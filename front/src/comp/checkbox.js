import { h } from "vue"

export default {
    props: {
        value: Boolean
    },
    emits: [
        "change"
    ],
    render() {
        return h("div", { class: ["inline-block"], onClick: ()=> this.$emit("change", !this.value) }, [
            h("span", { class: ["checkbox"], checked: this.value }),
            this.$slots.default()
        ])
    }
}
