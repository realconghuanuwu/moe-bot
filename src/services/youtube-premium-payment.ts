import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
} from "discord.js";
import { IMAGE } from "../constants/image.constant.js";
import { YOUTUBE_PREMIUM_PAYMENT_INFO } from "../constants/youtube-premium.constant.js";

export const YOUTUBE_PREMIUM_PAYMENT_BUTTON_ID = "pay_yt";

export function createYoutubePremiumPaymentButtonRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(YOUTUBE_PREMIUM_PAYMENT_BUTTON_ID)
      .setLabel("Hướng dẫn thanh toán")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("💰"),
  );
}

export async function replyYoutubePremiumPaymentGuide(
  interaction: ButtonInteraction,
) {
  const mbEmbed = new EmbedBuilder()
    .setTitle("QR Code MB Bank")
    .setColor("#004a95")
    .setImage(IMAGE.MB_BANK_QR);

  const momoEmbed = new EmbedBuilder()
    .setTitle("QR Code MoMo")
    .setColor("#a50064")
    .setImage(IMAGE.MOMO_QR);

  await interaction.reply({
    content: `${YOUTUBE_PREMIUM_PAYMENT_INFO}\n`,
    embeds: [mbEmbed, momoEmbed],
    ephemeral: false,
  });
}
