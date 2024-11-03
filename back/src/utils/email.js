// check if email is valid
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
export function isValidEmail(str) {
    return emailRegex.test(str)
}

// maybe upgrade later
const emailProviders = [
    "@gmail.com",
    "@ukr.net",
    "@msn.com",
    "@icloud.com",
    "@protonmail.com",
    "@proton.me",
    "@mailbox.org"
]
export function isValidEmailProvider(str) {
    return !!(emailProviders.find(provider=> str.endsWith(provider)))
}
