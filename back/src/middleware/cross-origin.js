//
// allow CORS requests from given base URL
//
function crossOrigin ({ origins, headers="*" }) {
    let methods = "GET, HEAD, POST, PUT, PATCH, DELETE"
    return async function (request, response, next) {
        response.append("Access-Control-Allow-Origin", origins)
        response.append("Access-Control-Allow-Headers", headers)
        response.append("Access-Control-Expose-Headers", headers)
        response.append("Access-Control-Allow-Methods", methods)
        await next()
    }
}

export {
    crossOrigin
}
