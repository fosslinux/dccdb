function doNextLine() {
    fetch(`/api/${session}/debugger/nextLine`, {method: "POST"});
}

function doPrevLine() {
    fetch(`/api/${session}/debugger/prevLine`, {method: "POST"});
}

function doCallFunction() {
    fetch(`/api/${session}/debugger/callFunction`, {method: "POST"});
}
