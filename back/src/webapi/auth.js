import { createRouter } from "better-express"

import { v4 as uuid } from "uuid"

import {
    createSessionToken,
    createShortCode,
    sessionRefreshTime,
    sessionExpireTime
} from "../utils/user-session.js"

import {
    timeout
} from "../utils/time.js"

let route = createRouter()

route.get("/auth.ping", async (request, response)=> {
    console.log(request.session)
    response.status(400).json({ 
        message: "pong!"
    })
})

route.post("/auth", async (request, response)=> {
    await timeout(250)
    let { db, session } = request
    if (session.ok) {
        if (session.refreshAt && session.refreshAt <= Date.now()) {
            let newSession = {
                token: createSessionToken(),
                tokenOld: session.token,
                refreshAt: Date.now() + sessionRefreshTime,
                expireAt: Date.now() + sessionExpireTime
            }
            await db.userSession.query().findById(session.id).patch(newSession)
            return response.status(200).json({
                session: {
                    id: session.id,
                    token: newSession.token,
                    refreshAt: newSession.refreshAt
                },
                success: true,
                message: "Session refreshed!"
            })
        }
        else {
            return response.status(200).json({
                success: true,
                message: "Your session is in great shape!"
            })
        }
    }
    else {
        return response.status(400).json({
            relogin: true,
            message: "Your session is invalid or expired. You have to re-login."
        })
    }
})

route.post("/auth.begin", async (request, response)=> {
    await timeout(250)
    let { db, logger } = request
    let email = request.body.email
    if (email) {
        let user = await db.user.query().where("email", email).first()
        if (!user) {
            user = await db.user.query().insert({
                id: uuid(),
                email: email,
                createdAt: Date.now(),
                confirmedAt: 0
            })
        }
        let userSession = await db.userSession.query().insert({
            id: uuid(),
            userId: user.id,
            token: createSessionToken(),
            tokenOld: null,
            shortCode: createShortCode(),
            createdAt: Date.now(),
            refreshAt: Date.now() + sessionRefreshTime,
            expireAt: Date.now() + sessionRefreshTime
        })
        
        // this is a stub!
        logger.warn(`Short code for ${email} is <${userSession.shortCode}>.`)

        return response.status(200).json({
            session: { id: userSession.id },
            message: "Code was sent!"
        })
    }
    else {
        return response.status(400).json({
            message: "Bad request! Required body { email String }"
        })
    }
})

route.post("/auth.complete", async (request, response)=> {
    await timeout(500)
    let { db, session, logger } = request

    if (!request.body.session?.shortCode) {
        return response.status(400).json({
            badToken: true,
            message: "Bad request! Bad token or short code."
        })
    }

    if (session.ok) {
        let user = await db.user.query().findById(session.userId)
        if (!user.confirmedAt) {
            await db.user.query().findById(user.id).patch({
                confirmedAt: Date.now()
            })
        }
        await db.userSession.query().findById(session.id).patch({
            shortCode: null,
            expireAt: Date.now() + sessionExpireTime
        })
        return response.status(200).json({
            session: {
                id: session.id,
                token: session.token,
                refreshAt: session.refreshAt
            },
            message: "Successfully confirmed session!"
        })
    }
    else if (session.expired) {
        return response.status(400).json({
            relogin: true,
            expired: true,
            message: "Bad request! This session expired."
        })
    }
    else if (session.badToken) {
        return response.status(400).json({
            badToken: true,
            message: "Bad request! Bad token or short code."
        })
    }
    else {
        return response.status(400).json({
            invalid: true,
            message: "Bad request! Most likely session not found."
        })
    }
})

export {
    route as authRouter
}
