
import {Application} from "./src/application";


let app = new Application();

app.config("development", "gate", ()=>{
    
});



app.start();

console.log("App: Start Server "+ app.server_name());

process.on("uncaughtException", (e)=>{
    console.log(e);
});

process.on("unhandledRejection", (reason, p)=>{
    console.error(reason);
});