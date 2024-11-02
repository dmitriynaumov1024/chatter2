import { v4 as uuid } from "uuid"

function hours(N) {
    return Math.floor(N * 3600000)
}

function minutes(N) {
    return Math.floor(N * 60000)
}

class Fake {
    constructor() {
        this.data = { }
    }
    user() {
        this.me ??= {
            id: uuid(),
            email: "user1@chatter2.oi",
            createdAt: Date.now() - hours(24) 
        }
        this.users ??= []
        this.users.push(this.me)
        return this
    }
    chat() {
        let user1 = this.me
        let user2 = {
            id: uuid(),
            email: "user2@chatter2.oi",
            createdAt: Date.now() - hours(22)
        }
        this.users.push(user2)
        let chat1 = {
            id: uuid(),
            title: "Example p2p chat",
            createdAt: Date.now() - hours(22),
            usersChangedAt: Date.now() - hours(20),
            messagesChangedAt: Date.now() - minutes(1),
            lastReadAt: Date.now() - minutes(2),
            canWrite: true,
            canManage: true
        }
        this.chatrooms ??= []
        this.chatrooms.push(chat1)
        let chunk1 = {
            id: uuid(),
            chatId: chat1.id,
            startAt: Date.now() - hours(22),
            endAt: null,
            messages: [
                { id: uuid(), senderId: user1.id, sentAt: Date.now() - hours(20), text: "Hello world!" },
                { id: uuid(), senderId: user2.id, sentAt: Date.now() - hours(20) + minutes(2), text: "Hello" },
                { id: uuid(), senderId: user1.id, sentAt: Date.now() - minutes(2), text: "HELLO TO WORLD!!!!" },
            ]
        }
        this.chatroomChunks ??= []
        this.chatroomChunks.push(chunk1)
        return this
    }
}

export function fake() {
    return new Fake()
}
