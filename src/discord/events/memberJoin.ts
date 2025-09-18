import { getConfig } from "@/discord/ConfigManager.js";
import { dateDiff } from "@/discord/utils.js";
import type { GuildMember } from "discord.js";
import { Events } from "discord.js";

export const name = Events.GuildMemberAdd;
export const once = false;

const sendMessageJoin = async (member: GuildMember): Promise<void> => {
  const logsJoinChannelId = getConfig("logsJoinChannel");
  if (!logsJoinChannelId) {
    return;
  }
  try {
    const logsJoinChannel = await member.guild.channels.fetch(String(logsJoinChannelId));
    if (!logsJoinChannel || !logsJoinChannel.isTextBased()) {
      console.error("Le salon de logs de join n'est pas un salon textuel.");
      return;
    }
    const joinEmbed = {
      color: 0x0099ff,
      title: "🧍‍♂️ Nouveau arrivant",
      description: `${member.user.tag} vient d'arriver !`,
      fields: [
        {
          name: "Mention",
          value: `${member.toString()}`,
          inline: false,
        },
        {
          name: "Compte créé il y a",
          value: dateDiff(member.user.createdAt),
          inline: false,
        },
      ],
      timestamp: new Date(member.user.createdAt.getTime()).toISOString(),
      footer: {
        text: `Développé par <@1123262077876850698>`,
      },
    };
    try {
      await logsJoinChannel.send({ embeds: [joinEmbed] });
    } catch (error) {
      console.error("Erreur lors de l'envoi du message de logs de join :", error);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du salon de logs de join :", error);
  }
};

const setNotifRole = async (member: GuildMember): Promise<void> => {
  const notifRoleId = getConfig("roleNotif");
  if (notifRoleId) {
    try {
      const notifRole = await member.guild.roles.fetch(String(notifRoleId));
      if (!notifRole) {
        console.error("Le rôle de notification n'existe pas.");
        return;
      }
      await member.roles.add(notifRole);
    } catch (error) {
      console.error("Erreur lors de la récupération du rôle de notification :", error);
      return;
    }
  }
};

export const execute = async (member: GuildMember): Promise<void> => {
  await sendMessageJoin(member);
  if (member.user.bot) {
    return;
  }

  await setNotifRole(member);
  const createdTimeAgo = Math.ceil((new Date().getTime() - member.user.createdAt.getTime()) / (1000 * 3600 * 24));
  if (createdTimeAgo <= 4) {
    const recentUserEmbed = {
      color: 0xed4245,
      title: "💢 Compte trop récent",
      description: `Votre compte est trop récent\nVeuillez revenir dans quelques jours`,
      fields: [
        {
          name: "Lien du Discord",
          value: `demander à waltii :)`,
          inline: false,
        },
      ],
      footer: {
        text: `Développé par <@1123262077876850698>`,
      },
    };
    try {
      await member.send({ embeds: [recentUserEmbed] });
      await member.kick("Compte trop récent");
    } catch (e) {
      console.error(e);
    }
  } else if ((createdTimeAgo > 4 && createdTimeAgo <= 60) || member.id === "1123262077876850698") {
    const unverifiedRoleId = getConfig("roleUnverified");
    if (!unverifiedRoleId) {
      return;
    }
    try {
      const unverifiedRole = await member.guild.roles.fetch(String(unverifiedRoleId));
      if (!unverifiedRole) {
        console.error("Le rôle des non vérifiés n'existe pas.");
        return;
      }
      await member.roles.add(getConfig("roleUnverified") ?? "");
    } catch (error) {
      console.error("Erreur lors de la récupération du rôle des non vérifiés :", error);
      return;
    }
  }
};
