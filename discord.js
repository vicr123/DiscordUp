const Eris = require('eris');
const config = require('./config');
const db = require('./db');
const { EventEmitter } = require('events');
const { processTxId } = require('./up');

class Discord extends EventEmitter {
    /** @type {Eris} */
    discord;

    constructor() {
        super();
        this.discord = new Eris(config.value("discordToken"));
        this.discord.on("ready", () => {
            console.log("Discord is ready!");
        });

        this.discord.on("messageCreate", this.handleMessage.bind(this));
        this.discord.on("messageReactionAdd", this.handleReaction.bind(this));

        this.discord.connect();
    }

    async handleMessage(/** @type {Eris.Message} */ msg) {
        if (!config.value("authorizedUsers").includes(msg.author.id)) return; //Not authorized to perform operations
        if (!msg.content.startsWith("up ")) return; //Not targeted at this bot

        let action = "update";
        let txType = "default";
        let whitelistMode = null;
        let posts = [];
        
        let parts = msg.content.substr(3).split(" ");
        for (let part of parts) {
            if (part.startsWith("--post=")) {
                posts.push(part.substr(7));
            } else if (part.startsWith("--type=")) {
                txType = part.substr(7);
            } else if (part == "--query") {
                action = "query";
            } else if (part.startsWith("--whitelist-next-tx=")) {
                let whitelistModeText = part.substr(20);
                whitelistMode = whitelistModeText === "true"
            } else if (part == "--help") {
                this.discord.createMessage(msg.channel.id, `Usage: \`up [--type=full|minimal|no] [--post=txId] [--query] [--whitelist-next-tx=true|false]\``);

                //Return early here to print help
                return;
            }
        }

        for (let post of posts) {
            if (action == "query") {
                let txType = await db.txType(post);
                this.discord.createMessage(msg.channel.id, `Transaction ${post} has type ${txType}`);
            } else {
                this.emit("processTxId", post, txType);
                this.discord.createMessage(msg.channel.id, `Updated ${post} with ${txType} type`);
            }
        }

        if (whitelistMode === true) {
            this.emit('changeWhitelistMode', whitelistMode);
            this.discord.createMessage(msg.channel.id, `Will whitelist next transaction merchant`);
        } else if (whitelistMode === false) {
            this.emit('changeWhitelistMode', whitelistMode);
            this.discord.createMessage(msg.channel.id, `Will not whitelist next transaction merchant`);
        }
    }

    async handleReaction(message, emoji, reactor) {
        if (!config.value("authorizedUsers").includes(reactor.id)) return;

        try {
            if (emoji.name === "⬆️") {
                let tx = await db.txForMessage(message.channel.id, message.id);
                this.emit("processTxId", tx, "default");
                this.discord.removeMessageReaction(message.channel.id, message.id, emoji.name, reactor.id);
            }
        } catch {

        }
    }

    async post(embed, channel, replacing) {
        /** @type {Eris.Message} */
        let message;
        if (replacing) {
            message = await this.discord.editMessage(channel, replacing, {
                embed: embed
            });
        } else {
            message = await this.discord.createMessage(channel, {
                embed: embed
            });
        }

        return message.id;
    }

    async remove(channel, message) {
        await this.discord.deleteMessage(channel, message);
    }
}

let instance = new Discord();
module.exports = instance;