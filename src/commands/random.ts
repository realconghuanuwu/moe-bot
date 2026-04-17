import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import axios from "axios";

export class RandomCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "van-mau",
      description: "Lấy một bài văn mẫu ngẫu nhiên",
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const response = await axios.get(
        "https://api.ditmenavi.com/api/posts/random",
      );
      const { title, content } = response.data;

      const embed = new EmbedBuilder()
        .setTitle(title || "Không có tiêu đề")
        .setDescription(content || "Không có nội dung")
        .setColor("#ffab00");

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in /van-mau command:", error);
      await interaction.editReply(
        "❌ Đã xảy ra lỗi khi lấy bài viết, vui lòng thử lại sau.",
      );
    }
  }
}
