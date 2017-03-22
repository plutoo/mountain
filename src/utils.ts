
import * as net from "net";
import * as os from "os";

/**
 * 匹配本机网卡接口
 * @param addr 
 */
function match_local_nf_address(addr:string){
    var interfaces = os.networkInterfaces();
    for(let name in interfaces){
        var addr_list = interfaces[name];
        for(let blk of addr_list){
            if(blk.address === addr){
                return true;
            }
        }
    }
    return false;
}


export function is_local_address(addr:string|undefined){
    if(addr == "0.0.0.0" || addr == undefined){
        return true;
    }
    if(net.isIP(addr)){
        return match_local_nf_address(addr);
    }
    throw new Error("bad address `"+addr+"`");
}