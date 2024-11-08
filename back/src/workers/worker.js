export class Worker {
    constructor({ init, work }) {
        this.$initFunc = init ?? (()=> {})
        this.$workFunc = work ?? (()=> {})
    }

    init () {
        this.$initialized = true
        return this.$initFunc()
    }

    start (timeoutMs) {
        if (!this.$initialized) {
            this.$initFunc()
        }
        this.$interval = setInterval(this.$workFunc, timeoutMs)
    }

    stop () {
        clearInterval(this.$interval)
    }
}

export function createWorker (options) {
    return new Worker(options)
}
