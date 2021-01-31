// Imports
// Packages
const {MessageEmbed} = require("discord.js");

// Local files
const moderation = require("$/util/moderation"),
    {confirmRequest} = require("$/util/functions"),
    config = require("$/config.json");

exports.run = async (client, message, args) => {
    if (args.length < 2) return message.channel.send(`**USAGE:** ${config.discord.prefix}strike <user> <reason>`)
        .then(msg => {
            message.delete({timeout: 4000, reason: "Automated"});
            msg.delete({timeout: 4000, reason: "Automated"});
        });

    const member = await moderation.getMemberFromMessage(message, args)
        .catch((e) => {
            return message.channel.send(e)
                .then((msg) => {
                    message.delete({timeout: 4000, reason: "Automated"});
                    msg.delete({timeout: 4000, reason: "Automated"});
                });
        });
    const reason = await args.slice(1).join(" ");

    confirmAndKick(message, member, reason);
}

// Functions
function confirmAndKick(message, member, reason) {
    const embed = new MessageEmbed()
        .setTitle(`Striking **${member.user.tag}**`)
        .setDescription(`Reason: ${reason}`);

    message.channel.send(embed)
        .then((msg) => {
            confirmRequest(msg, message.author.id)
                .then((result) => {
                    if (result === true) {
                        moderation.strike(member, reason, message.member)
                            .then((status) => {
                                if (status.info) message.channel.send(`Strike succeeded, but ${status.info}`);
                                else message.channel.send(`**${member.user.tag}** has been striked`);
                            })
                            .catch(() => {
                                return message.channel.send("Something went wrong, please try again.");
                            });
                    } else {
                        msg.edit("Cancelled.")
                        message.delete({timeout: 4000, reason: "Automated"});
                        msg.delete({timeout: 4000, reason: "Automated"});
                    }
                });
        });
}

exports.config = {
    command: "strike"
}