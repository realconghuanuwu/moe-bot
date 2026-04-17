import { Collection } from "discord.js";

export const conversationHistory = new Collection<
  string,
  { role: string; content: string }[]
>();

const MAX_HISTORY = 10;

/**
 * Adds a message to the history for a channel.
 * @param {string} channelId
 * @param {string} role 'user' | 'assistant' | 'system'
 * @param {string} content
 */
export function addMessageToHistory(
  channelId: string,
  role: string,
  content: string,
) {
  if (!conversationHistory.has(channelId)) {
    conversationHistory.set(channelId, []);
  }

  const history = conversationHistory.get(channelId)!;
  history.push({ role, content });

  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

export function getHistory(channelId: string) {
  return conversationHistory.get(channelId) || [];
}
