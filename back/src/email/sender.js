// this creates a mailjet sender.
export function mailjet (options = { }) {
    let encodedAuth = "Basic " + Buffer.from(`${options.apiKey}:${options.secretKey}`).toString("base64")
    let headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "Authorization": encodedAuth
    }
    let logger = options.logger
    logger?.log("Using mailjet provider")
    return {
        async send ({ sender, recipient, subject, text }) {
            try {
                let result = await fetch("https://api.mailjet.com/v3.1/send", {
                    method: "POST",
                    headers:  headers,
                    body: JSON.stringify({
                        Messages: [{
                            From: {
                                Email: sender.email,
                                Name: sender.name
                            },
                            To: [{
                                Email: recipient.email
                            }],
                            Subject: subject,
                            TextPart: text
                        }]
                    })
                }) 
                let body = await result.json()
                logger?.log("send '"+subject+"' to "+recipient.email)
                return body
            }
            catch(error) {
                logger?.error("Error while trying to send mail with mailjet")
                logger?.error(error)
            }
        }    
    }
}

// this creates a fake sender that just logs to logger.
export function $default (logger) {
    return {
        async send ({ sender, recipient, subject, text }) {
            logger.warn("From:    "+sender.email+" : "+sender.name)
            logger.warn("To:      "+recipient.email)
            logger.warn("Subject: "+subject)
            logger.warn("Text:    "+text)
        }
    }
}

/* 
one api for all

type Sender {
  async send (options: SenderOptions): Promise  
}

type SenderOptions {
    sender {
        email String
        name String
    }
    recipient {
        email String
    }
    subject String
    text String
}
*/

export const mailSenders = {
    mailjet,
    default: $default
}
