import { spawn, type ChildProcess } from 'node:child_process';
import tmp from 'tmp';
import { mkfifoSync } from 'mkfifo';
import { Mutex } from 'async-mutex';

export type DebuggerState = {
    location: {
        file: string,
        line: number,
    },
};

export class Debugger {
    _gdb!: ChildProcess;
    readonly _mutex: Mutex;
    _dataCallback!: ((data: string) => void) | undefined;

    stdoutFifo: string = "";
    stdinFifo: string = "";
    stderrFifo: string = "";

    _curGdbData: string = "";

    _finishedCallback!: () => void;
    stateCallback: (state: DebuggerState) => void = () => {};

    constructor(binary: string, finishedCallback: () => void) {
        this._mutex = new Mutex();
        this._mutex.acquire().then((release) => {
            this._dataCallback = () => {
                release();
            };
        }).finally(() => {
            this._gdb = spawn("gdb", [binary]);
            this._gdb.stdout?.on("data", (data: string) => {this._gdbOnData(data)});
            this._gdb.stderr?.on("data", (data: string) => {this._gdbOnData(data)});
            this._finishedCallback = finishedCallback;
        });
    }

    async doGdbInit() {
        const convertToFifo = async (fd: number) => {
            const filename = tmp.tmpNameSync();
            mkfifoSync(filename, 0o660);
            // 0101 == O_WRONLY | O_RDWR (we will NOT both read and write from the pipe)
            // O_RDWR is required to get it to actually open without other cursed things
            const new_fd: number = Number(await this.eval(`open("${filename}", 0102)`, "long"));
            await this.eval(`dup2(${new_fd}, ${fd})`, "void");
            return filename;
        }

        await this._runGdb("break main");
        await this._runGdb("run");
        this.stdinFifo = await convertToFifo(0);
        this.stdoutFifo = await convertToFifo(1);
        this.stderrFifo = await convertToFifo(2);
        // Also unbuffer outputs
        for (const stream of ["stdout", "stderr"]) {
            this.eval(`setvbuf((FILE *)${stream}, 0, 2, 0)`, "void");
        }
    }

    sendState() {
        this.getState().then(state => this.stateCallback(state));
    }

    async getState(): Promise<DebuggerState> {
        return {
            location: await this.currentLocation(),
        }
    }

    async nextLine() {
        await this._runGdb("next");
    }

    async prevLine() {
        await this._runGdb("reverse-next");
    }

    async callFunction() {
        await this._runGdb("step");
    }

    async currentLocation(): Promise<{file: string, line: number}> {
        //  XXX convert this to use Python API?
        const output: string = await this._runGdb("frame");
        const location = output.match(/.* at (.*):([0-9]*)/);
        if (location == null) return {file: "", line: -1};
        return {file: location[1], line: Number(location[2])};
    }

    async running(): Promise<boolean> {
        // https://stackoverflow.com/questions/30256274/gdb-command-to-know-whether-the-program-is-running-or-stopped
        const python: string = "int(gdb.selected_inferior().threads()[0].is_running())";
        return Boolean(Number(await this._runGdb(`python ${python}`)));
    }

    async eval(expression: string, type: string): Promise<string> {
        const output: string = await this._runGdb(`print (${type})${expression}`); 
        if (output == null) return "";
        const matches = output.match(/.* = (.*)/);
        return matches == null ? "" : matches[1];
    }

    _gdbOnData(data: string) {
        data = data.toString();
        if (data.includes("(gdb) ")) {
            const fragments = data.split("(gdb) ");
            this._curGdbData += fragments.shift();
            if (this._dataCallback !== undefined) {
                this._dataCallback(this._curGdbData);
                this._dataCallback = undefined;
            }
            this._curGdbData = fragments[0];
        } else {
            this._curGdbData += data;
        }
    }

    async _runGdb(command: string): Promise<string> {
        let promise: Promise<string> = Promise.resolve("");
        console.log(`running gdb ${command}`);
        // the mutex is required to ensure that commands are actually executed in order
        // otherwise the queue might not actually match with the command
        const release = await this._mutex.acquire();
        this._gdb.stdin?.write(`${command}\n`);
        promise = new Promise((resolve) => {
            const callback = (data: string) => {
                this._dataCallback = undefined;
                release();
                resolve(data);
            };
            this._dataCallback = callback;
        });
        return promise;
    }
}

export const debuggers: Map<string, Debugger> = new Map();
