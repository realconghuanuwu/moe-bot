import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { fetchFuelPrice } from "../lib/scraper.js";

export class GiaXangCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "giaxang",
      description: "Xem giá xăng dầu hôm nay (PVOIL)",
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("giaxang")
        .setDescription("Xem giá xăng dầu hôm nay (PVOIL)"),
    );
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();

    try {
      const { prices, updatedAt } = await fetchFuelPrice();

      if (!prices || !prices.length) {
        return interaction.editReply(
          "Không tìm thấy dữ liệu giá xăng dầu. Có thể trang web nguồn đã thay đổi cấu trúc.",
        );
      }

      const embed = new EmbedBuilder()
        .setTitle("⛽ Bảng Giá Xăng Dầu PVOIL")
        .setURL("https://www.pvoil.com.vn/tin-gia-xang-dau")
        .setColor("#ED1C24")
        .setTimestamp()
        .setFooter({ text: "Nguồn: pvoil.com.vn" });

      const priceList = prices
        .map((p) => `**${p.name}**\n💰 Giá bán lẻ: \`${p.price}\``)
        .join("\n\n");
      const description = `🕒 **${updatedAt}**\n\n${priceList}`;

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
