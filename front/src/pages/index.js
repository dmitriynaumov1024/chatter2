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
        return h("div", { class: ["full-height", "pad-05"] }, [
            h("h2", { }, "Welcome to Chatter Lite!"),
            h("p", { }, [
                "Get started with E-mail > ",
                h("a", { href: "#", onClick: ()=> { this.$goToPage("beginAuth") } }, "click here")
            ]),
            h("p", { }, [ 
                "Create new context for sandboxing > ",
                h("a", { href: "#", onClick: ()=> { this.newContextId = createContextId() } }, "click here")
            ]),
            this.newContextId? 
            h("a", { target: "_blank", href: "?context="+this.newContextId }, "Go to context "+ this.newContextId) : null
        ])
    }
}