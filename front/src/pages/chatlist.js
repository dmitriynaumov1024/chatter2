import { h } from "vue"
import modal from "../comp/modal.js"
import checkbox from "../comp/checkbox.js"
import stepperbox from "../comp/stepperbox.js"
import { prevent, stop } from "../comp/event-modifiers.js"

const chatModes = [ "accepted", "invited", "rejected" ]
const chatFolderNames = {
    accepted: "Active",
    invited: "Invitations",
    rejected: "Rejected"
}
const chatModeNames = {
    invited: "invited",
    accepted: "accepted",
    rejected: "rejected"
}
const supportedChatActions = {
    invited: ["accepted", "rejected"],
    accepted: ["invited", "rejected"],
    rejected: ["invited", "accepted"]
}

// chatroom card view
const chatroomView = {
    props: {
        chatroom: Object,
        chunks: Object,
        mode: String,
        expanded: Boolean
    },
    emits: [
        "navigate",
        "expand",
        "setMode"
    ],
    render() {
        let chatroom = this.chatroom
        if (this.mode == "accepted") {
            let message = this.chunks?.find(c=> c.chatId == chatroom.id && c.endAt == null)?.messages.filter(m=> m.text).at(-1)
            return h("div", { class: ["pad-025", "bv", "clickable", "chat-card"], expanded: this.expanded, onClick: ()=> this.$emit("navigate"), onContextmenu: prevent(()=> this.$emit("expand")) }, [
                h("p", { class: ["one-line"] }, h("b", { }, chatroom.title)),
                h("p", { class: ["color-gray", "mar-b-05", "one-line"] }, message?.text.slice(0, 200) ?? "no preview available"),
                (chatroom.messagesChangedAt > chatroom.lastReadAt)?
                h("div", { class: ["chat-preview-dot"] }, "") : null,
                h("div", { class: ["mar-b-05"], display: this.expanded, onClick: stop() }, [
                    h("a", { onClick: ()=> this.$emit("navigate") }, "Open"),
                    supportedChatActions[this.mode].map(act=> [
                        h("span", { class: ["color-gray"] }, " | "),
                        (chatroom.newMode == act)?
                        h("span", { }, "Marked as " + act) :
                        h("a", { onClick: ()=> this.$emit("setMode", act) }, "Mark as " + act)
                    ])
                ])
            ])
        }
        else if (this.mode == "invited" || this.mode == "rejected") {
            return h("div", { class: ["pad-025", "bv", "clickable", "chat-card"], expanded: this.expanded, onClick: ()=> this.$emit("expand"), onContextmenu: prevent(()=> this.$emit("expand")) }, [
                h("p", { class: ["one-line", "mar-b-05"] }, h("b", { }, chatroom.title)),
                h("div", { class: ["mar-b-05"], display: this.expanded, onClick: stop() }, [
                    h("a", { onClick: ()=> this.$emit("navigate") }, "Open"),
                    supportedChatActions[this.mode].map(act=> [
                        h("span", { class: ["color-gray"] }, " | "),
                        (chatroom.newMode == act)?
                        h("span", { }, "Marked as " + act) :
                        h("a", { onClick: ()=> this.$emit("setMode", act) }, "Mark as " + act)
                    ])
                ])
            ])
        }
        else {
            return h("div", { class: ["mar-b-05", "color-bad"] }, "Wrong mode.")
        }
    }
}

const chatroomListView = {
    props: {
        chatrooms: Object,
        currentMode: String
    },
    data() {
        return {
            expandedId: null
        }
    },
    emits: [
        "goToChat",
        "setChatMode"
    ],
    methods: {
        onNavigate(chat) {
            this.$emit("goToChat", chat.id)
        },
        onExpand(chat) {
            this.expandedId = chat.id
        },
        onSetMode(chat, mode) {
            this.$emit("setChatMode", chat.id, mode)
        }
    },
    render() {
        return this.chatrooms.map(chatroom=> {
            let chunks = this.$storage.chatroomChunks? this.$storage.chatroomChunks[chatroom.id] : null
            let mode = this.currentMode
            return h(chatroomView, { 
                chatroom, chunks, mode, expanded: this.expandedId==chatroom.id,
                onNavigate: ()=> this.onNavigate(chatroom),
                onExpand: ()=> this.onExpand(chatroom),
                onSetMode: (mode)=> this.onSetMode(chatroom, mode)
            })
        })
    }
}

const reloadIcon = {
    render() {
        return h("svg", { viewBox: "0 0 100 100" }, [
            h("g", { "stroke": "#fcfdff", "stroke-width": "10", "fill": "none" }, [
                h("path", { d: "M 10 50 Q 14 86 50 90 Q 86 86 90 50 Q 86 14 50 10 Q 40 13 30 25" }),
                h("path", { d: "M 29 6 L 26 28 L 47 41" })
            ])
        ])
    }
}

export default {
    data() {
        return {
            creatingChat: false,
            showingMe: false,
            loggingOut: false,
            chatTitle: "",
            chatMode: "accepted",
            getIndexTimeout: null,
            gettingIndex: false
        }
    },
    methods: {
        goToChat(id) {
            this.$temp.chat = id
            this.$goToPage("chatroom")
        },
        async getIndex() {
            clearTimeout(this.getIndexTimeout)
            let settings = this.$storage.settings
            if (settings.chatlistPolling.repeat) {
                this.getIndexTimeout = setTimeout(
                    ()=> { this.getIndex() }, 
                    settings.chatlistPolling.intervalS * 1000
                )
            }
            this.gettingIndex = true
            let result = await this.$http.invoke("index", { mode: this.chatMode })
            this.$storage.chatroomChunks??= { }
            if (result.me) {
                this.$storage.me = result.me
            }
            if (result.chatrooms) {
                this.$storage.chatrooms = result.chatrooms
            }
            this.gettingIndex = false
        },
        beginCreateChat() {
            this.chatTitle = ""
            this.creatingChat = true
        },
        async completeCreateChat(ok) {
            if (!ok) {
                this.creatingChat = false
                return
            }
            let title = this.chatTitle
            let result = await this.$http.invoke("chatroom.create", { chatroom: { title } })
            if (result.chatroom) {
                await this.getIndex()
                this.creatingChat = false
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
        setChatMode(mode) {
            if (mode != this.chatMode) {
                this.chatMode = mode
                this.getIndex()
            }
        },
        async setModeForChat(chatId, mode) {
            let result = await this.$http.invoke("chatroom.user.setmode", { chatroom: { id: chatId, mode } })
            if (result.success) {
                let chatroom = this.$storage.chatrooms.find(c=> c.id == chatId)
                chatroom.newMode = mode
            }
        },
        onPollingRepeatChanged(repeat) {
            if (repeat) {
                if (!this.getIndexTimeout) {
                    this.getIndexTimeout = setTimeout(
                        ()=> { this.getIndex() }, 
                        this.$storage.settings.chatlistPolling.intervalS * 1000
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
        this.getIndex()
    },
    unmounted() {
        clearTimeout(this.getIndexTimeout)
    },
    render() {
        const env = import.meta.env
        if (this.$storage.me && this.$storage.chatrooms) {
            let settings = this.$storage.settings
            let me = this.$storage.me
            let chatrooms = this.$storage.chatrooms.map(c => c)
                .sort((c1, c2)=> c2.messagesChangedAt - c1.messagesChangedAt)
            return h("div", { class: ["ww", "h100", "flex-v"] }, [
                h("div", { }, [
                    h("div", { class: ["bb"] }, [
                        h("div", { class: ["wc", "pad-05"] }, [
                            h("h2", { }, [
                                "My chatlist", " ", h("span", { class: ["color-good"] }, this.gettingIndex? "\u25cf" : null)
                            ]),
                            h("p", { }, [
                                h("span", { }, "Signed in as "),  
                                h("a", { onClick: ()=> this.beginShowMe() }, me.email)
                            ]),
                        ])
                    ]),
                    h("div", { class: ["bb"] }, [
                        h("div", { class: ["wc", "pad-0-05"] }, [
                            h("div", { class: ["flex-stripe"] }, 
                                chatModes.map(mode=> h("div", { class: ["pad-05", "clickable", "flex-grow", "text-center", mode==this.chatMode? ["text-bold", "shaded"] : "link"], onClick: ()=> this.setChatMode(mode) }, chatFolderNames[mode]))
                            )
                        ])
                    ]),
                ]),
                h("div", { class: ["wc", "pad-1-05", "flex-grow", "scroll"] }, [
                    this.chatMode == "accepted"? 
                    h("button", { class: ["block", "pad-025", "mar-b-05"], onClick: ()=> this.beginCreateChat() }, "+ New chat") : null,
                    chatrooms.length?
                    h(chatroomListView, { 
                        chatrooms, currentMode: this.chatMode,
                        onGoToChat: (id)=> this.goToChat(id),
                        onSetChatMode: (id, mode)=> this.setModeForChat(id, mode)
                    }) :
                    h("div", { class: ["text-center", "pad05"] }, "No chats so far..."),
                ]),
                h("div", { style: { "height": "2.5rem", "flex-shrink": 0, "font-size": "80%" }, class: ["pad-05", "color-gray"] }, `Chatter v${env.VITE_APP_VERSION}-${env.VITE_APP_MODE}, refresh ${settings.chatlistPolling.repeat? ("every "+settings.chatlistPolling.intervalS+"s"): "MANUAL"}`),
                h("button", { class: ["message-send-button"], display: !settings.chatlistPolling.repeat, onClick: ()=> this.getIndex() }, h(reloadIcon, { class: ["icon-20"] })),
                // a modal window for create new chat
                h(modal, { titleText: h("b", "Create new chat"), display: this.creatingChat, onClickOutside: ()=> this.completeCreateChat(false) }, ()=> h("div", { }, [
                    h("p", { class: ["mar-b-1"] }, [
                        "You (", me.email, ") will be automatically added to the chat with Write and Manage privileges. ",
                        "You can later find the chat in your 'Active' tab."
                    ]),
                    h("p", { }, "Chatroom title"),
                    h("input", { class: ["block", "mar-b-05"], value: this.chatTitle, onInput: (e)=> this.chatTitle = e.target.value }),
                    h("button", { class: ["block"], onClick: ()=> this.completeCreateChat(true) }, "Create")
                ])),
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
                            h("p", { }, "Chatlist polling interval, s"),
                            h(stepperbox, { class: ["flex-stripe"], 
                                min: settings.chatlistPolling.intervalMin, 
                                max: settings.chatlistPolling.intervalMax, 
                                step: settings.chatlistPolling.intervalStep,
                                value: settings.chatlistPolling.intervalS, 
                                onChange: (value)=> settings.chatlistPolling.intervalS = value
                            }),
                        ]),
                        h("div", { class: ["mar-b-05"] }, [
                            h("p", { }, "Chatlist polling repeat"),
                            h(checkbox, {
                                value: settings.chatlistPolling.repeat,
                                onChange: [
                                    (value)=> this.onPollingRepeatChanged(value),
                                    (value)=> settings.chatlistPolling.repeat = value,
                                ]
                            }, ()=> settings.chatlistPolling.repeat? "Enabled" : "Disabled")
                        ])
                    ])
                ])),
            ]) 
        }
        else return h("div", { class: ["wc", "pad-05"] }, [
            h("div", { }, [
                h("p", { }, "Loading, please wait. If it gets stuck for more than 10 seconds, reload the page manually.")
            ])
        ])
    }
}
