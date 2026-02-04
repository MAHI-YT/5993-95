const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');
const FormData = require('form-data');

cmd({
    pattern: "todubai",
    alias: ["dubai", "dubaieffect"],
    react: "🏙️",
    desc: "Apply Dubai effect to your image",
    category: "image",
    use: ".todubai (reply to image)",
    filename: __filename,
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        // Must reply to image
        if (!quoted || !quoted.imageMessage) {
            return reply("🖼️ Please reply to an image with `.todubai`");
        }

        await reply("⏳ Applying Dubai effect, please wait...");

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
            filename: 'dubai.jpg',
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

        // Call Dubai Effect API
        const apiUrl = `https://api-faa.my.id/faa/todubai?url=${encodeURIComponent(imageUrl)}`;

        const apiRes = await axios.get(apiUrl, { timeout: 60000 });
        const apiData = apiRes.data;

        // Get result URL from response (adjust based on actual response structure)
        let resultUrl = apiData.result || apiData.data?.result || apiData.url || apiData.image;

        if (!resultUrl) {
            return reply("❌ Effect failed. API returned no image.");
        }

        // Send processed image
        await conn.sendMessage(
            from,
            {
                image: { url: resultUrl },
                caption: "> 🏙️ Dubai Effect Applied Successfully by DARKZONE-MD"
            },
            { quoted: m }
        );

    } catch (err) {
        console.error("TODUBAI ERROR:", err);
        reply("❌ Dubai effect failed. Please try again.");
    }
});
