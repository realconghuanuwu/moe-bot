import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { fetchFuelPrice } from "../utils/scraper.js";

export class GiaXangCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "giaxang",
      description: "Xem giá xăng dầu hôm nay (Petrolimex)",
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("giaxang")
        .setDescription("Xem giá xăng dầu hôm nay (Petrolimex)"),
    );
  }

  async chatInputRun(interaction) {
    if (interaction.replied || interaction.deferred) return;

    await interaction.deferReply();

    try {
      const { prices, updatedAt } = await fetchFuelPrice();

      if (!prices || !prices.length) {
        return interaction.editReply(
          "Không tìm thấy dữ liệu giá xăng dầu. Có thể trang web nguồn đã thay đổi cấu trúc.",
        );
      }

      const embed = new EmbedBuilder()
        .setTitle("⛽ Bảng Giá Xăng Dầu Petrolimex")
        .setColor("#ED1C24")
        .setTimestamp()
        .setFooter({ text: "Nguồn: bbw.vn, webgia.com" });

      const priceList = prices
        .map(
          (p: any) =>
            `**${p.name}**\n📍 Vùng 1: \`${p.v1}\` | Vùng 2: \`${p.v2}\``,
        )
        .join("\n\n");
      const description = `🕒 Cập nhật: **${updatedAt}**\n\n${priceList}`;

      embed.setDescription(description);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "Đã xảy ra lỗi khi lấy dữ liệu giá xăng. Master vui lòng thử lại sau nà~",
      );
    }
  }
}
