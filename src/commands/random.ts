import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import axios from "axios";
import { readFile } from "fs/promises";

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

      try {
        const backupRaw = await readFile(new URL("../json/backup-van-mau.json", import.meta.url), "utf-8");
        const backupData = JSON.parse(backupRaw);
        const posts = backupData.posts;
        
        if (posts && posts.length > 0) {
          const randomPost = posts[Math.floor(Math.random() * posts.length)];
          const embed = new EmbedBuilder()
            .setTitle(randomPost.title || "Không có tiêu đề")
            .setDescription(randomPost.content || "Không có nội dung")
            .setColor("#ffab00");

          await interaction.editReply({ content: "*(Sử dụng dữ liệu backup do API lỗi)*", embeds: [embed] });
          return;
        }
      } catch (backupError) {
        console.error("Lỗi khi đọc file backup:", backupError);
      }

      await interaction.editReply(
        "❌ Đã xảy ra lỗi khi lấy bài viết, vui lòng thử lại sau.",
      );
    }
  }
}
