import { h } from "vue"
import modal from "../comp/modal.js"

const chatroomView = {
    props: {
        chatroomId: String
    },
    emits: [
        "click"
    ],
    render() {
        let chatroom = this.$storage.chatrooms.find(c => c.id == this.chatroomId)
        let chunks = this.$storage.chatroomChunks? this.$storage.chatroomChunks[this.chatroomId] : null
        let message = chunks?.find(c => c.chatId == this.chatroomId && c.endAt == null)?.messages.findLast(m=> m.text)
        return h("div", { class: ["pad-025", "bv", "clickable"], onClick: ()=> this.$emit("click") }, [
            h("p", { }, h("b", { }, chatroom.title)),
            h("p", { class: ["color-gray", "mar-b-05", "one-line"] }, message?.text.slice(200) || "no preview available"),
            (chatroom.messagesChangedAt > chatroom.lastReadAt)?
            h("div", { class: ["chat-preview-dot"] }, "") : null
        ])
    }
}

export default {
    data() {
        return {
            creatingChat: false,
            showingMe: false,
            loggingOut: false,
            chatTitle: ""
        }
    },
    methods: {
        goToChat(id) {
            this.$temp.chat = id
            this.$goToPage("chatroom")
        },
        async getIndex() {
            let result = await this.$http.invoke("index")
            this.$storage.chatroomChunks??= { }
            if (result.me) {
                this.$storage.me = result.me
            }
            if (result.chatrooms) {
                this.$storage.chatrooms = result.chatrooms
            }
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
        }
    },
    mounted() {
        this.getIndex()
    },
    render() {
        if (this.$storage.me && this.$storage.chatrooms) {
            let me = this.$storage.me
            let chatrooms = this.$storage.chatrooms.map(c => c)
            chatrooms.sort((c1, c2)=> c1.messagesChangedAt - c2.messagesChangedAt)
            return h("div", { class: ["full-height", "pad-05"] }, [
                h("div", { class: ["mar-b-1", "bb"] }, [
                    h("h2", { }, "My chatlist"),
                    h("p", { class: ["mar-b-05"] }, [
                        h("span", { }, "Signed in as "),  
                        h("a", { onClick: ()=> this.beginShowMe() }, me.email)
                    ]),
                ]),
                h("button", { class: ["block", "mar-b-05"], onClick: ()=> this.beginCreateChat() }, "+ New chat"),
                chatrooms.length?
                chatrooms.map(item=> {
                    return h(chatroomView, { chatroomId: item.id, onClick: ()=> this.goToChat(item.id) })
                }) :
                h("div", { class: ["text-center", "pad05"] }, "No chats so far..."),
                // a modal window for create new chat
                h(modal, { display: this.creatingChat, onClickOutside: ()=> this.completeCreateChat(false) }, ()=> h("div", { }, [
                    h("h3", { class: ["mar-b-1"] }, "Create new chat"),
                    h("p", { }, "Chatroom title"),
                    h("input", { class: ["block", "mar-b-05"], value: this.chatTitle, onInput: (e)=> this.chatTitle = e.target.value }),
                    h("button", { class: ["block"], onClick: ()=> this.completeCreateChat(true) }, "Create")
                ])),
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
                ]))
            ]) 
        }
        else return h("div", { class: ["pad-05"] }, [
            h("div", { }, [
                h("p", { }, "Loading, please wait. If it gets stuck for more than 10 seconds, reload the page manually.")
            ])
        ])
    }
}
