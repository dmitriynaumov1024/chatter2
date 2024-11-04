import { createRouter } from "better-express"

let route = createRouter()

let chatMode = {
    invited: (query)=> query.whereNull("acceptedAt").whereNull("rejectedAt"),
    accepted: (query)=> query.whereNotNull("acceptedAt").whereNull("rejectedAt"),
    rejected: (query)=> query.whereNotNull("rejectedAt")
}

chatMode.default = chatMode.accepted

route.post("/index", async (request, response)=> {
    let { logger, db, session, cache } = request
    if (!session.ok) return response.status(400).json({
        message: "Bad request! Not authorized."
    })
    
    let userId = session.userId
    let reqTime = request.body.time || 0 // ignore it for now
    let filterFunc = chatMode[request.body.mode] || chatMode.default

    let user = await db.user.query().findById(userId)
    let chatrooms = await filterFunc(
        db.userInChatroom.query().withGraphJoined("chat")
        .where("userId", userId).whereNull("kickedAt"))

    // perform shallow cache lookup
    chatrooms.forEach(uic=> {
        uic.chat = cache.chatroom.get(uic.chat, (oldChat, newChat)=> 
            newChat.usersChangedAt > oldChat.usersChangedAt || 
            newChat.messagesChangedAt > oldChat.messagesChangedAt
        )
    })

    return response.status(200).json({
        me: user,
        chatrooms: chatrooms.map(uic=> ({
            id: uic.chat.id,
            ownerId: uic.chat.ownerId == userId? uic.chat.ownerId : null,
            title: uic.chat.title,
            createdAt: uic.chat.createdAt,
            usersChangedAt: uic.chat.usersChangedAt,
            messagesChangedAt: uic.chat.messagesChangedAt,
            canWrite: !!uic.canWrite,
            canManage: !!uic.canManage,
            lastReadAt: uic.lastReadAt,
            invitedAt: uic.invitedAt,
            acceptedAt: uic.acceptedAt,
            rejectedAt: uic.rejectedAt
        }))
    })
})

export { 
    route as chatListRouter
}
