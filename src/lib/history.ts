import { Collection } from 'discord.js';

/**
 * Stores conversation history per channel.
 * Structure: Map<channelId, { role: string, content: string }[]>
 */
export const conversationHistory = new Collection<string, { role: string, content: string }[]>();

const MAX_HISTORY = 10;

/**
 * Adds a message to the history for a channel.
 * @param {string} channelId 
 * @param {string} role 'user' | 'assistant' | 'system'
 * @param {string} content 
 */
export function addMessageToHistory(channelId: string, role: string, content: string) {
    if (!conversationHistory.has(channelId)) {
        conversationHistory.set(channelId, []);
    }

    const history = conversationHistory.get(channelId)!;
    history.push({ role, content });

    // Keep only the last MAX_HISTORY messages
    if (history.length > MAX_HISTORY) {
        history.shift();
    }
}

/**
 * Gets the history for a channel.
 * @param {string} channelId 
 * @returns {{ role: string, content: string }[]}
 */
export function getHistory(channelId: string) {
    return conversationHistory.get(channelId) || [];
}
