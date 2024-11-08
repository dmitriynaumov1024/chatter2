import { createApp, h, reactive } from "vue"
import qs from "qs"
import { v4 as uuid } from "uuid" 
import { HttpClient } from "./http-client.js"
import { createSettings } from "./user-settings.js"

let httpClient = HttpClient("/api/v1")
let tempStorage = reactive({ })
let clientStorage = reactive({ })

let querystring = (window.location.search || window.location.hash)
if (querystring.startsWith("#")) querystring = querystring.split("?").at(-1) || ""
else querystring = (querystring.split("#").find(s => s.startsWith("?")) || "?").slice(1)
    
let query = qs.parse(querystring)

let lsKey = "app.chatter.light." + (query.context || "default")

// pages
import beginAuth from "./pages/auth-begin.js"
import continueAuth from "./pages/auth-continue.js"
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
        this.$storage.settings ??= createSettings()
        this.$http.session = Object.assign({}, this.$storage.session)
        await this.$http.timesync()
        this.$temp.page = "index"
        window.addEventListener("popstate", ()=> {
            this.$temp.page = window.history.state || "index"
        })
        window.addEventListener("beforeunload", ()=> {
            this.$storage.session = this.$http.session
            window.localStorage[lsKey] = JSON.stringify(Object.assign({}, this.$storage))
        })
        if (await this.$http.hasValidSession()) {
            this.$goToPage("chatlist")
        }
    },
    render() {
        // this container is fixed position, full width and full height.
        // each page does what's the best for it.
        return h("div", { class: ["layer-0", "hfull", "w100"] }, [
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
            window.history.pushState(newPage, "")
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
        this.$storage.settings = createSettings()
        this.$http.session = { }
    }, 100)
}

function setHeight () {
    document.body.style.setProperty("--height-full", window.innerHeight+"px")
}

setTimeout(()=> {
    setHeight()
    window.addEventListener("resize", setHeight)
}, 100)

app.mount("#app")
window.app = app

import "./style.css"
