import { h } from "vue"

export default {
    methods: {
        async onSubmitClick() {
            let result = await this.$http.beginAuth(this.$temp.email)
            if (result.session || true) {
                this.$storage.session = result.session
                this.$goToPage("continueAuth") 
            }
        }
    },
    render() {
        return h("div", { class: ["full-height", "pad-05"] }, [
            h("h2", { class: ["mar-b-1"] }, "Begin authentication by E-mail"),
            h("p", { }, "Your E-mail address"),
            h("input", { class: ["block", "mar-b-05"], placeholder: "user@example.com", value: this.$temp.email, onInput: (e)=> { this.$temp.email = e.target.value } }),
            h("button", { class: ["block"], onClick: ()=> this.onSubmitClick() }, "Send code")
        ])
    }
}
