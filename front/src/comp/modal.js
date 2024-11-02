import { h } from "vue"
import { self } from "./event-modifiers.js"

export default {
    emits: [
        "clickOutside"
    ],
    render() {
        return h("div", { class: ["modal-wrapper"], onClick: self(()=> this.$emit("clickOutside")) }, [
            h("div", { class: ["modal"] }, [
                h("div", { class: ["flex-stripe", "pad-05", "bb"] }, [ 
                    h("span", { class: ["flex-grow"] }, " "),
                    h("span", { class: ["clickable"], onClick: ()=> this.$emit("clickOutside") }, "[ \u2a2f ]")
                ]),
                h("div", { class: ["pad-05"] }, this.$slots.default())
            ])
        ])
    }
}
