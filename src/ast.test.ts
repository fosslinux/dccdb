import { CAst } from './ast';
import _ from 'lodash';
import fs from 'node:fs';

/*test("ast generated is subset of clang", async () => {
    const ast = await CAst.create("src/tests/simple.c");
    expect(ast).toBeDefined();
    const data = await fs.promises.readFile("src/tests/simple.json");
    const full = JSON.parse(data.toString());
    const recursiveSameKind = (a: any, b: any) => {
        console.log(a);
        console.log(b);
        expect(a.kind).toBe(b.kind);
        expect(Object.hasOwn(a, "inner")).toBe(Object.hasOwn(b, "inner"));
        if (Object.hasOwn(a, "inner")) {
            expect(a.inner.length).toBeGreaterThanOrEqual(b.inner.length);
            for (let i = 0; i < a.inner.length; i++) {
                recursiveSameKind(a.inner[i], b.inner[i]);
            }
        }
    }
    recursiveSameKind(ast?.ast, full);
});*/

test("_expansionLocify is a noop on simple.json", async () => {
    const data = await fs.promises.readFile("src/tests/simple.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/simple.c", false);
    const astPre = structuredClone(ast.ast);
    ast._expansionLocify(ast.ast);
    expect(ast.ast).toEqual(astPre);
});

test("_pruneAst removes all but main from simple.json", async () => {
    const data = await fs.promises.readFile("src/tests/simple.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/simple.c", false);
    ast.ast = ast._pruneAst(ast.ast);
    expect(ast.ast.inner.length).toBe(1);
    expect(ast.ast.inner[0].name).toBe("main");
});

test("_pruneAst removes all from simple.json on different file", async () => {
    const data = await fs.promises.readFile("src/tests/simple.json");
    const ast = new CAst(JSON.parse(data.toString()), "noexist.c", false);
    ast.ast = ast._pruneAst(ast.ast);
    expect(ast.ast.inner.length).toBe(0);
});

test("_pruneAst removes nearly all from sort.json", async () => {
    const data = await fs.promises.readFile("src/tests/sort.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/sort.c", false);
    ast.ast = ast._pruneAst(ast.ast);
    expect(ast.ast.inner.length).toBe(3);
});

test("_pruneAst then _expansionLocify fills loc", async () => {
    const data = await fs.promises.readFile("src/tests/sort.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/sort.c", false);
    ast.ast = ast._pruneAst(ast.ast);
    ast._expansionLocify(ast.ast);
    expect(ast.ast.inner[0].loc.file).toBe(ast.ast.inner[0].loc.expansionLoc.file);
});

test("_expansionLocify then _pruneAst removes an element", async () => {
    const data = await fs.promises.readFile("src/tests/sort.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/sort.c", false);
    ast._expansionLocify(ast.ast);
    ast.ast = ast._pruneAst(ast.ast);
    expect(ast.ast.inner.length).toBe(2);
});

for (const file of [["simple.json", "simple.c"], ["sort.json", "sort.c"]]) {
    for (const attr of ["file", "line"]) {
        test(`_fillLocAst makes nodes have loc.${attr}: ${file[0]}`, async () => {
            const data = await fs.promises.readFile(`src/tests/${file[0]}`);
            const ast = new CAst(JSON.parse(data.toString()), file[1], false);
            ast._fillLocAst(ast.ast, undefined, undefined);
            const recursiveCheck = (ast: any, val: any) => {
                if (val !== undefined) {
                    expect(ast.loc[attr]).toBe(val);
                    val = ast.loc[attr];
                }
                if (Object.hasOwn(ast, "inner")) {
                    for (const node of ast.inner) {
                        recursiveCheck(node, val);
                    }
                }
            };
            recursiveCheck(ast.ast, undefined);
        });
    }
}

test("_astFilter finds selectionSort in sort.json", async () => {
    const data = await fs.promises.readFile("src/tests/sort.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/sort.c", false);
    const filtered = ast._astFilter((node) => {
        return node.name === "selectionSort";
    });
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe("selectionSort");
});

test("functionDecls: simple.json", async () => {
    const data = await fs.promises.readFile("src/tests/simple.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/simple.c", false);
    expect(Array.from(ast.functionDecls.keys())).toEqual(["main"]);
});

test("functionDecls + _pruneAst: sort.json", async () => {
    const data = await fs.promises.readFile("src/tests/sort.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/sort.c", false);
    ast.ast = ast._pruneAst(ast.ast);
    expect(Array.from(ast.functionDecls.keys()).sort()).toEqual(["main", "selectionSort"].sort());
});

test("functionCalls: simple.json", async () => {
    const data = await fs.promises.readFile("src/tests/simple.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/simple.c", false);
    expect(ast.functionCalls.length).toBe(0);
});

test("functionCalls: sort.json", async () => {
    const data = await fs.promises.readFile("src/tests/sort.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/sort.c", false);
    expect(ast.functionCalls.length).toBe(3);
});

test("sort.json: line has function", async () => {
    const data = await fs.promises.readFile("src/tests/sort.json");
    const ast = new CAst(JSON.parse(data.toString()), "src/tests/sort.c", false);
    ast._fillLocAst(ast.ast, undefined, undefined);
    expect(ast.lineHasFunction(33)).toBe(true);
    expect(ast.lineHasFunction(31)).toBe(false);
    expect(ast.lineHasFunction(32)).toBe(false);
});

for (const name of ["simple", "sort"]) {
    test(`_runTransforms: ${name}.json`, async () => {
        const data = await fs.promises.readFile(`src/tests/${name}.json`);
        const ast = new CAst(JSON.parse(data.toString()), `src/tests/${name}.c`, false);
        ast._runTransforms();
        const transformedData = await fs.promises.readFile(`src/tests/${name}.transformed.json`);
        const transformed = JSON.parse(transformedData.toString());
        expect(ast.ast).toEqual(transformed);
    });
}
