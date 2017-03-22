"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const master = require("./master");
const path_consts = require("./path_consts");
let args = require("minimist")(process.argv.slice(2));
class Application {
    constructor() {
        let servers_config = require(path_consts.servers_config);
        //overwrite __curr_server_config
        let env_servers = servers_config[this.env()];
        if (env_servers && this.server_type() && env_servers[this.server_type()]) {
            let find = env_servers[this.server_type()].filter((c) => { return c.server_name == this.server_name(); });
            if (find.length > 0) {
                this.__curr_server_config = find[0];
            }
            else {
                throw new Error("server not found in servers.json `" + this.server_name() + "`");
            }
        }
        else {
            throw new Error(`server error "${this.env()}/${this.server_type()}"`);
        }
    }
    env() {
        if (args.env) {
            return args.env;
        }
        return "development";
    }
    server_type() {
        if (args.server_type) {
            return args.server_type;
        }
        return null;
    }
    server_name() {
        if (args.server_name) {
            return args.server_name;
        }
        return null;
    }
    server_config() {
        return this.__curr_server_config;
    }
    config(env, type, task) {
        if (env === this.env() && (type == null || (type === this.server_config().server_type))) {
            task.apply(this);
        }
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            let master_config = require(path_consts.master_config);
            this.supervisor = new master.MoniterClient(master_config, this.server_config());
            yield this.supervisor.start();
        });
    }
}
exports.Application = Application;
//# sourceMappingURL=application.js.map