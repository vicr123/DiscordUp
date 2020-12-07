const config = require('./config');
const up = require('./up');
const discord = require('./discord');
const db = require('./db');

async function clearTx(txId, clearType = true) {
    //Delete everything to do with this transaction
    let channels = await db.idsForTransaction(txId);
    for (let channel of channels) {
        discord.remove(channel.channel, channel.message);
    }
    db.clearTx(txId, clearType);
}

discord.on("processTxId", async (txId, txType) => {
    if (txType == "default") txType = await db.txType(txId);

    if (txType == "no") {
        clearTx(txId, false);
        db.upsertTxType(txId, txType);
    } else {
        //Process this transaction
        up.processTxId(txId, txType);
    }
});
discord.on("changeWhitelistMode", up.whitelistNextTx.bind(up));
up.on("embedAvailable", async (txId, embed) => {
    let channels = await db.idsForTransaction(txId);
    if (channels.length == 0) {
        //Post a new transaction
        for (let channel of config.value("channels")) {
            channels.push({
                channel: channel,
                message: null
            });
        }
    }
    
    for (let channel of channels) {
        discord.post(embed, channel.channel, channel.message).then((messageId) => {
            if (!channel.message) db.insertTransaction(txId, channel.channel, messageId);
        });
    }
});
up.on("updateAllowedType", async (txId, allowedType) => {
    await db.upsertTxType(txId, allowedType);
});
up.on("clearTx", clearTx);