import {
    sessionShortCodeTime
} from "../utils/user-session.js"

// gets user session from request.body.session
function userSession({ fake } = { }) {
    return async function (request, response, next) {
        let { db, logger } = request
        let session = { userId: null }
        let reqSession = request.body.session || { }
        if (fake) {
            // thats really all fake authorization!
            session.ok = true
            session.id = reqSession.id
            session.userId = reqSession.userId
        }
        else {
            if (reqSession.id) {
                let storedSession = await db.userSession.query()
                    .where("id", reqSession.id)
                    .first()
                if (!storedSession) {
                    session.ok = false
                    session.notFound = true
                } 
                else if ((storedSession.expireAt < Date.now()) || (reqSession.shortCode && storedSession.createdAt + sessionShortCodeTime < Date.now())) {
                    session.ok = false
                    session.expired = true
                }
                else {
                    let tokenOk = reqSession.token && (storedSession.token == reqSession.token || storedSession.tokenOld == reqSession.token)
                    let shortCodeOk = reqSession.shortCode && storedSession.shortCode == reqSession.shortCode
                    if (tokenOk || shortCodeOk) {
                        session.ok = true
                        session.id = reqSession.id
                        session.token = storedSession.token
                        session.userId = storedSession.userId
                        session.createdAt = storedSession.createdAt
                        session.refreshAt = storedSession.refreshAt
                        session.expireAt = storedSession.expireAt
                    }
                    else {
                        session.ok = false
                        session.badToken = true
                    }
                }
            }
            else {
                session.ok = false
                session.notFound = true
            }
        }
        request.session = session
        await next()
    }
}

export {
    userSession
}
