import {
  formatTimeJoinLeaveMessage,
  sendEmbedToConfiguredChannel,
} from "@/discord/utils.js";
import type { GuildMember } from "discord.js";
import { EmbedBuilder, Events } from "discord.js";

export const name = Events.GuildMemberRemove;
export const once = false;

const sendMessageLeave = async (
  member: GuildMember,
  createdTimeAgo: number,
): Promise<void> => {
  const bannedUser = await member.guild.bans.fetch(member.id).catch(() => null);

  if (createdTimeAgo <= 4) {
    const leaveEmbed = {
      color: 0xed4245,
      title: "🚩 Nouveau départ",
      description: `${member.user.tag} a quitté le serveur !`,
      fields: [
        { name: "Raison", value: `Compte trop récent 🚩`, inline: false },
        { name: "Mention", value: `${member.toString()}`, inline: false },
        {
          name: "Compte créé il y a",
          value: formatTimeJoinLeaveMessage(member.user.createdAt),
          inline: false,
        },
      ],
      timestamp: new Date(member.user.createdAt.getTime()).toISOString(),
      footer: { text: `Développé par <@1123262077876850698>` },
    };
    await sendEmbedToConfiguredChannel(member.guild, "logsLeaveChannel", {
      embeds: [leaveEmbed],
    });
    return;
  }

  const leaveEmbedBuilder = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🏃 Nouveau départ")
    .setDescription(`${member.user.tag} a quitté le serveur !`)
    .addFields(
      { name: "Mention", value: `${member.toString()}`, inline: false },
      {
        name: "Compte créé il y a",
        value: formatTimeJoinLeaveMessage(member.user.createdAt),
        inline: false,
      },
      {
        name: "Sur le serveur depuis",
        value: formatTimeJoinLeaveMessage(member.joinedAt ?? new Date()),
        inline: false,
      },
    )
    .setTimestamp(new Date(member.user.createdAt.getTime()))
    .setFooter({ text: `Développé par <@1123262077876850698>` });

  if (bannedUser) {
    leaveEmbedBuilder.addFields({
      name: "Raison",
      value: `❗ L'utilisateur a été banni`,
      inline: false,
    });
  }

  await sendEmbedToConfiguredChannel(member.guild, "logsLeaveChannel", {
    embeds: [leaveEmbedBuilder],
  });
};

export const execute = async (member: GuildMember): Promise<void> => {
  const createdTimeAgo = Math.ceil(
    (new Date().getTime() - member.user.createdAt.getTime()) /
      (1000 * 3600 * 24),
  );
  await sendMessageLeave(member, createdTimeAgo);
};
