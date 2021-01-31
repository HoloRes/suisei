// Imports
// Packages
const {MessageEmbed} = require("discord.js"),
    parse = require("parse-duration"),
    moment = require("moment"),
    humanizeDuration = require("humanize-duration");

// Local files
const moderation = require("$/util/moderation"),
    {confirmRequest} = require("$/util/functions"),
    config = require("$/config.json");

exports.run = async (client, message, args) => {
    if (args.length < 3) return message.channel.send(`**USAGE:** ${config.discord.prefix}mute <user> <duration> <reason>`)
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

    const reason = await args.slice(2).join(" ");
    const duration = await parse(args[1], "m"); // Parse into minutes
    if (isNaN(duration) || duration === 0) return message.channel.send("Invalid duration")
        .then((msg) => {
            message.delete({timeout: 4000, reason: "Automated"});
            msg.delete({timeout: 4000, reason: "Automated"});
        });
    if(member) confirmAndMute(message, duration, member, reason);
}

// Functions
function confirmAndMute(message, duration, member, reason) {
    const embed = new MessageEmbed()
        .setTitle(`Muting **${member.user.tag}** for **${humanizeDuration(moment.duration(duration, "minutes").asMilliseconds())}**`)
        .setDescription(`Reason: ${reason}`);

    message.channel.send(embed)
        .then((msg) => {
            confirmRequest(msg, message.author.id)
                .then((result) => {
                    if (result === true) {
                        moderation.mute(member, duration, reason, message.member)
                            .then((status) => {
                                if (status.info) message.channel.send(`Mute succeeded, but ${status.info}`);
                                else message.channel.send(`**${member.user.tag}** has been muted`)
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
    command: "mute"
}