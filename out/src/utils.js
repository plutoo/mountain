"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const os = require("os");
/**
 * 匹配本机网卡接口
 * @param addr
 */
function match_local_nf_address(addr) {
    var interfaces = os.networkInterfaces();
    for (let name in interfaces) {
        var addr_list = interfaces[name];
        for (let blk of addr_list) {
            if (blk.address === addr) {
                return true;
            }
        }
    }
    return false;
}
function is_local_address(addr) {
    if (addr == "0.0.0.0" || addr == undefined) {
        return true;
    }
    if (net.isIP(addr)) {
        return match_local_nf_address(addr);
    }
    throw new Error("bad address `" + addr + "`");
}
exports.is_local_address = is_local_address;
//# sourceMappingURL=utils.js.map