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
    readonly _gdb: ChildProcess;
    readonly _mutex: Mutex;
    readonly _queue: Array<(data: string) => void>;

    stdoutFifo: string = "";
    stdinFifo: string = "";
    stderrFifo: string = "";

    _curGdbData: string = "";

    readonly _finishedCallback: () => void;
    stateCallback: (state: DebuggerState) => void = () => {};

    constructor(binary: string, finishedCallback: () => void) {
        this._queue = new Array();
        this._mutex = new Mutex();

        this._gdb = spawn("gdb", [binary]);
        this._gdb.stdout?.on("data", (data: string) => {this._gdbOnData(data)});
        this._gdb.stderr?.on("data", (data: string) => {this._gdbOnData(data)});
        this._finishedCallback = finishedCallback;
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

        await this._runGdb("");
        await this._runGdb("break main");
        await this._runGdb("run");
        this.stdinFifo = await convertToFifo(0);
        this.stdoutFifo = await convertToFifo(1);
        this.stderrFifo = await convertToFifo(2);

        this.stateCallback(await this.getState());
    }

    async getState(): Promise<DebuggerState> {
        return {
            location: await this.currentLocation(),
        }
    }

    async currentLocation(): Promise<{file: string, line: number}> {
        //  XXX convert this to use Python API?
        const output: string = await this._runGdb("frame");
        const location = output.match(/.* at (.*):([0-9]*)/);
        if (location == null) return {file: "", line: -1};
        return {file: location[0], line: Number(location[1])};
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
            for (let fragment of fragments) {
                const callback = this._queue.pop();
                if (callback !== undefined) {
                    callback(this._curGdbData);
                }
                this._curGdbData = fragment;
            }
        } else {
            this._curGdbData += data;
        }
    }

    async _runGdb(command: string): Promise<string> {
        let promise: Promise<string> = Promise.resolve("");
        // the mutex is required to ensure that commands are actually executed in order
        // (i think?)
        const release = await this._mutex.acquire();
        this._gdb.stdin?.write(`${command}\n`);
        promise = new Promise((resolve) => {
            const callback = (data: string) => {
                resolve(data);
            };
            this._queue.push(callback);
            release();
        });
        return promise;
    }
}

export let debuggers: Map<string, Debugger> = new Map();
