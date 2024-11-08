// create default settings
export function createSettings() {
    return {
        chatlistPolling: {
            repeat: true,
            intervalS: 10,
            intervalMin: 5,
            intervalMax: 60,
            intervalStep: 5
        },
        chatroomPolling: {
            repeat: true,
            intervalS: 10,
            intervalMin: 5,
            intervalMax: 60,
            intervalStep: 5
        }
    }
}
