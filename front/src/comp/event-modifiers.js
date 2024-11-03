import { withModifiers } from "vue"

export function self (callback) {
    return withModifiers(callback, ["self"])
} 

export function prevent (callback) {
    return (event)=> {
        if (event.preventDefault) event.preventDefault()
        if (callback) callback(event)
    }
}

export function stop (callback) {
    return (event)=> {
        if (event.stopPropagation) event.stopPropagation()
        if (callback) callback(event)
    }
}

