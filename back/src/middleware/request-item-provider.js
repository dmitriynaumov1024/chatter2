// provide any item
export function requestItemProvider (factoryObject) {
    return async function (request, response, next) {
        for (let key in factoryObject) {
            let factoryFunc = factoryObject[key]
            request[key] = factoryFunc()
        }
        await next()
    }
}
