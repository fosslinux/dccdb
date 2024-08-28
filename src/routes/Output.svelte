<script lang="ts">
    import { io } from 'socket.io-client';
    import { getContext } from 'svelte';
    import { Xterm, type Terminal, type ITerminalOptions } from '@battlefieldduck/xterm-svelte';
    import { page } from '$app/stores';

    let terminal: Terminal;
    let options: ITerminalOptions = {
        theme: {
            background: "#2b2b2b",
        },
    };

    async function onLoad(event: CustomEvent<{terminal: Terminal}>) {
        terminal = event.detail.terminal;
    }

    const session = getContext("session");

    const socket = io(`ws://${$page.url.host}?session=${session}`);
    socket.on('process', (message) => {
        const data = JSON.parse(message);
        switch (data.action) {
            case "stdout":
                terminal?.write(data.data.replace(/\n/g, "\r\n"));
                break;
            case "end":
                terminal?.write(`Exited with code ${data.code}\r\n`);
                options.disableStdin = true;
                break;
            default:
                console.error(`Unknown action ${data.action}`);
        }
    });

    async function onData(event: CustomEvent<string>) {
        console.log("hellooo");
        socket.emit("process", JSON.stringify({
            session: session,
            action: "stdin",
            data: event.detail,
        }));
    }
</script>

<Xterm {options} on:load={onLoad} on:data={onData}/>
