import { h } from "vue"

export default {
    props: {
        value: Number,
        min: Number,
        max: Number,
        step: Number
    },
    emits: [
        "change"
    ],
    methods: {
        decrement() {
            if (this.value > this.min) {
                this.$emit("change", Math.max(this.min, this.value - this.step))
            }
        },
        increment() {
            if (this.value < this.max) {
                this.$emit("change", Math.min(this.max, this.value + this.step))
            }
        }
    },
    render() {
        return h("div", { class: ["stepperbox-wrapper"], }, [
            h("button", { onClick: ()=> this.decrement() }, "\u2013"),
            h("input", { style: { }, readonly: true, value: this.value }),
            h("button", { onClick: ()=> this.increment() }, "+")
        ])
    }
}
