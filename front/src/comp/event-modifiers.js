import { withModifiers } from "vue"

export function self (callback) {
    return withModifiers(callback, ["self"])
} 

