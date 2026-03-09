const { cmd } = require('../command');
const fetch = require('node-fetch');

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

        const api = `https://api-faa.my.id/faa/ytplay?q=${encodeURIComponent(q)}`;
        
        const res = await fetch(api);
        const json = await res.json();

        console.log("API Response:", json);

        if (!json.status || !json.result || !json.result.mp3) {
            return await reply("❌ No results found!");
        }

        const { title, mp3, thumbnail, duration, views, author, published } = json.result;

        const dur = duration ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : "N/A";

        const caption = `🎧 *AUDIO DOWNLOADER*
╭━━━━━━━━━━━━━━╮
┃ 🎵 *Title:* ${title}
┃ 👤 *Author:* ${author}
┃ ⏱️ *Duration:* ${dur}
┃ 👁️ *Views:* ${views?.toLocaleString()}
┃ 📅 *Published:* ${published}
╰━━━━━━━━━━━━━━╯
> *DARKZONE-MD*`;

        // Send thumbnail
        if (thumbnail) {
            await conn.sendMessage(from, {
                image: { url: thumbnail },
                caption: caption
            }, { quoted: mek });
        } else {
            await reply(caption);
        }

        // Send audio
        await conn.sendMessage(from, {
            audio: { url: mp3 },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error:", e);
        await reply("❌ Error: " + e.message);
    }
});
