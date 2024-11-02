const LogLevel = {
    debug: 0,
    info: 1,
    log: 1,
    warn: 2,
    error: 3
}

function str(text) {
    return ((typeof text=="string")||(text instanceof String))? text : JSON.stringify(text)
}

class Logger
{
    constructor({ filter, write } = { }) {
        if (filter) this.filter = filter
        if (write) this.writeImpl = write
    }

    filter (level) {
        return true
    }

    write (level, text) {
        if (this.filter(level)) {
            this.writeImpl(level, text)
        }
    }

    timestamp () {
        return new Date().toISOString().slice(0, 19)
    }

    debug (text) {
        this.write(LogLevel.debug, `[${this.timestamp()}][i] ${str(text)}`)
    }

    info (text) {
        this.write(LogLevel.info, `[${this.timestamp()}][i] ${str(text)}`)
    }

    log (text) {
        this.write(LogLevel.log, `[${this.timestamp()}][i] ${str(text)}`)
    }

    warn (text) {
        this.write(LogLevel.warn, `[${this.timestamp()}][!] ${str(text)}`)
    }

    error (text) {
        this.write(LogLevel.error, `[${this.timestamp()}][x] ${str(text)}`)
    }
}

export {
    LogLevel,
    Logger
} 
