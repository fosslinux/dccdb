import { type Socket } from 'socket.io';
import pty from 'node-pty';
import { type IPty } from 'node-pty';

let subprocess: Map<string, IPty> = new Map();

export function processSetup(socket: Socket) {
    const session = socket.handshake.query.session?.toString();
    if (session == undefined) {
        console.error("Invalid request to websocket");
        return;
    }

    subprocess.set(session, pty.spawn("/bin/python3", ["-i"], {}));

    subprocess.get(session)?.onData((data: string) => {
        socket.emit("process", JSON.stringify({
            action: "stdout",
            data: data.toString(),
        }));
    });
    subprocess.get(session)?.onExit((code) => {
        socket.emit("process", JSON.stringify({
            action: "end",
            code: code.exitCode,
        }));
    });
}

export function processHandler(message: string) {
    const data = JSON.parse(message);

    switch (data.action) {
        case "stdin":
            subprocess.get(data.session)?.write(data.data.replace(/\r/g, "\n"));
            break;
        default:
            console.error(`Invalid action ${data.action}`);
    }
}
