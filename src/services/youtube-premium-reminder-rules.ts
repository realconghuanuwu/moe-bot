import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);

export const YOUTUBE_PREMIUM_DUE_DATE_FORMAT = "DD/MM/YYYY";

export type HeaderLookup = Record<string, string>;

export interface YoutubePremiumMemberRow {
  name: string;
  email: string;
  discordUid: string;
  dueDateRaw: string;
  monthValues: Record<number, unknown>;
  rowNumber?: number;
}

export interface YoutubePremiumReminderCandidate {
  name: string;
  email: string;
  discordUid: string;
  dueDateRaw: string;
  dueDateStatus: "valid" | "missing" | "invalid";
  unpaidMonths: number[];
  rowNumber?: number;
}

export interface SkippedYoutubePremiumRow {
  name: string;
  rowNumber?: number;
  reason: string;
}

export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function createHeaderLookup(headers: string[]): HeaderLookup {
  return headers.reduce<HeaderLookup>((lookup, header) => {
    const normalized = normalizeHeader(header);

    if (normalized) {
      lookup[normalized] = header;
    }

    return lookup;
  }, {});
}

export function getHeaderValue(
  values: Record<string, unknown>,
  lookup: HeaderLookup,
  headerName: string,
): string {
  const header = lookup[normalizeHeader(headerName)];
  const value = header ? values[header] : undefined;

  return value == null ? "" : String(value).trim();
}

export function isPaidValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  return String(value ?? "").trim().toUpperCase() === "TRUE";
}

export function parseDueDate(value: string): Dayjs | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  const parsedDate = dayjs(trimmedValue, YOUTUBE_PREMIUM_DUE_DATE_FORMAT, true);

  return parsedDate.isValid() ? parsedDate : null;
}

export function getUnpaidMonths(member: YoutubePremiumMemberRow): number[] {
  const unpaidMonths: number[] = [];

  for (let month = 1; month <= 12; month += 1) {
    if (!isPaidValue(member.monthValues[month])) {
      unpaidMonths.push(month);
    }
  }

  return unpaidMonths;
}

export function evaluateYoutubePremiumReminder(
  member: YoutubePremiumMemberRow,
  today = dayjs(),
): YoutubePremiumReminderCandidate | SkippedYoutubePremiumRow | null {
  const unpaidMonths = getUnpaidMonths(member);
  const currentMonth = today.month() + 1;
  const isCurrentMonthUnpaid = !isPaidValue(member.monthValues[currentMonth]);
  const dueDate = parseDueDate(member.dueDateRaw);
  const dueDateStatus = member.dueDateRaw
    ? dueDate
      ? "valid"
      : "invalid"
    : "missing";
  const isPastDue = dueDate ? dueDate.isBefore(today, "day") : false;

  if (!isCurrentMonthUnpaid && !isPastDue) {
    return null;
  }

  if (!member.discordUid) {
    return {
      name: member.name,
      rowNumber: member.rowNumber,
      reason: "missing discord uid",
    };
  }

  return {
    name: member.name,
    email: member.email,
    discordUid: member.discordUid,
    dueDateRaw: member.dueDateRaw,
    dueDateStatus,
    unpaidMonths,
    rowNumber: member.rowNumber,
  };
}

export function buildYoutubePremiumMemberFromValues(
  values: Record<string, unknown>,
  lookup: HeaderLookup,
  rowNumber?: number,
): YoutubePremiumMemberRow {
  const monthValues: Record<number, unknown> = {};

  for (let month = 1; month <= 12; month += 1) {
    const header = lookup[normalizeHeader(`Tháng ${month}`)];
    monthValues[month] = header ? values[header] : undefined;
  }

  return {
    name: getHeaderValue(values, lookup, "Tên"),
    email: getHeaderValue(values, lookup, "Email"),
    discordUid: getHeaderValue(values, lookup, "discord uid"),
    dueDateRaw: getHeaderValue(values, lookup, "Hạn Thanh toán"),
    monthValues,
    rowNumber,
  };
}

export function formatUnpaidMonths(unpaidMonths: number[], year: number): string {
  if (unpaidMonths.length === 0) return "Không có";

  return unpaidMonths
    .map((month) => `${String(month).padStart(2, "0")}/${year}`)
    .join(", ");
}
