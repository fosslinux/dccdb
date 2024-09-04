class State {
    _location: {file: string, line: number};

    constructor(event: MessageEvent) {
        this._location = {file: "", line: 1};
        this.updateState(event);
    }

    set line(line: number) {
        const rows = document.getElementById("code")?.children[0].children[0];
        const oldRow = rows?.children[this._location.line - 1] as HTMLElement;
        oldRow.style.backgroundColor = "";
        this._location.line = line;
        const row = rows?.children[line - 1] as HTMLElement;
        row.style.backgroundColor = "green";
        row.scrollIntoView({behavior: "smooth"});
    }

    updateState(event: MessageEvent) {
        const obj = JSON.parse(event.data);
        this.line = obj.location.line;
    }
}

let state: State;

declare let session: string;

function createState() {
    const eventSource = new EventSource(`/api/${session}/state`);
    eventSource.onmessage = (event: MessageEvent) => {
        console.log(event.data);
        if (state == undefined) {
            state = new State(event);
        } else {
            state.updateState(event);
        }
    };
}
