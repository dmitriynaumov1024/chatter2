import { createRouter } from "better-express"

let route = createRouter()

route.get("/ping", async (request, response)=> {
    response.status(200)
    .set("What-Is-This", "chatter2")
    .set("Cache-Control", "max-age=10")
    .json({
        message: "pong!",
        endpointType: "chatter2",
        whatIsThis: "chatter2"
    })
})

route.post("/time", async (request, response)=> {
    response.status(200)
    .set("Cache-Control", "max-age=1")
    .json({
        time: Date.now()
    })
})

export {
    route as utilsRouter
}
