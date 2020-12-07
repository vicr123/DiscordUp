const { EventEmitter } = require("events");
const e = require("express");
const sqlite3 = require('sqlite3');

class Db extends EventEmitter {
    db;

    constructor() {
        super();
        this.db = new sqlite3.Database("up.db");
        this.db.run("CREATE TABLE IF NOT EXISTS txTypes(txid TEXT PRIMARY KEY, type TEXT)");
        this.db.run("CREATE TABLE IF NOT EXISTS transactions(txid TEXT, channel TEXT, message TEXT, PRIMARY KEY(txid, channel, message), UNIQUE(channel, message))");
    }

    idsForTransaction(txId) {
        return new Promise((res, rej) => {
            this.db.all("SELECT * FROM transactions WHERE txid=?", [txId], (err, rows) => {
                if (err) {
                    rej(err);
                    return;
                }

                let ids = [];
                for (let row of rows) {
                    ids.push({
                        channel: row.channel,
                        message: row.message
                    });
                }
                res(ids);
            });
        });
    }

    upsertTxType(txId, type) {
        this.db.run("INSERT INTO txTypes(txid, type) VALUES(?, ?) ON CONFLICT(txid) DO UPDATE SET type=? WHERE txid=?", [txId, type, type, txId]);
    }

    txType(txId) {
        return new Promise((res, rej) => {
            this.db.all("SELECT * FROM txTypes WHERE txid=?", [txId], (err, rows) => {
                if (err) {
                    rej(err);
                    return;
                }

                if (rows.length === 0) {
                    res("default");
                    return;
                }

                res(rows[0].type);
            });
        });
    }

    insertTransaction(txId, channel, message) {
        this.db.run("INSERT INTO transactions(txid, channel, message) VALUES(?, ?, ?)", [txId, channel, message]);
    }

    txForMessage(channel, message) {
        return new Promise((res, rej) => {
            this.db.all("SELECT * FROM transactions WHERE channel=? AND message=?", [channel, message], (err, rows) => {
                if (err) {
                    rej(err);
                    return;
                }

                if (rows.length === 0) {
                    rej();
                    return;
                }

                res(rows[0].txid);
            });
        });
    }

    clearTx(txId, clearType) {
        if (clearType) this.db.run("DELETE FROM txTypes WHERE txid=?", [txId]);
        this.db.run("DELETE FROM transactions WHERE txid=?", [txId]);
    }
}

let instance = new Db();
module.exports = instance;