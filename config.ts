import fs from 'fs';
import type {Configuration} from "./types.js";

class Config {
    cfg;
    constructor() {
        let configString = fs.readFileSync("./config.json", {
            encoding: "utf-8"
        });
        this.cfg = JSON.parse(configString);
    }

    value<T extends keyof Configuration>(key: T): Configuration[T] {
        return this.cfg[key];
    }

    pushArray<T extends keyof Configuration>(key: T, value: Configuration[T][0]) {
        const array: Configuration[T] = this.cfg[key];
        if (Array.isArray(array)) {
            array.push(value);
        }
        this.cfg[key] = array;

        this.save();
    }

    save() {
        fs.writeFileSync("./config.json", JSON.stringify(this.cfg, null, 4));
    }
}

export default new Config();