const { Client, GatewayIntentBits, Events, EmbedBuilder } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON requests from Tebex
app.use(express.json());

// ==========================
// DISCORD BOT
// ==========================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (readyClient) => {
    console.log("=================================");
    console.log(`BOT IS ONLINE: ${readyClient.user.tag}`);
    console.log("=================================");
});

client.on(Events.Error, (error) => {
    console.error("DISCORD ERROR:");
    console.error(error);
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

// ==========================
// TEBEX WEBHOOK
// ==========================

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

        // Ignore events that are not completed payments
        if (req.body.type !== "payment.completed") {
            console.log("Event ignored.");
            return res.status(200).send("OK");
        }

        const payment = req.body.subject;

        if (!payment) {
            console.error("Payment data not found!");
            return res.status(400).send("Payment data missing");
        }

        // Minecraft username
        const username =
            payment.customer?.username?.username ||
            payment.customer?.username ||
            "Unknown Player";

        // Purchased packages
        const packages = payment.products
            ?.map((product) => {
                const quantity = product.quantity || 1;
                const packageName =
                    product.name || "Unknown Package";

                return `+ x${quantity} ${packageName}`;
            })
            .join("\n") || "+ Unknown Package";

        // Donation channel
        const channelId =
            process.env.DONATION_CHANNEL_ID;

        if (!channelId) {
            console.error(
                "DONATION_CHANNEL_ID is missing!"
            );

            return res
                .status(500)
                .send("Channel not configured");
        }

        const channel =
            await client.channels.fetch(channelId);

        if (!channel || !channel.isTextBased()) {
            console.error(
                "Donation channel not found!"
            );

            return res
                .status(500)
                .send("Channel not found");
        }

        // ==========================
        // CREATE DONATION EMBED
        // ==========================

        const embed = new EmbedBuilder()
            // No setColor = default embed appearance
            .setAuthor({
                name: "🛒 Visit our Store now!"
            })
            .setTitle(
                "Thank You for your support!"
            )
            .setDescription(
                `\`\`\`\n${username} has supported us!\n\`\`\``
            )
            .addFields({
                name: "Packages",
                value: `\`\`\`diff\n