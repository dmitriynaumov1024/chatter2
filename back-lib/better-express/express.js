import express from "express"
import { ConsoleLogger, LogLevel } from "logging"

let debug = process.env.BACKEND_MODE == "dev"
let logger = new ConsoleLogger({
    filter: (level) => level >= (debug? LogLevel.debug : LogLevel.info)
})

// stolen from
// https://www.npmjs.com/package/async-error-catcher?activeTab=code
function catchErrors (func) {
    if (!(func instanceof Function)) {
        throw new Error("func must be instance of Function")
    }

    return function (req, res, next, ...rest) {
        let promise = func(req, res, next, ...rest)
        if (promise?.catch) promise.catch(err => next(err))
    }
}

const httpMethods = [ "all", "get", "post", "put", "patch", "delete" ]

class Router 
{
    constructor (router) {
        this.router = router || express.Router()
        this.endpoints = { }
        for (let method of httpMethods) {
            this[method] = (path, handler) => {
                this.endpoints[method] ??= { }
                this.endpoints[method][path] = handler
                return this.router[method](path, catchErrors(handler))
            }
        }
    }

    use (handler) {
        this.handlers ??= [ ]
        this.handlers.push(handler)
        return this.router.use(catchErrors(handler))
    }

    describe () {
        let result = []
        if (this.handlers?.length) {
            result.push(`  + handlers (${this.handlers.length})`)
        }
        if (this.endpoints) for (let method in this.endpoints) {
            for (let path in this.endpoints[method]) {
                result.push(`  + ${method} ${path}`)
            }
        }
        return result.join("\n")
    }
}

class SubpathRouter
{
    constructor (parent, path) {
        this.parent = parent
        this.path = `${path}`
    }

    use (...args) {
        if (args.length > 1) {
            this.parent.use(this.path + args[0], args[1])
        }
        else {
            this.parent.use(this.path, args[0])
        }
    }

    subpath (path) {
        // flat hierarchy, is it ever profitable?
        return new SubpathRouter(this.parent, this.path + path)
    }
}

class Application
{
    constructor(app) {
        this.app = app || express()
        this.listen = (...args) => this.app.listen(...args)
        for (let method of httpMethods) {
            this[method] = (path, handler) => {
                return this.app[method](path, catchErrors(handler))
            }
        }
    }

    use (...args) {
        if (args.length == 2) {
            let [ path, handler ] = args
            if (handler instanceof Router) {
                logger.debug(`mounting Router at ${path}\n${handler.describe()}`)
                return this.app.use(path, handler.router)
            }
            else {
                return this.app.use(path, catchErrors(handler))
                logger.debug(`mounting handler at ${path}`)
            }
        }
        if (args.length == 1) {
            let [ handler ] = args
            return this.app.use(catchErrors(handler))
        }
    }

    subpath (path) {
        return new SubpathRouter(this, path)
    }
}

function createExpress () {
    return new Application(null)
}

function createRouter () {
    return new Router(null)
}

export {
    Application,
    Router,
    createExpress,
    createRouter
}
