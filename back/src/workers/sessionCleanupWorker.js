import { sessionRefreshTime } from "../utils/user-session.js"
import { createWorker } from "./worker.js"

export function sessionCleanupWorker ({ dbAdapter, logger }) {
    let db = dbAdapter
    return createWorker({
        init() {
            logger.log("Using session cleanup worker")
        },
        async work() {
            let count = await db.userSession.query()
                .where("expireAt", "<", (Date.now()-sessionRefreshTime)).delete()
            logger.log("Sessions cleaned up: "+count)
        }
    })
}
