'use server'

import webpush, { PushSubscription as WebPushSubscription } from 'web-push'

// 1. Type guard to ensure the subscription object is valid
function isValidPushSubscription(subscription: unknown): subscription is WebPushSubscription {
    return (
        typeof subscription === 'object' &&
        subscription !== null &&
        'endpoint' in subscription &&
        'keys' in subscription &&
        typeof (subscription as any).keys === 'object' &&
        'p256dh' in (subscription as any).keys &&
        'auth' in (subscription as any).keys
    )
}

// 2. Convert the JSON subscription to a WebPushSubscription
//    Notice we are not using subscription.getKey() anymore.
//    Instead, we assume `sub.keys.p256dh` and `sub.keys.auth` are already base64 strings.
function convertToWebPushSubscription(sub: {
    endpoint: string
    keys: { p256dh: string; auth: string }
}): WebPushSubscription {
    return {
        endpoint: sub.endpoint,
        keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
        },
    }
}

// 3. Set VAPID details
//    Make sure these environment variables are set in your hosting environment.
webpush.setVapidDetails(
    'mailto:theangrathana1@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, // Public VAPID key
    process.env.VAPID_PRIVATE_KEY!             // Private VAPID key
)

// 4. Keep a reference to the current subscription in memory (for demo purposes)
let subscription: WebPushSubscription | null = null

// 5. Function to subscribe a user
export async function subscribeUser(sub: {
    endpoint: string
    keys: { p256dh: string; auth: string }
}) {
    try {
        // Convert the JSON subscription to a WebPushSubscription
        const webPushSubscription = convertToWebPushSubscription(sub)
        subscription = webPushSubscription
        
        // In production, store subscription in your database here...
        // await db.subscriptions.create({ data: webPushSubscription })

        return { success: true }
    } catch (error) {
        console.error('Error processing subscription:', error)
        return { success: false, error: 'Failed to process subscription' }
    }
}

// 6. Function to unsubscribe a user
export async function unsubscribeUser() {
    subscription = null
    // In production, remove subscription from database here...
    // await db.subscriptions.delete({ where: { ... } })
    return { success: true }
}

// 7. Send a push notification
export async function sendNotification(message: string) {
    if (!subscription) {
        throw new Error('No subscription available')
    }

    if (!isValidPushSubscription(subscription)) {
        throw new Error('Invalid subscription format')
    }

    try {
        await webpush.sendNotification(
            subscription,
            JSON.stringify({
                title: 'Test Notification',
                body: message,
                icon: '/icon.png',
            })
        )
        return { success: true }
    } catch (error) {
        console.error('Error sending push notification:', error)
        return { success: false, error: 'Failed to send notification' }
    }
}
