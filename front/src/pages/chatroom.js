import { h } from "vue"
import modal from "../comp/modal.js"

import { getTimeZone, timestampToHHMM } from "../utils.js"

const tz = getTimeZone()

const actionTexts = {
    chat: {
        create: ()=> `Chatroom was created.`
    },
    user: {
        found: (user)=> `${user.email} created this chatroom.`,
        invite: (user)=> `${user.email} was invited to this chat.`,
        kick: (user)=> `${user.email} was kicked from this chat.`
    }
}

// maybe upgrade later
const messageView = {
    props: {
        own: Boolean,
        users: Object,
        message: Object
    },
    emits: [
        "click"
    ],
    render() {
        return h("div", { class: ["message"], own: this.own }, [
            h("p", { class: ["mar-b-05"] }, users.find(u=> u.id == message.userId).email || message.userId),
            h("p", { class: [] }, message.text),
            h("p", { class: ["text-right", "text-090", "color-gray"] }, timestampToHHMM(message.createdAt, tz))
        ])
    }
}

const sysMessageView = {
    props: {
        message: Object
    },
    render() {
        let event = this.message.event
        let formatter = actionTexts[event.entityType][event.actionType]
        return h("div", { class: ["system-message"] }, [
            h("span", { }, formatter(event.entity))
        ])
    }
}

const messageListView = {
    props: {
        users: Object,
        messageChunks: Object
    },
    emits: [
        "click"
    ],
    render() {
        let prev = { createdAt: -1 }
        let result = [ ]
        for (let chunk of this.messageChunks) {
            for (let message of chunk.messages) {
                if (message.text) {
                    result.push(h(messageView, { message, users, own: message.userId == this.$storage.me.id }))
                }
                else if (message.event) {
                    if (actionTexts[message.event.entityType] && 
                        actionTexts[message.event.entityType][message.event.actionType]) {
                        result.push(h(sysMessageView, { message }))
                    }
                }
            }
        }
        return h("div", { class: ["message-list"] }, result)
    }
}

export default {
    data() {
        return { 
            loaded: false,
            showingMe: false,
            showingUsers: false,
            loggingOut: false
        }
    },
    methods: {
        async getIndex() {
            let storage = this.$storage
            let result = await this.$http.invoke("chatroom.index", { chatroom: { id: this.$temp.chat } })
            storage.chatroomChunks??= { }
            storage.users??= { }
            storage.chatrooms??= [ ]

            if (result.chatroom) {
                let i = storage.chatrooms.findIndex(item=> item.id == result.chatroom.id)
                if (i >= 0) storage.chatrooms[i] = result.chatroom
                else storage.chatrooms.push(result.chatroom) 

                storage.chatroomChunks[result.chatroom.id]??= [ ]
                if (result.messageChunk) { 
                    storage.chatroomChunks[result.chatroom.id]??= [ ]
                    let chunks = storage.chatroomChunks[result.chatroom.id]
                    let j = chunks.findIndex(item=> item.id == result.messageChunk.id)
                    if (j >= 0) {
                        if (result.messageChunk.patch)
                            chunks[j] = Object.assign({ }, chunks[j], [chunks[j].messages, result.messageChunk.messages].flat(1))
                        else 
                            chunks[j] = result.messageChunk
                    }
                    else {
                        chunks.push(result.messageChunk)
                    }
                }

                if (result.users) {
                    storage.users[result.chatroom.id] = result.users
                }
                this.loaded = true
            }
        },
        beginShowMe() {
            this.showingMe = true
        },
        endShowMe() {
            this.showingMe = false
        },
        beginLogout() {
            this.loggingOut = true
        },
        endLogout(confirm) {
            this.loggingOut = false
            if (confirm) {
                this.$logout()
            }
        },
        beginShowUsers() {
            this.showingUsers = true
        },
        endShowUsers() {
            this.showingUsers = false
        }
    },
    mounted() {
        this.getIndex()
    },
    render() {
        if (!this.loaded) return h("div", { }, [
            h("h2", { }, "Chatroom"),
            h("p", { }, "Loading...")
        ])
        let storage = this.$storage
        let me = storage.me 
        let chatroom = storage.chatrooms.find(c=> c.id == this.$temp.chat)
        let users = storage.users[chatroom.id]
        let chunks = storage.chatroomChunks[chatroom.id]
        return h("div", { class: ["full-height", "pad-05"] }, [
            h("div", { class: ["mar-b-1", "bb"] }, [
                h("h2", { class: ["clickable"], onClick: ()=> this.beginShowUsers() }, chatroom.title),
                me? h("p", { class: ["mar-b-05"] }, [
                    h("span", { }, "Signed in as "),  
                    h("a", { onClick: ()=> this.beginShowMe() }, me.email)
                ]) : null
            ]),
            h(messageListView, { 
                users: users, messageChunks: chunks
            }),
            // a modal window displaying details about user
            h(modal, { display: this.showingMe, onClickOutside: ()=> this.endShowMe() }, ()=> h("div", { }, [
                h("div", { class: ["mar-b-1"] }, [
                    h("h3", { class: ["mar-b-05"] }, me.email),
                    h("p", { class: ["color-gray"] }, me.id)
                ]),
                this.loggingOut?
                h("div", { }, [
                    h("p", { class: ["mar-b-05"] }, "Really log out?"),
                    h("button", { class: ["block", "mar-b-05"], onClick: ()=> this.endLogout(false) }, "Cancel"),
                    h("button", { class: ["block", "color-bad", "mar-b-05"], onClick: ()=> this.endLogout(true) }, h("b", "Log out"))
                ]) :
                h("button", { class: ["block"], onClick: ()=> this.beginLogout() }, "Log out")
            ])),
            // a modal displaying all users
            h(modal, { display: this.showingUsers && !!users, onClickOutside: ()=> this.endShowUsers() }, ()=> h("div", { }, [
                h("div", { class: ["mar-b-1"] }, [
                    h("h3", { class: ["mar-b-05"] }, "Users in " + chatroom.title),
                    h("button", { class: ["block"] }, "+ Add user")
                ]),
                users.map(user=> {
                    return h("p", { }, user.email)
                })
            ]))
        ])
    }
}
