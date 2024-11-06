import { h } from "vue"
import { v4 as uuid } from "uuid" 

function createContextId() {
    return uuid().slice(0, 8)
}

export default {
    data() {
        return {
            newContextId: null
        }
    },
    render() {
        return h("div", { class: ["ww"] }, [
            h("div", { class: ["bv"] }, [
                h("div", { class: ["wc", "pad-05", "text-center"] }, [
                    h("img", { class: ["height-10", "mar-b-1"], src: "/favicon.svg" }),
                    h("h2", { class: [] }, "Chatter Lite")
                ])
            ]),
            h("div", { class: ["bv"] }, [
                h("div", { class: ["wc", "pad-05"] }, [
                    h("p", { class: ["mar-b-1"] }, h("b", "Chatter Lite"), " is a super-light-weight messenger for those who have bad internet. As minimalistic as possible, Chatter Lite is to provide a communication channel in cases of very slow, unstable or frequently interrupted network connection. Built in a Single-page App format, it has initial payload size of just about 100 kbytes. You can configure API polling interval or completely disable automatic API requests. This service is not for profit, we do not sell your data to third parties."),
                    h("a", { class: ["block", "pad-05", "clickable", "text-center"], onClick: ()=> { this.$goToPage("beginAuth") } }, "Get started with E-mail")
                ])
            ])
        ])
    }
}