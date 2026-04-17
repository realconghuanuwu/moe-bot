import { Command } from "@sapphire/framework";
import { addMessageToHistory, getHistory } from "../utils/history.js";
import { SYSTEM_PROMP } from "../utils/system-promp.js";
import { OPENAI_MODEL } from "../constants/openai-model.constant.js";

const USED_MODEL = OPENAI_MODEL.GPT_OSS_120B;
export class ChatCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "chat",
      description: `Chat with ChatGPT (${USED_MODEL})`,
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("chat")
        .setDescription("Chat with ChatGPT")
        .addStringOption((option) =>
          option
            .setName("prompt")
            .setDescription("What do you want to say?")
            .setRequired(true),
        ),
    );
  }

  async chatInputRun(interaction) {
    const prompt = interaction.options.getString("prompt", true);

    // AI can take time, so we must defer
    await interaction.deferReply();

    const channelId = interaction.channelId;

    try {
      // Add user message to history
      addMessageToHistory(channelId, "user", prompt);

      const response = await this.container.openai.chat.completions.create({
        model: USED_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMP },
          ...(getHistory(channelId) as any),
        ],
      });

      const replyContent = response.choices[0].message.content || "";

      // Add AI response to history
      addMessageToHistory(channelId, "assistant", replyContent);

      const plainReply = `Bạn hỏi: ${prompt}\nCâu trả lời:\n${replyContent}`;
      return interaction.editReply(plainReply);
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "Đã có lỗi xảy ra, vui lòng thử lại sau hoặc hỏi tôi câu khác nhé!",
      );
    }
  }
}
