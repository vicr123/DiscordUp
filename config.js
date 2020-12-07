const fs = require('fs');

class Config {
    cfg;
    constructor() {
        let configString = fs.readFileSync("./config.json");
        this.cfg = JSON.parse(configString);
    }

    value(key) {
        return this.cfg[key];
    }

    pushArray(key, value) {
        let array = this.cfg[key];
        array.push(value);
        this.cfg[key] = array;

        this.save();
    }

    save() {
        fs.writeFileSync("./config.json", JSON.stringify(this.cfg, null, 4));
    }
}

let instance = new Config();
module.exports = instance;