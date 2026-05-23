import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { getConfirmedPaymentHistoryByDiscordUid } from "../services/youtube-premium-payments.js";

const MAX_HISTORY_RECORDS = 8;

export class YtHistoryCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "yt-history",
      description: "Xem lịch sử thanh toán",
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const records = await getConfirmedPaymentHistoryByDiscordUid(
        interaction.user.id,
      );

      if (records.length === 0) {
        await interaction.editReply(
          "Bạn chưa có lịch sử thanh toán đã xác nhận.",
        );
        return;
      }

      const shownRecords = records.slice(0, MAX_HISTORY_RECORDS);
      const embed = new EmbedBuilder()
        .setTitle("📜 Lịch sử thanh toán YouTube Premium")
        .setColor(0x4f46e5)
        .setFooter({
          text:
            records.length > shownRecords.length
              ? `Hiển thị ${shownRecords.length}/${records.length} giao dịch mới nhất`
              : `${records.length} giao dịch đã xác nhận`,
        });

      for (const record of shownRecords) {
        const confirmedAt = record.confirmed_at
          ? new Date(record.confirmed_at).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })
          : "Không rõ";

        embed.addFields({
          name: `${record.period} - ${record.amount}`,
          value:
            `🏦 ${record.method}\n` +
            `✅ ${confirmedAt}\n` +
            `🧾 [Xem bill](${record.proof_url})`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[yt-history] failed", error);
      await interaction.editReply(
        "❌ Không thể đọc lịch sử thanh toán, vui lòng thử lại sau.",
      );
    }
  }
}
