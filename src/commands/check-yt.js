import { Command } from '@sapphire/framework';
import { getGoogleSheet } from '../lib/googleSheet.js';

export class CheckYtPreCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'check-yt-pre',
            description: 'Kiểm tra trạng thái thanh toán YouTube Premium'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    async chatInputRun(interaction) {
        // Since Google API calls can be slow, defer the reply
        await interaction.deferReply();

        try {
            // Get the document instance
            const doc = await getGoogleSheet();
            
            // "2112995111" is likely the sheet 'gid' (Worksheet ID).
            const sheet = doc.sheetsById['2112995111'];
            
            if (!sheet) {
                return interaction.editReply('❌ Không tìm thấy Sheet với ID 2112995111 trong Document.');
            }

            // Fetch rows from the worksheet
            const rows = await sheet.getRows();
            const userId = interaction.user.id;

            // Find the row where the 'discord uid' column matches the Discord ID
            const userRow = rows.find(row => row.get('discord uid') === userId);

            if (!userRow) {
                return interaction.editReply('❌ Không tìm thấy Discord UID của bạn trong danh sách.');
            }

            // Get the current month and year
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonthIndex = now.getMonth() + 1;
            const currentMonthColumn = `Tháng ${currentMonthIndex}`;

            // 1. Check current month status
            const isCurrentMonthPaid = userRow.get(currentMonthColumn) === 'TRUE';
            const dueDate = userRow.get('Hạn Thanh toán');

            // 2. Check all months in the year
            const unpaidMonths = [];
            for (let i = 1; i <= 12; i++) {
                const monthCol = `Tháng ${i}`;
                if (userRow.get(monthCol) !== 'TRUE') {
                    // Format month to mm/yyyy
                    unpaidMonths.push(`${i.toString().padStart(2, '0')}/${currentYear}`);
                }
            }

            let responseMessage = '';
            
            // Format Current Month Status
            if (isCurrentMonthPaid) {
                responseMessage += `✅ Bạn đã thanh toán cho **${currentMonthColumn}**.\n\n`;
            } else {
                responseMessage += `⚠️ Bạn **CHƯA** thanh toán cho **${currentMonthColumn}**!\n`;
            }

            if (dueDate) {
                responseMessage += `📅 Hạn thanh toán gần nhất: **${dueDate}**\n`;
            }

            responseMessage += `\n--- **Tình trạng cả năm ${currentYear}** ---\n`;

            // 3. Check all-year status
            if (unpaidMonths.length === 0) {
                responseMessage += `🎉 Tuyệt vời! Bạn đã thanh toán cho **cả năm ${currentYear}**.`;
            } else {
                responseMessage += `📌 Các tháng chưa thanh toán:\n> ${unpaidMonths.join(', ')}`;
            }

            await interaction.editReply(responseMessage);

        } catch (error) {
            console.error('Error in check-yt-pre command:', error);
            await interaction.editReply(`Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.`);
        }
    }
}
