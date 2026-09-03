const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder
} = require("discord.js");

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


// ===============================
// DISCORD BOT
// ===============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});


client.once(
    Events.ClientReady,
    (readyClient) => {

        console.log(
            "BOT IS ONLINE: " +
            readyClient.user.tag
        );

    }
);


client.on(
    Events.Error,
    (error) => {

        console.error(
            "DISCORD ERROR:",
            error
        );

    }
);


console.log(
    "Starting Discord login..."
);


client.login(
    process.env.DISCORD_TOKEN
)
.then(() => {

    console.log(
        "Discord login successful!"
    );

})
.catch((error) => {

    console.error(
        "LOGIN ERROR:",
        error
    );

});


// ===============================
// TEBEX WEBHOOK
// ===============================

app.post(
    "/tebex",

    async (req, res) => {

        try {

            console.log(
                "Tebex event received!"
            );

            console.log(
                "Event type:",
                req.body.type
            );


            // ===============================
            // TEBEX WEBHOOK VALIDATION
            // ===============================

            if (
                req.body.type ===
                "validation.webhook"
            ) {

                console.log(
                    "Tebex validation received!"
                );

                return res
                    .status(200)
                    .json({

                        id: req.body.id

                    });

            }


            // ===============================
            // ONLY COMPLETED PAYMENTS
            // ===============================

            if (
                req.body.type !==
                "payment.completed"
            ) {

                console.log(
                    "Event ignored."
                );

                return res
                    .status(200)
                    .send("OK");

            }


            // ===============================
            // PAYMENT DATA
            // ===============================

            const payment =
                req.body.subject;


            if (!payment) {

                console.error(
                    "Payment data missing!"
                );

                return res
                    .status(400)
                    .send(
                        "Payment data missing"
                    );

            }


            // ===============================
            // MINECRAFT USERNAME
            // ===============================

            const username =
                payment.customer?.username?.username ||
                payment.customer?.username ||
                "Unknown Player";


            // ===============================
            // PURCHASED PACKAGES
            // ===============================

            let packageNames =
                "Unknown Package";


            if (
                payment.products &&
                Array.isArray(
                    payment.products
                ) &&
                payment.products.length > 0
            ) {

                packageNames =
                    payment.products

                    .map(
                        (product) => {

                            const quantity =
                                product.quantity ||
                                1;


                            const name =
                                product.name ||
                                "Unknown Package";


                            if (
                                quantity > 1
                            ) {

                                return (
                                    name +
                                    " x" +
                                    quantity
                                );

                            }


                            return name;

                        }
                    )

                    .join(", ");

            }


            // ===============================
            // DONATION CHANNEL
            // ===============================

            const channelId =
                process.env
                    .DONATION_CHANNEL_ID;


            if (!channelId) {

                console.error(
                    "DONATION_CHANNEL_ID is missing!"
                );

                return res
                    .status(500)
                    .send(
                        "Channel not configured"
                    );

            }


            const channel =
                await client.channels.fetch(
                    channelId
                );


            if (
                !channel ||
                !channel.isTextBased()
            ) {

                console.error(
                    "Donation channel not found!"
                );

                return res
                    .status(500)
                    .send(
                        "Donation channel not found"
                    );

            }


            // ===============================
            // MINECRAFT SKIN
            // ===============================

            const skinUrl =
                "https://mc-heads.net/body/" +
                encodeURIComponent(
                    username
                ) +
                "/200";


            // ===============================
            // CREATE DONATION EMBED
            // ===============================

            const embed =
                new EmbedBuilder()

                .setColor(
                    "#57F287"
                )

                .setTitle(
                    "🎉 New Donation Received 🎉"
                )

                .setDescription(

                    "**GG! " +
                    username +
                    " has purchased**\n" +

                    "**" +
                    packageNames +
                    "**"

                )

                .addFields({

                    name:
                        "🔑 Key All:",

                    value:

                        "██████████░░░░░░░░░░\n" +
                        "**5%**"

                })

                .addFields({

                    name:
                        "🛒 Store",

                    value:

                        "Purchase Ranks & Coins from our store\n" +

                        (
                            process.env.STORE_URL ||
                            "Store link not configured"
                        )

                })

                .setImage(
                    skinUrl
                )

                .setFooter({

                    text:
                        "Thank you for supporting our server!"

                })

                .setTimestamp();


            // ===============================
            // SEND DONATION MESSAGE
            // ===============================

            await channel.send({

                embeds: [
                    embed
                ]

            });


            console.log(

                "Donation message sent for " +
                username

            );


            return res
                .status(200)
                .send(
                    "Success"
                );


        } catch (error) {


            console.error(

                "TEBEX ERROR:",
                error

            );


            return res
                .status(500)
                .send(
                    "Server error"
                );


        }

    }
);


// ===============================
// HOME PAGE
// ===============================

app.get(
    "/",

    (req, res) => {

        res.send(
            "Minecraft Discord donation bot is running!"
        );

    }
);


// ===============================
// START WEB SERVER
// ===============================

app.listen(
    PORT,
    "0.0.0.0",

    () => {

        console.log(

            "Web server running on port " +
            PORT

        );

    }
);