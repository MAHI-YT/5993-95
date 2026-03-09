const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "music",
    alias: ["play", "song", "audio", "roohi", "ayezal"],
    desc: "Download YouTube audio with thumbnail (Faa API)",
    category: "download",
    react: "🎶",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎧 Please provide a song name!\n\nExample: .play Faded Alan Walker");

        await reply("🔍 Searching...");

        // Use new Faa API with proper config
        const api = `https://api-faa.my.id/faa/ytplay?q=${encodeURIComponent(q)}`;
        
        const res = await axios.get(api, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        const json = res.data;

        // Debug log
        console.log("API Response:", JSON.stringify(json, null, 2));

        if (!json.status || !json.result || !json.result.mp3) {
            return await reply("❌ No results found or download failed!");
        }

        const result = json.result;
        const title = result.title || "Unknown Song";
        const thumbnail = result.thumbnail || "";
        const audioUrl = result.mp3;
        const duration = result.duration ? `${Math.floor(result.duration / 60)}:${(result.duration % 60).toString().padStart(2, '0')}` : "Unknown";
        const views = result.views ? result.views.toLocaleString() : "Unknown";
        const author = result.author || "Unknown";
        const published = result.published || "Unknown";

        // 🎵 Send video thumbnail + info first
        try {
            await conn.sendMessage(from, {
                image: { url: thumbnail },
                caption: `🎧 *AUDIO DOWNLOADER*\n╭━━━━━━━━━━━━━━╮\n┃ 🎵 *Title:* ${title}\n┃ 👤 *Author:* ${author}\n┃ ⏱️ *Duration:* ${duration}\n┃ 👁️ *Views:* ${views}\n┃ 📅 *Published:* ${published}\n┃ 📥 *Status:* Downloading...\n╰━━━━━━━━━━━━━━╯\n> *DARKZONE-MD*`
            }, { quoted: mek });
        } catch (thumbError) {
            console.log("Thumbnail error, sending without image:", thumbError.message);
            await reply(`🎧 *AUDIO DOWNLOADER*\n╭━━━━━━━━━━━━━━╮\n┃ 🎵 *Title:* ${title}\n┃ 👤 *Author:* ${author}\n┃ ⏱️ *Duration:* ${duration}\n┃ 👁️ *Views:* ${views}\n┃ 📅 *Published:* ${published}\n┃ 📥 *Status:* Downloading...\n╰━━━━━━━━━━━━━━╯\n> *DARKZONE-MD*`);
        }

        // 🎧 Send final audio file
        await conn.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Full Error Details:", e.message);
        console.error("Error Stack:", e.stack);
        await reply("❌ Error: " + e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
