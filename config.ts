import fs from 'fs';

class Config {
    cfg;
    constructor() {
        let configString = fs.readFileSync("./config.json", {
            encoding: "utf-8"
        });
        this.cfg = JSON.parse(configString);
    }

    value(key: string) {
        return this.cfg[key];
    }

    pushArray(key: string, value: any) {
        let array = this.cfg[key];
        array.push(value);
        this.cfg[key] = array;

        this.save();
    }

    save() {
        fs.writeFileSync("./config.json", JSON.stringify(this.cfg, null, 4));
    }
}

export default new Config();