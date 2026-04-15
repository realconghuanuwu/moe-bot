import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { fetchGoldPrice } from '../lib/scraper.js';

export class GiaVangCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'giavang',
            description: 'Xem giá vàng hôm nay (SJC, DOJI, PNJ)'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder.setName('giavang').setDescription('Xem giá vàng hôm nay (SJC, DOJI, PNJ)')
        );
    }

    async chatInputRun(interaction) {
        await interaction.deferReply();

        try {
            const { prices, updatedAt } = await fetchGoldPrice();

            if (!prices || prices.length === 0) {
                return interaction.editReply('Không tìm thấy dữ liệu giá vàng. Có thể trang web nguồn đã thay đổi cấu trúc.');
            }

            const embed = new EmbedBuilder()
                .setTitle('🟡 Bảng Giá Vàng Hôm Nay')
                .setURL('https://simplize.vn/gia-vang')
                .setDescription(`🕒 **${updatedAt}**`)
                .setColor('#FFD700')
                .setTimestamp()
                .setFooter({ text: 'Nguồn: simplize.vn' });

            prices.forEach(item => {
                embed.addFields({ 
                    name: `✨ ${item.name}`, 
                    value: `🛒 Mua: \`${item.buy}\` | 💰 Bán: \`${item.sell}\``,
                    inline: false 
                });
            });

            return interaction.editReply({ embeds: [embed] });


        } catch (error) {
            console.error(error);
            return interaction.editReply('Đã xảy ra lỗi khi lấy dữ liệu giá vàng. Master vui lòng thử lại sau nà~');
        }
    }
}
