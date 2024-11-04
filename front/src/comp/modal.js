import { h } from "vue"
import { self } from "./event-modifiers.js"

export default {
    props: {
        titleText: String 
    },
    emits: [
        "clickOutside"
    ],
    render() {
        return h("div", { class: ["modal-wrapper"], onClick: self(()=> this.$emit("clickOutside")) }, [
            h("div", { class: ["modal", "pad-05"] }, [
                h("div", { class: this.titleText? ["flex-stripe", "bb", "mar-b-05", "pad-b-05"] : ["flex-stripe"] }, [ 
                    h("div", { class: ["flex-grow"] }, this.titleText || " "),
                    h("div", { class: ["clickable", "pad-0-05"], onClick: ()=> this.$emit("clickOutside") }, h("b", "\u2a2f")),
                ]),
                h("div", { }, this.$slots.default())
            ])
        ])
    }
}
