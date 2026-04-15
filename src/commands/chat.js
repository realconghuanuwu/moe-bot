import { Command } from '@sapphire/framework';
import { addMessageToHistory, getHistory } from '../lib/history.js';
import { EmbedBuilder } from 'discord.js';
import { SYSTEM_PROMP } from '../utils/system-promp.js';

export class ChatCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'chat',
      description: 'Chat with ChatGPT'
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('chat')
        .setDescription('Chat with ChatGPT')
        .addStringOption((option) =>
          option.setName('prompt').setDescription('What do you want to say?').setRequired(true)
        )
    );
  }

  async chatInputRun(interaction) {
    const prompt = interaction.options.getString('prompt', true);

    // AI can take time, so we must defer
    await interaction.deferReply();

    const channelId = interaction.channelId;
    const history = getHistory(channelId);

    try {
      // Add user message to history
      addMessageToHistory(channelId, 'user', prompt);

      const response = await this.container.openai.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: SYSTEM_PROMP },
          ...getHistory(channelId)
        ]
      });

      const replyContent = response.choices[0].message.content;

      // Add AI response to history
      addMessageToHistory(channelId, 'assistant', replyContent);

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(replyContent)
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setFooter({ text: `${prompt}` })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.editReply('Đã có lỗi xảy ra, vui lòng thử lại sau hoặc hỏi tôi câu khác nhé!');
    }
  }
}
