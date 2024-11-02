//
// Constraints
// 

function pk () {
    return {
        primaryKey: true
    }
}

function fk (model) {
    // if model is lambda function
    if ((model instanceof Function) && !model.prototype) {
        model = model()
    }
    return {
        foreignKey: true,
        target: model
    }
}

function cascade () {
    return {
        onDelete: "cascade"
    }
}

function restrict () {
    return {
        onDelete: "restrict"
    }
}

function increment () {
    return {
        increment: true
    }
}

function unique () {
    return {
        unique: true
    }
}

function min (value) {
    return {
        min: value
    }
}

function max (value) {
    return {
        max: value
    }
}

function regex (pattern) {
    return {
        regex: pattern
    }
}

function json () {
    return {
        json: true
    }
}

const constraint = {
    pk, fk, cascade, restrict, increment, unique, min, max, regex, json
}

export {
    constraint,
    pk, fk, cascade, restrict, increment, unique, min, max, regex, json
}

