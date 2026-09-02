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

// =========================
// EXPRESS CONFIGURATION
// =========================

// Keep raw body for Tebex signature verification
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// =========================
// DISCORD BOT
// =========================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once("ready", () => {
    console.log("=================================");
    console.log(`Logged in as ${client.user.tag}`);
    console.log("Discord bot is online!");
    console.log("=================================");
});

// =========================
// TEBEX WEBHOOK
// =========================

app.post("/tebex", async (req, res) => {
    try {

        console.log("Tebex event received!");

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

                console.log("Invalid Tebex signature!");

                return res.status(401).send("Invalid signature");
            }
        }

        // =========================
        // TEBEX VALIDATION
        // =========================

        if (req.body.type === "validation.webhook") {

            console.log("Tebex webhook validation received!");

            return res.status(200).json({
                id: req.body.id
            });
        }

        // =========================
        // ONLY COMPLETED PAYMENTS
        // =========================

        if (req.body.type !== "payment.completed") {

            console.log(
                `Ignored event: ${req.body.type}`
            );

            return res.status(200).send("Event received");
        }

        console.log("Completed payment received!");

        const payment = req.body.subject;

        const channelId =
            process.env.DONATION_CHANNEL_ID;

        // Check channel ID
        if (!channelId) {

            console.log(
                "ERROR: DONATION_CHANNEL_ID is missing!"
            );

            return res.status(500).send(
                "Donation channel not configured"
            );
        }

        // Get Discord channel
        const channel =
            await client.channels.fetch(channelId);

        if (
            !channel ||
            channel.type !== ChannelType.GuildText
        ) {

            console.log(
                "ERROR: Donation channel not found!"
            );

            return res.status(500).send(
                "Channel not found"
            );
        }

        // =========================
        // MINECRAFT USERNAME
        // =========================

        const username =
            payment.customer?.username?.username ||
            payment.customer?.username ||
            "Unknown Player";

        // =========================
        // PURCHASED PACKAGES
        // =========================

        const packages =
            payment.products
                ?.map(product => {

                    const quantity =
                        product.quantity || 1;

                    const packageName =
                        product.name ||
                        "Unknown Package";

                    return `+ x${quantity} ${packageName}`;

                })
                .join("\n")
            ||
            "+ No package information";

        // =========================
        // DISCORD EMBED
        // =========================

        const embed = new EmbedBuilder()

            // No colour = Discord default

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
                value:
                    `\`\`\`diff\n${packages}\n\`\`\``
            });

        // =========================
        // SEND MESSAGE
        // =========================

        await channel.send({
            embeds: [embed]
        });

        console.log(
            `Donation message sent for ${username}`
        );

        return res
            .status(200)
            .send("Success");

    } catch (error) {

        console.error(
            "TEBEX ERROR:"
        );

        console.error(error);

        return res
            .status(500)
            .send("Server error");
    }
});

// =========================
// RENDER HEALTH PAGE
// =========================

app.get("/", (req, res) => {

    res.send(
        "Discord donation bot is running!"
    );

});

// =========================
// START WEB SERVER
// =========================

app.listen(PORT, () => {

    console.log(
        `Web server running on port ${PORT}`
    );

});

// =========================
// DISCORD LOGIN
// =========================

if (!process.env.DISCORD_TOKEN) {

    console.error(
        "ERROR: DISCORD_TOKEN environment variable is missing!"
    );

} else {

    console.log(
        "Discord token found. Attempting login..."
    );

}

client.login(process.env.DISCORD_TOKEN)

    .then(() => {

        console.log(
            "Discord login request successful!"
        );

    })

    .catch((error) => {

        console.error(
            "DISCORD LOGIN ERROR:"
        );

        console.error(error);

    });