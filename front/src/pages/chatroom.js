import { h } from "vue"
import modal from "../comp/modal.js"

import { getTimeZone, timestampToHHMM, timestampToDayMonthYear, days, isValidEmail } from "../utils.js"

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

const addUserStatusTexts = {
    default: ()=> h("span", { class: ["color-bad"] }, "Unknown status. Normally you should not see this."),
    added: (email)=> `${email} was invited to this chat.`,
    alreadyExists: (email)=> `${email} is already in this chat.`,
    userNotFound: (email)=> h("span", { class: ["color-bad"] }, `${email} not found.`),
    notAuthorized: ()=> h("span", { class: ["color-bad"] }, "You are not authorized to manage users in this chat, or chat does not exist."),
    notValidEmail: (email)=> h("span", { class: ["color-bad"] }, `${email} is not a valid E-mail.`),
    otherError: ()=> h("span", { class: ["color-bad"] }, "Something went wrong when trying to add user to this chat.")
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
            showingControls: false,
            loggingOut: false,
            deletingChat: false,
            deletedChat: false,
            addingUser: false,
            addedUserEmailNew: "",
            addedUserEmail: "",
            addingUserStatus: null
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
        async deleteChat() {
            let storage = this.$storage
            let chatId = this.$temp.chat
            let result = await this.$http.invoke("chatroom.delete", { chatroom: { id: chatId } })
            if (result?.success) {
                this.deletedChat = true
            }
        },
        async addUser(email) {
            let storage = this.$storage
            let chatId = this.$temp.chat
            let result = await this.$http.invoke("chatroom.user.add", { chatroom: { id: chatId }, user: { email } })
            let status = null
            if (result.success) {
                this.addingUser = false
                if (result.added) status = "added"
                else if (result.alreadyExists) status = "alreadyExists"
            }
            else {
                if (result.chatNotFound) status = "notAuthorized"
                else if (result.userNotFound) status = "userNotFound"
                else status = "otherError"
            }
            this.addingUserStatus = status
        },
        goToChatlist() {
            this.$goToPage("chatlist") 
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
        beginShowControls() {
            this.showingControls = true
        },
        endShowControls() {
            this.showingControls = false
        },
        beginDeleteChat() {
            this.deletingChat = true
        },
        endDeleteChat(confirm) {
            if (confirm) { 
                if (this.deleteConfirmText == "DELETE") {
                    this.deletingChat = false
                    this.deleteChat()
                }
            }
            else {
                this.deletingChat = false
            }
        },
        beginAddUser() {
            this.addedUserEmail = ""
            this.addingUser = true
            this.addingUserStatus = null
        },
        endAddUser(confirm) {
            if (!confirm) {
                this.addingUser = false
                return
            }
            this.addingUserStatus = null
            let email = this.addedUserEmailNew
            this.addedUserEmail = email
            if (isValidEmail(email)) {
                this.addUser(email)
            }
            else {
                this.addingUserStatus = "notValidEmail"
            }
            // to do more
        }
    },
    mounted() {
        this.getIndex()
    },
    render() {
        if (!this.loaded) return h("div", { class: ["pad-05"] }, [
            h("h2", { class: ["mar-b-05"] }, "Chatroom"),
            h("p", { }, "Loading...")
        ])
        let storage = this.$storage
        let me = storage.me 
        let chatroom = storage.chatrooms.find(c=> c.id == this.$temp.chat)
        let users = storage.users[chatroom.id]
        let me2 = users.find(u=> u.id == me.id)
        let chunks = storage.chatroomChunks[chatroom.id]
        if (this.deletedChat) return h("div", { class: ["pad-05"] }, [
            h("h2", { class: ["mar-b-05"] }, "Chatroom deleted"),
            h("p", { class: ["mar-b-05"] }, "You deleted this chatroom. Click the button below to go to chat list."),
            h("button", { class: ["block", "pad-05"], onClick: ()=> this.goToChatlist() }, "Go to Chat list")
        ])
        return h("div", { class: ["full-height", "pad-05"] }, [
            h("div", { class: ["mar-b-1", "bb"] }, [
                h("h2", { class: ["clickable"], onClick: ()=> this.beginShowControls() }, chatroom.title),
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
                    h("button", { class: ["block", "color-bad"], onClick: ()=> this.endLogout(true) }, h("b", "Log out"))
                ]) :
                h("button", { class: ["block"], onClick: ()=> this.beginLogout() }, "Log out")
            ])),
            // a modal displaying group controls
            h(modal, { display: this.showingControls && !!users, onClickOutside: ()=> this.endShowControls() }, ()=> h("div", { }, [
                h("div", { class: ["mar-b-1"] }, [
                    h("h3", { class: ["mar-b-05"] }, chatroom.title),
                    h("div", { class: ["mar-b-05"] }, [
                        h("p", { }, `Created on ${timestampToDayMonthYear(chatroom.createdAt, tz)}`),
                        me2.acceptedAt? h("p", { }, `You joined on ${timestampToDayMonthYear(me2.acceptedAt, tz)}`): null,
                    ]),
                    me2.canManage? [
                        this.deletingChat?
                        h("div", { }, [
                            h("p", { class: ["mar-b-05"] }, [
                                `You are trying to delete ${chatroom.title} with ${users.length} users, `,
                                `that existed for ${days(Date.now()-chatroom.createdAt)+1} day(s) since ${timestampToDayMonthYear(chatroom.createdAt, tz)}. `, 
                                `To delete this chatroom, type DELETE in the text field below.`
                            ]),
                            h("input", { class: ["block", "mar-b-05"], onInput: (e)=> this.deleteConfirmText = e.target.value }),
                            h("div", { class: ["flex-stripe", "flex-pad-05"] }, [
                                h("button", { class: ["flex-grow"], onClick: ()=> this.endDeleteChat(false) }, "Cancel"),
                                h("button", { class: ["flex-grow", "color-bad"], onClick: ()=> this.endDeleteChat(true) }, h("b", "Delete"))
                            ])
                        ]) :
                        h("p", { class: [] }, [
                            h("span", "To delete chatroom "),
                            h("a", { onClick: ()=> this.beginDeleteChat() }, "click here")
                        ])
                    ] : null
                ]),
                h("div", { class: ["mar-b-1"] }, [
                    h("h4", { class: ["mar-b-05"] }, `Users (${users.length})`),
                    // to do add user 
                    me2.canManage? [
                    this.addingUser?
                        h("div", { class: ["mar-b-05"] }, [
                            h("p", { }, "Add user by E-mail"),
                            this.addingUserStatus?
                            h("p", { class: ["mar-b-05"] }, (addUserStatusTexts[this.addingUserStatus] || addUserStatusTexts.default)(this.addedUserEmail)) : null,
                            h("input", { class: ["block", "mar-b-05"], onInput: (e)=> this.addedUserEmailNew = e.target.value, placeholder: "mail@example.com" }),
                            h("div", { class: ["flex-stripe", "flex-pad-05"] }, [
                                h("button", { class: ["flex-grow", "color-bad"], onClick: ()=> this.endAddUser(false) }, "Cancel"),
                                h("button", { class: ["flex-grow"], onClick: ()=> this.endAddUser(true) }, "Add user")
                            ])
                        ]) :
                        h("div", { class: ["mar-b-05"] }, [
                            this.addingUserStatus?
                            h("p", { class: ["mar-b-05"] }, (addUserStatusTexts[this.addingUserStatus] || addUserStatusTexts.default)(this.addedUserEmail)) : null,
                            h("button", { class: ["block", "mar-b-05"], onClick: ()=> this.beginAddUser() }, "+ Add user"),
                        ]),
                    ] : null,
                    h("div", { class: ["max-height-15"] }, [
                        users.map(user=> h("p", { }, user.email))
                    ])
                ])
            ]))
        ])
    }
}
