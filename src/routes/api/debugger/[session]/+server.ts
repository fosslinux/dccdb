import { type DebuggerState, debuggers } from '$lib/debugger.ts';
import { produce } from 'sveltekit-sse';

function delay(ms: number) {
    return new Promise(function run(resolve) {
        setTimeout(resolve, ms);
    });
}

export function POST({ params }: {params: {session: string}}) {
    return produce(async function start({ emit }) {
        let dbg = debuggers.get(params.session);
        while (dbg === undefined) {
            await delay(200);
            console.log(debuggers);
            dbg = debuggers.get(params.session);
        }
        const callback = (state: DebuggerState) => {
            console.log(`${params.session}: ${state}`);
            emit("state", JSON.stringify(state));
        };
        dbg.stateCallback = callback;
    });
}
