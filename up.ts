import {EventEmitter} from "events";
import express from 'express';
import config from './config.ts';
import fetch from 'node-fetch';
import {TransactionId, TransactionResource, UpCategoryResponse, UpTransactionIdResponse} from "./types.ts";
import type {EmbedOptions} from "eris";

const upToken = config.value("upToken");

class Up extends EventEmitter {
    server;
    categories: Record<string, {name: string, parent?: string}> = {};
    wlNextTx;

    constructor() {
        super();

        this.wlNextTx = false;

        this.server = express();
        this.server.use(express.json());

        this.server.post("/webhookpayload", (req, res) => {
            res.send('OK!');

            let data = req.body.data;

            let attr = data.attributes;
            if (attr.eventType == "TRANSACTION_CREATED") {
                void this.processTxId(data.relationships.transaction.data.id);
            } else if (attr.eventType == "TRANSACTION_SETTLED") {
                void this.processTxId(data.relationships.transaction.data.id);
            } else if (attr.eventType == "TRANSACTION_DELETED") {
                this.emit("clearTx", data.relationships.transaction.data.id);
            }
        });
        
        this.server.listen(config.value("httpPort"), () => {
            console.log("Web server is ready!");
        });
        
        void this.initialiseCategories();
    }

    async initialiseCategories() {
        this.categories = {};

        const myHeaders = {
            "Authorization": `Bearer ${upToken}`
        };

        const requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        } as const;

        let response = await fetch(`https://api.up.com.au/api/v1/categories`, requestOptions)
        let json = await response.json() as UpCategoryResponse;

        let data = json.data;
        for (let category of data) {
            let catg: {name: string, parent?: string} = {
                name: category.attributes.name,
            }

            if (category.relationships.parent.data) {
                catg.parent = category.relationships.parent.data.id;
            }

            this.categories[category.id] = catg;
        }
    }

    isAllowedTransaction(data: TransactionResource) {
        if (data.attributes.description.startsWith("Cover ") || data.attributes.description.startsWith("Forward ") || data.attributes.description.startsWith("Transfer ") || data.attributes.description.startsWith("Auto Transfer ")) return "no";
        if (config.value("allowedMerchants").includes(data.attributes.description)) return "full";
        return "minimal";
    }

    async processTxData(data: TransactionResource, allowedType: string) {
        if (this.wlNextTx) {
            //Whitelist this merchant
            config.pushArray("allowedMerchants", data.attributes.description);
            this.wlNextTx = false;
        }

        let isRefund = data.attributes.amount["valueInBaseUnits"] > 0;
    
        let fields = [];
    
        //Make sure this isn't a transfer
        if (allowedType === "default") allowedType = this.isAllowedTransaction(data);
        if (allowedType === "no") return;
        
        let isTransfer = data.attributes.message !== null;
        let isWithdrawal = data.attributes.description === "ATM Cash Out";
        let embedDescription = "Victor spent some money!";
        if (isTransfer) embedDescription = "Victor transferred some money!";
        if (isRefund) embedDescription = "Victor was issued a refund!";
        if (isWithdrawal) embedDescription = "Victor withdrew some money!";
    
        let footer = null;
        if (allowedType === "full") {
            let amount = "";
    
            if (data.attributes["foreignAmount"]) {
                if (isRefund) {
                    amount = `-${data.attributes["foreignAmount"].value} ${data.attributes["foreignAmount"]["currencyCode"]} (that's -$${data.attributes.amount.value} AUD)`;
                } else {
                    amount = `${data.attributes["foreignAmount"].value.substr(1)} ${data.attributes["foreignAmount"]["currencyCode"]} (that's $${data.attributes.amount.value.substr(1)} AUD)`;
                    if (!isTransfer && data.attributes.status == "HELD") footer = {
                        "icon_url": "https://raw.githubusercontent.com/vicr123/contemporary-icons/master/status/16/dialog-information.svg",
                        "text": "The AUD amount may change to reflect the FX rate at the time of settlement"            
                    };
                }
            } else {
                if (isRefund) {
                    amount = "-$" + data.attributes.amount.value + " AUD";
                } else {
                    amount = "$" + data.attributes.amount.value.substr(1) + " AUD";
                }
            }

            if (data.attributes.status == "HELD") amount += " [PENDING]";
            
            if (!isWithdrawal) {
                let description = data.attributes.description;

                if (data.attributes.rawText?.toLowerCase().startsWith("afterpay")) {
                    description += " · via Afterpay";
                }

                fields.push({
                    "name": isTransfer ? "Who?" : "Where?",
                    "value": description
                });
            }
    
            fields.push({
                "name": "How much?",
                "value": amount
            })
        } else if (isRefund) {
            //Don't say anything
            return;
        }
    
        if (data.relationships.category.data) {
            let catg = this.categories[data.relationships.category.data.id];
            let parentCatg;
    
            if (catg.parent) {
                parentCatg = this.categories[catg.parent];
            }
    
            let field = {
                "name": "Category",
                "value": parentCatg ? `${parentCatg.name} > ${catg.name}` : catg.name
            }
    
            fields.push(field);
        }
    
        let embedBody: EmbedOptions =
        {
            "title": "Oh no!",
            "description": embedDescription,
            "color": 16743012,
            "author": {
                "name": "Up",
                "url": "https://up.com.au/",
                "icon_url": "https://cdn.discordapp.com/emojis/629299043679600640.png?v=1"
            },
            "fields": fields
        };
    
        if (footer) {
            embedBody.footer = footer;
        }

        this.emit("updateAllowedType", data.id, allowedType);
        this.emit("embedAvailable", data.id, embedBody);
    }

    async processTxId(tx: TransactionId, allowedType = "default") {
        //oh no Victor made a purchase!
        const myHeaders = {
            "Authorization": `Bearer ${upToken}`
        };       
    
        const requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        } as const;
        
        let response = await fetch(`https://api.up.com.au/api/v1/transactions/${tx}`, requestOptions);
        let json = await response.json() as UpTransactionIdResponse;
        await this.processTxData(json.data, allowedType);
    }

    whitelistNextTx(enabled: boolean) {
        this.wlNextTx = enabled;
    }
}

export default new Up();