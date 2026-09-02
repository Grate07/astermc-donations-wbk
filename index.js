const { Client, GatewayIntentBits, Events } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (client) => {
    console.log("=================================");
    console.log(`BOT IS ONLINE: ${client.user.tag}`);
    console.log("=================================");
});

client.on(Events.Error, (error) => {
    console.error("DISCORD ERROR:");
    console.error(error);
});

client.on("debug", (info) => {
    console.log("[DISCORD DEBUG]", info);
});

console.log("Starting Discord login...");

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log("Login promise completed!");
    })
    .catch((error) => {
        console.error("LOGIN ERROR:");
        console.error(error);
    });

app.get("/", (req, res) => {
    res.send("Bot service is running");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server running on port ${PORT}`);
});