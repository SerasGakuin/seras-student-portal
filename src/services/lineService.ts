import { CONFIG } from '@/lib/config';
import * as line from '@line/bot-sdk'; // Assuming @line/bot-sdk is used for line.Client

// Define an interface for the LINE profile if not already defined
interface LineProfile {
    displayName: string;
    userId: string;
    pictureUrl?: string;
    statusMessage?: string;
}

/**
 * A service for interacting with the LINE Messaging API.
 */
export const lineService = {
    /**
     * Retrieves the user's profile information.
     * NOTE: The original comment in the provided snippet indicated this method might be incorrectly implemented
     * or rely on client-side tokens. For a backend service, `getProfile` typically takes a userId.
     * This implementation is a placeholder based on the provided snippet's structure.
     * It's marked as not implemented as per the user's snippet.
     */
    async getProfile(accessToken: string): Promise<LineProfile> {
        // The original comment in the snippet noted:
        // "This is wrong, client.getProfile takes userId, not access token."
        // "Wait, for Liff we use ID Token or Liff SDK."
        // "But for backend API, we usually verify ID token or fetch profile."
        // "The existing code actually verified ID token. Let's look at existing code first."
        // "Ah, `getProfile` here was likely NOT implemented correctly or relied on client side token?"
        // "Let's stick to adding pushMessage for now."
        throw new Error("Method not implemented.");
    },

    /**
     * Sends a push message to a specific user via LINE Messaging API using the LINE SDK.
     * @param to LINE User ID
     * @param text Message text to send
     */
    async pushMessage(to: string, text: string): Promise<void> {
        if (!CONFIG.LINE_CHANNEL_ACCESS_TOKEN) {
            console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping push message.');
            return;
        }

        const client = new line.Client({
            channelAccessToken: CONFIG.LINE_CHANNEL_ACCESS_TOKEN,
        });

        try {
            await client.pushMessage(to, {
                type: 'text',
                text: text,
            });
            console.log(`[LineService] Pushed message to ${to}`);
        } catch (error) {
            console.error('[LineService] Failed to push message:', error);
            throw error; // Let caller handle or just log
        }
    }
};
