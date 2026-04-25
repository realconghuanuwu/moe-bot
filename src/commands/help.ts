import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "help",
      description: "Hiển thị danh sách tất cả các lệnh và hướng dẫn sử dụng bot",
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("🤖 Moe Bot - Hướng Dẫn Sử Dụng")
      .setColor("#FFD700") // Màu vàng kim loại sang trọng
      .setThumbnail(this.container.client.user?.displayAvatarURL() || null)
      .setDescription(
        "Chào mừng bạn đến với Moe Bot! Dưới đây là danh sách các lệnh đang hoạt động trên hệ thống.",
      )
      .addFields(
        {
          name: "🎭 Giải Trí & Văn Mẫu",
          value:
            "**/van-mau random** [tts] [toc-do]: Lấy văn mẫu ngẫu nhiên. (Bật `tts` để bot đọc trong phòng Voice).\n**/van-mau stop**: Dừng bot và rời phòng Voice ngay lập tức.\n**/alo** [user]: Gửi văn mẫu đe dọa hài hước đến một người.\n**/xin-loi** [user]: Gửi lời xin lỗi chân thành đến đối phương.",
        },
        {
          name: "📊 Tra Cứu Thông Tin",
          value:
            "**/giavang**: Cập nhật giá vàng trong nước (SJC, Doji...) và quốc tế.\n**/giaxang**: Cập nhật giá xăng dầu (Petrolimex) mới nhất.\n**/chat** [content]: Trò chuyện trực tiếp với trí tuệ nhân tạo AI.",
        },
        {
          name: "⚙️ Tiện Ích Hệ Thống",
          value:
            "**/help**: Hiển thị bảng hướng dẫn này.\n**/ping**: Kiểm tra độ trễ phản hồi của bot.",
        },
      )
      .addFields({
        name: "💡 Mẹo nhỏ",
        value:
          "Khi dùng TTS, bạn có thể chọn tốc độ (x1.5, x2, x3) để nghe văn mẫu theo phong cách 'rap' hoặc 'troll' hơn!",
      })
      .setFooter({
        text: "Moe Bot - Cung cấp bởi realconghuanuwu",
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
