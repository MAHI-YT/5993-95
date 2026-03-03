const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');
const FormData = require('form-data');

cmd({
    pattern: "toanime",
    alias: ["animeimg"],
    react: "🎨",
    desc: "Convert image into Anime style",
    category: "image",
    use: ".toanime (reply to image)",
    filename: __filename,
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        // Must reply to an image
        if (!quoted || !quoted.imageMessage) {
            return reply("🖼️ Please reply to an image with `.toanime`");
        }

        await reply("⏳ Converting image to Anime style, please wait...");

        // Download image from WhatsApp
        const stream = await downloadContentFromMessage(
            quoted.imageMessage,
            'image'
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Upload image to temporary hosting
        const form = new FormData();
        form.append('file', buffer, {
            filename: 'anime.jpg',
            contentType: 'image/jpeg'
        });

        const uploadRes = await axios.post(
            'https://tmpfiles.org/api/v1/upload',
            form,
            { headers: form.getHeaders() }
        );

        const imageUrl = uploadRes.data.data.url.replace(
            'tmpfiles.org/',
            'tmpfiles.org/dl/'
        );

        // Call Your Anime API
        const apiUrl = `https://api-faa.my.id/faa/toanime?url=${encodeURIComponent(imageUrl)}`;

        // Send result image directly
        await conn.sendMessage(
            from,
            {
                image: { url: apiUrl },
                caption: "> 🎨 Anime Image Created Successfully by 𝐑𝐔𝐇𝐈𝐈𝐈 😻🎀💗"
            },
            { quoted: m }
        );

    } catch (err) {
        console.error("TOANIME ERROR:", err);
        reply("❌ Anime conversion failed. Please try again.");
    }
});
