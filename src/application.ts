
import * as master from"./master";
import * as path_consts from  "./path_consts";

import * as minimist from "minimist";

declare type EnvType = "development"|"release"|"debug"|"production";



let args = require("minimist")(process.argv.slice(2));

export class Application {

    supervisor:master.MoniterClient|null;

    private __env:string;
    private __server_name:string;

    private __curr_server_config:ServerConfig;

    constructor() {
        let servers_config = require(path_consts.servers_config);
        
        //overwrite __curr_server_config
        let env_servers = servers_config[this.env()];
        if(env_servers && this.server_type() && env_servers[this.server_type()!]){
            let find = (env_servers[this.server_type()!] as ServerConfig[]).filter((c)=>{return c.server_name==this.server_name()});
            if(find.length > 0){
                this.__curr_server_config = find[0];
            }else{
                throw new Error("server not found in servers.json `"+this.server_name()+"`");
            }
        }else{
            throw new Error(`server error "${this.env()}/${this.server_type()}"`);
        }
    }

    env():string {
        if(args.env){
            return args.env;
        }
        return "development";
    }

    server_type():string|null{
        if(args.server_type){
            return args.server_type;
        }
        return null;
    }

    server_name():string|null {
        if(args.server_name){
            return args.server_name;
        }
        return null;
    }

    server_config():ServerConfig {
        return this.__curr_server_config;
    }

    config(env:EnvType, type:string|null, task:()=>void){
        if(env === this.env()  && (type == null || (type === this.server_config().server_type))) {
            task.apply(this);
        }
    }

    async start() {
        let master_config = require(path_consts.master_config);
        this.supervisor = new master.MoniterClient(master_config, this.server_config());
        await this.supervisor.start();
    }
}
