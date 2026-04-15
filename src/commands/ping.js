import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { isMessageInstance } from '@sapphire/discord.js-utilities';

export class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'ping',
      aliases: ['pong', 'chokhan'],
      description: 'ping pong'
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('ping').setDescription('Ping bot to see if it is alive')
    );
  }

  async chatInputRun(interaction) {
    const callbackResponse = await interaction.reply({
      content: `Ping?`,
      withResponse: true,
      flags: MessageFlags.Ephemeral
    });
    const msg = callbackResponse.resource?.message;

    console.log(callbackResponse)

    if (msg && isMessageInstance(msg)) {
      const diff = msg.createdTimestamp - interaction.createdTimestamp;
      const ping = Math.round(this.container.client.ws.ping);
      return interaction.editReply(`Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms. dmcs)`);
    }

    return interaction.editReply('Failed to retrieve ping :(');
  }
}