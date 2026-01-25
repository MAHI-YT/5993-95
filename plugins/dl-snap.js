const { cmd, commands } = require('../command');
const axios = require('axios');

cmd({
  'pattern': "snackvideo",
  'alias': ["snack", "sv"],
  'react': '🎬',
  'desc': "Download SnackVideo videos",
  'category': "download",
  'use': ".snackvideo <url>",
  'filename': __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  try {
    if (!args[0]) {
      return reply("❌ Please provide a SnackVideo URL.\n\nExample: .snackvideo https://www.snackvideo.com/...");
    }

    const url = args[0];
    reply("*🎬 Downloading SnackVideo...*");
    
    const response = await axios.get(`https://api.deline.web.id/downloader/snackvideo?url=${encodeURIComponent(url)}`);

    if (!response.data || !response.data.status) {
      return reply("❌ Failed to download video. Please check the URL and try again.");
    }

    const videoUrl = response.data.result.video;

    await conn.sendMessage(from, {
      'video': { 'url': videoUrl },
      'caption': "✅ Downloaded via SnackVideo Downloader"
    }, { 'quoted': m });

  } catch (error) {
    console.error(error);
    reply("❌ An error occurred while downloading the video.");
  }
});
