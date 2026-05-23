import dayjs from "dayjs";
import type { ButtonInteraction, Client } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { GoogleSpreadsheetRow } from "google-spreadsheet";
import { randomUUID } from "node:crypto";
import {
  formatVndAmount,
  getYoutubePremiumPaymentAmount,
  getYoutubePremiumPaymentAmountDisplay,
} from "../constants/youtube-premium.constant.js";
import {
  getGoogleSheet,
  getYoutubePremiumWorksheet,
} from "../utils/google-sheet.js";

export const PAYMENT_SUBMISSIONS_SHEET_TITLE = "Payment Submissions";
export const PAYMENT_HISTORY_SHEET_TITLE = "Payment History";
export const PAYMENT_CONFIRM_BUTTON_PREFIX = "yt_payment_confirm:";
export const PAYMENT_REJECT_BUTTON_PREFIX = "yt_payment_reject:";
export const PAYMENT_DRAFT_MONTH_BUTTON_PREFIX = "yt_payment_month:";
export const PAYMENT_DRAFT_SUBMIT_BUTTON_PREFIX = "yt_payment_submit:";
export const PAYMENT_DRAFT_CANCEL_BUTTON_PREFIX = "yt_payment_cancel:";
export const MAX_PAYMENT_PROOF_SIZE_BYTES = 5 * 1024 * 1024;
const PAYMENT_DRAFT_TTL_MS = 10 * 60 * 1000;

export const PAYMENT_SUBMISSION_HEADERS = [
  "id",
  "submitted_at",
  "member_name",
  "discord_uid",
  "email",
  "periods",
  "amount",
  "method",
  "proof_url",
  "status",
  "reviewed_at",
  "reviewed_by",
  "review_note",
];

export const PAYMENT_HISTORY_HEADERS = [
  "id",
  "created_at",
  "confirmed_at",
  "member_name",
  "discord_uid",
  "email",
  "period",
  "amount",
  "method",
  "proof_url",
  "status",
  "confirmed_by",
  "note",
];

export interface PaymentProofAttachment {
  url: string;
  contentType: string | null;
  size: number;
}

export interface PaymentSubmissionInput {
  discordUid: string;
  months: number[];
  year: number;
  method: string;
  proof: PaymentProofAttachment;
}

export interface PaymentDraft {
  id: string;
  discordUid: string;
  memberName: string;
  email: string;
  method: string;
  proof: PaymentProofAttachment;
  unpaidMonths: number[];
  selectedMonths: number[];
  year: number;
  createdAt: number;
}

export interface PaymentSubmissionRecord {
  id: string;
  submitted_at: string;
  member_name: string;
  discord_uid: string;
  email: string;
  periods: string;
  amount: string;
  method: string;
  proof_url: string;
  status: "pending" | "confirmed" | "rejected";
  reviewed_at: string;
  reviewed_by: string;
  review_note: string;
}

export interface PaymentHistoryRecord {
  id: string;
  created_at: string;
  confirmed_at: string;
  member_name: string;
  discord_uid: string;
  email: string;
  period: string;
  amount: string;
  method: string;
  proof_url: string;
  status: "confirmed";
  confirmed_by: string;
  note: string;
}

const paymentDrafts = new Map<string, PaymentDraft>();
const paymentReviewLocks = new Set<string>();
const paymentDraftSubmitLocks = new Set<string>();

export function acquirePaymentReviewLock(submissionId: string): boolean {
  if (paymentReviewLocks.has(submissionId)) {
    return false;
  }

  paymentReviewLocks.add(submissionId);
  return true;
}

export function releasePaymentReviewLock(submissionId: string): void {
  paymentReviewLocks.delete(submissionId);
}

export function clearPaymentReviewLocksForTest(): void {
  paymentReviewLocks.clear();
}

export function acquirePaymentDraftSubmitLock(draftId: string): boolean {
  if (paymentDraftSubmitLocks.has(draftId)) {
    return false;
  }

  paymentDraftSubmitLocks.add(draftId);
  return true;
}

export function releasePaymentDraftSubmitLock(draftId: string): void {
  paymentDraftSubmitLocks.delete(draftId);
}

export function clearPaymentDraftSubmitLocksForTest(): void {
  paymentDraftSubmitLocks.clear();
}

export function validatePaymentPeriod(period: string): boolean {
  return dayjs(period, "MM/YYYY", true).isValid();
}

export function getPaymentPeriodMonth(period: string): number {
  return dayjs(period, "MM/YYYY", true).month() + 1;
}

export function getMonthColumnFromPeriod(period: string): string {
  return `Tháng ${getPaymentPeriodMonth(period)}`;
}

export function getMonthColumnFromMonth(month: number): string {
  return `Tháng ${month}`;
}

export function monthToPeriod(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${year}`;
}

export function compactPaymentPeriods(months: number[], year: number): string {
  if (months.length === 0) return "";

  const sortedMonths = [...new Set(months)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sortedMonths[0];
  let previousMonth = sortedMonths[0];

  for (const month of sortedMonths.slice(1)) {
    if (month === previousMonth + 1) {
      previousMonth = month;
      continue;
    }

    ranges.push(formatPeriodRange(rangeStart, previousMonth, year));
    rangeStart = month;
    previousMonth = month;
  }

  ranges.push(formatPeriodRange(rangeStart, previousMonth, year));

  return ranges.join(", ");
}

export function parseCompactPaymentPeriods(periods: string): number[] {
  return periods
    .split(",")
    .flatMap((part) => {
      const trimmedPart = part.trim();
      const rangeMatch = /^(\d{2})-(\d{2})\/\d{4}$/.exec(trimmedPart);

      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        return Array.from(
          { length: end - start + 1 },
          (_, index) => start + index,
        );
      }

      const singleMatch = /^(\d{2})\/\d{4}$/.exec(trimmedPart);
      return singleMatch ? [Number(singleMatch[1])] : [];
    })
    .filter((month) => month >= 1 && month <= 12);
}

export function calculatePaymentTotal(months: number[]): string {
  return formatVndAmount(months.length * getYoutubePremiumPaymentAmount());
}

export function toggleSelectedMonth(
  selectedMonths: number[],
  month: number,
): number[] {
  const selectedSet = new Set(selectedMonths);

  if (selectedSet.has(month)) {
    selectedSet.delete(month);
  } else {
    selectedSet.add(month);
  }

  return [...selectedSet].sort((a, b) => a - b);
}

export function validatePaymentProofAttachment(
  proof: PaymentProofAttachment,
): string | null {
  if (!proof.contentType?.startsWith("image/")) {
    return "File bill phải là ảnh.";
  }

  if (proof.size > MAX_PAYMENT_PROOF_SIZE_BYTES) {
    return "Ảnh bill phải nhỏ hơn hoặc bằng 5MB.";
  }

  return null;
}

export function getHostDiscordUids(): string[] {
  return (process.env.YT_HOST_DISCORD_UIDS ?? "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
}

export function isPaymentHost(userId: string, hostUids = getHostDiscordUids()) {
  return hostUids.includes(userId);
}

export function isPaymentReviewButtonId(customId: string): boolean {
  return (
    customId.startsWith(PAYMENT_CONFIRM_BUTTON_PREFIX) ||
    customId.startsWith(PAYMENT_REJECT_BUTTON_PREFIX)
  );
}

export function isPaymentDraftButtonId(customId: string): boolean {
  return (
    customId.startsWith(PAYMENT_DRAFT_MONTH_BUTTON_PREFIX) ||
    customId.startsWith(PAYMENT_DRAFT_SUBMIT_BUTTON_PREFIX) ||
    customId.startsWith(PAYMENT_DRAFT_CANCEL_BUTTON_PREFIX)
  );
}

export function createPaymentReviewButtonRow(submissionId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PAYMENT_CONFIRM_BUTTON_PREFIX}${submissionId}`)
      .setLabel("Xác nhận")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${PAYMENT_REJECT_BUTTON_PREFIX}${submissionId}`)
      .setLabel("Từ chối")
      .setStyle(ButtonStyle.Danger),
  );
}

export async function createPaymentDraft(
  input: Omit<PaymentSubmissionInput, "months" | "year">,
): Promise<PaymentDraft> {
  const proofError = validatePaymentProofAttachment(input.proof);
  if (proofError) throw new Error(proofError);

  const member = await findYoutubePremiumMemberByDiscordUid(input.discordUid);
  if (!member) {
    throw new Error(
      "Không tìm thấy Discord UID của bạn trong danh sách YouTube Premium.",
    );
  }

  const year = dayjs().year();
  const unpaidMonths = getUnpaidMonthsFromRow(member.row);

  if (unpaidMonths.length === 0) {
    throw new Error("Bạn không có kỳ nào đang chưa thanh toán.");
  }

  const draft: PaymentDraft = {
    id: randomUUID(),
    discordUid: input.discordUid,
    memberName: member.name,
    email: member.email,
    method: input.method,
    proof: input.proof,
    unpaidMonths,
    selectedMonths: [],
    year,
    createdAt: Date.now(),
  };

  paymentDrafts.set(draft.id, draft);

  return draft;
}

export function buildPaymentDraftMessage(draft: PaymentDraft): string {
  const selectedPeriods = compactPaymentPeriods(
    draft.selectedMonths,
    draft.year,
  );
  const total = calculatePaymentTotal(draft.selectedMonths);

  return (
    `🧾 **Chọn kỳ thanh toán YouTube Premium**\n\n` +
    `👤 Thành viên: **${draft.memberName}**\n` +
    `🏦 Phương thức: **${draft.method}**\n` +
    `📌 Kỳ đã chọn: **${selectedPeriods || "Chưa chọn"}**\n` +
    `💰 Tổng tiền: **${draft.selectedMonths.length === 0 ? "0đ" : total}**\n\n` +
    `Bấm tháng để chọn/bỏ chọn, rồi bấm **Gửi bill**.`
  );
}

export function createPaymentDraftComponents(draft: PaymentDraft) {
  const monthButtons = draft.unpaidMonths.map((month) =>
    new ButtonBuilder()
      .setCustomId(`${PAYMENT_DRAFT_MONTH_BUTTON_PREFIX}${draft.id}:${month}`)
      .setLabel(String(month).padStart(2, "0"))
      .setStyle(
        draft.selectedMonths.includes(month)
          ? ButtonStyle.Success
          : ButtonStyle.Secondary,
      ),
  );
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let index = 0; index < monthButtons.length; index += 5) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        monthButtons.slice(index, index + 5),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PAYMENT_DRAFT_SUBMIT_BUTTON_PREFIX}${draft.id}`)
        .setLabel("Gửi bill")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${PAYMENT_DRAFT_CANCEL_BUTTON_PREFIX}${draft.id}`)
        .setLabel("Hủy")
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return rows;
}

export async function handleYoutubePaymentDraftButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const draftId = getDraftIdFromButtonId(interaction.customId);
  const draft = paymentDrafts.get(draftId);

  if (!draft || Date.now() - draft.createdAt > PAYMENT_DRAFT_TTL_MS) {
    paymentDrafts.delete(draftId);
    await interaction.update({
      content: "⚠️ Phiên chọn kỳ đã hết hạn. Vui lòng chạy lại `/yt-submit`.",
      components: [],
    });
    return;
  }

  if (draft.discordUid !== interaction.user.id) {
    await interaction.reply({
      content: "❌ Bạn không thể thao tác payment draft của người khác.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId.startsWith(PAYMENT_DRAFT_CANCEL_BUTTON_PREFIX)) {
    paymentDrafts.delete(draft.id);
    await interaction.update({
      content: "Đã hủy gửi bill thanh toán.",
      components: [],
    });
    return;
  }

  if (interaction.customId.startsWith(PAYMENT_DRAFT_MONTH_BUTTON_PREFIX)) {
    const month = Number(interaction.customId.split(":").at(-1));
    draft.selectedMonths = toggleSelectedMonth(draft.selectedMonths, month);
    await interaction.update({
      content: buildPaymentDraftMessage(draft),
      components: createPaymentDraftComponents(draft),
    });
    return;
  }

  if (draft.selectedMonths.length === 0) {
    await interaction.reply({
      content: "❌ Vui lòng chọn ít nhất một kỳ thanh toán.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  if (!acquirePaymentDraftSubmitLock(draft.id)) {
    await interaction.editReply({
      content: "⏳ Bill này đang được gửi cho chủ host duyệt, vui lòng chờ.",
      components: createPaymentDraftComponents(draft),
    });
    return;
  }

  let didSubmit = false;

  try {
    const submission = await submitYoutubePremiumPayment({
      discordUid: draft.discordUid,
      months: draft.selectedMonths,
      year: draft.year,
      method: draft.method,
      proof: draft.proof,
    });

    didSubmit = true;
    paymentDrafts.delete(draft.id);
    await notifyPaymentHosts(interaction.client, submission);
    await interaction.editReply({
      content: `✅ Đã gửi bill thanh toán kỳ **${submission.periods}** cho chủ host duyệt.`,
      components: [],
    });
  } catch (error) {
    console.error("[yt-payment] failed to submit payment draft", error);
    await interaction.editReply({
      content: "❌ Gửi bill thất bại. Vui lòng thử lại hoặc kiểm tra log bot.",
      components: createPaymentDraftComponents(draft),
    });
  } finally {
    if (!didSubmit) {
      releasePaymentDraftSubmitLock(draft.id);
    }
  }
}

export async function submitYoutubePremiumPayment(
  input: PaymentSubmissionInput,
): Promise<PaymentSubmissionRecord> {
  if (input.months.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một kỳ thanh toán.");
  }

  const proofError = validatePaymentProofAttachment(input.proof);
  if (proofError) throw new Error(proofError);

  const member = await findYoutubePremiumMemberByDiscordUid(input.discordUid);
  if (!member) {
    throw new Error(
      "Không tìm thấy Discord UID của bạn trong danh sách YouTube Premium.",
    );
  }

  const submission: PaymentSubmissionRecord = {
    id: randomUUID(),
    submitted_at: dayjs().toISOString(),
    member_name: member.name,
    discord_uid: input.discordUid,
    email: member.email,
    periods: compactPaymentPeriods(input.months, input.year),
    amount: calculatePaymentTotal(input.months),
    method: input.method,
    proof_url: input.proof.url,
    status: "pending",
    reviewed_at: "",
    reviewed_by: "",
    review_note: "",
  };

  const submissionsSheet = await getOrCreatePaymentSubmissionsSheet();
  await submissionsSheet.addRow(toRawRow(submission));

  return submission;
}

export async function notifyPaymentHosts(
  client: Client,
  submission: PaymentSubmissionRecord,
): Promise<void> {
  const hostUids = getHostDiscordUids();

  if (hostUids.length === 0) {
    console.warn("[yt-payment] YT_HOST_DISCORD_UIDS missing; no host DM sent.");
    return;
  }

  await Promise.all(
    hostUids.map(async (hostUid) => {
      try {
        const host = await client.users.fetch(hostUid);
        await host.send({
          content:
            `📥 **Yêu cầu xác nhận thanh toán YouTube Premium**\n\n` +
            `👤 Thành viên: **${submission.member_name}** (<@${submission.discord_uid}>)\n` +
            `📅 Kỳ: **${submission.periods}**\n` +
            `🔢 Số tháng: **${parseCompactPaymentPeriods(submission.periods).length}**\n` +
            `💰 Số tiền: **${submission.amount}**\n` +
            `🏦 Phương thức: **${submission.method}**\n` +
            `🧾 Bill: ${submission.proof_url}`,
          components: [createPaymentReviewButtonRow(submission.id)],
        });
      } catch (error) {
        console.error(`[yt-payment] failed to DM host="${hostUid}"`, error);
      }
    }),
  );
}

export async function handleYoutubePaymentReviewButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!isPaymentHost(interaction.user.id)) {
    await interaction.reply({
      content: "❌ Bạn không có quyền duyệt thanh toán YouTube Premium.",
      ephemeral: true,
    });
    return;
  }

  const isConfirm = interaction.customId.startsWith(
    PAYMENT_CONFIRM_BUTTON_PREFIX,
  );
  const submissionId = interaction.customId.replace(
    isConfirm ? PAYMENT_CONFIRM_BUTTON_PREFIX : PAYMENT_REJECT_BUTTON_PREFIX,
    "",
  );

  await interaction.deferReply({ ephemeral: true });

  if (!acquirePaymentReviewLock(submissionId)) {
    await interaction.editReply(
      "⏳ Yêu cầu này đang được xử lý, vui lòng chờ.",
    );
    return;
  }

  try {
    const result = isConfirm
      ? await confirmPaymentSubmission(submissionId, interaction.user.id)
      : await rejectPaymentSubmission(submissionId, interaction.user.id);

    await interaction.editReply(result.message);
    await removePaymentReviewButtons(interaction);

    if (result.didProcess) {
      await notifyPaymentSubmitter(
        interaction.client,
        result.submission,
        isConfirm,
      ).catch((error) =>
        console.error("[yt-payment] failed to notify submitter", error),
      );
    }
  } catch (error) {
    console.error("[yt-payment] failed to review payment submission", error);
    await interaction.editReply(
      "❌ Duyệt thanh toán thất bại. Vui lòng thử lại hoặc kiểm tra log bot.",
    );
  } finally {
    releasePaymentReviewLock(submissionId);
  }
}

export async function confirmPaymentSubmission(
  submissionId: string,
  reviewerUid: string,
): Promise<{
  submission: PaymentSubmissionRecord;
  monthColumns: string[];
  message: string;
  didProcess: boolean;
}> {
  const { row, submission } = await findPaymentSubmissionRowById(submissionId);

  if (submission.status !== "pending") {
    return {
      submission,
      monthColumns: getMonthColumnsFromPeriods(submission.periods),
      message: `⚠️ Payment request này đã được xử lý với status: ${submission.status}.`,
      didProcess: false,
    };
  }

  const reviewedAt = dayjs().toISOString();
  const months = parseCompactPaymentPeriods(submission.periods);
  const monthColumns = months.map(getMonthColumnFromMonth);
  const submittedYear = getYearFromPeriods(submission.periods);

  row.assign({
    status: "confirmed",
    reviewed_at: reviewedAt,
    reviewed_by: reviewerUid,
  });
  await row.save();

  const confirmedSubmission = {
    ...submission,
    status: "confirmed" as const,
    reviewed_at: reviewedAt,
    reviewed_by: reviewerUid,
  };

  const historySheet = await getOrCreatePaymentHistorySheet();
  await historySheet.addRows(
    months.map((month) =>
      toRawRow({
        id: confirmedSubmission.id,
        created_at: confirmedSubmission.submitted_at,
        confirmed_at: reviewedAt,
        member_name: confirmedSubmission.member_name,
        discord_uid: confirmedSubmission.discord_uid,
        email: confirmedSubmission.email,
        period: monthToPeriod(month, submittedYear),
        amount: confirmedSubmission.amount,
        method: confirmedSubmission.method,
        proof_url: confirmedSubmission.proof_url,
        status: "confirmed",
        confirmed_by: reviewerUid,
        note: "",
      } satisfies PaymentHistoryRecord),
    ),
  );

  await markYoutubePremiumMonthsPaid(
    confirmedSubmission.discord_uid,
    monthColumns,
  );

  return {
    submission: confirmedSubmission,
    monthColumns,
    message: `✅ Đã xác nhận thanh toán ${confirmedSubmission.member_name} - ${confirmedSubmission.periods}. Đã update ${monthColumns.join(", ")} = TRUE.`,
    didProcess: true,
  };
}

export async function rejectPaymentSubmission(
  submissionId: string,
  reviewerUid: string,
): Promise<{
  submission: PaymentSubmissionRecord;
  monthColumns: string[];
  message: string;
  didProcess: boolean;
}> {
  const { row, submission } = await findPaymentSubmissionRowById(submissionId);

  if (submission.status !== "pending") {
    return {
      submission,
      monthColumns: getMonthColumnsFromPeriods(submission.periods),
      message: `⚠️ Payment request này đã được xử lý với status: ${submission.status}.`,
      didProcess: false,
    };
  }

  const reviewedAt = dayjs().toISOString();

  row.assign({
    status: "rejected",
    reviewed_at: reviewedAt,
    reviewed_by: reviewerUid,
  });
  await row.save();

  const rejectedSubmission = {
    ...submission,
    status: "rejected" as const,
    reviewed_at: reviewedAt,
    reviewed_by: reviewerUid,
  };

  return {
    submission: rejectedSubmission,
    monthColumns: getMonthColumnsFromPeriods(submission.periods),
    message: `❌ Đã từ chối thanh toán ${rejectedSubmission.member_name} - ${rejectedSubmission.periods}.`,
    didProcess: true,
  };
}

async function removePaymentReviewButtons(
  interaction: ButtonInteraction,
): Promise<void> {
  try {
    await interaction.message.edit({ components: [] });
  } catch (error) {
    console.warn("[yt-payment] failed to remove review buttons", error);
  }
}

export async function getConfirmedPaymentHistoryByDiscordUid(
  discordUid: string,
): Promise<PaymentHistoryRecord[]> {
  const historySheet = await getOrCreatePaymentHistorySheet();
  const rows = await historySheet.getRows();

  return rows
    .map((row) => paymentHistoryFromRow(row))
    .filter(
      (record) =>
        record.discord_uid === discordUid && record.status === "confirmed",
    )
    .sort((a, b) => b.confirmed_at.localeCompare(a.confirmed_at));
}

async function findYoutubePremiumMemberByDiscordUid(discordUid: string) {
  const sheet = await getYoutubePremiumWorksheet();
  const rows = await sheet.getRows();
  const row = rows.find(
    (candidate) => candidate.get("discord uid") === discordUid,
  );

  if (!row) return null;

  return {
    row,
    name: String(row.get("Tên") ?? ""),
    email: String(row.get("Email") ?? ""),
  };
}

async function markYoutubePremiumMonthsPaid(
  discordUid: string,
  monthColumns: string[],
): Promise<void> {
  const member = await findYoutubePremiumMemberByDiscordUid(discordUid);

  if (!member) {
    throw new Error(
      `Không tìm thấy Discord UID ${discordUid} để update tháng.`,
    );
  }

  for (const monthColumn of monthColumns) {
    member.row.set(monthColumn, "TRUE");
  }

  await member.row.save();
}

async function findPaymentSubmissionRowById(submissionId: string): Promise<{
  row: GoogleSpreadsheetRow;
  submission: PaymentSubmissionRecord;
}> {
  const submissionsSheet = await getOrCreatePaymentSubmissionsSheet();
  const rows = await submissionsSheet.getRows();
  const row = rows.find((candidate) => candidate.get("id") === submissionId);

  if (!row) {
    throw new Error(`Không tìm thấy payment submission id=${submissionId}.`);
  }

  return {
    row,
    submission: paymentSubmissionFromRow(row),
  };
}

async function getOrCreatePaymentSubmissionsSheet() {
  return getOrCreateWorksheet(
    PAYMENT_SUBMISSIONS_SHEET_TITLE,
    PAYMENT_SUBMISSION_HEADERS,
  );
}

async function getOrCreatePaymentHistorySheet() {
  return getOrCreateWorksheet(
    PAYMENT_HISTORY_SHEET_TITLE,
    PAYMENT_HISTORY_HEADERS,
  );
}

async function getOrCreateWorksheet(title: string, headers: string[]) {
  const doc = await getGoogleSheet();
  const existingSheet = doc.sheetsByTitle[title];

  if (existingSheet) {
    await existingSheet.loadHeaderRow();
    return existingSheet;
  }

  return doc.addSheet({
    title,
    headerValues: headers,
  });
}

function paymentSubmissionFromRow(
  row: GoogleSpreadsheetRow,
): PaymentSubmissionRecord {
  return {
    id: String(row.get("id") ?? ""),
    submitted_at: String(row.get("submitted_at") ?? ""),
    member_name: String(row.get("member_name") ?? ""),
    discord_uid: String(row.get("discord_uid") ?? ""),
    email: String(row.get("email") ?? ""),
    periods: String(row.get("periods") ?? ""),
    amount: String(row.get("amount") ?? ""),
    method: String(row.get("method") ?? ""),
    proof_url: String(row.get("proof_url") ?? ""),
    status: String(
      row.get("status") ?? "pending",
    ) as PaymentSubmissionRecord["status"],
    reviewed_at: String(row.get("reviewed_at") ?? ""),
    reviewed_by: String(row.get("reviewed_by") ?? ""),
    review_note: String(row.get("review_note") ?? ""),
  };
}

function paymentHistoryFromRow(
  row: GoogleSpreadsheetRow,
): PaymentHistoryRecord {
  return {
    id: String(row.get("id") ?? ""),
    created_at: String(row.get("created_at") ?? ""),
    confirmed_at: String(row.get("confirmed_at") ?? ""),
    member_name: String(row.get("member_name") ?? ""),
    discord_uid: String(row.get("discord_uid") ?? ""),
    email: String(row.get("email") ?? ""),
    period: String(row.get("period") ?? ""),
    amount: String(row.get("amount") ?? ""),
    method: String(row.get("method") ?? ""),
    proof_url: String(row.get("proof_url") ?? ""),
    status: String(
      row.get("status") ?? "confirmed",
    ) as PaymentHistoryRecord["status"],
    confirmed_by: String(row.get("confirmed_by") ?? ""),
    note: String(row.get("note") ?? ""),
  };
}

function toRawRow(record: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, String(value ?? "")]),
  );
}

function getUnpaidMonthsFromRow(row: GoogleSpreadsheetRow): number[] {
  const unpaidMonths: number[] = [];

  for (let month = 1; month <= 12; month += 1) {
    if (String(row.get(`Tháng ${month}`) ?? "").toUpperCase() !== "TRUE") {
      unpaidMonths.push(month);
    }
  }

  return unpaidMonths;
}

function getDraftIdFromButtonId(customId: string): string {
  if (customId.startsWith(PAYMENT_DRAFT_MONTH_BUTTON_PREFIX)) {
    return customId
      .replace(PAYMENT_DRAFT_MONTH_BUTTON_PREFIX, "")
      .split(":")[0];
  }

  if (customId.startsWith(PAYMENT_DRAFT_SUBMIT_BUTTON_PREFIX)) {
    return customId.replace(PAYMENT_DRAFT_SUBMIT_BUTTON_PREFIX, "");
  }

  return customId.replace(PAYMENT_DRAFT_CANCEL_BUTTON_PREFIX, "");
}

function formatPeriodRange(
  startMonth: number,
  endMonth: number,
  year: number,
): string {
  const start = String(startMonth).padStart(2, "0");
  const end = String(endMonth).padStart(2, "0");

  return startMonth === endMonth
    ? `${start}/${year}`
    : `${start}-${end}/${year}`;
}

function getMonthColumnsFromPeriods(periods: string): string[] {
  return parseCompactPaymentPeriods(periods).map(getMonthColumnFromMonth);
}

function getYearFromPeriods(periods: string): number {
  const yearMatch = /(\d{4})/.exec(periods);

  return yearMatch ? Number(yearMatch[1]) : dayjs().year();
}

async function notifyPaymentSubmitter(
  client: Client,
  submission: PaymentSubmissionRecord,
  isConfirmed: boolean,
): Promise<void> {
  const user = await client.users.fetch(submission.discord_uid);
  await user.send(
    isConfirmed
      ? `✅ Thanh toán YouTube Premium kỳ ${submission.periods} của bạn đã được xác nhận.`
      : `❌ Thanh toán YouTube Premium kỳ ${submission.periods} của bạn đã bị từ chối. Vui lòng kiểm tra lại bill hoặc liên hệ chủ host.`,
  );
}
