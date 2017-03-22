
import * as sio from "socket.io";
import * as sio_client from "socket.io-client";
import * as fs from "fs";
import * as path from "path";
import * as minimist from "minimist";
import * as net from "net";
import * as child_process from "child_process";

import * as path_constants from "./path_consts";

import * as utils from "./utils";

interface MasterConfig {
    host:string;
    port:number;
}

type EnvType = "development"|"release"|"debug"|"production";

var args = require("minimist")(process.argv.slice(2));

export class StartupRunner {

    monitor:MonitorServer|null;
    servers:ServerInstance[];

    constructor(){
        this.servers = [];
        this.monitor = null;
    }

    async start(){
        
        let master:MasterConfig = require(path_constants.master_config);
        let servers:{[index:string]:{[index:string]:ServerConfig[]}} = require(path_constants.servers_config);

        let server_set = servers[this.get_env()];

        if(!server_set) {
            throw new Error("enviroment argument error `"+this.get_env()+"`");
        }

         
        this.monitor = new MonitorServer(master, server_set);

        for(let type in server_set){
            for(let config of server_set[type]) {
                config.env = this.get_env(); // overwrite env
                config.server_type = type;
                let server = new ServerInstance(config);
                this.servers.push(server);
                await server.start_server();
            }
        }
    }


    get_env():string {
        return args.env ? args.env : "development";
    }
}


class ServerInstance {

    config: ServerConfig; 

    constructor(config:ServerConfig) {
        this.config = config;
    }
    
    async start_server() {
        if(utils.is_local_address(this.config.ip)){
            await this.start_server_local();
        }else{
            throw new Error("startup remote server is not implemented!");
        }
    }

    private async start_server_local(){
        console.log("start local server "+ this.config.server_name);
        let config = this.config;
        let argument_line = Object.keys(config).map((key)=>{return `--${key}=${config[key]}`});
        console.log(`start argument ${argument_line.join(" ")}`)
        let c = child_process.fork(path_constants.appjs_path, argument_line,
            {
               silent:true 
            });
        c.on("error", (err)=>{
            console.error("master child_process error "+ err);
        });
    }
}

class ServerRealtimeInfo {
    config:ServerConfig;
}

export class MonitorServer {
    
    config:MasterConfig;
    servers_config: {[index:string]:ServerConfig[]};
    sio_server:SocketIO.Server;
    socket_cache:Map<string, SocketIO.Socket>;
    server_cache:Map<string, ServerRealtimeInfo>;

    heartbeat_mark:Map<string, number>;

    server_startup_cb:(name:string)=>void;

    constructor(config:MasterConfig,  servers_config:{[index:string]:ServerConfig[]}){
        this.config = config;
        this.servers_config = servers_config;
        this.sio_server = sio();
        this.server_cache = new Map;
        this.socket_cache = new Map;
        this.heartbeat_mark = new Map;
    }

    async start() {
        let s = this.sio_server;
        s.listen(this.config.host+":" + this.config.port,{});

        s.on("connection", (sock)=>{
            this.socket_cache.set(sock.id, sock);
            var info = new ServerRealtimeInfo();
            this.server_cache.set(sock.id, info);

            sock.on("notify", this.on_notify.bind(this, sock, info))
            sock.on("register", this.on_register.bind(this, sock, info))
            sock.on("heartbeat", this.on_heartbeat.bind(this, sock, info))
            

            sock.on("disconnect", ()=>{
                if(this.server_cache.has(sock.id)){
                    this.on_close(this.server_cache.get(sock.id)!);
                }
                this.socket_cache.delete(sock.id);
                this.server_cache.delete(sock.id);
            });
        });

        setInterval(this.check_timeout_servers.bind(this), 1000);
    }

    check_timeout_servers() {
        var now = Date.now();
        for(let type in this.servers_config) {
            this.servers_config[type].forEach((config)=>{
                var last_beat = this.heartbeat_mark.get(config.server_name);
                if(last_beat === undefined || now -last_beat > 5000) {
                    this.dead_server_found(config);
                }
            });
        }
    }

    dead_server_found(config:ServerConfig){
        console.log("server id dead ?? "+config.server_name);
    }


    /**
     * 更新各信息
     * @param sock 
     * @param info 
     */
    private on_notify(sock:SocketIO.Socket, info:ServerRealtimeInfo, data){

    }

    private on_register(sock:SocketIO.Socket, info:ServerRealtimeInfo, data:ServerConfig){
        sock.emit("register_done");
        info.config = data;
        console.log("server startup success "+data.server_name);
        this.server_startup_cb(data.server_name);
    }

    private on_heartbeat(sock:SocketIO.Socket, info:ServerRealtimeInfo, data:{server_name:string}){
        sock.emit("heartbeat_back");
        this.heartbeat_mark.set(data.server_name, Date.now());
        console.log("tick from "+data.server_name);
    }

    private on_close(info:ServerRealtimeInfo){
        console.error("server "+info.config.server_name+ " timeout!");
    }
}

export class MoniterClient {

    client:SocketIOClient.Socket|null;

    config:MasterConfig;
    server_config:ServerConfig;

    constructor(config:MasterConfig, sconfig:ServerConfig){
        this.config = config;
        this.server_config = sconfig;
    }

    async start() {
        await this.connect();
        //heartbeat

        this.client!.on("heartbeat_back", ()=>{

        });


        setInterval(()=>{
            this.heartbeat();
        }, 2000);
    }

    private async connect(){
        let config = this.config;
        this.client = sio_client.connect("http://"+config.host+":"+config.port);
        this.client.on("connect", ()=>{
            this.register();
        });
        return new Promise((resolve, reject)=>{
            this.client!.on("register_done",()=>{
                resolve();
            });
            this.client!.on("error",(err)=>{
                reject(err);
            });
        });
    }

    register(){
        if(this.client){
            this.client.emit("register", this.server_config);
        }else{
            console.error("monitor client is not connected to master!");
        }
    }

    notify(msg:any) {
        if(this.client){
            this.client.emit("notify", msg);
        }else{
            console.error("monitor client is not connected to master!");
        }
    }


    heartbeat(){
        if(this.client){
            this.client.emit("heartbeat",{server_name: this.server_config.server_name!});
        }else{
            console.error("monitor client is not connected to master!");
        }
    }

}
