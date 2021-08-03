const { Command } = require('klasa');
const { MessageEmbed } = require('discord.js');
const Bots = require("@models/bots");

const { server: {mod_log_id, role_ids} } = require("@root/config.json");

const reasons = {
    "1": `Tu bot estaba apagado al momento de ser probado`,
    "2": `Tu bot tiene similitudes con otro`,
    "3": `Tu bot responde a otros bots`,
    "4": `Tu bot no cuenta con los comandos minimos para ser aprobado`,
    "5": `Tu bot no cuenta con un comando inicial como \`help\``
}
var modLog;

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            name: 'remove',
            runIn: ['text'],
            aliases: ["delete"],
            permissionLevel: 8,
            botPerms: ["SEND_MESSAGES"],
            description: "Elimina un bot de la lista",
            usage: '[Member:user]'
        });
    }

    async run(message, [Member]) {
        if (!Member || !Member.bot) return message.channel.send(`:x: | Menciona al bot que quieres remover de la lista`).then(alerta => {
            setTimeout(() => {
                alerta.delete()
            }, 7000);
        })
        let e = new MessageEmbed()
            .setTitle('Reasons')
            .setColor(0x6b83aa)
            .addField(`Bot removido`, `${Member}`)
        let cont = ``;
        for (let k in reasons) {
            let r = reasons[k];
            cont += ` - **${k}**: ${r}\n\n`
        }
        cont += `\nAgrega el numero de una razon valida para remover el bot`
        
        message.channel.send(cont);
        let filter = m => m.author.id === message.author.id;

        let collected = await message.channel.awaitMessages(filter, { max: 1, time: 20000, errors: ['time'] });
        let reason = collected.first().content
        let r = collected.first().content;
        if (parseInt(reason)) {
            r = reasons[reason]
            if (!r) return message.channel.send("Inavlid reason number.")
        }

        let bot = await Bots.findOne({ botid: Member.id }, { _id: false });
        await Bots.updateOne({ botid: Member.id }, { $set: { state: "deleted", owners: {primary: bot.owners.primary, additional: []} } });
        const botUser = await this.client.users.fetch(Member.id);

        if (!bot) return message.channel.send(`Unknown Error. Bot not found.`)
        let owners = [bot.owners.primary].concat(bot.owners.additional)
        e = new MessageEmbed()
            .setTitle('Bot Removido')
            .addField(`Bot`, `<@${bot.botid}>`, true)
            .addField(`Owner`, owners.map(x => x ? `<@${x}>` : ""), true)
            .addField("Mod", message.author, true)
            .addField("Reason", r)
            .setThumbnail(botUser.displayAvatarURL({format: "png", size: 256}))
            .setTimestamp()
            .setColor(0xffaa00)
        modLog.send(e)
        modLog.send(owners.map(x => x ? `<@${x}>` : "")).then(m => { m.delete() });
        message.channel.send(`Removed <@${bot.botid}> Check <#${mod_log_id}>.`)
        
        owners = await message.guild.members.fetch({user: owners})
        owners.forEach(o => {
            o.send(`Your bot ${bot.username} has been removed:\n>>> ${r}`)
        })
        if (!message.client.users.cache.find(u => u.id === bot.botid).bot) return;
        try {
            message.guild.members.fetch(message.client.users.cache.find(u => u.id === bot.botid))
                .then(bot => {
                    bot.kick().then(() => {})
                        .catch(e => { console.log(e) })
                }).catch(e => { console.log(e) });
        } catch (e) { console.log(e) }
    }

    async init() {
        modLog = await this.client.channels.fetch(mod_log_id);
    }
};
