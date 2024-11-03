export function HttpClient (apiBaseUrl, initSession) {
    let session = initSession ?? { }
    let timediff = null
    let busy = { }

    async function doPost(topic, params) {
        if (busy[topic]) {
            return
        }
        params ??= { }
        try {
            params.session = Object.assign({ }, session, params.session) 
            busy[topic] = true
            let result = await fetch(apiBaseUrl + "/" + topic, { 
                method: "POST", 
                headers: { "Content-Type": "application/json; chatset=utf-8" },
                body: JSON.stringify(Object.assign({ }, params)) 
            })
            // if (result.status >= 400) {
            //     return { error: true } 
            // }
            result = await result.json()
            if (result.session) session = Object.assign({}, result.session)
            return result 
        }
        catch (error) {
            console.error(error)
            return { error }
        }
        finally {
            busy[topic] = false
        }
    }

    return {
        get session() {
            return session
        },
        set session(value) {
            session = value
        },
        async hasValidSession() {
            let result = session? await doPost("auth", { }) : { }
            if (result.session?.id || result.success) {
                console.log("session is valid!")
                return true
            }
        },
        async timesync () {
            let result = await doPost("time", { })
            if (result.time) timediff = result.time - Date.now()
        },
        async beginAuth (email) {
            return await doPost("auth.begin", {
                email: email
            })
        },
        async completeAuth (shortcode) {
            return await doPost("auth.complete", {
                session: { id: session.id, shortCode: shortcode }
            })
        },
        async refreshAuth () {
            return await doPost("auth", {
                session: { id: session.id, token: session.token } 
            })
        },
        async invoke (topic, params) {
            if (timediff == null) {
                await this.timesync()
            }
            if (session.refreshAt < Date.now()+timediff) {
                await this.refreshAuth()
            }
            return await doPost(topic, params)
        }
    }
}
