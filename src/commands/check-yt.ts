import { Command } from "@sapphire/framework";
import dayjs from "dayjs";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import { getGoogleSheet } from "../utils/google-sheet.js";
import { IMAGE } from "../constants/image.constant.js";

export class CheckYtPreCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "check-yt-pre",
      description: "Kiểm tra trạng thái thanh toán YouTube Premium",
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
      // Get the document instance
      const doc = await getGoogleSheet();

      // "2112995111" is likely the sheet 'gid' (Worksheet ID).
      const sheet = doc!.sheetsById["2112995111"];

      if (!sheet) {
        return interaction.editReply(
          "❌ Không tìm thấy Sheet với ID 2112995111 trong Document.",
        );
      }

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

      // Add Payment Button
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("pay_yt")
          .setLabel("Hướng dẫn thanh toán")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("💰"),
      );

      const msg = await interaction.editReply({
        content: responseMessage,
        components: [row],
      });

      // Create collector for the button
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000, // 10 minutes
      });

      collector.on("collect", async (i) => {
        if (i.customId === "pay_yt") {
          const payInfo =
            `💰 **Số tiền:** 27.000đ\n\n` +
            `🏦 **Thông tin chuyển khoản:**\n` +
            `**MB Bank:** 1010100007214 (LUONG CONG HUAN)\n` +
            `**MoMo:** 0915364692 (LUONG CONG HUAN)\n\n` +
            `📊 **Xem bảng theo dõi thanh toán tại:** https://url-shortener.me/BU49\n\n`;

          const mbEmbed = new EmbedBuilder()
            .setTitle("QR Code MB Bank")
            .setColor("#004a95")
            .setImage(IMAGE.MB_BANK_QR);

          const momoEmbed = new EmbedBuilder()
            .setTitle("QR Code MoMo")
            .setColor("#a50064")
            .setImage(IMAGE.MOMO_QR);

          await i.reply({
            content: payInfo,
            embeds: [mbEmbed, momoEmbed],
            ephemeral: false,
          });
        }
      });

      collector.on("end", () => {
        // Optionally disable the button after timeout
        (row.components[0] as ButtonBuilder).setDisabled(true);
        interaction.editReply({ components: [row] }).catch(() => {});
      });
    } catch (error) {
      console.error("Error in check-yt-pre command:", error);
      await interaction.editReply(
        `Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.`,
      );
    }
  }
}
