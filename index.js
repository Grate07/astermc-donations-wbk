const { Client, GatewayIntentBits, Events, EmbedBuilder } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Discord Bot
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (readyClient) => {
    console.log("BOT IS ONLINE: " + readyClient.user.tag);
});

client.on(Events.Error, (error) => {
    console.error("DISCORD ERROR:", error);
});

console.log("Starting Discord login...");

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log("Discord login successful!");
    })
    .catch((error) => {
        console.error("LOGIN ERROR:", error);
    });


// Tebex Webhook
app.post("/tebex", async (req, res) => {

    try {

        console.log("Tebex event received!");
        console.log("Event type:", req.body.type);

        // Tebex validation
        if (req.body.type === "validation.webhook") {

            console.log("Tebex validation received!");

            return res.status(200).json({
                id: req.body.id
            });
        }

        // Only completed payments
        if (req.body.type !== "payment.completed") {

            console.log("Event ignored.");

            return res.status(200).send