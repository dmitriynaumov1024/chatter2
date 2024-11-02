import { createRouter } from "better-express"
import { v4 as uuid } from "uuid"

let chatMode = {
    invited: (query)=> query.whereNull("acceptedAt").whereNull("rejectedAt"),
    accepted: (query)=> query.whereNotNull("acceptedAt").whereNull("rejectedAt"),
    rejected: (query)=> query.whereNotNull("rejectedAt")
}

chatMode.default = chatMode.accepted

let chatModeModifier = {
    invited: (uic)=> { 
        uic.invitedAt ??= Date.now()
        uic.acceptedAt = null
        uic.rejectedAt = null
    },
    accepted: (uic)=> {
        uic.invitedAt ??= Date.now()
        uic.acceptedAt = Date.now()
        uic.rejectedAt = null
    },
    rejected: (uic)=> {
        uic.invitedAt ??= Date.now()
        uic.acceptedAt ??= Date.now()
        uic.rejectedAt = Date.now()
    }
}

// add event to corresponding chat 
// technically we can just launch it and forget.
export async function emitUserChangeEvent ({ cache, chatId, user, mode }) {
    let chunk = null, 
        chat = cache.chatroom.get({ id: chatId, notCached: true })
    if (chat.notCached) {
        // it will pull through chat
        chat = await cache.chatroom.getById(chatId)
        chunk = await cache.chatroomChunk.getByQuery(c => c.where("chatId", chatId).whereNull("endAt"))
    }
    else {
        chunk = cache.chatroomChunk.filter(c => c.chatId == chatId && c.endAt == null)
    }
    let now = Date.now()
    chat.usersChangedAt = now
    chat.messagesChangedAt = now
    chunk.messages.push({
        id: uuid(),
        createdAt: now,
        event: {
            entityType: "user",
            actionType: mode,
            entity: {
                id: user.id,
                email: user.email
            }
        }
    })
    if (chat.isFullChunk(chunk)) {
        let newChunk = chat.sealChunk(chunk)
        cache.chatroomChunk.put(newChunk, true)
        await cache.chatroomChunk.pushById(newChunk.id)
    }
    cache.chatroomChunk.put(chunk, true)
    await cache.chatroomChunk.pushById(chunk.id)
    await cache.chatroom.pushById(chatId)
}

let route = createRouter()

route.post("/chatroom.user.add", async(request, response)=> {
    let { logger, db, session } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })
    
    let reqChatroom = request.body.chatroom
    let reqUser = request.body.user

    let requestOk = reqChatroom?.id && reqUser?.email

    if (!requestOk) return response.status(400).json({
        message: "Bad request! Expected { chatroom { id String }, user { email String } }"
    }) 

    let theUIC = await db.userInChatroom.query().withGraphJoined("chat")
        .where("userId", session.userId).where("chatId", reqChatroom.id)
        .where(uic=> uic.where("canManage", true).orWhere("chat.ownerId", session.userId))
        .first()
    if (!theUIC) return response.status(400).json({
        bad: "chatroom",
        message: "Chatroom does not exist, or you can not manage it."
    })
    let theChatroom = theUIC.chat
    
    let addedUser = await db.user.query().where("email", reqUser.email).first()
    if (!addedUser) return response.status(400).json({
        bad: "user",
        message: "User does not exist."
    })

    let now = Date.now()

    let addedUic = await db.userInChatroom.query()
        .where("userId", addedUser.id).where("chatId", theChatroom.id).first()

    emitUserChangeEvent({
        cache,
        chatId: theChatroom.id,
        user: addedUser,
        mode: "invite"
    })

    if (addedUic) {
        await db.userInChatroom.query()
        .where("userId", addedUser.id).where("chatId", theChatroom.id)
        .patch({
            canWrite: !!reqUser.canWrite,
            canManage: !!reqUser.canManage,
            kickedAt: null
        })
        return response.status(200).json({
            message: "Updated existing user in chatroom."
        })
    }
    else {
        await db.userInChatroom.query()
        .insert({
            chatId: theChatroom.id,
            userId: addedUser.id,
            canWrite: !!reqUser.canWrite,
            canManage: !!reqUser.canManage,
            invitedAt: now,
            acceptedAt: null,
            rejectedAt: null,
            kickedAt: null,
            lastReadAt: null
        })
        return response.status(200).json({
            message: "This user is already in chatroom."
        })
    }
})

route.post("/chatroom.user.setmode", async(request, response)=> {
    let { logger, db, session } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })
    
    let reqChatroom = request.body.chatroom
    let requestOk = reqChatroom?.id && reqChatroom?.mode
    if (!requestOk) return response.status(400).json({
        message: "Bad request! Expected { chatroom { id String, mode String } }"
    }) 
    let mode = chatModeModifier[reqChatroom.mode]
    if (!mode) return response.status(400).json({
        message: "Bad request! Expected chatroom.mode = (invited|accepted|rejected)"
    })

    // to do allow users to set own mode (invited|accepted|rejected).
    let theUIC = await db.userInChatroom.query()
        .where("userId", session.userId).where("chatId", reqChatroom.id)
        .whereNull("kickedAt")
        .first()
    if (!theUIC) return response.status(400).json({
        bad: "chatroom",
        message: "Chatroom does not exist, or you were kicked from it."
    })

    mode(theUIC)

    let result = await db.userInChatroom.query()
        .where("userId", theUIC.userId)
        .where("chatId", theUIC.chatId)
        .patch(theUIC)

    return response.status(200).json({
        success: true,
        message: "Successfully updated user mode in chatroom."
    })
})

route.post("/chatroom.user.remove", async(request, response)=> {
    let { logger, db, session } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })
    
    let reqChatroom = request.body.chatroom
    let reqUser = request.body.user

    let requestOk = reqChatroom?.id && reqUser?.id

    if (!requestOk) return response.status(400).json({
        message: "Bad request! Expected { chatroom { id String }, user { id String } }"
    }) 

    let theUIC = await db.userInChatroom.query().withGraphJoined("chat")
        .where("userId", session.userId).where("chatId", reqChatroom.id)
        .where(uic=> uic.where("canManage", true).orWhere("chat.ownerId", session.userId))
        .first()
    if (!theUIC) return response.status(400).json({
        bad: "chatroom",
        message: "Chatroom does not exist, or you can not manage it."
    })

    let addedUser = await db.user.query().where("id", reqUser.id).first()
    if (!addedUser) return response.status(400).json({
        bad: "user",
        message: "User does not exist."
    })

    let addedUic = await db.userInChatroom.query()
        .where("userId", addedUser.id).where("chatId", theChatroom.id).first()

    if (addedUic) {
        await db.userInChatroom.query()
        .where("userId", addedUser.id).where("chatId", theChatroom.id)
        .patch({
            canWrite: false,
            canManage: false,
            kickedAt: Date.now()
        })
        emitUserChangeEvent({
            cache,
            chatId: addedUic.chatId,
            user: addedUser,
            mode: "kick"
        })
        return response.status(200).json({
            success: true,
            user: { id: addedUser.id },
            chatroom: { id: theChatroom.id },
            message: "Kicked existing user from chatroom."
        })
    }
    else {
        return response.status(400).json({
            message: "User exists, but not related to this chatroom at all."
        })
    }
})

export {
    route as chatroomUserRouter
}
