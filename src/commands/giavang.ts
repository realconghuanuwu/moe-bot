import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { fetchGoldPrice } from "../lib/scraper.js";

export class GiaVangCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "giavang",
      description: "Xem giá vàng hôm nay (SJC, DOJI, PNJ)",
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("giavang")
        .setDescription("Xem giá vàng hôm nay (SJC, DOJI, PNJ)"),
    );
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();

    try {
      const { prices, updatedAt } = await fetchGoldPrice();

      if (!prices || prices.length === 0) {
        return interaction.editReply(
          "Không tìm thấy dữ liệu giá vàng. Có thể trang web nguồn đã thay đổi cấu trúc.",
        );
      }

      const embed = new EmbedBuilder()
        .setTitle("🟡 Bảng Giá Vàng Hôm Nay")
        .setURL("https://simplize.vn/gia-vang")
        .setDescription(`🕒 Cập nhật lúc: **${updatedAt}**`)
        .setColor("#FFD700")
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/2653/2653512.png")
        .setTimestamp()
        .setFooter({ text: "Nguồn: simplize.vn • Đơn vị: VNĐ" });

      // Lấy tối đa 8 loại vàng quan trọng nhất để hiển thị trực quan và đẹp mắt
      prices.slice(0, 8).forEach((item) => {
        const buyDiffStr = item.buyDiff
          ? item.buyDiff.startsWith("-")
            ? `📉 \`${item.buyDiff}\``
            : `📈 \`${item.buyDiff}\``
          : "";
        const sellDiffStr = item.sellDiff
          ? item.sellDiff.startsWith("-")
            ? `📉 \`${item.sellDiff}\``
            : `📈 \`${item.sellDiff}\``
          : "";

        embed.addFields({
          name: `✨ ${item.name}`,
          value: `🛒 Mua: **${item.buy}** ${buyDiffStr}\n💰 Bán: **${item.sell}** ${sellDiffStr}`,
          inline: false,
        });
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "Đã xảy ra lỗi khi lấy dữ liệu giá vàng. Master vui lòng thử lại sau nà~",
      );
    }
  }
}
