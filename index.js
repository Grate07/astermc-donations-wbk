const express = require("express");
const crypto = require("crypto");

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ChannelType
} = require("discord.js");

const app = express();
const PORT = process.env.PORT || 3000;

// Keep raw body for Tebex signature verification
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Discord bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Tebex webhook endpoint
app.post("/tebex", async (req, res) => {
    try {
        const signature = req.headers["x-signature"];
        const secret = process.env.TEBEX_WEBHOOK_SECRET;

        // Verify Tebex signature
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
                console.log("Invalid Tebex signature");
                return res.status(401).send("Invalid signature");
            }
        }

        // Tebex endpoint validation
        if (req.body.type === "validation.webhook") {
            console.log("Tebex validation received");

            return res.status(200).json({
                id: req.body.id
            });
        }

        // Only handle completed payments
        if (req.body.type !== "payment.completed") {
            return res.status(200).send("Event received");
        }

        const payment = req.body.subject;

        const channelId = process.env.DONATION_CHANNEL_ID;

        const channel = await client.channels.fetch(channelId);

        if (!channel || channel.type !== ChannelType.GuildText) {
            console.log("Donation channel not found");
            return res.status(500).send("Channel not found");
        }

        // Minecraft username
        const username =
            payment.customer?.username?.username ||
            payment.products?.[0]?.username?.username ||
            "Unknown Player";

        // Packages
        const packages = payment.products
            .map(product =>
                `+ x${product.quantity} ${product.name}`
            )
            .join("\n");

        // Embed
        const embed = new EmbedBuilder()
            // Default Discord embed colour
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

        console.log(
            `Donation message sent for ${username}`
        );

        return res.status(200).send("Success");

    } catch (error) {
        console.error(error);
        return res.status(500).send("Server error");
    }
});

// Render needs a web server
app.get("/", (req, res) => {
    res.send("Discord bot is running!");
});

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

// Login Discord bot
client.login(process.env.DISCORD_TOKEN);