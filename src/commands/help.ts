import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "help",
      description: "Hiển thị danh sách tất cả các lệnh của bot",
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    // Lấy tất cả các commands đã được đăng ký trong bot
    const commandsStore = this.container.stores.get("commands");
    const commandsArray = Array.from(commandsStore.values());

    const commandListString = commandsArray
      .filter((cmd) => cmd.name && cmd.description) // Chỉ lấy các lệnh hợp lệ
      .map((cmd) => `**/${cmd.name}**: ${cmd.description}`)
      .join("\n\n");

    const embed = new EmbedBuilder()
      .setTitle("📚 Hướng dẫn sử dụng Bot")
      .setColor("#ffab00")
      .setDescription(
        `Dưới đây là danh sách các lệnh bạn có thể sử dụng:\n\n${commandListString}`,
      )
      .setFooter({
        text: `Tổng số lệnh: ${commandsArray.length}`,
      });

    await interaction.reply({ embeds: [embed] });
  }
}
