const axios = require('axios');
const config = require('../config');
const { cmd } = require('../command');

async function getGoogleImageSearch(query) {
    const apiUrl = `https://api-faa.my.id/faa/google-image?query=${encodeURIComponent(query)}`;
    
    try {
        const res = await axios.get(apiUrl);
        const data = res.data;
        
        // Check if status is true and result is an array
        if (data.status === true && Array.isArray(data.result)) {
            // Filter valid URLs
            return data.result.filter(url => typeof url === 'string' && url.startsWith('http'));
        }
        return [];
    } catch (error) {
        console.error('API Error:', error.message);
        return [];
    }
}

cmd({
    pattern: "imagen",
    alias: ["image", "img"],
    react: "🕒",
    desc: "Search for images",
    category: "search",
    use: ".imagen <query>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`❀ Please enter a text to search for an Image.`);

        await reply("*🔍 SEARCHING FOR IMAGES...*");

        const urls = await getGoogleImageSearch(q);
        
        if (!urls || urls.length === 0) {
            return reply('✧ No images found for your search.');
        }
        
        if (urls.length < 2) {
            return reply('✧ Not enough images found for an album.');
        }

        // Send up to 10 images
        const imagesToSend = urls.slice(0, 10);
        
        for (let i = 0; i < imagesToSend.length; i++) {
            try {
                await conn.sendMessage(from, { 
                    image: { url: imagesToSend[i] },
                    caption: i === 0 ? `> 🖼️ DARKZONE-MD RESULTS FOR: ${q}` : ''
                }, { quoted: m });
            } catch (err) {
                console.error(`Failed to send image ${i + 1}:`, err.message);
                continue; // Skip failed image and continue with next
            }
        }

        await conn.sendMessage(from, { 
            text: `✅ Successfully sent ${imagesToSend.length} images for: *${q}*` 
        }, { quoted: m });

    } catch (error) {
        console.error('Image Search Error:', error);
        reply(`⚠️ A problem has occurred.\n\n${error.message}`);
    }
});
