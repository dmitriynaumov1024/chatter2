import { h } from "vue"

export default {
    data() {
        return { 
            shortCode: "",
            errorMessage: null
        }
    },
    methods: {
        async onSubmitClick() {
            let result = await this.$http.completeAuth(this.shortCode)
            if (result.session) {
                this.$storage.session = result.session
                this.$goToPage("chatlist")
            }
            else {
                this.errorMessage = "Could not complete authentication. Most likely this short code is not valid."
            }
        }
    },
    render() {
        return h("div", { class: ["ww", "h100", "scroll"] }, [
            h("div", { class: ["bv"] }, [
                h("div", { class: ["wc", "pad-1-05"] }, [
                    h("h2", { }, [
                        h("img", { class: ["icon-15"], src: "/favicon.svg" }),
                        h("span", " Continue authentication")
                    ]),
                ]),
            ]),
            h("div", { class: ["bv"] }, [
                h("div", { class: ["wc", "pad-1-05"] }, [
                    h("p", { class: ["mar-b-1"] }, ["A short code was sent to your E-mail address ", h("u", { }, this.$temp.email), ". If you don't see it in a minute, check spam folder or try ",
                        h("a", { onClick: ()=> { this.$goToPage("beginAuth") } }, "send it again.")
                    ]),
                    h("p", { }, "Your short code"),
                    h("input", { class: ["block", "mar-b-05"], placeholder: "00000000", onInput: (e)=> { this.shortCode = e.target.value } }),
                    h("button", { class: ["block", "mar-b-1"], onClick: ()=> this.onSubmitClick() }, "Proceed"),
                    this.errorMessage?
                    h("p", { class: ["color-bad", "mar-b-05"] }, this.errorMessage) : null,
                    h("a", { onClick: ()=> { this.$goToPage("beginAuth") } }, "Go back")
                ])
            ])
        ])
    }
}
