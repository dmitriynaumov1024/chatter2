//
// request logger
//
function requestLogger() {
    return async function (request, response, next) {
        let { logger } = request
        logger.log(`${request.method} ${request.originalUrl}`)
        await next()
    }
}

export {
    requestLogger
}
