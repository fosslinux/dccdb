import { spawn } from 'node:child_process';
import _ from 'lodash';

export class CAst {
    ast: any;
    readonly _inputs: Array<string> = new Array();

    constructor(ast: object, filename: string) {
        this.ast = ast;
        this._inputs = [filename];
        this._runTransforms();
    }

    static async create(filename: string) {
        const clang = spawn("clang", ["-Xclang", "-ast-dump=json", "-fsyntax-only", filename]);
        let json: string = "";
        clang.stdout?.on("data", (data) => {
            json += data;
        });
        let ast: CAst | undefined = undefined;
        await new Promise((resolve) => {
            clang.on("exit", (_code) => {
                resolve(0);
                ast = new CAst(JSON.parse(json), filename);
            });
        });
        return ast;
    }

    _runTransforms() {
        // Remove all not from input files
        this.ast = this._pruneAst(this.ast);
        this._fillLocAst(this.ast, undefined, undefined);
    }

    _pruneAst(ast: any) {
        if (Object.hasOwn(ast, "loc") &&
            Object.hasOwn(ast.loc, "file") &&
            !this._inputs.includes(ast.loc.file)) {
            return null;
        } else if (Object.hasOwn(ast, "loc") &&
                   !Object.hasOwn(ast.loc, "file") &&
                   Object.hasOwn(ast.loc, "includedFrom") &&
                   Object.hasOwn(ast.loc.includedFrom, "file") &&
                   !this._inputs.includes(ast.loc.includedFrom.file)) {
            return null;
        } else if (Object.hasOwn(ast, "isImplicit") && ast.isImplicit) {
            return null;
        } else if (Object.hasOwn(ast, "storageClass") && ast.storageClass === "extern") {
            return null;
        } else {
            if (Object.hasOwn(ast, "inner")) {
                for (const [index, node] of ast.inner.entries()) {
                    ast.inner[index] = this._pruneAst(node);
                }
                for (let i = 0; i < ast.inner.length; i++) {
                    if (ast.inner[i] === null) {
                        ast.inner.splice(i, 1);
                        i--;
                    }
                }
            }
            return ast;
        }
    }

    _fillLocAst(ast: any, file: string | undefined, line: number | undefined): [string | undefined, number | undefined] {
        if (Object.hasOwn(ast, "loc")) {
            if (Object.hasOwn(ast.loc, "file")) {
                file = ast.loc.file;
            } else if (file !== undefined) {
                ast.loc.file = file;
            }

            if (Object.hasOwn(ast.loc, "line")) {
                line = ast.loc.line;
            } else if (line !== undefined) {
                ast.loc.line = line;
            }
        } else if (Object.hasOwn(ast, "range")) {
            if (Object.hasOwn(ast.range.begin, "line")) {
                line = ast.range.begin.line;
            }
        }

        if (!Object.hasOwn(ast, "loc") && file !== undefined) {
            ast.loc = {file};
            if (line !== undefined) {
                ast.loc.line = line;
            }
        }

        if (Object.hasOwn(ast, "inner")) {
            for (const node of ast.inner) {
                [file, line] = this._fillLocAst(node, file, line);
            }
        }

        return [file, line];
    }

    _astFilterRecursive(filter: (item: any) => boolean, ast: any): Array<any> {
        const nodes = [];
        if (Object.hasOwn(ast, "inner")) {
            nodes.push(...ast.inner.filter(filter));
            for (const node of ast.inner) {
                nodes.push(...this._astFilterRecursive(filter, node));
            }
        }
        return nodes;
    }

    _astFilter(filter: (item: any) => boolean): Array<any> {
        return this._astFilterRecursive(filter, this.ast);
    }

    _functionDecls() {
        const functions = this._astFilter((item) => {
            return item.kind === "FunctionDecl";
        });
        const map = new Map();
        for (const decl of functions) {
            map.set(decl.name, decl);
        }
        return map;
    }

    __functionDecls = _.memoize(this._functionDecls);
    get functionDecls() {
        return this.__functionDecls();
    }

    _functionCalls() {
        return this._astFilter((item) => {
            if (item.kind === "CallExpr") {
                const funcName = CAst._callExprFuncName(item);
                return Array.from(this.functionDecls.keys()).includes(funcName);
            }
            return false;
        });
    }

    static _callExprFuncName(item: any) {
         const implicitCastExpr = item.inner.filter((item: any) => { return item.kind === "ImplicitCastExpr" })[0];
         const declRefExpr = implicitCastExpr.inner.filter((item: any) => { return item.kind === "DeclRefExpr" })[0];
         return declRefExpr.referencedDecl.name;
    }

    __functionCalls = _.memoize(this._functionCalls);
    get functionCalls() {
        return this.__functionCalls();
    }

    lineHasFunction(line: number): boolean {
        for (const func of this.functionCalls) {
            if (func.loc.line === line) {
                return true;
            }
        }
        return false;
    }
}
