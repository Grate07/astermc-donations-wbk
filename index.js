const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = 3000;
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1537787955144433765/wOD0TusPweqOPdIAY31U_3_psQWeQt2AbBGtZWvVd5cPyUvt8rjtDGynAZ4Wc1VrkTTw";

app.post('/tebex', async (req, res) => {
    try {
        const data = req.body;
        console.log("Webhook received:", data.type); // This will show in Render logs

        // 1. LOGIN WEBHOOK
        if (data.type === 'player.login') {
            const username = data.player.name;
            await axios.post(DISCORD_WEBHOOK, {
                embeds: [{
                    title: "✅ Player Logged In",
                    description: `**${username}** just opened the store`,
                    color: 3447003, // Blue
                    timestamp: new Date()
                }]
            });
            console.log(`Posted login for ${username}`);
            return res.sendStatus(200);
        }

        // 2. PAYMENT WEBHOOK
        if (data.type === 'payment.completed') {
            const username = data.player.name;
            const uuid = data.player.uuid;
            const email = data.player.email;
            const items = data.basket.basket_items;
            const price = data.amount;
            const currency = data.currency.iso_4217;
            const txnId = data.id;

            // Check Mojang for real skin. If cracked = Steve
            let avatar = `https://mc-heads.net/avatar/Steve/128`;
            let skinUrl = `https://mc-heads.net/body/Steve`;
            try {
                await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`, {timeout: 2000});
                avatar = `https://mc-heads.net/avatar/${username}/128`;
                skinUrl = `https://mc-heads.net/body/${username}`;
            } catch {}

            const itemList = items.map(i => `**${i.quantity}x** ${i.name}`).join('\n');

            await axios.post(DISCORD_WEBHOOK, {
                username: "Tebex Store",
                avatar_url: avatar,
                embeds: [{
                    title: "💰 New Purchase",
                    description: `**${username}** has just made a purchase on the store.`,
                    color: 3066993, // Tebex green
                    thumbnail: { url: avatar },
                    image: { url: skinUrl }, // Full body skin
                    fields: [
                        { name: "Username", value: `\`${username}\``, inline: true },
                        { name: "Email", value: `\`${email}\``, inline: true },
                        { name: "UUID", value: `\`${uuid}\``, inline: false },
                        { name: "Package(s)", value: itemList, inline: false },
                        { name: "Amount", value: `**${price} ${currency}**`, inline: true },
                        { name: "Transaction ID", value: `\`${txnId}\``, inline: true }
                    ],
                    footer: { text: "Tebex", icon_url: "https://cdn.tebex.io/webstore/favicon.ico" },
                    timestamp: new Date()
                }]
            });
            console.log(`Posted purchase for ${username}`);
            return res.sendStatus(200);
        }
        
        // If it's any other webhook type
        res.sendStatus(200);
        
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => console.log(`✅ Tebex Bot running on port ${PORT}`));