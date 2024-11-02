import { createRouter } from "better-express"
import { v4 as uuid } from "uuid"
// import { emitUserChangeEvent } from "./chatroom.user.js"

function lengthInRange(string, min, max) {
    if (string.length < min) return false
    if (string.length > max) return false
    return true
}

let route = createRouter()

route.post("/chatroom.index", async(request, response)=> {
    let { logger, db, cache, session } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })

    let reqChatroom = request.body.chatroom
    let requestOk = reqChatroom?.id
    if (!requestOk) return response.status(400).json({
        message: "Bad request! Expected { chatroom { id Number } }"
    })
    
    let uic = await db.userInChatroom.query().withGraphJoined("chat")
        .where("userId", session.userId)
        .where("chatId", reqChatroom.id)
        .first()
    if (!uic) return response.status(400).json({
        message: "Bad request! Chatroom not found."
    })

    let { before, after } = request.body

    let chunk = null
    let users = null
    
    let chatroom = cache.chatroom.get({ id: uic.chatId, notCached: true }, (oldChat, newChat)=> 
            newChat.usersChangedAt > oldChat.usersChangedAt || 
            newChat.messagesChangedAt > oldChat.messagesChangedAt)

    if (chatroom.notCached) {
        chatroom = await cache.chatroom.getById(uic.chatId)
    }

    // fast-forward
    if (after > 0) {
        // patch last read timestamp
        if (uic.lastReadAt < after) {
            uic.lastReadAt = after
            await db.userInChatroom.query()
                .where("userId", session.userId)
                .where("chatId", reqChatroom.id)
                .patch({ lastReadAt: after })
        }
        // all users if they were updated
        if (chatroom.usersChangedAt > after) {
            users = await db.userInChatroom.query().withGraphJoined("user").where("chatId", chatroom.id)
        }
        if (chatroom.messagesChangedAt > after) {
            // first look for it in cache
            chunk = cache.chatroomChunk.filter(c => c.chatId == chatroom.id && c.startAt <= after && (c.endAt > after || c.endAt == null)).at(0)
            chunk ??= await cache.chatroomChunk.getByQuery(
                c => c.where("chatId", chatroom.id).where("startAt", "<=", after)
                .where(ch => ch.where("endAt", ">", after).orWhereNull("endAt")).first()
            )
            // patch insted of sending everything
            chunk = Object.assign({ }, chunk, { patch: true, messages: chunk.messages.filter(m=> m.createdAt >= after) })
        }
    }
    // history
    else if (before > 0) {
        chunk = cache.chatroomChunk.filter(c => c.chatId == chatroom.id && c.startAt < before && c.endAt >= before).at(0)
        chunk ??= await cache.chatroomChunk.getByQuery(
            c => c.where("chatId", chatroom.id).where("endAt", ">=", before).where("startAt", "<", before).first() 
        )
    }
    // this means latest chunk and all users
    else {
        users = await db.userInChatroom.query().withGraphJoined("user").where("chatId", chatroom.id)
        chunk = cache.chatroomChunk.filter(c => c.chatId == chatroom.id && c.endAt == null).at(0)
        chunk ??= await cache.chatroomChunk.getByQuery(c => c.where("chatId", chatroom.id).whereNull("endAt").first())
    }

    return response.status(200).json({
        users: users.map(uic=> ({
            id: uic.user.id,
            email: uic.user.email,
            canWrite: uic.canWrite,
            canManage: uic.canManage,
            invitedAt: uic.invitedAt,
            acceptedAt: uic.acceptedAt
        })),
        chatroom: chatroom,
        messageChunk: chunk
    })
})

route.post("/chatroom.create", async(request, response)=> {
    let { logger, db, cache, session } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })
    
    let reqChatroom = request.body.chatroom
    let requestOk = reqChatroom?.title && lengthInRange(reqChatroom.title, 1, 70)

    if (!requestOk) return response.status(400).json({
        message: "Bad request! Expected chatroom { title: String[1,70] }"
    })
    
    let now = Date.now()

    let chatroom = {
        id: uuid(),
        ownerId: session.userId,
        title: reqChatroom.title,
        createdAt: now,
        messagesChangedAt: now,
        usersChangedAt: now
    }
    chatroom = await db.chatroom.query().insert(chatroom)

    let uic = {
        userId: session.userId,
        chatId: chatroom.id,
        canWrite: true,
        canManage: true,
        lastReadAt: null,
        invitedAt: now,
        acceptedAt: now,
        rejectedAt: null,
        kickedAt: null
    }
    uic = await db.userInChatroom.query().insert(uic)

    let user = await db.user.query().findById(session.userId)

    let chunk = chatroom.createChunk()
    chunk.messages.push({
        id: uuid(),
        createdAt: now,
        event: {
            entityType: "chat",
            actionType: "create"
        }
    })
    chunk.messages.push({
        id: uuid(),
        createdAt: now,
        event: {
            entityType: "user",
            actionType: "found",
            entity: user
        }
    })
    await db.chatroomChunk.query().insert(chunk)

    cache.chatroom.put(chatroom)
    cache.chatroomChunk.put(chunk)

    return response.status(200).json({
        chatroom: { id: chatroom.id },
        success: true,
        message: "Successfully created a chatroom"
    })
})

route.post("/chatroom.delete", async(request, response)=> {
    let { logger, db, cache, session } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })

    let reqChatroom = request.body.chatroom

    let requestOk = reqChatroom?.id
    if (!requestOk) return response.status(400).json({
        message: "Bad request! Expected chatroom { id Number }"
    })
    
    // only owners can delete chatrooms
    let result = await db.chatroom.query()
        .where("id", reqChatroom.id)
        .where("ownerId", session.userId)
        .delete()

    if (result) {
        cache.chatroom.forgetById(reqChatroom.id)
        return response.status(200).json({
            success: true,
            chatroom: { id: reqChatroom.id },
            message: "Successfully deleted a chatroom."
        })
    }
    else return response.status(400).json({
        message: "Chatroom not found or you have no rights to delete it."
    })
})

export {
    route as chatroomRouter
}
