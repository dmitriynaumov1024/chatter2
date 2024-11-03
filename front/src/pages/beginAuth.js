import { h } from "vue"
import { isValidEmail } from "../utils.js"

export default {
    data() {
        return {
            invalidEmail: false,
            blacklistedEmail: false,
            verifyingEmail: false,
            otherError: false,
            newEmail: ""
        }
    },
    methods: {
        async onSubmitClick() {
            this.invalidEmail = false
            this.blacklistedEmail = false
            this.verifyingEmail = false
            this.otherError = false
            let email = this.newEmail
            this.$temp.email = email
            if (!isValidEmail(email)) {
                this.invalidEmail = true
            } 
            let result = await this.$http.beginAuth(this.$temp.email)
            if (result.session) {
                this.$storage.session = result.session
                this.$goToPage("continueAuth") 
            }
            else if (result.blacklistedEmail) {
                this.blacklistedEmail = true
            }
            else if (result.verifyingEmail) {
                this.verifyingEmail = true
            }
            else {
                this.otherError = true
            }
        }
    },
    render() {
        return h("div", { class: ["full-height", "pad-05"] }, [
            h("h2", { class: ["mar-b-1"] }, "Begin authentication by E-mail"),
            h("p", { }, "Your E-mail address"),
            h("input", { class: ["block", "mar-b-05"], placeholder: "user@example.com", value: this.newEmail, onInput: (e)=> { this.newEmail = e.target.value } }),
            h("button", { class: ["block", "mar-b-05"], onClick: ()=> this.onSubmitClick() }, "Send code"),
            this.invalidEmail? 
            h("p", { class: ["color-bad"] }, `${this.$temp.email} is not a valid E-mail.`) : null,
            this.blacklistedEmail? 
            h("p", { class: ["color-bad"] }, `${this.$temp.email} is blacklisted. You can try another E-mail.`) : null,
            this.verifyingEmail?
            h("p", { }, `${this.$temp.email} is being verified now, it may take up to 10 minutes. Thanks for your patience!`) : null,
            this.otherError? 
            h("p", { class: ["color-bad"] }, "Something went wrong. Try again later.") : null
        ])
    }
}
