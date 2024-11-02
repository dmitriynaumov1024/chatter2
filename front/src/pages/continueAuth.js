import { h } from "vue"

export default {
    data() {
        return { }
    },
    methods: {
        async onSubmitClick() {
            console.log("code: " + this.$temp.shortCode)
            let result = await this.$http.completeAuth(this.$temp.shortCode)
            if (result.session) {
                this.$storage.session = result.session
                this.$goToPage("chatlist")
            }
            else {
                this.$data.errorMessage = "Could not complete authentication. Most likely this short code is not valid."
            }
        }
    },
    render() {
        return h("div", { class: ["full-height", "pad-05"] }, [
            h("h2", { class: ["mar-b-1"] }, "Continue authentication"),
            h("p", { class: ["mar-b-1"] }, ["A short code was sent to your E-mail address ", h("u", { }, this.$temp.email), ". If you don't see it in a minute, check spam folder or try ",
                h("a", { href: "#", onClick: ()=> { this.$goToPage("beginAuth") } }, "send it again.")
            ]),
            h("p", { }, "Your short code"),
            h("input", { class: ["block", "mar-b-05"], placeholder: "00000000", value: this.$temp.shortCode, onInput: (e)=> { this.$temp.shortCode = e.target.value } }),
            h("button", { class: ["block", "mar-b-1"], onClick: ()=> this.onSubmitClick() }, "Proceed"),
            this.$data.errorMessage?
            h("p", { class: ["color-bad", "mar-b-05"] }, this.$data.errorMessage) :
            null,
            h("a", { href: "#", onClick: ()=> { this.$goToPage("beginAuth") } }, "Go back")
        ])
    }
}
