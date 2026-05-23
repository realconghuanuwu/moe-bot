import { Command } from "@sapphire/framework";
import dayjs from "dayjs";
import { getYoutubePremiumWorksheet } from "../utils/google-sheet.js";
import { createYoutubePremiumPaymentButtonRow } from "../services/youtube-premium-payment.js";

export class CheckYtPreCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "yt-status",
      description: "Kiểm tra số tháng chưa thanh toán",
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  async chatInputRun(interaction) {
    // Since Google API calls can be slow, defer the reply
    await interaction.deferReply();

    try {
      const sheet = await getYoutubePremiumWorksheet();

      // Fetch rows from the worksheet
      const rows = await sheet.getRows();
      const userId = interaction.user.id;

      // Find the row where the 'discord uid' column matches the Discord ID
      const userRow = rows.find((row) => row.get("discord uid") === userId);

      if (!userRow) {
        return interaction.editReply(
          "❌ Không tìm thấy Discord UID của bạn trong danh sách.",
        );
      }

      // Get the current month and year
      const now = dayjs();
      const currentYear = now.year();
      const currentMonthIndex = now.month() + 1;
      const currentMonthColumn = `Tháng ${currentMonthIndex}`;

      // 1. Check current month status
      const isCurrentMonthPaid = userRow.get(currentMonthColumn) === "TRUE";
      const dueDate = userRow.get("Hạn Thanh toán");

      // 2. Check all months in the year
      const unpaidMonths: string[] = [];
      for (let i = 1; i <= 12; i++) {
        const monthCol = `Tháng ${i}`;
        if (userRow.get(monthCol) !== "TRUE") {
          // Format month to mm/yyyy
          unpaidMonths.push(`${i.toString().padStart(2, "0")}/${currentYear}`);
        }
      }

      let responseMessage = "";

      // Format Current Month Status
      if (isCurrentMonthPaid) {
        responseMessage += `✅ Bạn đã thanh toán cho **${currentMonthColumn}**.\n\n`;
      } else {
        responseMessage += `⚠️ Bạn **CHƯA** thanh toán cho **${currentMonthColumn}**!\n`;
      }

      if (dueDate) {
        responseMessage += `📅 Hạn thanh toán gần nhất: **${dueDate}**\n`;
      }

      responseMessage += `\n--- **Tình trạng cả năm ${currentYear}** ---\n`;

      // 3. Check all-year status
      if (unpaidMonths.length === 0) {
        responseMessage += `🎉 Tuyệt vời! Bạn đã thanh toán cho **cả năm ${currentYear}**.\n`;
      } else {
        responseMessage += `📌 Các tháng chưa thanh toán:\n> ${unpaidMonths.join(", ")}`;
      }

      await interaction.editReply({
        content: responseMessage,
        components: [createYoutubePremiumPaymentButtonRow()],
      });
    } catch (error) {
      console.error("Error in check-yt-pre command:", error);
      await interaction.editReply(
        `Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.`,
      );
    }
  }
}
