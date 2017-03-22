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
const sio = require("socket.io");
const sio_client = require("socket.io-client");
const child_process = require("child_process");
const http = require("http");
const path_constants = require("./path_consts");
const utils = require("./utils");
var args = require("minimist")(process.argv.slice(2));
class StartupRunner {
    constructor() {
        this.servers = [];
        this.monitor = null;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            let master = require(path_constants.master_config);
            let servers = require(path_constants.servers_config);
            let server_set = servers[this.get_env()];
            if (!server_set) {
                throw new Error("enviroment argument error `" + this.get_env() + "`");
            }
            this.monitor = new MonitorServer(master, server_set);
            for (let type in server_set) {
                for (let config of server_set[type]) {
                    config.env = this.get_env(); // overwrite env
                    config.server_type = type;
                    let server = new ServerInstance(config);
                    this.servers.push(server);
                    yield server.start_server();
                }
            }
            this.monitor.start();
        });
    }
    get_env() {
        return args.env ? args.env : "development";
    }
}
exports.StartupRunner = StartupRunner;
class ServerInstance {
    constructor(config) {
        this.config = config;
    }
    start_server() {
        return __awaiter(this, void 0, void 0, function* () {
            if (utils.is_local_address(this.config.ip)) {
                yield this.start_server_local();
            }
            else {
                throw new Error("startup remote server is not implemented!");
            }
        });
    }
    start_server_local() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("start local server " + this.config.server_name);
            let config = this.config;
            let argument_line = Object.keys(config).map((key) => { return `--${key}=${config[key]}`; });
            console.log(`start argument ${argument_line.join(" ")}`);
            let c = child_process.fork(path_constants.appjs_path, argument_line, {
                silent: true
            });
            c.on("error", (err) => {
                console.error("master child_process error " + err);
            });
        });
    }
}
class ServerRealtimeInfo {
}
class MonitorServer {
    constructor(config, servers_config) {
        this.config = config;
        this.servers_config = servers_config;
        this.http_server = http.createServer();
        this.sio_server = sio(this.http_server);
        this.server_cache = new Map;
        this.socket_cache = new Map;
        this.heartbeat_mark = new Map;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.http_server.listen(this.config.host + ":" + this.config.port);
            let s = this.sio_server;
            s.on("connection", (sock) => {
                this.socket_cache.set(sock.id, sock);
                var info = new ServerRealtimeInfo();
                this.server_cache.set(sock.id, info);
                sock.on("notify", this.on_notify.bind(this, sock, info));
                sock.on("register", this.on_register.bind(this, sock, info));
                sock.on("heartbeat", this.on_heartbeat.bind(this, sock, info));
                sock.on("disconnect", () => {
                    if (this.server_cache.has(sock.id)) {
                        this.on_close(this.server_cache.get(sock.id));
                    }
                    this.socket_cache.delete(sock.id);
                    this.server_cache.delete(sock.id);
                });
            });
            setInterval(this.check_timeout_servers.bind(this), 1000);
        });
    }
    check_timeout_servers() {
        var now = Date.now();
        for (let type in this.servers_config) {
            this.servers_config[type].forEach((config) => {
                var last_beat = this.heartbeat_mark.get(config.server_name);
                if (last_beat === undefined || now - last_beat > 5000) {
                    this.dead_server_found(config);
                }
            });
        }
    }
    dead_server_found(config) {
        console.log("server id dead ?? " + config.server_name);
    }
    /**
     * 更新各信息
     * @param sock
     * @param info
     */
    on_notify(sock, info, data) {
    }
    on_register(sock, info, data) {
        sock.emit("register_done");
        info.config = data;
        console.log("server startup success " + data.server_name);
        this.server_startup_cb(data.server_name);
    }
    on_heartbeat(sock, info, data) {
        sock.emit("heartbeat_back");
        this.heartbeat_mark.set(data.server_name, Date.now());
        console.log("tick from " + data.server_name);
    }
    on_close(info) {
        console.error("server " + info.config.server_name + " timeout!");
    }
}
exports.MonitorServer = MonitorServer;
class MoniterClient {
    constructor(config, sconfig) {
        this.config = config;
        this.server_config = sconfig;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            //heartbeat
            this.client.on("heartbeat_back", () => {
            });
            setInterval(() => {
                this.heartbeat();
            }, 2000);
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            let config = this.config;
            this.client = sio_client.connect("http://" + config.host + ":" + config.port);
            this.client.on("connect", () => {
                this.register();
            });
            return new Promise((resolve, reject) => {
                this.client.on("register_done", () => {
                    resolve();
                });
                this.client.on("error", (err) => {
                    reject(err);
                });
            });
        });
    }
    register() {
        if (this.client) {
            this.client.emit("register", this.server_config);
        }
        else {
            console.error("monitor client is not connected to master!");
        }
    }
    notify(msg) {
        if (this.client) {
            this.client.emit("notify", msg);
        }
        else {
            console.error("monitor client is not connected to master!");
        }
    }
    heartbeat() {
        if (this.client) {
            this.client.emit("heartbeat", { server_name: this.server_config.server_name });
        }
        else {
            console.error("monitor client is not connected to master!");
        }
    }
}
exports.MoniterClient = MoniterClient;
//# sourceMappingURL=master.js.map