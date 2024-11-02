//
// im sorry
//
import express from "express"

let realParser = express.json()

function jsonBodyParser () {
    return realParser
}

export {
    jsonBodyParser
}
