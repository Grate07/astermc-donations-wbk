const express = require('express');
const app = express();
app.use(express.json());

const DISCORD_WEBHOOK = process.env.WEBHOOK_URL;

// Fix 1: Allow GET so you don't see Cannot GET
app.get('/tebex', (req, res) => res.send('Use POST for Tebex webhook'));

async function isPremium(username) {
  if (!username || username.startsWith(".")) return false;
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    return res.status === 200;
  } catch { return true; } // assume premium if API down
}

app.post('/tebex', async (req, res) => {
  // Log full type for debugging
  console.log("Tebex Type:", req.body.type || "no-type", "Keys:", Object.keys(req.body));

  // Tebex validation - correct check
  if (req.body.type && req.body.type.toLowerCase().includes("validation")) {
    console.log("Validation OK");
    return res.sendStatus(200);
  }

  try {
    // Fix 2: Tebex sends data in 3 different places
    let username = req.body.username 
                || req.body.player?.name 
                || req.body.customer?.username 
                || req.bodyign || "Unknown";
                
    let item = req.body.subject 
            || req.body.packages?.[0]?.name 
            || req.body.package?.name 
            || "Donation";

    if (!DISCORD_WEBHOOK) {
      console.log("ERROR: WEBHOOK_URL env missing!");
      return res.sendStatus(500);
    }

    const cleanName = username.replace(/^\./, "");
    const premium = await isPremium(cleanName);

    // Fix 3: Use reliable skin URLs
    let skinUrl = premium 
      ? `https://starlightskins.lunareclipse.studio/render/ultimate/${cleanName}/full`
      : `https://mc-heads.net/body/${cleanName}/left`;

    // Fallback if dot-name or API fail
    if (username.startsWith(".")) {
      skinUrl = `https://visage.surgeplay.com/full/512/ec3f62a7-3f65-30f2-bbfb-becfb9d6e9b3`;
    }

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

    const text = await discordRes.text();
    console.log("Discord status:", discordRes.status, text.slice(0,100));
    res.sendStatus(200);
  } catch (e) {
    console.error("CRASH:", e);
    res.sendStatus(500);
  }
});

app.get('/', (req,res) => res.send('Tebex Webhook is Online!'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Running on ' + PORT));