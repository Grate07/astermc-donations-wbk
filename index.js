const express = require('express');
const app = express();
app.use(express.json());

const DISCORD_WEBHOOK = process.env.WEBHOOK_URL;

async function isPremium(username) {
  if (!username || username.startsWith(".")) return false;
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    return res.status === 200;
  } catch { return false; }
}

app.post('/tebex', async (req, res) => {
  console.log("Tebex Hit:", JSON.stringify(req.body).slice(0, 200));
  
  // Tebex validation check - just return 200
  if (!req.body.player && !req.body.username) {
    console.log("Validation webhook received");
    return res.sendStatus(200);
  }

  try {
    let username = req.body.player?.name || req.body.username || "Unknown";
    const item = req.body.packages?.[0]?.name || req.body.subject || "Donation";
    const cleanName = username.replace(/^\./, "");
    const premium = await isPremium(cleanName);
    
    let skinUrl = premium 
      ? `https://starlightskins.lunareclipse.studio/render/ultimate/${cleanName}/full`
      : `https://visage.surgeplay.com/full/512/MHF_Steve.png`;

    const percent = 84;
    const bar = "█".repeat(8) + "░".repeat(2);

    const discordRes = await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          color: 0x00FF0D,
          title: "New Donation Received 🎉",
          description: `**GG! ${username} has purchased ${item}**\n\n**Key All:**\n${bar} ${percent}%\n\nPurchase Ranks & Coins from our store\nhttps://store.astermc.net/`,
          image: { url: skinUrl }
        }]
      })
    });
    
    console.log("Discord status:", discordRes.status);
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get('/', (req,res) => res.send('Tebex Webhook is Online!'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Running on ' + PORT));