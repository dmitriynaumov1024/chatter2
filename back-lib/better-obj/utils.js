import crypto from "node:crypto"

async function paginate (page, size, queryFunc) {
    let items = await (queryFunc().offset((page-1)*size).limit(size+1))
    return {
        page: page,
        prev: (page > 1) ? page - 1 : null,
        next: (items.length > size) ? page + 1 : null,
        items: items
    }
}

async function count (queryFunc) {
    let result = await (queryFunc().count())
    return result[0].count
}

function hash (source) {
    return crypto.createHash("blake2b512")
        .update(source)
        .digest("hex")
}

function randomHash (length) {
    return hash(crypto.randomBytes(length))
}

function offsetDate (...args) {
    if (args.length >= 2) {
        return new Date(args[0].valueOf() + args[1].valueOf())
    }
    else if (args.length == 1) {
        return new Date(new Date().valueOf() + args[0].valueOf())
    }
    else {
        return new Date()
    }
}

function diffDate (date1, date2) {
    // not like difference of 2 numbers, but more like vector length
    // how much ms we have to spend to reach date 2 from date 1
    if (! date1 instanceof Date) date1 = new Date(date1)
    if (! date2 instanceof Date) date2 = new Date(date2)
    return date2.valueOf() - date1.valueOf()
}

function formatDiffDate (diff) {
    let s = Math.floor(Math.abs(diff / 1000))
    let m = Math.floor(s / 60)
    let h = Math.floor(m / 60)
    let d = Math.floor(h / 24)
    let interval = `${d} days, ${h%24} hours, ${m%60} minutes`
    if (diff < 0) return interval + " ago"
    else return "in " + interval
}

function formatDateTime(date) {
    if (!(date instanceof Date)) date = new Date(date)
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} `
         + `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`
}

const daysInMonth = [
    31, 28, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31 
]

function ymdToDate (year, month, day, hour, minute) {
    year = clamp(year, 0, 9999) | 0
    month = clamp(month, 1, 12) | 0
    day = clamp(day, 1, daysInMonth[month - 1]) | 0
    hour = clamp(hour, 0, 23) | 0
    minute = clamp(minute, 0, 59) | 0
    let yearS = String(year).padStart(4, "0")
    let monthS = String(month).padStart(2, "0")
    let dayS = String(day).padStart(2, "0")
    let hourS = String(hour).padStart(2, "0")
    let minuteS = String(minute).padStart(2, "0")
    return new Date(`${yearS}-${monthS}-${dayS}T${hourS}:${minuteS}:00`)
}

function inRange (number, min, max) {
    return number >= min && number <= max
}

function clamp (value, min, max) {
    if (value < min) return min
    else if (value > max) return max
    else return value
}

export {
    paginate,
    count,
    hash,
    randomHash,
    offsetDate,
    diffDate,
    formatDiffDate,
    formatDateTime,
    ymdToDate,
    inRange,
    clamp
}
