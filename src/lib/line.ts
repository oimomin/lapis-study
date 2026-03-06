import { Client, WebhookEvent } from '@line/bot-sdk';

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// Singleton LINE Client
let lineClient: Client | null = null;

export const getLineClient = () => {
    if (!config.channelAccessToken || !config.channelSecret) {
        console.warn('LINE Integration is not configured. Missing environment variables.');
        return null;
    }

    if (!lineClient) {
        lineClient = new Client(config);
    }
    return lineClient;
};

/**
 * Utility to send a push message to a LINE user.
 */
export async function sendLineMessage(userId: string, text: string) {
    const client = getLineClient();
    if (!client) {
        console.warn(`Attempted to send message to ${userId}, but LINE is not configured.`);
        return false;
    }

    try {
        await client.pushMessage(userId, { type: 'text', text });
        return true;
    } catch (error) {
        console.error('Failed to send LINE message:', error);
        return false;
    }
}
