import { DbAdapter } from "better-obj"

import { 
    User,
    EmailVerification,
    UserSession,
    Chatroom,
    UserInChatroom,
    ChatroomChunk 
} from "./models.js"

class Chatter2DbAdapter extends DbAdapter 
{
    constructor() {
        super({
            // models must be supplied in the right order 
            // to avoid dependency issues
            user: User,
            emailVerification: EmailVerification,
            userSession: UserSession,
            chatroom: Chatroom,
            userInChatroom: UserInChatroom,
            chatroomChunk: ChatroomChunk
        })
    }
}

export {
    Chatter2DbAdapter
}
