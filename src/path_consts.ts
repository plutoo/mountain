
import * as path from "path";

let pwd = process.cwd();


export var master_config = path.join(pwd, "config/master.json");
export var config_folder = path.join(pwd, "config");
export var servers_config  = path.join(pwd, "config/servers.json");
export var appjs_path = path.join(pwd, "app.js");