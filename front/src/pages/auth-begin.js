import { h } from "vue"
import { isValidEmail } from "../utils.js"

export default {
    data() {
        return {
            invalidEmail: false,
            blacklistedEmail: false,
            verifyingEmail: false,
            otherError: false,
            newEmail: this.$temp.email,
            waitTimeout: undefined
        }
    },
    methods: {
        onSubmitClick() {
            this.sendCode(this.newEmail)
        },
        async sendCode(email) {
            this.waitTimeout = undefined
            this.invalidEmail = false
            this.blacklistedEmail = false
            this.verifyingEmail = false
            this.otherError = false
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
                this.waitTimeout = result.waitTimeout
            }
            else {
                this.otherError = true
            }
        }
    },
    render() {
        return h("div", { class: ["ww"] }, [
            h("div", { class: ["bv"] }, [
                h("div", { class: ["wc", "pad-1-05"] }, [
                    h("h2", { }, [
                        h("img", { class: ["icon-15"], src: "/favicon.svg" }),
                        h("span", " Begin authentication")
                    ]),
                ]),
            ]),
            h("div", { class: ["bv"] }, [
                h("div", { class: ["wc", "pad-1-05"] }, [
                    h("p", { }, "Your E-mail address"),
                    h("input", { class: ["block", "mar-b-05"], placeholder: "user@example.com", value: this.newEmail, onInput: (e)=> { this.newEmail = e.target.value } }),
                    h("button", { class: ["block", "mar-b-05"], onClick: ()=> this.onSubmitClick() }, "Send code"),
                    this.invalidEmail? 
                    h("p", { class: ["color-bad"] }, `${this.$temp.email} is not a valid E-mail.`) : null,
                    this.blacklistedEmail? 
                    h("p", { class: ["color-bad"] }, `${this.$temp.email} is blacklisted. You can try another E-mail.`) : null,
                    this.verifyingEmail?
                    h("p", { }, [
                        `${this.$temp.email} is being verified now. `,
                        this.waitTimeout>0? 
                            `Estimated wait time is ${Math.ceil(this.waitTimeout/60000)} minute(s).`: 
                            `It may take up to 10 minutes.`,
                        `Thanks for your patience!`
                    ]) : null,
                    this.otherError? 
                    h("p", { class: ["color-bad"] }, "Something went wrong. Try again later.") : null
                ])
            ])
        ])
    }
}
