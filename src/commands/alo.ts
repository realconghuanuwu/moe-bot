import { Command } from "@sapphire/framework";

export class AloCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "alo",
      description: "Đọc văn mẫu cho một người dùng bằng cách tag họ",
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
            .setDescription("Người mà bạn muốn đọc văn mẫu")
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

    const responseContent = `📞 Alo, em có phải ${tag} không?
😨 Ui ${tag} ơi… em đừng có chối 😭
📄 Thông tin về tên 🧑‍💼, địa chỉ nhà 🏡, trường học 🎓, ở đâu 📍, bố mẹ tên là gì 👨‍👩‍👧‍👦… anh có cả ở đây rồi 🗂️🔊 ${tag} có cần anh đọc cho nghe một số thông tin không?… 👂📢
🥺 ${tag} ơi… em còn trẻ quá 👶, hơn con anh có mấy tuổi à 😢
🤦‍♂️Sao ${tag} lại làm thế… 😔
🌱 Còn cả tương lai đằng trước… ✨🎓
🏃‍♂️📬 ${tag} thích anh cho người đến tận nhà nói chuyện với bố mẹ em đấy à?? 😤🏠👮‍♂️
🐧🐧🐧`;

    await interaction.reply({ content: responseContent });
  }
}
