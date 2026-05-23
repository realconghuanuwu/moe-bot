import { Command } from "@sapphire/framework";
import {
  buildPaymentDraftMessage,
  createPaymentDraft,
  createPaymentDraftComponents,
} from "../services/youtube-premium-payments.js";

export class YtSubmitPaymentCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "yt-submit",
      description:
        "Gửi bill thanh toán YouTube Premium để chủ host xác nhận (để dễ đối chiếu sau này khỏi blame)",
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addAttachmentOption((option) =>
          option
            .setName("proof")
            .setDescription("Ảnh bill/chuyển khoản")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("method")
            .setDescription("Phương thức thanh toán")
            .setRequired(true)
            .addChoices(
              { name: "MB Bank", value: "MB Bank" },
              { name: "MoMo", value: "MoMo" },
            ),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const proof = interaction.options.getAttachment("proof", true);
      const method = interaction.options.getString("method", true);
      const draft = await createPaymentDraft({
        discordUid: interaction.user.id,
        method,
        proof: {
          url: proof.url,
          contentType: proof.contentType,
          size: proof.size,
        },
      });

      await interaction.editReply({
        content: buildPaymentDraftMessage(draft),
        components: createPaymentDraftComponents(draft),
      });
    } catch (error) {
      console.error("[yt-submit] failed", error);
      await interaction.editReply(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Không thể gửi bill thanh toán, vui lòng thử lại sau.",
      );
    }
  }
}
