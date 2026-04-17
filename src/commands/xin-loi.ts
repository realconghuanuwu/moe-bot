import { Command } from "@sapphire/framework";

export class XinLoiCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "xin-loi",
      description: "Gửi một lời xin lỗi chân thành sâu sắc đến một người dùng",
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Người bạn muốn xin lỗi")
            .setRequired(true)
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser("user");

    if (!targetUser) {
      await interaction.reply({
        content: "❌ Không tìm thấy người dùng đó.",
        ephemeral: true,
      });
      return;
    }

    const tag = targetUser.toString();
    const sender = interaction.user.toString();

    const responseContent = `Kính gửi: Ban quản trị nhóm
Và đặc biệt gửi đến ${tag},
Mình là ${sender}, thành viên của nhóm. Mình viết đơn này để "chân thành" gửi lời xin lỗi đến bạn ${tag} và những người thích kick war vì đã "phản ứng thiếu kiềm chế" trước những nội dung "rất sáng tạo" của bạn. Cụ thể là bạn muốn tạo bait/content ngu mục đích để ăn chửi chứ content ngu như thế không chửi cũng uổng
Mình nhận ra rằng, mình và mọi người đã chiều theo ý bạn và chửi bạn đã khiến bạn cay cú và chửi ngược lại mọi người trong cộng đồng . Mình xin lỗi vì đã không thấu hiểu rằng, đôi khi "làm content ngu cũng là một nghệ thuật", và việc bạn kiên trì theo đuổi phong cách "khác biệt" như vậy đáng được tôn trọng.
Mình hứa sẽ cố gắng kiềm chế hơn trong tương lai, dù đôi khi vẫn khó hiểu tại sao một số bài viết "chất lượng cao" lại nhận về toàn reaction trái chiều. 
Hy vọng ${tag} và những thành viên có cùng gu sáng tạo sẽ tiếp tục đóng góp cho nhóm những content/bait ngu như thế này để group nhiệt hơn.`;

    await interaction.reply({ content: responseContent });
  }
}
