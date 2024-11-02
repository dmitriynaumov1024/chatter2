import { createApp, h, reactive } from "vue"
import qs from "qs"
import { v4 as uuid } from "uuid" 
import { HttpClient } from "./http-client.js"

let httpClient = HttpClient("/api/v1")
let tempStorage = reactive({ })
let clientStorage = reactive({ })

let querystring = (window.location.search || window.location.hash).split("?").at(-1) || ""
let query = qs.parse(querystring)

let lsKey = "app.chatter.light." + (query.context || "default")

// pages
import beginAuth from "./pages/beginAuth.js"
import continueAuth from "./pages/continueAuth.js"
import chatlist from "./pages/chatlist.js"
import chatroom from "./pages/chatroom.js"
import index from "./pages/index.js"

let pages = {
    beginAuth,
    continueAuth,
    chatlist,
    chatroom,
    index
}

let app = createApp({
    async created() {
        Object.assign(this.$storage, JSON.parse(window.localStorage[lsKey]|| "{}"))
        this.$http.session = Object.assign({}, this.$storage.session)
        await this.$http.timesync()
        if (await this.$http.hasValidSession()) {
            this.$goToPage("chatlist")
        }
        window.addEventListener("popstate", ()=> {
            this.$temp.page = window.history.state || "index"
            console.log("popped page")
        })
        window.addEventListener("beforeunload", ()=> {
            this.$storage.session = this.$http.session
            window.localStorage[lsKey] = JSON.stringify(Object.assign({}, this.$storage))
        })
    },
    render() {
        return h("div", { class: ["width-container"] }, [
            h(pages[this.$temp.page]??pages.index, { })
        ])
    }
})

app.config.globalProperties.$http = httpClient
app.config.globalProperties.$temp = tempStorage
app.config.globalProperties.$storage = clientStorage

app.config.globalProperties.$goToPage = function(newPage) {
    setTimeout(()=> {
        if (newPage == -1) {
            console.log("pop page")
            window.history.back()
        }
        else {
            console.log("push page " + newPage)
            window.history.pushState(this.$temp.page, "")
            this.$temp.page = newPage
        }
    }, 100)
}

app.config.globalProperties.$logout = function() {
    setTimeout(()=> {
        this.$goToPage("index")
        for (let key in this.$storage) {
            this.$storage[key] = null
        }
        this.$http.session = { }
    }, 100)
}

app.mount("#app")
window.app = app

import "./style.css"
