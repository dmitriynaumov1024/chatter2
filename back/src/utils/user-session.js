import crypto from "node:crypto"

export function createSessionToken() {
    return crypto.randomBytes(256).toString("hex")
}

export function createShortCode() {
    return crypto.randomBytes(10).map(byte=> byte%99).join("").slice(0, 8)
}

export const sessionRefreshTime = 3600000 // 1 hour
export const sessionExpireTime = 86400000 // 24 hours
export const sessionShortCodeTime = 300000 // 5 minutes
