import { h } from "vue"
import modal from "../comp/modal.js"
import checkbox from "../comp/checkbox.js"
import stepperbox from "../comp/stepperbox.js"

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
        userName: Object,
        message: Object
    },
    emits: [
        "click"
    ],
    render() {
        return h("div", { class: ["message"], own: this.own }, [
            h("p", { class: [] }, h("b", { }, this.userName)),
            h("p", { class: [] }, this.message.text),
            h("p", { class: ["text-right", "text-090", "color-gray"] }, timestampToHHMM(this.message.createdAt, tz))
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

const dayMessageView = {
    props: {
        message: Object
    },
    render() {
        return h("div", { class: ["day-message"] }, [
            h("span", { }, timestampToDayMonthYear(this.message.day, tz))
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
        return h("div", { class: ["message-list-wrapper", "flex-grow", "scroll"] }, [
            h("div", { class: ["pad-05"] }, this.messageChunks.map(chunk=> {
                return chunk.messages.map(message=> {
                    if (message.day) {
                        return h(dayMessageView, { message })
                    }
                    else if (message.event) {
                        return h(sysMessageView, { message })
                    }
                    else {
                        return h(messageView, { message, userName: this.users.find(u=> u.id==message.userId)?.email || message.userId, own: message.userId == this.$storage.me.id })
                    }
                })
            }))
        ])
    }
}

const messageSenderIcon = {
    render() {
        return h("svg", { viewBox: "0 0 10 10" }, [
            h("g", { "fill": "#f8f9fc", "stroke": "none" }, [
                h("path", { d: "M 1.5 8.5 L 2 6 L 4 8 Z" }),
                h("path", { d: "M 2.5 5.5 L 4.5 7.5 L 9 3 L 7 1 Z" })
            ])
        ])
    }
}

// chunkOld, chunkNew technically can be both old chunks and new chunks.
// to do later: EDIT messages
function toNormalizedChunk ({ chunkOld, chunkNew, chunk }) {
    chunkNew ??= chunk
    let prev = chunkOld?.messages.at(-1) || ({ createdAt: -1 })
    let result = (chunkNew.patch && chunkOld)? chunkOld : ({ id: chunkNew.id, chatId: chunkNew.chatId, startAt: chunkNew.startAt, endAt: chunkNew.endAt, messages: [ ] })
    let chunkNewStart = chunkNew.messages.findIndex(msg=> msg.id == prev.id) + 1
    for (let i=chunkNewStart; i<chunkNew.messages.length; i++) {
        let message = chunkNew.messages[i]
        if (days(prev.createdAt) < days(message)) {
            result.messages.push({ day: message.createdAt })
        }
        result.messages.push(message)
    }
    return result
}

// merge message arrays.
function mergeMessages (oldArray, newArray) {
    let prev = oldArray.at(-1)
    let newStart = newArray.findIndex(msg=> msg.id == prev.id) + 1
    let result = [ oldArray.map(msg=> msg), newArray.slice(newStart) ].flat(1)
    return result
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
            addingUserStatus: null,
            addedUser: {
                emailNew: "",
                email: "",
                canWrite: false,
                canManage: false
            },
            
            selectedUser: null,
            editedUser: null,
            removedUser: null,

            typingMessage: false,
            messageText: "",

            normalizedChunks: [ ],

            getIndexTimeout: null,
            gettingIndex: false,
            nextGetIndexTime: Date.now()
        }
    },
    methods: {
        async getIndex({ before, after, repeat } = { }) {
            this.gettingIndex = true
            let storage = this.$storage
            let settings = storage.settings
            let repeatInterval = settings.chatroomPolling.intervalS * 1000
            let result = await this.$http.invoke("chatroom.index", { chatroom: { id: this.$temp.chat }, before, after })
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
                        if (result.messageChunk.patch) {
                            let chunkOld = this.normalizedChunks.pop()
                            this.normalizedChunks.push(toNormalizedChunk({ chunkOld, chunkNew: result.messageChunk }))
                            chunks[j] = Object.assign({ }, result.messageChunk, { messages: mergeMessages(chunks[j].messages, result.messageChunk.messages) })
                        }
                        else {
                            this.normalizedChunks[j] = toNormalizedChunk({ chunkOld: this.normalizedChunks[j-1], chunkNew: result.messageChunk })
                            chunks[j] = result.messageChunk
                        }
                    }
                    else {
                        this.normalizedChunks.push(toNormalizedChunk({ chunkOld: this.normalizedChunks.at(-1), chunkNew: result.messageChunk }))
                        chunks.push(result.messageChunk)
                        this.normalizedChunks.sort((ch1, ch2)=> ch1.startAt - ch2.startAt)
                        chunks.sort((ch1, ch2)=> ch1.startAt - ch2.startAt)
                    }
                }

                if (result.users) {
                    storage.users[result.chatroom.id] = result.users
                }
                this.loaded = true

                // if succeeded, set timeout
                if (repeat && settings.chatroomPolling.repeat) {
                    this.nextGetIndexTime = Date.now() + repeatInterval
                    this.getIndexTimeout = setTimeout(()=> this.getIndex({ repeat: true, after: result.chatroom.messagesChangedAt }), repeatInterval)
                }
            }
            else if (repeat && settings.chatroomPolling.repeat) {
                // if failed, set timeout to do this one again
                this.nextGetIndexTime = Date.now() + repeatInterval
                this.getIndexTimeout = setTimeout(()=> this.getIndex({ repeat: true, before, after }), repeatInterval)
            }
            this.gettingIndex = false
        },
        async deleteChat() {
            let storage = this.$storage
            let chatId = this.$temp.chat
            let result = await this.$http.invoke("chatroom.delete", { chatroom: { id: chatId } })
            if (result?.success) {
                this.deletedChat = true
            }
        },
        async addUser({ email, canWrite, canManage } = { }) {
            let storage = this.$storage
            let chatroom = storage.chatrooms.find(c=> c.id == this.$temp.chat)
            let chatId = this.$temp.chat
            let result = await this.$http.invoke("chatroom.user.add", { chatroom: { id: chatId }, user: { email, canWrite, canManage } })
            let status = null
            if (result.success) {
                this.addingUser = false
                if (result.added) status = "added"
                else if (result.alreadyExists) status = "alreadyExists"
                this.getIndex({ after: Math.max(chatroom.messagesChangedAt, chatroom.usersChangedAt) })
            }
            else {
                if (result.chatNotFound) status = "notAuthorized"
                else if (result.userNotFound) status = "userNotFound"
                else status = "otherError"
            }
            this.addingUserStatus = status
        },
        async removeUser(userId) {
            let storage = this.$storage
            let chatId = this.$temp.chat
            let chatroom = storage.chatrooms.find(c=> c.id == chatId)
            let result = await this.$http.invoke("chatroom.user.remove", { chatroom: { id: chatId }, user: { id: userId } })
            if (result.success) {
                this.getIndex({ after: Math.max(chatroom.messagesChangedAt, chatroom.usersChangedAt) })
            }
        },
        async sendMessage(messageText) {
            let storage = this.$storage
            let chatId = this.$temp.chat
            let chatroom = storage.chatrooms.find(c=> c.id == this.$temp.chat)
            let result = await this.$http.invoke("chatroom.message.send", { chatroom: { id: chatId }, message: { text: messageText } })
            if (result.success) {
                // we only do this if there is more than 2s until next request
                let refreshTimeMargin = 2000
                if (this.nextGetIndexTime - Date.now() > refreshTimeMargin) {
                    this.getIndex({ after: Math.max(chatroom.messagesChangedAt, chatroom.usersChangedAt) })
                }
                this.messageText = ""
            }
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
            this.addedUser.email = ""
            this.addedUser.canWrite = false
            this.addedUser.canManage = false
            this.addingUser = true
            this.addingUserStatus = null
            this.selectedUser = null
        },
        endAddUser(confirm) {
            if (!confirm) {
                this.addingUser = false
                return
            }
            this.addingUserStatus = null
            let email = this.addedUser.emailNew
            this.addedUser.email = email
            if (isValidEmail(email)) {
                this.addUser(this.addedUser)
            }
            else {
                this.addingUserStatus = "notValidEmail"
            }
            // to do more
        },
        beginRemoveUser(user) {
            this.removedUser = user
        },
        endRemoveUser(confirm) {
            if (confirm) {
                this.removeUser(this.removedUser.id)
            } 
            this.removedUser = null
        },
        beginSendMessage() {
            this.typingMessage = true
            console.log(this.$refs.messageInput)
            setTimeout(()=> this.$refs.messageInput.focus(), 60)
        },
        endSendMessage(confirm, erase) {
            if (erase) {
                this.messageText = ""
                return
            }
            if (confirm) {
                this.sendMessage(this.messageText)
            }
            this.typingMessage = false
        },
        onPollingRepeatChanged(repeat) {
            if (repeat) {
                if (!this.getIndexTimeout) {
                    this.getIndexTimeout = setTimeout(
                        ()=> { this.getIndex() }, 
                        this.$storage.settings.chatroomPolling.intervalS * 1000
                    )
                }
            }
            else {
                clearTimeout(this.getIndexTimeout)
                this.getIndexTimeout = null
            }
        }
    },
    mounted() {
        let storage = this.$storage
        storage.normalizedChunks ??= { }
        storage.normalizedChunks[this.$temp.chat] = []
        this.normalizedChunks = storage.normalizedChunks[this.$temp.chat]
        this.getIndex({ repeat: true })
    },
    unmounted() {
        clearTimeout(this.getIndexTimeout)
    },
    render() {
        const env = import.meta.env
        if (!this.loaded) return h("div", { class: ["ww", "pad-05"] }, [
            h("h2", { class: ["mar-b-05"] }, "Chatroom"),
            h("p", { }, "Loading...")
        ])
        let storage = this.$storage
        let settings = storage.settings
        let me = storage.me 
        let chatroom = storage.chatrooms.find(c=> c.id == this.$temp.chat)
        let users = storage.users[chatroom.id]
        let me2 = users.find(u=> u.id == me.id)
        let chunks = storage.chatroomChunks[chatroom.id]
        if (this.deletedChat) return h("div", { class: ["ww"] }, [
            h("div", { class: ["wc", "pad-05"] }, [
                h("h2", { class: ["mar-b-05"] }, "Chatroom deleted"),
                h("p", { class: ["mar-b-05"] }, "You deleted this chatroom. Click the button below to go to chat list."),
                h("button", { class: ["block", "pad-05"], onClick: ()=> this.goToChatlist() }, "Go to Chat list")
            ])
        ])
        return h("div", { class: ["ww", "h100", "flex-v"] }, [
            h("div", { class: ["bb"] }, [
                h("div", { class: ["wc", "pad-05"] }, [
                    h("h2", { class: ["clickable"], onClick: ()=> this.beginShowControls() }, [
                        chatroom.title, " ", h("span", { class: ["color-good"] }, this.gettingIndex? "\u25cf" : null)
                    ]),
                    me? h("p", { }, [
                        h("span", { }, "Signed in as "),  
                        h("a", { onClick: ()=> this.beginShowMe() }, me.email)
                    ]) : null
                ]),
            ]),
            h(messageListView, { 
                users: users, messageChunks: this.normalizedChunks
            }),
            h("div", { style: { "height": "2.5rem", "flex-shrink": 0, "font-size": "80%" }, class: ["pad-05", "color-gray"] }, `Chatter v${env.VITE_APP_VERSION}-${env.VITE_APP_MODE}, refresh ${settings.chatroomPolling.repeat? ("every "+settings.chatroomPolling.intervalS+"s"): "MANUAL"}`),
            // a modal window displaying settings and details about user
            h(modal, { titleText: "Profile & Settings", display: this.showingMe, onClickOutside: ()=> this.endShowMe() }, ()=> h("div", { }, [
                h("div", { class: ["mar-b-05", "bb"] }, [
                    h("h3", { class: ["mar-b-05"] }, me.email),
                    h("p", { class: ["color-gray", "mar-b-05"] }, me.id),
                    this.loggingOut?
                    h("div", { class: ["mar-b-05"] }, [
                        h("p", { class: ["mar-b-05"] }, "Really log out?"),
                        h("button", { class: ["block", "mar-b-05"], onClick: ()=> this.endLogout(false) }, "Cancel"),
                        h("button", { class: ["block", "color-bad"], onClick: ()=> this.endLogout(true) }, h("b", "Log out"))
                    ]) :
                    h("button", { class: ["block", "mar-b-05"], onClick: ()=> this.beginLogout() }, "Log out")
                ]),
                h("div", { class: ["mar-b-05"] }, [
                    h("h3", { class: ["mar-b-05"] }, "Settings"),
                    h("div", { class: ["mar-b-05"] }, [
                        h("p", { }, "Chatroom polling interval, s"),
                        h(stepperbox, { class: ["flex-stripe"], 
                            min: settings.chatroomPolling.intervalMin, 
                            max: settings.chatroomPolling.intervalMax, 
                            step: settings.chatroomPolling.intervalStep,
                            value: settings.chatroomPolling.intervalS, 
                            onChange: (value)=> settings.chatroomPolling.intervalS = value
                        }),
                    ]),
                    h("div", { class: ["mar-b-05"] }, [
                        h("p", { }, "Chatroom polling repeat"),
                        h(checkbox, {
                            value: settings.chatroomPolling.repeat,
                            onChange: [
                                (value)=> this.onPollingRepeatChanged(value),
                                (value)=> settings.chatroomPolling.repeat = value,
                            ]
                        }, ()=> settings.chatroomPolling.repeat? "Enabled" : "Disabled")
                    ])
                ])
            ])),
            // a modal displaying chatroom controls
            h(modal, { titleText: "Chatroom details", display: this.showingControls && !!users, onClickOutside: ()=> this.endShowControls() }, ()=> h("div", { }, [
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
                        h("div", { class: ["mar-b-1", "pad-b-05", "bb"] }, [
                            h("p", { }, "Add user by E-mail"),
                            this.addingUserStatus?
                            h("p", { class: ["mar-b-05"] }, (addUserStatusTexts[this.addingUserStatus] || addUserStatusTexts.default)(this.addedUser.email)) : null,
                            h("input", { class: ["block", "mar-b-05"], onInput: (e)=> { this.addedUser.emailNew = e.target.value }, placeholder: "mail@example.com" }),
                            h("div", { class: ["mar-b-05"] }, [
                                h(checkbox, { value: this.addedUser.canWrite, onChange: (v)=> { this.addedUser.canWrite = v } }, ()=> "Can write"), " : : ",
                                h(checkbox, { value: this.addedUser.canManage, onChange: (v)=> { this.addedUser.canManage = v } }, ()=> "Can manage")
                            ]),
                            h("div", { class: ["flex-stripe", "flex-pad-05"] }, [
                                h("button", { class: ["flex-grow", "color-bad"], onClick: ()=> this.endAddUser(false) }, "Cancel"),
                                h("button", { class: ["flex-grow"], onClick: ()=> this.endAddUser(true) }, "Add user")
                            ])
                        ]) :
                        h("div", { class: ["mar-b-05"] }, [
                            this.addingUserStatus?
                            h("p", { class: ["mar-b-05"] }, (addUserStatusTexts[this.addingUserStatus] || addUserStatusTexts.default)(this.addedUser.email)) : null,
                            h("button", { class: ["block", "mar-b-05"], onClick: ()=> this.beginAddUser() }, "+ Add user"),
                        ]),
                    ] : null,
                    me2.canManage? 
                    h("div", { class: ["max-height-15"] }, [
                        users.map(user=> h("div", { class: ["user-card", "pad-b-05"], expanded: this.selectedUser==user.id }, [
                            h("p", { class: ["clickable"], onClick: ()=> { this.selectedUser = user.id } }, user.email),
                            h("div", { class: [], display: this.selectedUser==user.id }, [
                                h(checkbox, { value: user.canWrite }, ()=> "Can write"), " : : ",
                                h(checkbox, { value: user.canManage }, ()=> "Can manage")
                            ]),
                            (this.removedUser && (this.removedUser==user))?
                            [
                                h("p", { }, "Remove this user from the chatroom? Chatroom managers can add them back later."),
                                h("div", { class: ["flex-stripe", "flex-pad-05"] }, [
                                    h("button", { class: ["flex-grow"], onClick: ()=> this.endRemoveUser(false) }, "Cancel"),
                                    h("button", { class: ["flex-grow", "color-bad"], onClick: ()=> this.endRemoveUser(true) }, h("b", "Remove"))
                                ])
                            ]:
                            h("p", { class: [], display: (this.selectedUser==user.id && chatroom.ownerId!=user.id) }, [ "To remove this user ",
                                h("a", { class: ["color-bad"], onClick: ()=> this.beginRemoveUser(user) }, "click here")
                            ])
                        ]))
                    ]) :
                    h("div", { class: ["max-height-15"] }, [
                        users.map(user=> h("p", { class: ["mar-b-05"] }, user.email))
                    ])
                ])
            ])),
            // a modal message sender
            h(modal, { titleText: "Send message", display: this.typingMessage, onClickOutside: ()=> this.endSendMessage(false) }, ()=> h("div", { }, [
                h("textarea", { class: ["block", "height-10", "mar-b-05", "no-border"], ref: "messageInput", value: this.messageText, onInput: (e)=> { this.messageText = e.target.value } }),
                h("div", { class: ["flex-stripe", "flex-pad-05"] }, [
                    this.messageText?
                    h("span", { class: ["flex-grow", "clickable", "text-center", "color-bad", "pad-025"], onClick: ()=> this.endSendMessage(false, true) }, "\u2a2f Erase") :
                    h("span", { class: ["flex-grow", "clickable", "text-center", "color-bad", "pad-025"], onClick: ()=> this.endSendMessage(false) }, "Cancel"),
                    h("button", { class: ["width-50p", "pad-025"], onClick: ()=> this.endSendMessage(true) }, h("b", "Send"))
                ])
            ])),
            h("button", { class: ["message-send-button"], display: !this.typingMessage, onClick: ()=> this.beginSendMessage() }, h(messageSenderIcon, { class: ["icon-20"] }))
        ])
    }
}
