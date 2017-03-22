
import * as master from "./src/master";

let runner = new master.StartupRunner();

(async ()=>{
    await runner.start();
})();


process.on("uncaughtException", (e)=>{
    console.log(e);
});

process.on("unhandledRejection", (reason, p)=>{
    console.error(reason);
});