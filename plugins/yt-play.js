const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "music",
    alias: ["play", "song", "audio", "roohi"],
    desc: "Download YouTube audio with thumbnail (Deline API)",
    category: "download",
    react: "🎶",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎧 Please provide a song name!\n\nExample: .play Faded Alan Walker");

        

        // Use new Deline API
        const api = `https://api.deline.web.id/downloader/ytplay?q=${encodeURIComponent(q)}`;
        const res = await axios.get(api);
        const json = res.data;

        if (!json?.status || !json?.result?.dlink) {
            return await reply("❌ No results found or download failed!");
        }

        const result = json.result;
        const title = result.title || "Unknown Song";
        const thumbnail = result.thumbnail;
        const audioUrl = result.dlink;
        const quality = result.pick?.quality || "128kbps";
        const size = result.pick?.size || "Unknown";
        const videoUrl = result.url || "N/A";

        // 🎵 Send video thumbnail + info first
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `- *AUDIO DOWNLOADER 🎧*\n╭━━❐━⪼\n┇๏ *Title* - ${title}\n┇๏ *Quality* - ${quality}\n┇๏ *Size* - ${size}\n┇๏ *Author* - ${vid.author.name}\n┇๏ *Status* - Downloading...\n╰━━❑━⪼\n> *DARKZONE-MD*`
        }, { quoted: mek });

        // 🎧 Send final audio file
        await conn.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .play command:", e);
        await reply("❌ Error occurred, please try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
