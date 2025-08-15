import {EventEmitter} from "events";
import sqlite3 from "sqlite3";
import {TransactionId} from "./types.ts";

interface TxTypesTable {
    txid: string,
    type: string,
}

interface TransactionsTable {
    txid: string,
    channel: string,
    message: string,
}

class Db extends EventEmitter {
    db;

    constructor() {
        super();
        this.db = new sqlite3.Database("up.db");
        this.db.run("CREATE TABLE IF NOT EXISTS txTypes(txid TEXT PRIMARY KEY, type TEXT)");
        this.db.run("CREATE TABLE IF NOT EXISTS transactions(txid TEXT, channel TEXT, message TEXT, PRIMARY KEY(txid, channel, message), UNIQUE(channel, message))");
    }

    idsForTransaction(txId: TransactionId): Promise<{channel: string, message: string}[]> {
        return new Promise((res, rej) => {
            this.db.all("SELECT * FROM transactions WHERE txid=?", [txId], (err, rows: TransactionsTable[]) => {
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

    upsertTxType(txId: TransactionId, type: string) {
        this.db.run("INSERT INTO txTypes(txid, type) VALUES(?, ?) ON CONFLICT(txid) DO UPDATE SET type=? WHERE txid=?", [txId, type, type, txId]);
    }

    txType(txId: TransactionId) {
        return new Promise((res, rej) => {
            this.db.all("SELECT * FROM txTypes WHERE txid=?", [txId], (err, rows: TxTypesTable[]) => {
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

    insertTransaction(txId: TransactionId, channel: string, message: string) {
        this.db.run("INSERT INTO transactions(txid, channel, message) VALUES(?, ?, ?)", [txId, channel, message]);
    }

    txForMessage(channel: string, message: string) {
        return new Promise((res, rej) => {
            this.db.all("SELECT * FROM transactions WHERE channel=? AND message=?", [channel, message], (err, rows: TransactionsTable[]) => {
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

    clearTx(txId: TransactionId, clearType: boolean) {
        if (clearType) this.db.run("DELETE FROM txTypes WHERE txid=?", [txId]);
        this.db.run("DELETE FROM transactions WHERE txid=?", [txId]);
    }
}

export default new Db();