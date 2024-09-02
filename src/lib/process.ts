import socketio from 'socket.io';
import pty from 'node-pty';
import { type IPty, type IDisposable } from 'node-pty';
import tmp from 'tmp';
import { spawn, type ChildProcess } from 'child_process';
import { Debugger, debuggers } from './debugger.ts';
import fs from 'node:fs';
import net from 'node:net';

let processes: Map<string, Process> = new Map();

export class Process {
    readonly _dcc_path: string;
    readonly _socket: socketio.Socket;
    readonly _session: string;
    finished: boolean;
    debugger: Debugger | undefined = undefined;
    _stdinStream: net.Socket | undefined = undefined;

    _writeData(data: string) {
        this._socket.emit("process", JSON.stringify({
            action: "stdout",
            data: data,
        }));
    }

    constructor(socket: socketio.Socket, session: string) {
        // Compile with dcc
        this._socket = socket;
        this._session = session;
        this._dcc_path = tmp.tmpNameSync();

        const dcc_process = spawn("dcc", [
            "/tmp/test.c",
            "-o",
            this._dcc_path,
        ]);

        this.finished = false;

        dcc_process.on('data', (data: string) => {
            this._writeData(data.toString());
            return;
        });
        dcc_process.on('close', (code: number) => {
            if (code !== 0) {
                this._finish();
            } else {
                this._setupDebugger();
            }
        });
    }

    _setupDebugger() {
        // https://github.com/nodejs/node/issues/23220#issuecomment-599117002
        this.debugger = new Debugger(this._dcc_path, this._finish);
        debuggers.set(this._session, this.debugger);
        console.log(debuggers);
        this.debugger.doGdbInit().then(() => {
            // no, stupid linter, this.debugger cannot be undefined
            fs.open(this.debugger.stdinFifo, fs.constants.O_RDWR | fs.constants.O_NONBLOCK, (_err, fd) => {
                this._stdinStream = new net.Socket({fd: fd, readable: false});
                this._stdinStream.on("end", this._finish);
                this._socket.emit("process", JSON.stringify({
                    action: "ready"
                }));
            });
    
            // https://github.com/nodejs/node/issues/23220#issuecomment-426345872
            fs.open(this.debugger.stdoutFifo, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK, (_err, fd) => {
                const socket = new net.Socket({fd});
                socket.on("data", (data) => this._writeData(data.toString()));
            });
    
            fs.open(this.debugger.stderrFifo, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK, (_err, fd) => {
                const socket = new net.Socket({fd});
                socket.on("data", (data) => this._writeData(data.toString()));
            });
        });
    }

    _finish() {
        if (!this.finished) {
            fs.unlink(this._dcc_path, (_) => {});
            this._socket.emit("process", JSON.stringify({
                action: "end",
                code: 0,
            }));
            this.finished = true;
        }
    }

    input(data: string) {
        this._stdinStream?.write(data);
    }
}

export function processSetup(socket: socketio.Socket) {
    const session = socket.handshake.query.session?.toString();
    if (session == undefined) {
        console.error("Invalid request to websocket");
        return;
    }

    const process = new Process(socket, session);
    processes.set(session, process);
}

export function processHandler(message: string) {
    const data = JSON.parse(message);

    switch (data.action) {
        case "stdin":
            const text = data.data.replace(/\r/g, "\n");
            processes.get(data.session)?.input(text);
            //subprocesses.get(data.session)?.debug?.write(text);
            break;
        default:
            console.error(`Invalid action ${data.action}`);
    }
}
