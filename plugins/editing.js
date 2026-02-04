const axios = require('axios');
const config = require('../config');
const { cmd } = require('../command');
const FormData = require('form-data');

// Function to upload image to Catbox and get URL
async function uploadToCatbox(buffer) {
    const form = new FormData();
    form.append('fileToUpload', buffer, { filename: 'image.jpg' });
    form.append('reqtype', 'fileupload');
    
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
    });
    
    return response.data;
}

cmd({
    pattern: "tosingapura",
    alias: ["singapura", "catify", "catface"],
    react: "🐱",
    desc: "Transform your photo to Singapura cat style",
    category: "fun",
    use: ".tosingapura (reply to an image)",
    filename: __filename
}, async (conn, mek, m, { from, quoted, reply, isMedia }) => {
    try {
        // Check if replied to an image or sent with image
        const isQuotedImage = quoted && (quoted.mimetype || '').startsWith('image');
        const isDirectImage = isMedia && mek.message?.imageMessage;
        
        if (!isQuotedImage && !isDirectImage) {
            return reply('❀ Please reply to an image or send an image with the command!');
        }

        await reply("*🐱 Transforming your image to Singapura cat style...*");

        // Download the image
        let buffer;
        if (isQuotedImage) {
            buffer = await quoted.download();
        } else {
            buffer = await conn.downloadMediaMessage(mek);
        }

        // Upload image to get URL
        const imageUrl = await uploadToCatbox(buffer);
        
        if (!imageUrl || !imageUrl.startsWith('http')) {
            return reply('❌ Failed to upload image. Please try again.');
        }

        // Call the Singapura transformation API
        const apiUrl = `https://api-faa.my.id/faa/tosingapura?url=${encodeURIComponent(imageUrl)}`;
        
        // Send transformed image
        await conn.sendMessage(from, { 
            image: { url: apiUrl }, 
            caption: '> 🐱 *Singapura Cat Transformation*\n> Powered by DARKZONE-MD' 
        }, { quoted: m });

    } catch (error) {
        console.error('Singapura Transform Error:', error);
        reply(`⚠️ An error occurred.\n\n${error.message}`);
    }
});
