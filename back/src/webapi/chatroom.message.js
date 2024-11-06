import { createRouter } from "better-express"
import { v4 as uuid } from "uuid"

let route = createRouter()

route.post("/chatroom.message.send", async(request, response)=> {
    let { logger, db, cache, session } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })

    let { chatroom, message } = request.body
    let requestOk = chatroom?.id && message?.text && message.text.length > 1
    if (!requestOk) return response.status(400).json({
        message: "Bad request! Expected { chatroom { id Number }, message { text String[1,10000] } }"
    })
    
    let uic = await db.userInChatroom.query()
        .where("userId", session.userId)
        .where("chatId", chatroom.id)
        .first()
    let uicOk = uic && uic.canWrite && uic.kickedAt == null
    if (!uicOk) return response.status(400).json({
        message: "Bad request! Chatroom not found or you do not have enough rights."
    })

    message.text = message.text.slice(0, 10000)
    let theChatroom = await cache.chatroom.getById(chatroom.id)

    let chunk = cache.chatroomChunk.filter(c => c.chatId == chatroom.id && c.endAt == null).at(0)
    chunk ??= await cache.chatroomChunk.getByQuery(c=> c.where("chatId", chatroom.id).whereNull("endAt").first())

    let now = Date.now()
    theChatroom.messagesChangedAt = now
    await cache.chatroom.pushById(chatroom.id)

    chunk.messages.push({
        id: uuid(),
        createdAt: now,
        userId: uic.userId,
        text: message.text
    })
    if (theChatroom.isFullChunk(chunk)) {
        let newChunk = theChatroom.sealChunk(chunk)
        cache.chatroomChunk.put(newChunk)
        await cache.chatroomChunk.pushById(newChunk.id)
    }
    await cache.chatroomChunk.pushById(chunk.id)

    return response.status(200).json({
        success: true
    }) 
})

route.post("/chatroom.message.edit", async(request, response)=> {
    let { logger, db, cache, session } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })

    let { chatroom, chatroomChunk, message } = request.body
    let requestOk = chatroom?.id && chatroomChunk?.id && message?.id && message?.text && message.text.length > 1
    if (!requestOk) return response.status(400).json({
        message: "Bad request! Expected { chatroom { id Number }, chatroomChunk { id Number }, message { text String[1,10000] } }"
    })
    
    let uic = await db.userInChatroom.query()
        .where("userId", session.userId)
        .where("chatId", chatroom.id)
        .first()
    let uicOk = uic && uic.canWrite && uic.kickedAt == null
    if (!uicOk) return response.status(400).json({
        message: "Bad request! Chatroom not found or you do not have enough rights."
    })

    message.text = message.text.slice(0, 10000)
    let theChatroom = await cache.chatroom.getById(chatroom.id)

    // get latest chunk.
    let chunk = cache.chatroomChunk.filter(c => c.chatId == chatroom.id && c.endAt == null).at(0)
    chunk ??= await cache.chatroomChunk.getByQuery(c=> c.where("chatId", chatroom.id).whereNull("endAt").first())

    let now = Date.now()
    theChatroom.messagesChangedAt = now
    await cache.chatroom.pushById(theChatroom.id)

    chunk.messages.push({
        id: uuid(),
        createdAt: now,
        userId: uic.userId,
        text: message.text,
        edit: {
            chunk: chatroomChunk.id,
            id: message.id
        }
    })
    if (theChatroom.isFullChunk(chunk)) {
        let newChunk = theChatroom.sealChunk(chunk)
        cache.chatroomChunk.put(newChunk)
        await cache.chatroomChunk.pushById(newChunk.id)
    }
    await cache.chatroomChunk.pushById(chunk.id)

    // user should do chatroom index again to see own message.
    return response.status(200).json({
        success: true
    }) 
})

export {
    route as chatroomMessageRouter
}
