import type { Client, MessageCreateOptions } from "discord.js";
import type { GoogleSpreadsheetRow } from "google-spreadsheet";
import dayjs from "dayjs";
import { getYoutubePremiumWorksheet } from "../utils/google-sheet.js";
import { createYoutubePremiumPaymentButtonRow } from "./youtube-premium-payment.js";
import {
  buildYoutubePremiumMemberFromValues,
  createHeaderLookup,
  evaluateYoutubePremiumReminder,
  type SkippedYoutubePremiumRow,
  type YoutubePremiumReminderCandidate,
} from "./youtube-premium-reminder-rules.js";

const DISCORD_MESSAGE_LIMIT = 2000;
const DISCORD_MESSAGE_TARGET_LENGTH = 1850;

export interface YoutubePremiumReminderBatch {
  sheetTitle: string;
  today: dayjs.Dayjs;
  candidates: YoutubePremiumReminderCandidate[];
  skippedRows: SkippedYoutubePremiumRow[];
}

export interface ReminderNotifier {
  notify(batch: YoutubePremiumReminderBatch): Promise<void>;
}

interface SendableTextChannel {
  send(options: MessageCreateOptions): Promise<unknown>;
}

export class DiscordChannelReminderNotifier implements ReminderNotifier {
  public constructor(
    private readonly client: Client,
    private readonly channelId: string,
  ) {}

  public async notify(batch: YoutubePremiumReminderBatch): Promise<void> {
    if (batch.candidates.length === 0) return;

    const channel = await this.client.channels.fetch(this.channelId);

    if (!channel?.isTextBased() || !("send" in channel)) {
      throw new Error(
        `YT_REMINDER_CHANNEL_ID "${this.channelId}" không phải text channel.`,
      );
    }

    const messages = buildDiscordReminderMessages(batch);
    const allowedUserIds = [
      ...new Set(batch.candidates.map((candidate) => candidate.discordUid)),
    ];

    for (const message of messages) {
      await (channel as SendableTextChannel).send({
        content: message,
        components: [createYoutubePremiumPaymentButtonRow()],
        allowedMentions: {
          users: allowedUserIds,
        },
      });
    }
  }
}

export async function runYoutubePremiumReminder(
  notifier: ReminderNotifier,
  today = dayjs(),
): Promise<YoutubePremiumReminderBatch> {
  const sheet = await getYoutubePremiumWorksheet();
  const rows = await sheet.getRows();
  const headerLookup = createHeaderLookup(sheet.headerValues);
  const candidates: YoutubePremiumReminderCandidate[] = [];
  const skippedRows: SkippedYoutubePremiumRow[] = [];

  for (const row of rows) {
    const member = buildYoutubePremiumMemberFromRow(row, headerLookup);
    const result = evaluateYoutubePremiumReminder(member, today);

    if (!result) continue;

    if ("reason" in result) {
      skippedRows.push(result);
      continue;
    }

    candidates.push(result);
  }

  const batch = {
    sheetTitle: sheet.title,
    today,
    candidates,
    skippedRows,
  };

  console.log(
    `[yt-reminder] sheet="${sheet.title}" matched=${candidates.length} skipped=${skippedRows.length}`,
  );

  for (const skippedRow of skippedRows) {
    console.warn(
      `[yt-reminder] skipped row=${skippedRow.rowNumber ?? "unknown"} name="${skippedRow.name}" reason="${skippedRow.reason}"`,
    );
  }

  await notifier.notify(batch);

  return batch;
}

function buildYoutubePremiumMemberFromRow(
  row: GoogleSpreadsheetRow,
  headerLookup: Record<string, string>,
) {
  const values = Object.fromEntries(
    row._worksheet.headerValues.map((header) => [header, row.get(header)]),
  );

  return buildYoutubePremiumMemberFromValues(values, headerLookup, row.rowNumber);
}

export function buildDiscordReminderMessages(
  batch: YoutubePremiumReminderBatch,
): string[] {
  const year = batch.today.year();
  const header =
    `📣 **YouTube Premium - nhắc nợ (${batch.candidates.length})**\n` +
    `Ngày: ${batch.today.format("DD/MM/YYYY")}\n\n`;
  const messages: string[] = [];
  let currentMessage = header;

  for (const candidate of batch.candidates) {
    const line = formatDiscordReminderLine(candidate, year);

    if (
      currentMessage !== header &&
      currentMessage.length + line.length > DISCORD_MESSAGE_TARGET_LENGTH
    ) {
      messages.push(currentMessage.trimEnd());
      currentMessage = header;
    }

    currentMessage += line;
  }

  if (currentMessage !== header) {
    messages.push(currentMessage.trimEnd());
  }

  return messages.map((message) =>
    message.length <= DISCORD_MESSAGE_LIMIT
      ? message
      : message.slice(0, DISCORD_MESSAGE_LIMIT),
  );
}

function formatDiscordReminderLine(
  candidate: YoutubePremiumReminderCandidate,
  year: number,
): string {
  const dueDate =
    candidate.dueDateStatus === "valid"
      ? candidate.dueDateRaw
      : `${candidate.dueDateRaw || "Chưa có"} (${candidate.dueDateStatus})`;

  return (
    `👤 <@${candidate.discordUid}> **${candidate.name || "Không tên"}**\n` +
    `📅 Hạn: ${dueDate} | ❌ Chưa đóng: ${formatCompactUnpaidMonths(candidate.unpaidMonths, year)}\n`
  );
}

export function formatCompactUnpaidMonths(
  unpaidMonths: number[],
  year: number,
): string {
  if (unpaidMonths.length === 0) return "Không có";

  const sortedMonths = [...new Set(unpaidMonths)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sortedMonths[0];
  let previousMonth = sortedMonths[0];

  for (const month of sortedMonths.slice(1)) {
    if (month === previousMonth + 1) {
      previousMonth = month;
      continue;
    }

    ranges.push(formatMonthRange(rangeStart, previousMonth, year));
    rangeStart = month;
    previousMonth = month;
  }

  ranges.push(formatMonthRange(rangeStart, previousMonth, year));

  return ranges.join(", ");
}

function formatMonthRange(startMonth: number, endMonth: number, year: number): string {
  const start = String(startMonth).padStart(2, "0");
  const end = String(endMonth).padStart(2, "0");

  return startMonth === endMonth ? `${start}/${year}` : `${start}-${end}/${year}`;
}
