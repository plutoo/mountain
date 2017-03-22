"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const application_1 = require("./src/application");
let app = new application_1.Application();
app.config("development", "gate", () => {
});
app.start();
console.log("App: Start Server " + app.server_name());
process.on("uncaughtException", (e) => {
    console.log(e);
});
process.on("unhandledRejection", (reason, p) => {
    console.error(reason);
});
//# sourceMappingURL=app.js.map