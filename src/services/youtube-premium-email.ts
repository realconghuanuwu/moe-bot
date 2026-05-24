import nodemailer from "nodemailer";
import {
  YOUTUBE_PREMIUM_MB_PAYMENT_URL,
  YOUTUBE_PREMIUM_MB_QR_IMAGE_URL,
  YOUTUBE_PREMIUM_MOMO_PAYMENT_URL,
  YOUTUBE_PREMIUM_MOMO_QR_IMAGE_URL,
  getYoutubePremiumPaymentAmountDisplay,
  YOUTUBE_PREMIUM_SHEET_URL,
} from "../constants/youtube-premium.constant.js";
import {
  formatCompactUnpaidMonths,
  type ReminderNotifier,
  type YoutubePremiumReminderBatch,
} from "./youtube-premium-reminder.js";
import type { YoutubePremiumReminderCandidate } from "./youtube-premium-reminder-rules.js";

export interface EmailTransporter {
  sendMail(options: EmailMessageOptions): Promise<unknown>;
}

export interface EmailMessageOptions {
  from: string;
  to: string;
  bcc?: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailReminderConfig {
  from: string;
  hostBccEmail?: string;
}

export interface PaymentConfirmedEmailInput {
  memberName: string;
  email: string;
  periods: string;
  amount: string;
  method: string;
  proofUrl: string;
  confirmedAt: string;
}

export class EmailReminderNotifier implements ReminderNotifier {
  public constructor(
    private readonly transporter: EmailTransporter,
    private readonly config: EmailReminderConfig,
  ) {}

  public async notify(batch: YoutubePremiumReminderBatch): Promise<void> {
    if (batch.candidates.length === 0) return;

    if (!this.config.hostBccEmail) {
      console.warn(
        "[yt-email] YT_HOST_BCC_EMAIL missing; sending without BCC.",
      );
    }

    for (const candidate of batch.candidates) {
      if (!candidate.email) {
        console.warn(
          `[yt-email] skipped row=${candidate.rowNumber ?? "unknown"} name="${candidate.name}" reason="missing email"`,
        );
        continue;
      }

      try {
        await this.transporter.sendMail(
          buildYoutubePremiumEmailMessage(candidate, batch, this.config),
        );
        console.log(
          `[yt-email] sent to="${candidate.email}" name="${candidate.name}"`,
        );
      } catch (error) {
        console.error(
          `[yt-email] failed to="${candidate.email}" name="${candidate.name}"`,
          error,
        );
      }
    }
  }
}

export function createEmailReminderNotifierFromEnv(): EmailReminderNotifier | null {
  if (process.env.YT_EMAIL_ENABLED !== "true") return null;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    console.warn(
      "[yt-email] SMTP_HOST, SMTP_USER, SMTP_PASS, or SMTP_FROM missing; email disabled.",
    );
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
  });

  return new EmailReminderNotifier(transporter, {
    from,
    hostBccEmail: process.env.YT_HOST_BCC_EMAIL,
  });
}

export async function sendYoutubePremiumPaymentConfirmedEmailFromEnv(
  payment: PaymentConfirmedEmailInput,
): Promise<void> {
  if (process.env.YT_EMAIL_ENABLED !== "true") return;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    console.warn(
      "[yt-payment-email] SMTP_HOST, SMTP_USER, SMTP_PASS, or SMTP_FROM missing; email disabled.",
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
  });

  await sendYoutubePremiumPaymentConfirmedEmail(transporter, { from }, payment);
}

export async function sendYoutubePremiumPaymentConfirmedEmail(
  transporter: EmailTransporter,
  config: Pick<EmailReminderConfig, "from">,
  payment: PaymentConfirmedEmailInput,
): Promise<void> {
  if (!payment.email) {
    console.warn(
      `[yt-payment-email] skipped name="${payment.memberName}" reason="missing email"`,
    );
    return;
  }

  try {
    await transporter.sendMail(
      buildYoutubePremiumPaymentConfirmedEmailMessage(payment, config),
    );
    console.log(
      `[yt-payment-email] sent confirmation to="${payment.email}" name="${payment.memberName}"`,
    );
  } catch (error) {
    console.error(
      `[yt-payment-email] failed to="${payment.email}" name="${payment.memberName}"`,
      error,
    );
  }
}

export function buildYoutubePremiumPaymentConfirmedEmailMessage(
  payment: PaymentConfirmedEmailInput,
  config: Pick<EmailReminderConfig, "from">,
): EmailMessageOptions {
  return {
    from: config.from,
    to: payment.email,
    subject: "Xác nhận thanh toán YouTube Premium thành công",
    text: buildYoutubePremiumPaymentConfirmedEmailText(payment),
    html: buildYoutubePremiumPaymentConfirmedEmailHtml(payment),
  };
}

export function buildYoutubePremiumEmailMessage(
  candidate: YoutubePremiumReminderCandidate,
  batch: YoutubePremiumReminderBatch,
  config: EmailReminderConfig,
): EmailMessageOptions {
  const dueDate =
    candidate.dueDateStatus === "valid"
      ? candidate.dueDateRaw
      : `${candidate.dueDateRaw || "Chưa có"} (${candidate.dueDateStatus})`;
  const unpaidMonths = formatCompactUnpaidMonths(
    candidate.unpaidMonths,
    batch.today.year(),
  );
  const subject = "Thông báo đến hạn thanh toán phí YouTube Premium";
  const text = buildYoutubePremiumEmailText(
    candidate.name,
    dueDate,
    unpaidMonths,
  );
  const html = buildYoutubePremiumEmailHtml(
    candidate.name,
    dueDate,
    unpaidMonths,
  );

  return {
    from: config.from,
    to: candidate.email,
    bcc: config.hostBccEmail || undefined,
    subject,
    text,
    html,
  };
}

export function buildYoutubePremiumEmailText(
  name: string,
  dueDate: string,
  billingPeriod: string,
): string {
  return (
    `Thông báo đến hạn thanh toán phí YouTube Premium\n` +
    `Kỳ ${billingPeriod}\n\n` +
    `Kính gửi anh/chị ${name || "bạn"},\n\n` +
    `Đến thời điểm hiện tại, phí sử dụng dịch vụ YouTube Premium cho kỳ nêu trên đã đến hạn thanh toán. ` +
    `Anh/chị vui lòng xem thông tin chi tiết bên dưới và chủ động hoàn tất thanh toán giúp em trong thời gian sớm nhất.\n\n` +
    `Số tiền: ${getYoutubePremiumPaymentAmountDisplay()}\n` +
    `Hạn chót: trước ${dueDate}\n\n` +
    `Thông tin thanh toán\n\n` +
    `MB Bank\n` +
    `Số tài khoản: 1010100007214\n` +
    `Chủ tài khoản: LUONG CONG HUAN\n` +
    `Thanh toán qua MB Bank: ${YOUTUBE_PREMIUM_MB_PAYMENT_URL}\n\n` +
    `MoMo\n` +
    `Số điện thoại: 0915364692\n` +
    `Tên ví: LUONG CONG HUAN\n` +
    `Thanh toán qua MoMo: ${YOUTUBE_PREMIUM_MOMO_PAYMENT_URL}\n\n` +
    `Theo dõi tiến độ thanh toán\n` +
    `Anh/chị có thể theo dõi trạng thái thanh toán của mình tại bảng tổng hợp dưới đây:\n` +
    `${YOUTUBE_PREMIUM_SHEET_URL}\n\n` +
    `Sau khi hoàn tất thanh toán, anh/chị vui lòng phản hồi lại hoặc sử dụng lệnh \`/yt-submit\` trên Discord để gửi bill xác nhận. Xin cảm ơn sự hợp tác của anh/chị.\n`
  );
}

export function buildYoutubePremiumEmailHtml(
  name: string,
  dueDate: string,
  billingPeriod: string,
): string {
  const safeName = escapeHtml(name || "bạn");
  const safeDueDate = escapeHtml(dueDate);
  const safeBillingPeriod = escapeHtml(billingPeriod);
  const safeAmount = escapeHtml(getYoutubePremiumPaymentAmountDisplay());

  return `
<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
      <h1 style="margin:0 0 8px;text-align:center;font-size:22px;line-height:1.35;color:#111827;">
        Thông báo đến hạn thanh toán phí YouTube Premium
      </h1>
      <div style="text-align:center;font-size:18px;font-weight:700;margin-bottom:28px;color:#111827;">
        Kỳ ${safeBillingPeriod}
      </div>

      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;">Kính gửi anh/chị <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.7;">
        Đến thời điểm hiện tại, phí sử dụng dịch vụ <strong>YouTube Premium</strong> cho kỳ nêu trên đã đến hạn thanh toán.
        Anh/chị vui lòng xem thông tin chi tiết bên dưới và chủ động hoàn tất thanh toán giúp em trong thời gian sớm nhất.
      </p>

      <ul style="margin:0 0 22px;padding-left:22px;font-size:14px;line-height:1.8;">
        <li><strong>Số tiền:</strong> ${safeAmount}</li>
        <li><strong>Hạn chót:</strong> trước ${safeDueDate}</li>
      </ul>

      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:22px;text-align:center;margin-bottom:22px;">
        <h2 style="margin:0 0 18px;font-size:16px;color:#111827;">Thông tin thanh toán</h2>

        <h3 style="margin:0 0 8px;font-size:15px;color:#111827;">MB Bank</h3>
        <p style="margin:0 0 4px;font-size:13px;line-height:1.5;"><strong>Số tài khoản:</strong> 1010100007214</p>
        <p style="margin:0 0 12px;font-size:13px;line-height:1.5;"><strong>Chủ tài khoản:</strong> LUONG CONG HUAN</p>
        <img src="${YOUTUBE_PREMIUM_MB_QR_IMAGE_URL}" alt="QR MB Bank" width="220" style="display:block;margin:0 auto 14px;max-width:220px;width:100%;height:auto;border:0;">
        <a href="${YOUTUBE_PREMIUM_MB_PAYMENT_URL}" style="display:inline-block;background:#0f6f9f;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:999px;padding:11px 20px;margin-bottom:24px;">
          Thanh toán qua MB Bank
        </a>

        <h3 style="margin:0 0 8px;font-size:15px;color:#111827;">MoMo</h3>
        <p style="margin:0 0 4px;font-size:13px;line-height:1.5;"><strong>Số điện thoại:</strong> 0915364692</p>
        <p style="margin:0 0 12px;font-size:13px;line-height:1.5;"><strong>Tên ví:</strong> LUONG CONG HUAN</p>
        <img src="${YOUTUBE_PREMIUM_MOMO_QR_IMAGE_URL}" alt="QR MoMo" width="180" style="display:block;margin:0 auto 14px;max-width:180px;width:100%;height:auto;border:0;">
        <a href="${YOUTUBE_PREMIUM_MOMO_PAYMENT_URL}" style="display:inline-block;background:#e83f92;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:999px;padding:11px 20px;">
          Thanh toán qua MoMo
        </a>
      </div>

      <div style="background:#eef3ff;border:1px solid #cddafe;border-radius:10px;padding:20px;text-align:center;margin-bottom:22px;">
        <h2 style="margin:0 0 10px;font-size:16px;color:#3049d6;">Theo dõi tiến độ thanh toán</h2>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#1f2937;">
          Anh/chị có thể theo dõi trạng thái thanh toán của mình tại bảng tổng hợp dưới đây:
        </p>
        <a href="${YOUTUBE_PREMIUM_SHEET_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:999px;padding:11px 22px;">
          Xem bảng theo dõi thanh toán
        </a>
      </div>

      <p style="margin:0;font-size:13px;line-height:1.7;color:#374151;">
        Sau khi hoàn tất thanh toán, anh/chị vui lòng phản hồi lại hoặc sử dụng lệnh <code>/yt-submit</code> trên Discord để gửi bill xác nhận. Xin cảm ơn sự hợp tác của anh/chị.
      </p>
    </div>
  </body>
</html>`;
}

export function buildYoutubePremiumPaymentConfirmedEmailText(
  payment: PaymentConfirmedEmailInput,
): string {
  return (
    `Xác nhận thanh toán YouTube Premium thành công\n\n` +
    `Kính gửi anh/chị ${payment.memberName || "bạn"},\n\n` +
    `Thanh toán YouTube Premium kỳ ${payment.periods} của anh/chị đã được chủ host xác nhận.\n\n` +
    `Thông tin thanh toán\n` +
    `Kỳ thanh toán: ${payment.periods}\n` +
    `Số tiền: ${payment.amount}\n` +
    `Phương thức: ${payment.method}\n` +
    `Thời gian xác nhận: ${formatEmailDateTime(payment.confirmedAt)}\n` +
    `Bill: ${payment.proofUrl}\n` +
    `Bảng theo dõi: ${YOUTUBE_PREMIUM_SHEET_URL}\n\n` +
    `Anh/chị có thể dùng lệnh /yt-history trên Discord để xem lại lịch sử thanh toán đã xác nhận.\n` +
    `Cảm ơn anh/chị đã hoàn tất thanh toán.`
  );
}

export function buildYoutubePremiumPaymentConfirmedEmailHtml(
  payment: PaymentConfirmedEmailInput,
): string {
  const safeName = escapeHtml(payment.memberName || "bạn");
  const safePeriods = escapeHtml(payment.periods);
  const safeAmount = escapeHtml(payment.amount);
  const safeMethod = escapeHtml(payment.method);
  const safeConfirmedAt = escapeHtml(formatEmailDateTime(payment.confirmedAt));
  const safeProofUrl = escapeHtml(payment.proofUrl);

  return `
<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
        <h1 style="margin:0 0 8px;text-align:center;font-size:22px;line-height:1.35;color:#15803d;">
          Thanh toán YouTube Premium đã được xác nhận
        </h1>
        <p style="margin:0 0 24px;text-align:center;font-size:15px;color:#374151;">
          Kỳ ${safePeriods}
        </p>

        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;">Kính gửi anh/chị <strong>${safeName}</strong>,</p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.7;">
          Thanh toán phí sử dụng dịch vụ <strong>YouTube Premium</strong> của anh/chị đã được chủ host xác nhận.
        </p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;"><strong>Kỳ thanh toán:</strong> ${safePeriods}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Số tiền:</strong> ${safeAmount}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Phương thức:</strong> ${safeMethod}</p>
          <p style="margin:0;font-size:14px;"><strong>Thời gian xác nhận:</strong> ${safeConfirmedAt}</p>
        </div>

        <div style="text-align:center;margin-bottom:20px;">
          <a href="${safeProofUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:999px;padding:11px 20px;margin:0 4px 8px;">
            Xem bill đã gửi
          </a>
          <a href="${YOUTUBE_PREMIUM_SHEET_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:999px;padding:11px 20px;margin:0 4px 8px;">
            Xem bảng theo dõi
          </a>
        </div>

        <p style="margin:0;font-size:13px;line-height:1.7;color:#374151;">
          Anh/chị có thể dùng lệnh <code>/yt-history</code> trên Discord để xem lại lịch sử thanh toán đã xác nhận.
          Cảm ơn anh/chị đã hoàn tất thanh toán.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function formatEmailDateTime(value: string): string {
  if (!value) return "Không rõ";

  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
