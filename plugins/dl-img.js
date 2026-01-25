const axios = require('axios');
const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "imagen",
    alias: ["image", "img", "gimage"],
    react: "🖼️",
    desc: "Search for images",
    category: "search",
    use: ".imagen <query>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`❀ Please enter a text to search for an Image.`);

        await conn.sendMessage(from, { react: { text: "🔍", key: m.key } });
        await reply("*🔎 SEARCHING FOR IMAGES...*");

        // New Working API - Correct Format
        const apiURL = `https://api-faa.my.id/faa/google-image?query=${encodeURIComponent(q)}`;
        
        console.log("Calling API:", apiURL);

        const res = await axios.get(apiURL, {
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        });

        const data = res.data;
        console.log("Full API Response:", JSON.stringify(data, null, 2));

        // Check if result exists and is array
        if (!data.result || !Array.isArray(data.result) || data.result.length === 0) {
            return reply("✧ No images found for your search query.");
        }

        // Get image URLs directly from result array
        const imageUrls = data.result;

        console.log("Found Images:", imageUrls.length);

        // Update reaction
        await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

        // Send up to 5 images
        const maxImages = Math.min(imageUrls.length, 5);
        
        for (let i = 0; i < maxImages; i++) {
            try {
                await conn.sendMessage(from, {
                    image: { url: imageUrls[i] },
                    caption: i === 0 ? `🔍 *Results for:* ${q}\n\n> 📥 *DARKZONE-MD*` : ""
                }, { quoted: m });

                // Delay between sends
                await new Promise(r => setTimeout(r, 1500));

            } catch (imgErr) {
                console.warn(`Image ${i + 1} failed:`, imgErr.message);
            }
        }

        // Success reaction
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (error) {
        console.error('Full Error:', error);
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
        reply(`⚠️ Error: ${error.message}`);
    }
});
