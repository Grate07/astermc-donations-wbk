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

            return res.status(200).send("OK");
        }

        const payment = req.body.subject;

        if (!payment) {
            return res.status(400).send("Payment data missing");
        }


        // Minecraft username
        const username =
            payment.customer?.username?.username ||
            payment.customer?.username ||
            "Unknown Player";


        // Packages
        let packages = "+ Unknown Package";

        if (payment.products) {

            packages = payment.products
                .map((product) => {

                    const quantity =
                        product.quantity || 1;

                    const name =
                        product.name || "Unknown Package";

                    return "+ x" + quantity + " " + name;

                })
                .join("\n");

        }


        // Donation Channel
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


        // Create Embed
        const codeBlock = "```";

        const embed = new EmbedBuilder()

            .setAuthor({
                name: "🛒 Visit our Store now!"
            })

            .setTitle(
                "Thank You for your support!"
            )

            .setDescription(
                codeBlock +
                "\n" +
                username +
                " has supported us!" +
                "\n" +
                codeBlock
            )

            .addFields({

                name: "Packages",

                value:
                    codeBlock +
                    "diff\n" +
                    packages +
                    "\n" +
                    codeBlock

            });


        // Send with Discord Bot
        await channel.send({

            embeds: [embed]

        });


        console.log(
            "Donation message sent for " +
            username
        );


        return res
            .status(200)
            .send("Success");


    } catch (error) {

        console.error(
            "TEBEX ERROR:",
            error
        );

        return res
            .status(500)
            .send("Server error");

    }

});


// Render home page
app.get("/", (req, res) => {

    res.send(
        "Minecraft Discord donation bot is running!"
    );

});


// Start server
app.listen(PORT, "0.0.0.0", () => {

    console.log(
        "Web server running on port " +
        PORT
    );

});