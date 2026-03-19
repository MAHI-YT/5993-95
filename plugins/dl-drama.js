const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "drama",
    alias: ["ytDrama", "ytmdrama", "dzdrama"],
    desc: "Download YouTube drama in high quality (Dark Zone MD)",
    category: "download",
    react: "🍿",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply(`
🌸 *DRAMA DOWNLOADER – DARK ZONE MD* 🌸

🎬 Please provide a drama name or YouTube URL!

💡 Example:
\`.drama Kaisi Teri Khudgarzi Episode 1\`
        `);

        // Function to extract video ID
        function getVideoId(url) {
            const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            return match ? match[1] : null;
        }

        let url = q;
        let videoInfo = null;

        // Detect URL or title
        if (q.startsWith('http://') || q.startsWith('https://')) {
            if (!q.includes("youtube.com") && !q.includes("youtu.be"))
                return await reply("❌ Please provide a valid YouTube drama URL!");
            const videoId = getVideoId(q);
            if (!videoId) return await reply("❌ Invalid YouTube URL!");
            const searchFromUrl = await yts({ videoId: videoId });
            videoInfo = searchFromUrl;
            url = `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            const search = await yts(q + " drama full episode");
            if (!search.videos || search.videos.length === 0)
                return await reply("😢 No drama found with that name!");
            videoInfo = search.videos[0];
            url = videoInfo.url;
        }

        // Send fancy preview
        await conn.sendMessage(from, {
            image: { url: videoInfo.thumbnail },
            caption: `
╔═══════════◇🌙◇═════════╗
     *🎭 DRAMA DOWNLOADER 🎭*
╚═══════════◇🌙◇═════════╝

📺 *Title:* ${videoInfo.title}
🕒 *Duration:* ${videoInfo.timestamp}
👁️ *Views:* ${videoInfo.views.toLocaleString()}
🔗 *Source:* YouTube

⏳ _Fetching download link..._
            `
        }, { quoted: mek });

        // Download via GiftedTech API
        const api = `https://api.giftedtech.co.ke/api/download/dlmp4?apikey=gifted&url=${encodeURIComponent(url)}`;
        const res = await axios.get(api);
        const data = res.data;

        if (!data?.success || !data?.result?.download_url)
            return await reply("⚠️ Could not get the drama file, please try again later!");

        const { title, download_url, quality } = data.result;

        // Send as a document for faster speed
        await conn.sendMessage(from, {
            document: { url: download_url },
            mimetype: 'video/mp4',
            fileName: `${title || videoInfo.title}.mp4`,
            caption: `
✨ *${title || videoInfo.title}*  
📊 *Quality:* ${quality || '480p'}
🎬 Your requested drama is ready!

🖤 *Enjoy Watching With*  
『🔥 DARK ZONE MD 🔥』
            `
        }, { quoted: mek });

        // Success react
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error("❌ Error in .drama command:", err);
        await reply("⚠️ Oops! Something went wrong while fetching your drama!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
