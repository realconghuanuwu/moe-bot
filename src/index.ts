import 'dotenv/config';
import { SapphireClient, container } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import OpenAI from 'openai';

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
  loadMessageCommandListeners: true
});

declare module '@sapphire/framework' {
  interface Container {
    openai: OpenAI;
  }
}

container.openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

client.login(process.env.DISCORD_TOKEN);
