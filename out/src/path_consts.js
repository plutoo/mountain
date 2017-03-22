"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
let pwd = process.cwd();
exports.master_config = path.join(pwd, "config/master.json");
exports.config_folder = path.join(pwd, "config");
exports.servers_config = path.join(pwd, "config/servers.json");
exports.appjs_path = path.join(pwd, "app.js");
//# sourceMappingURL=path_consts.js.map