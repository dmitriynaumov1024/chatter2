// timespan: average number of milliseconds to wait
export function timeout(timespan) {
    return new Promise((resolve)=> {
        setTimeout(()=> resolve(), Math.floor(timespan * (Math.random() + 0.5)))
    })
}
