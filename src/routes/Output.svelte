<script lang="ts">
    import { getContext, onMount } from 'svelte';
    import { Xterm, type Terminal, type ITerminalOptions } from '@battlefieldduck/xterm-svelte';
    import { io, type Socket } from 'socket.io-client';
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

    let socket: Socket;
    onMount(() => {
        socket = io(`ws://${$page.url.host}?session=${session}`);
    });

    const session: string = getContext("session");

    onMount(() => {
        socket.on('process', (message: string) => {
            console.log(message);
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
    });

    async function onData(event: CustomEvent<string>) {
        socket.emit("process", JSON.stringify({
            session: session,
            action: "stdin",
            data: event.detail,
        }));
    }
</script>

<Xterm {options} on:load={onLoad} on:data={onData}/>
