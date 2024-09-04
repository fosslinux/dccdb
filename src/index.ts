import express, { type Response } from "express";
import { debuggers, type DebuggerState } from "./debugger";
import { processHandler, processSetup } from "./process";
import { Server } from "socket.io";
import http from "http";
import fs from "node:fs";
import path from "path";
import pino from "pino";

const logger = pino({level: "trace"});

logger.info("Starting");

const app = express();

app.get('/', (_, res: Response) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/api/:session/code", (req, res) => {
    fs.readFile("/tmp/test.c", "utf8", (_, data) => {
        res.json(data);
    });
});

app.get("/api/:session/state", (req, res) => {
    logger.debug(`${req.params.session} opening state (SSE)`);
    res.set({
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
    });
    res.flushHeaders();

    res.write("retry: 2000\n\n");

    const callback = (state: DebuggerState) => {
        res.write(`data: ${JSON.stringify(state)}\n\n`);
    };
    const dbg = debuggers.get(req.params.session);
    if (dbg === undefined) {
        res.status(503);
    } else {
        dbg.stateCallback = callback;
        dbg.sendState();
    }
});

app.post("/api/:session/debugger/:action", (req, res) => {
    logger.debug(`${req.params.session}: ${req.params.action}`);
    const action = req.params.action;
    const dbg = debuggers.get(req.params.session);
    if (dbg === undefined) {
        res.status(503);
    } else {
        switch (action) {
            case "nextLine":
                dbg.nextLine();
                break;
            case "prevLine":
                dbg.prevLine();
                break;
            case "callFunction":
                dbg.callFunction();
                break;
        }
        dbg.sendState();
        res.status(200);
    }
    res.end();
});

app.use("/dist", express.static("dist"));
app.use("/node_modules", express.static("node_modules"));

const server = http.createServer(app);
const io = new Server(server);
io.on("connection", (socket) => {
    processSetup(socket, logger.child({module: "foo"}));
    socket.on("process", processHandler);
});

logger.info("Listening");
server.listen(3000);
