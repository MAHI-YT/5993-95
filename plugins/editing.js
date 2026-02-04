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

        // Step 1: Download image from WhatsApp
        let buffer;
        try {
            const stream = await downloadContentFromMessage(
                quoted.imageMessage,
                'image'
            );

            buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            console.log("✅ Image downloaded, size:", buffer.length);
        } catch (downloadErr) {
            console.error("Download Error:", downloadErr);
            return reply("❌ Failed to download image from WhatsApp.");
        }

        // Step 2: Upload image to Catbox.moe (more reliable)
        let imageUrl;
        try {
            const form = new FormData();
            form.append('fileToUpload', buffer, {
                filename: 'image.jpg',
                contentType: 'image/jpeg'
            });
            form.append('reqtype', 'fileupload');

            const uploadRes = await axios.post(
                'https://catbox.moe/user/api.php',
                form,
                { 
                    headers: form.getHeaders(),
                    timeout: 30000
                }
            );

            imageUrl = uploadRes.data;
            console.log("✅ Image uploaded:", imageUrl);

            if (!imageUrl || !imageUrl.startsWith('http')) {
                throw new Error("Invalid upload response");
            }
        } catch (uploadErr) {
            console.error("Upload Error:", uploadErr);
            
            // Fallback: Try tmpfiles.org
            try {
                const form2 = new FormData();
                form2.append('file', buffer, {
                    filename: 'dubai.jpg',
                    contentType: 'image/jpeg'
                });

                const uploadRes2 = await axios.post(
                    'https://tmpfiles.org/api/v1/upload',
                    form2,
                    { headers: form2.getHeaders() }
                );

                imageUrl = uploadRes2.data.data.url.replace(
                    'tmpfiles.org/',
                    'tmpfiles.org/dl/'
                );
                console.log("✅ Fallback upload:", imageUrl);
            } catch (fallbackErr) {
                console.error("Fallback Upload Error:", fallbackErr);
                return reply("❌ Failed to upload image. Please try again.");
            }
        }

        // Step 3: Call Dubai Effect API
        let resultBuffer;
        try {
            const apiUrl = `https://api-faa.my.id/faa/todubai?url=${encodeURIComponent(imageUrl)}`;
            console.log("🔗 API URL:", apiUrl);

            const apiRes = await axios.get(apiUrl, { 
                timeout: 120000,
                responseType: 'arraybuffer'
            });

            resultBuffer = Buffer.from(apiRes.data);
            console.log("✅ API Response received, size:", resultBuffer.length);

            // Check if response is actually an image
            if (resultBuffer.length < 1000) {
                // Might be JSON error, try to parse
                const textResponse = resultBuffer.toString('utf-8');
                console.log("API Text Response:", textResponse);
                
                try {
                    const jsonData = JSON.parse(textResponse);
                    if (jsonData.result || jsonData.data?.result || jsonData.url) {
                        const resultUrl = jsonData.result || jsonData.data?.result || jsonData.url;
                        const imgRes = await axios.get(resultUrl, {
                            responseType: 'arraybuffer',
                            timeout: 60000
                        });
                        resultBuffer = Buffer.from(imgRes.data);
                    } else {
                        throw new Error("No result in JSON");
                    }
                } catch (jsonErr) {
                    console.error("JSON Parse Error:", jsonErr);
                    return reply("❌ API returned invalid response.");
                }
            }

        } catch (apiErr) {
            console.error("API Error:", apiErr.message);
            return reply("❌ Dubai effect API failed. Server might be down.");
        }

        // Step 4: Send processed image
        try {
            await conn.sendMessage(
                from,
                {
                    image: resultBuffer,
                    caption: "> 🏙️ Dubai Effect Applied Successfully by DARKZONE-MD"
                },
                { quoted: m }
            );
            console.log("✅ Image sent successfully");
        } catch (sendErr) {
            console.error("Send Error:", sendErr);
            return reply("❌ Failed to send processed image.");
        }

    } catch (err) {
        console.error("TODUBAI FULL ERROR:", err);
        reply("❌ Dubai effect failed: " + err.message);
    }
});
