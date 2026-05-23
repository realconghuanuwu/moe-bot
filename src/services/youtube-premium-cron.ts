import cron from "node-cron";
import type { Client } from "discord.js";
import { DEFAULT_YOUTUBE_PREMIUM_REMINDER_TIMEZONE } from "../constants/youtube-premium.constant.js";
import {
  DiscordChannelReminderNotifier,
  runYoutubePremiumReminder,
} from "./youtube-premium-reminder.js";

const YOUTUBE_PREMIUM_REMINDER_CRON = "0 11 10,12,15-25 * *";

export function startYoutubePremiumReminderCron(client: Client) {
  const channelId = process.env.YT_REMINDER_CHANNEL_ID;

  if (!channelId) {
    console.warn(
      "[yt-reminder] YT_REMINDER_CHANNEL_ID missing; cron disabled.",
    );
    return null;
  }

  const timezone =
    process.env.YT_REMINDER_TIMEZONE ??
    DEFAULT_YOUTUBE_PREMIUM_REMINDER_TIMEZONE;
  const notifier = new DiscordChannelReminderNotifier(client, channelId);

  const task = cron.schedule(
    YOUTUBE_PREMIUM_REMINDER_CRON,
    async () => {
      console.log(`[yt-reminder] start timezone=${timezone}`);

      try {
        await runYoutubePremiumReminder(notifier);
        console.log("[yt-reminder] done");
      } catch (error) {
        console.error("[yt-reminder] failed", error);
      }
    },
    {
      timezone,
    },
  );

  console.log(
    `[yt-reminder] scheduled cron="${YOUTUBE_PREMIUM_REMINDER_CRON}" timezone="${timezone}"`,
  );

  return task;
}
