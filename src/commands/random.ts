import { Command } from "@sapphire/framework";
import { EmbedBuilder, GuildMember } from "discord.js";
import axios from "axios";
import { readFile } from "fs/promises";
import { voiceManager } from "../utils/voice-manager.js";

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
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand((subcommand) =>
          subcommand
            .setName("random")
            .setDescription("Lấy một bài văn mẫu ngẫu nhiên")
            .addBooleanOption((option) =>
              option
                .setName("tts")
                .setDescription(
                  "Phát giọng nói văn mẫu trong phòng Voice (Tiếng Việt)",
                )
                .setRequired(false),
            )
            .addNumberOption((option) =>
              option
                .setName("toc-do")
                .setDescription("Tốc độ giọng nói (Mặc định: 1x)")
                .addChoices(
                  { name: "1x", value: 1 },
                  { name: "1.5x", value: 1.5 },
                  { name: "2x", value: 2 },
                  { name: "3x", value: 3 },
                )
                .setRequired(false),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand.setName("stop").setDescription("Dừng phát và rời phòng Voice"),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("skip")
            .setDescription("Bỏ qua bài đang phát, phát bài văn mẫu kế trong hàng đợi Voice"),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "stop") {
      return this.handleStop(interaction);
    }

    if (subcommand === "skip") {
      return this.handleSkip(interaction);
    }

    const subcommandOptions =
      interaction.options.data.find((option) => option.name === subcommand)
        ?.options ?? [];
    const ttsOption = subcommandOptions.find((option) => option.name === "tts");
    const tts = typeof ttsOption?.value === "boolean" ? ttsOption.value : true;
    const speed = interaction.options.getNumber("toc-do") ?? 1;
    await interaction.deferReply();

    let finalTitle = "";
    let finalContent = "";
    let isBackup = false;

    try {
      const response = await axios.get(
        "https://api.ditmenavi.com/api/posts/random",
      );
      finalTitle = response.data.title;
      finalContent = response.data.content;
    } catch (error) {
      console.error("Error in /van-mau command API:", error);
      try {
        const backupRaw = await readFile(
          new URL("../json/backup-van-mau.json", import.meta.url),
          "utf-8",
        );
        const backupData = JSON.parse(backupRaw);
        const posts = backupData.posts;

        if (posts && posts.length > 0) {
          const randomPost = posts[Math.floor(Math.random() * posts.length)];
          finalTitle = randomPost.title;
          finalContent = randomPost.content;
          isBackup = true;
        }
      } catch (backupError) {
        console.error("Lỗi khi đọc file backup:", backupError);
      }
    }

    if (!finalContent) {
      await interaction.editReply(
        "❌ Đã xảy ra lỗi khi lấy bài viết, vui lòng thử lại sau.",
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(finalTitle || "Không có tiêu đề")
      .setDescription(
        finalContent.length > 4000
          ? finalContent.substring(0, 3997) + "..."
          : finalContent || "Không có nội dung",
      )
      .setColor("#ffab00");

    await interaction.editReply({
      content: isBackup ? "*(Sử dụng dữ liệu backup do API lỗi)*" : undefined,
      embeds: [embed],
    });

        // Xử lý TTS nếu người dùng yêu cầu
        if (tts) {
          const member = interaction.member as GuildMember;
          if (!member.voice || !member.voice.channel) {
            await interaction.followUp({
              content:
                "❌ Bạn phải tham gia một phòng Voice để sử dụng tính năng TTS!",
              ephemeral: true,
            });
            return;
          }

          const loadingMessage = await interaction.followUp({
            content: "⏳ Đã thêm vào hàng đợi TTS. Bot sẽ tạo giọng khi đến lượt...",
            ephemeral: true,
          });
          const editTtsStatus = async (content: string) => {
            try {
              await interaction.webhook.editMessage(loadingMessage.id, {
                content,
              });
            } catch (error) {
              console.warn("Failed to edit TTS loading message:", error);
            }
          };
          const guildManager = voiceManager.getOrCreateManager(interaction.guildId!);
          
          await guildManager.addToQueue({
            content: finalContent,
            speed: speed,
            guildId: interaction.guildId!,
            channelId: member.voice.channel.id,
            adapterCreator: interaction.guild!.voiceAdapterCreator,
            onTtsProcessing: () =>
              editTtsStatus("⏳ Đang tạo giọng đọc bằng VietNeu TTS, vui lòng chờ..."),
            onTtsFallback: () =>
              editTtsStatus("⚠️ VietNeu TTS bị lỗi hoặc quá chậm. Đang chuyển sang TTS dự phòng..."),
            onTtsReady: (source) =>
              editTtsStatus(
                source === "vietneu"
                  ? "✅ Tạo giọng xong, bot đang phát trong Voice."
                  : "✅ Đã dùng TTS dự phòng, bot đang phát trong Voice.",
              ),
          });
        }
  }

  private async handleStop(interaction: Command.ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const guildManager = voiceManager.getOrCreateManager(guildId);
    guildManager.stop();

    return interaction.reply({
      content: "🛑 Đã dừng phát và xóa hàng đợi âm thanh. Tạm biệt!",
    });
  }

  private async handleSkip(interaction: Command.ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({
        content: "❌ Lệnh chỉ dùng trong server.",
        ephemeral: true,
      });
    }

    const guildManager = voiceManager.getOrCreateManager(guildId);
    const skipped = guildManager.skip();

    return interaction.reply({
      content: skipped
        ? "⏭️ Đã bỏ qua bài hiện tại. Đang phát bài kế trong hàng đợi (nếu còn)."
        : "❌ Không có bài nào đang phát hoặc trong hàng đợi để bỏ qua.",
      ephemeral: true,
    });
  }
}
