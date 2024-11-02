// timestamp milliseconds precision
// timezone milliseconds precision as well
// returns hh:mm without a zone
export function timestampToHHMM(timestampUTC, timezone) {
    let date = new Date(timestampUTC + timezone),
        mm = date.getUTCMinutes().toString().padStart(2, "0"),
        hh = date.getUTCHours().toString().padStart(2, "0")
    return `${hh}:${mm}`
}

// timestamp milliseconds precision
// timezone milliseconds precision as well
// returns hh:mm [[+|-]hhz:mmz|UTC]
export function timestampToHHMMz(timestampUTC, timezone) {
    let date = new Date(timestampUTC + timezone),
        offset = new Date(Math.abs(timezone)),
        mm = date.getUTCMinutes().toString().padStart(2, "0"),
        hh = date.getUTCHours().toString().padStart(2, "0")
    if (Math.abs(timezone) < 1000) return `${hh}:${mm} UTC`

    let mmz = offset.getUTCMinutes().toString().padStart(2, "0"),
        hhz = offset.getUTCHours().toString(),
        signz = (timezone < 0)? "-" : "+"
    return `${hh}:${mm} ${signz}${hhz}:${mmz}`
}

// convert timestamp to day month year
// if locale is provided, returns DD Month YYYY
// if no locale, returns DD/MM/YYYY
export function timestampToDayMonthYear(timestampUTC, timezone, locale) {
    let date = new Date(timestampUTC + timezone||0),
        day = date.getUTCDate(),
        month = date.getUTCMonth(),
        year = date.getUTCFullYear()
    if (locale?.month) return `${day} ${locale.month[month]} ${year}`
    else return `${day}/${month+1}/${year}`
}

// extract date component from timestamp 
export function days(timestampUTC, timezone = 0) {
    timestampUTC += timezone
    return Math.floor(timestampUTC / 86400000)
}

// our own cursed timezone format 
// milliseconds difference between UTC and local time
export function getTimeZone() {
    let a = new Date()
    return -60000 * a.getTimezoneOffset()
}
