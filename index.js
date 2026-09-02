const express = require("express");
const crypto = require("crypto");

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ChannelType,
    Events
} = require("discord.js");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================
// EXPRESS
// ==========================

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// ==========================
// DISCORD BOT
// ==========================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Bot ready
client.once(Events.ClientReady, (readyClient) => {
    console.log("=================================");
    console.log(`BOT ONLINE: ${readyClient.user.tag}`);
    console.log("=================================");
});

// Discord errors
client.on("error", (error) => {
    console.error("DISCORD CLIENT ERROR:");
    console.error(error);
});

// ==========================
// TEBEX WEBHOOK ENDPOINT
// ==========================

app.post("/tebex", async (req, res) => {
    try {
        console.log("Tebex event received!");

        const signature = req.headers["x-signature"];
        const secret = process.env.TEBEX_WEBHOOK_SECRET;

        // Verify signature
        if (secret && signature && req.rawBody) {
            const bodyHash = crypto
                .createHash("sha256")
                .update(req.rawBody)
                .digest("hex");

            const expectedSignature = crypto
                .createHmac("sha256", secret)
                .update(bodyHash)
                .digest("hex");

            if (signature !== expectedSignature) {
                console.log("Invalid Tebex signature!");
                return res.status(401).send("Invalid signature");
            }
        }

        // Tebex validation
        if (req.body.type === "validation.webhook") {
            console.log("Tebex validation received!");

            return res.status(200).json({
                id: req.body.id
            });
        }

        // Ignore events other than completed payments
        if (req.body.type !== "payment.completed") {
            console.log(`Ignored event: ${req.body.type}`);
            return res.status(200).send("Event received");
        }

        console.log("Completed payment received!");

        const payment = req.body.subject;

        const channelId = process.env.DONATION_CHANNEL_ID;

        if (!channelId) {
            console.error("DONATION_CHANNEL_ID is missing!");
            return res.status(500).send("Donation channel not configured");
        }

        // Get channel
        const channel = await client.channels.fetch(channelId);

        if (
            !channel ||
            channel.type !== ChannelType.GuildText
        ) {
            console.error("Donation channel not found!");
            return res.status(500).send("Channel not found");
        }

        // Minecraft username
        const username =
            payment.customer?.username?.username ||
            payment.customer?.username ||
            "Unknown Player";

        // Packages
        const packages = payment.products
            ?.map((product) => {
                const quantity = product.quantity || 1;
                const packageName = product.name || "Unknown Package";

                return `+ x${quantity} ${packageName}`;
            })
            .join("\n") || "+ Unknown Package";

        // ==========================
        // DONATION EMBED
        // ==========================

        const embed = new EmbedBuilder()
            // No setColor = default Discord embed colour
            .setAuthor({
                name: "🛒 Visit our Store now!"
            })
            .setTitle("Thank You for your support!")
            .setDescription(
                `\`\`\`\n${username} has supported us!\n\`\`\``
            )
            .addFields({
                name: "Packages",
                value: `\`\`\`diff\n${packages}\n\`\`\``
            });

        // Bot sends the message
        await channel.send({
            embeds: [embed]
        });

        console.log(`Donation message sent for ${username}`);

        return res.status(200).send("Success");

    } catch (error) {
        console.error("TEBEX ERROR:");
        console.error(error);

        return res.status(500).send("Server error");
    }
});

// ==========================
// RENDER HOME PAGE
// ==========================

app.get("/", (req, res) => {
    res.send("Discord donation bot is running!");
});

// ==========================
// START WEB SERVER
// ==========================

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

// ==========================
// LOGIN TO DISCORD
// ==========================

const token = process.env.DISCORD_TOKEN;

console.log("Checking Discord token...");

if (!token) {
    console.error("ERROR: DISCORD_TOKEN environment variable is missing!");
} else {
    console.log("Discord token found.");
    console.log("Attempting to connect to Discord...");

    client.login(token)
        .then(() => {
            console.log("Discord login request accepted!");
        })
        .catch((error) => {
            console.error("DISCORD LOGIN FAILED:");
            console.error(error);
        });
}