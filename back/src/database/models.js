import { Model, type } from "better-obj"
import { pk, fk, cascade, restrict, increment, unique, max, belongsToOne, hasMany, json } from "better-obj"

import { v4 as uuid } from "uuid"

// custom primitive types
let custom = {
    Timestamp: type.Integer,
    Timespan: type.Integer,
    ChatroomType: type.String,
    PublicityLevel: type.String,
    PermissionLevel: type.String
}

/*
[1] relational User
+ id: String pk
+ email: String unique
+ createdAt: Timestamp
+ confirmedAt: Timestamp
*/
export class User extends Model {
    static get props() {
        return {
            id: {
                type: type.String,
                rules: [ pk() ]
            },
            email: {
                type: type.String,
                rules: [ unique() ]
            },
            createdAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            confirmedAt: {
                type: custom.Timestamp,
                rules: [ ]
            }
        }
    }
}

/*
[1.1] relational EmailVerification
+ email: String pk
+ rejected: Boolean
+ verifyAt: Timestamp 
*/
export class EmailVerification extends Model {
    static get props() {
        return {
            email: {
                type: type.String,
                rules: [ pk() ]
            },
            verifyAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            rejected: {
                type: type.Boolean,
                rules: [ ]
            }
        }
    }
}

/*
[2] relational UserSession
+ id: String pk
+ userId: String fk(User)
+ token: String
+ tokenOld: String
+ shortCode: String
+ createdAt: Timestamp
+ refreshAt: Timestamp
+ expireAt: Timestamp
*/
export class UserSession extends Model {
    static get props() {
        return {
            id: {
                type: type.String,
                rules: [ pk() ]
            },
            userId: {
                type: type.String,
                rules: [ fk(User) ]
            },
            token: {
                type: type.String,
                rules: [ ]
            },
            tokenOld: {
                type: type.String,
                rules: [ ]
            },
            shortCode: {
                type: type.String,
                rules: [ ]
            },
            createdAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            refreshAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            expireAt: {
                type: custom.Timestamp,
                rules: [ ]
            }
        }
    }
}

/*
[3] relational Chatroom
+ id: String pk
+ ownerId: String fk(User)
+ title: String
+ createdAt: Timestamp
+ usersChangedAt: Timestamp
+ messagesChangedAt: Timestamp
*/
export class Chatroom extends Model {
    static get props() {
        return {
            id: {
                type: type.String,
                rules: [ pk() ]
            },
            ownerId: {
                type: type.String,
                rules: [ fk(User) ]
            },
            title: {
                type: type.String,
                rules: [ max(128) ]
            },
            createdAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            usersChangedAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            messagesChangedAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
        }
    }

    // this is approx calculation.
    static isFullChunk (chunk) {
        const maxChunkSize = 50000
        const messagePaddingSize = 200 
        let sum = 0
        for (let item of chunk.messages) {
            sum += messagePaddingSize
            if (item.event) sum += messagePaddingSize
            if (item.text) sum += item.text.length * 1.9
        }
        return sum > maxChunkSize
    }

    isFullChunk (chunk) {
        return this.constructor.isFullChunk(chunk)
    }

    // unconditionally seals one chunk and returns new chunk.
    static sealChunk (chatroom, oldChunk) {
        let now = Date.now()
        oldChunk.endAt = now
        let newChunk = {
            id: uuid(),
            chatId: chatroom.id,
            startAt: now,
            endAt: null,
            messages: [ ]
        }
        return newChunk
    }

    sealChunk (oldChunk) {
        return this.constructor.sealChunk(this, oldChunk)
    }

    static createChunk (chatroom) {
        let now = Date.now()
        let newChunk = new ChatroomChunk({
            id: uuid(),
            chatId: chatroom.id,
            startAt: now,
            endAt: null,
            messages: [ ]
        })
        return newChunk
    }

    createChunk () {
        return this.constructor.createChunk(this)
    }
}

/*
[4] relational UserInChatroom
+ chatId: String pk fk(Chatroom)
+ userId: String pk fk(User)
+ canWrite: Boolean
+ canManage: Boolean
+ lastReadAt: Timestamp
*/
export class UserInChatroom extends Model {
    static get props() {
        return {
            chatId: {
                type: type.String,
                rules: [ pk(), fk(Chatroom), cascade() ]
            },
            userId: {
                type: type.String,
                rules: [ pk(), fk(User), cascade() ]
            },
            canWrite: {
                type: type.Boolean,
                rules: [ ]
            },
            canManage: {
                type: type.Boolean,
                rules: [ ]
            },
            invitedAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            acceptedAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            rejectedAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            kickedAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            lastReadAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            chat: {
                type: Chatroom,
                rules: [ belongsToOne() ]
            },
            user: {
                type: User,
                rules: [ belongsToOne() ]
            }
        }
    }
}

/*
[5] relational ChatroomChunk
+ id: String pk 
+ chatId: String fk(Chatroom) 
+ startAt: Timestamp
+ endAt: Timestamp
+ messages: Message[] json
*/
export class ChatroomChunk extends Model {
    static get props() {
        return {
            id: {
                type: type.String,
                rules: [ pk() ]
            },
            chatId: {
                type: type.String,
                rules: [ fk(Chatroom), cascade() ]
            },
            startAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            endAt: {
                type: custom.Timestamp,
                rules: [ ]
            },
            messages: {
                type: type.Object,
                rules: [ json() ]
            }
        }
    }
}
