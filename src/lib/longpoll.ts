export async function longpoll(endpoint: string, callback: (resp: string) => void, finished: () => void) {
    let response = await fetch(endpoint);

    if (response.status == 502) {
        await longpoll(endpoint, callback, finished);
    } else if (response.status == 410) {
        finished();
    } else if (response.status != 200) {
        console.log(`Polling {endpoint} failed: {response.statusText}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        await longpoll(endpoint, callback, finished);
    } else {
        callback(await response.text());
        await longpoll(endpoint, callback, finished);
    }
}
