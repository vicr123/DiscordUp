import Eris, {Client, EmbedOptions} from "eris";
import config from "./config.ts";
import db from "./db.ts";
import {EventEmitter} from "events";

class Discord extends EventEmitter {
    discord: Client;

    constructor() {
        super();
        this.discord = Eris(config.value("discordToken"));
        this.discord.on("ready", () => {
            console.log("Discord is ready!");
        });

        this.discord.on("messageCreate", async msg => {
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
                    await this.discord.createMessage(msg.channel.id, `Usage: \`up [--type=full|minimal|no] [--post=txId] [--query] [--whitelist-next-tx=true|false]\``);

                    //Return early here to print help
                    return;
                }
            }

            for (let post of posts) {
                if (action == "query") {
                    let txType = await db.txType(post);
                    await this.discord.createMessage(msg.channel.id, `Transaction ${post} has type ${txType}`);
                } else {
                    this.emit("processTxId", post, txType);
                    await this.discord.createMessage(msg.channel.id, `Updated ${post} with ${txType} type`);
                }
            }

            if (whitelistMode === true) {
                this.emit('changeWhitelistMode', whitelistMode);
                await this.discord.createMessage(msg.channel.id, `Will whitelist next transaction merchant`);
            } else if (whitelistMode === false) {
                this.emit('changeWhitelistMode', whitelistMode);
                await this.discord.createMessage(msg.channel.id, `Will not whitelist next transaction merchant`);
            }
        });
        this.discord.on("messageReactionAdd", async (message, emoji, reactor) => {
            if (!config.value("authorizedUsers").includes(reactor.id)) return;

            try {
                if (emoji.name === "⬆️") {
                    let tx = await db.txForMessage(message.channel.id, message.id);
                    this.emit("processTxId", tx, "default");
                    await this.discord.removeMessageReaction(message.channel.id, message.id, emoji.name, reactor.id);
                } else if (emoji.name === "✅") {
                    let tx = await db.txForMessage(message.channel.id, message.id);
                    this.emit("processTxId", tx, "full");
                    await this.discord.removeMessageReaction(message.channel.id, message.id, emoji.name, reactor.id);
                }
            } catch {

            }
        });

        void this.discord.connect();
    }

    async post(embed: EmbedOptions, channel: string, replacing?: string) {
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

    async remove(channel: string, message: string) {
        await this.discord.deleteMessage(channel, message);
    }
}

export default new Discord();