import { CONFIG } from '@/lib/config';

/**
 * Sends a push message to a specific user via LINE Messaging API.
 * @param to LINE User ID
 * @param text Message text to send
 */
export const sendPushMessage = async (to: string, text: string): Promise<void> => {
    if (!CONFIG.LINE_CHANNEL_ACCESS_TOKEN) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping message send.');
        return;
    }

    try {
        const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                to,
                messages: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error('Failed to send LINE message:', JSON.stringify(errorData));
        } else {
            console.log(`LINE message sent to ${to}`);
        }
    } catch (error) {
        console.error('Error sending LINE message:', error);
    }
};
