import 'dotenv/config';
import { SapphireClient, container } from '@sapphire/framework';
import { Events, GatewayIntentBits } from 'discord.js';
import OpenAI from 'openai';
import { startYoutubePremiumReminderCron } from './services/youtube-premium-cron.js';
import {
  replyYoutubePremiumPaymentGuide,
  YOUTUBE_PREMIUM_PAYMENT_BUTTON_ID,
} from './services/youtube-premium-payment.js';

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

client.once(Events.ClientReady, () => {
  startYoutubePremiumReminderCron(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (
    !interaction.isButton() ||
    interaction.customId !== YOUTUBE_PREMIUM_PAYMENT_BUTTON_ID
  ) {
    return;
  }

  try {
    await replyYoutubePremiumPaymentGuide(interaction);
  } catch (error) {
    console.error("[yt-payment] failed", error);
  }
});

client.login(process.env.DISCORD_TOKEN);
