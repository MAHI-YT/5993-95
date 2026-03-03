const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');
const FormData = require('form-data');

cmd({
    pattern: "anime",
    alias: ["toanime"],
    react: "🎨",
    desc: "Convert replied image into Anime style",
    category: "image",
    use: ".anime (reply to image)",
    filename: __filename,
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {

        // Check reply image
        if (!quoted || !quoted.imageMessage) {
            return reply("🖼️ Reply to an image with `.anime`");
        }

        await reply("⏳ Creating anime version...");

        // Download image from WhatsApp
        const stream = await downloadContentFromMessage(
            quoted.imageMessage,
            'image'
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Upload image to tmpfiles
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

        // Call YOUR API
        const apiRes = await axios.get(
            `https://api-faa.my.id/faa/toanime?url=${encodeURIComponent(imageUrl)}`,
            { timeout: 60000 }
        );

        const data = apiRes.data;

        // Validate API response structure
        if (!data.status || !data.url) {
            console.log("Invalid API Response:", data);
            return reply("❌ API failed to generate image.");
        }

        // Send generated image directly using returned URL
        await conn.sendMessage(
            from,
            {
                image: { url: data.url },
                caption: `🎨 Anime Image Generated Successfully\n\n👤 Creator: ${data.creator}`
            },
            { quoted: m }
        );

    } catch (err) {
        console.error("ANIME ERROR:", err.response?.data || err.message);
        reply("❌ Anime conversion failed. Try again later.");
    }
});
