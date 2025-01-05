'use server'

import webpush, { PushSubscription as WebPushSubscription } from 'web-push'

// Type guard to ensure subscription has required keys
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

// Convert browser PushSubscription to WebPushSubscription
function convertToWebPushSubscription(subscription: PushSubscription): WebPushSubscription {
    return {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: btoa(
                String.fromCharCode.apply(
                    null,
                    Array.from(new Uint8Array(subscription.getKey('p256dh')!))
                )
            ),
            auth: btoa(
                String.fromCharCode.apply(
                    null,
                    Array.from(new Uint8Array(subscription.getKey('auth')!))
                )
            ),
        },
    }
}

webpush.setVapidDetails(
    'mailto:theangrathana1@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

let subscription: WebPushSubscription | null = null

export async function subscribeUser(sub: PushSubscription) {
    try {
        const webPushSubscription = convertToWebPushSubscription(sub)
        subscription = webPushSubscription
        // In a production environment, you would want to store the subscription in a database
        // For example: await db.subscriptions.create({ data: webPushSubscription })
        return { success: true }
    } catch (error) {
        console.error('Error converting subscription:', error)
        return { success: false, error: 'Failed to process subscription' }
    }
}

export async function unsubscribeUser() {
    subscription = null
    // In a production environment, you would want to remove the subscription from the database
    // For example: await db.subscriptions.delete({ where: { ... } })
    return { success: true }
}

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