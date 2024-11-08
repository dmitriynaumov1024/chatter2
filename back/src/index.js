import "dotenv/config"

import { ConsoleLogger } from "logging"
let logger = new ConsoleLogger()

import { sqlite } from "./database/connect.js"
let dbConnection = sqlite({ 
    filename: "../var/database.db"
})

import { Chatter2DbAdapter } from "./database/database.js"
let dbAdapter = new Chatter2DbAdapter()
await dbAdapter.connect(dbConnection)
await dbAdapter.createDb()

import { Chatter2CacheAdapter } from "./cache/cache.js"
let cacheAdapter = new Chatter2CacheAdapter(dbAdapter)

import { mailSenders } from "./email/sender.js"
let createMailSender = mailSenders[process.env.MAIL_PROVIDER]
let mailSender = createMailSender? 
    createMailSender({ 
        apiKey: process.env.MAIL_API_KEY, 
        secretKey: process.env.MAIL_API_SECRET,
        logger: logger
    }): 
    mailSenders.default(logger)

// workers:
// session cleanup worker
import { sessionCleanupWorker } from "./workers/sessionCleanupWorker.js"
let scWorker = sessionCleanupWorker({ dbAdapter, logger })
scWorker.start(30000) // every 30 seconds. 

// server
import { createServer } from "better-express"
let server = createServer({
    https: true,
    key: process.env.BACK_CERT_KEY_FILE,
    cert: process.env.BACK_CERT_FILE
})

// static serving
import express from "express"
server.http.use(express.static("./dist"))

// pre-middleware
import { requestItemProvider } from "./middleware/request-item-provider.js"
server.http.use(requestItemProvider({
    logger: ()=> logger,
    db: ()=> dbAdapter,
    cache: ()=> cacheAdapter,
    emailer: ()=> mailSender 
}))

import { requestLogger } from "./middleware/request-logger.js"
server.http.use(requestLogger())

import { crossOrigin } from "./middleware/cross-origin.js"
server.http.use(crossOrigin({ origins: "*" }))

import { jsonBodyParser } from "./middleware/json-parser.js"
server.http.use(jsonBodyParser())

// web api handlers
let api = server.http.subpath("/api/v1")

import { userSession } from "./middleware/user-session.js"
api.use(userSession())

import { utilsRouter } from "./webapi/utils.js"
api.use(utilsRouter)

import { authRouter } from "./webapi/auth.js"
api.use(authRouter)

import { chatListRouter } from "./webapi/chatlist.js"
api.use(chatListRouter)

import { chatroomRouter } from "./webapi/chatroom.js"
api.use(chatroomRouter)

import { chatroomUserRouter } from "./webapi/chatroom.user.js"
api.use(chatroomUserRouter)

import { chatroomMessageRouter } from "./webapi/chatroom.message.js"
api.use(chatroomMessageRouter)

// error catcher
import { errorCatcher } from "./middleware/error-catcher.js"
server.http.app.use(errorCatcher(()=> logger))

let port = process.env.BACK_PORT
server.listen(port)
logger.log(`Listening to ${port}`)
