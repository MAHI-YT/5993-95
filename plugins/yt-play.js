const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { toAudio } = require('../lib/converter');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

// EliteProTech API - Primary
async function getEliteProTechDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
        return {
            download: res.data.downloadURL,
            title: res.data.title
        };
    }
    throw new Error('EliteProTech ytdown returned no download');
}

async function getYupraDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
        return {
            download: res.data.data.download_url,
            title: res.data.data.title,
            thumbnail: res.data.data.thumbnail
        };
    }
    throw new Error('Yupra returned no download');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
        return {
            download: res.data.dl,
            title: res.data.title,
            thumbnail: res.data.thumb
        };
    }
    throw new Error('Okatsu ytmp3 returned no download');
}

cmd({
    pattern: "music",
    alias: ["play", "song", "audio", "roohi", "ayezal"],
    desc: "Download YouTube audio with multiple API fallback",
    category: "download",
    react: "🎶",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return await reply('🎧 Please provide a song name or YouTube link!\n\nExample: .play Faded Alan Walker');
        }

        let video;
        if (q.includes('youtube.com') || q.includes('youtu.be')) {
            video = { url: q };
        } else {
            const search = await yts(q);
            if (!search || !search.videos.length) {
                return await reply('❌ No results found.');
            }
            video = search.videos[0];
        }

        // Inform user with thumbnail
        await conn.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: `🎧 *DARKZONE-MD AUDIO DOWNLOADER*\n╭━━━━━━━━━━━━━━━━━╮\n┃ 🎵 *Title:* ${video.title}\n┃ ⏱️ *Duration:* ${video.timestamp}\n┃ 👁️ *Views:* ${video.views?.toLocaleString() || 'N/A'}\n┃ 👤 *Author:* ${video.author?.name || 'N/A'}\n┃ 📥 *Status:* Downloading...\n╰━━━━━━━━━━━━━━━━━╯\n> *DARKZONE-MD*`
        }, { quoted: mek });

        // Try multiple APIs with fallback chain: EliteProTech -> Yupra -> Okatsu
        let audioData;
        let audioBuffer;
        let downloadSuccess = false;

        // List of API methods to try
        const apiMethods = [
            { name: 'EliteProTech', method: () => getEliteProTechDownloadByUrl(video.url) },
            { name: 'Yupra', method: () => getYupraDownloadByUrl(video.url) },
            { name: 'Okatsu', method: () => getOkatsuDownloadByUrl(video.url) }
        ];

        // Try each API until we successfully download audio
        for (const apiMethod of apiMethods) {
            try {
                audioData = await apiMethod.method();
                const audioUrl = audioData.download || audioData.dl || audioData.url;

                if (!audioUrl) {
                    console.log(`${apiMethod.name} returned no download URL, trying next API...`);
                    continue;
                }

                // Try to download the audio file - arraybuffer first
                try {
                    const audioResponse = await axios.get(audioUrl, {
                        responseType: 'arraybuffer',
                        timeout: 90000,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        decompress: true,
                        validateStatus: s => s >= 200 && s < 400,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': '*/*',
                            'Accept-Encoding': 'identity'
                        }
                    });
                    audioBuffer = Buffer.from(audioResponse.data);

                    if (audioBuffer && audioBuffer.length > 0) {
                        downloadSuccess = true;
                        console.log(`✅ Downloaded successfully from ${apiMethod.name}`);
                        break;
                    }
                } catch (downloadErr) {
                    const statusCode = downloadErr.response?.status || downloadErr.status;
                    if (statusCode === 451) {
                        console.log(`Download blocked (451) from ${apiMethod.name}, trying next API...`);
                        continue;
                    }

                    // Try stream mode as fallback for this URL
                    try {
                        const audioResponse = await axios.get(audioUrl, {
                            responseType: 'stream',
                            timeout: 90000,
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                            validateStatus: s => s >= 200 && s < 400,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': '*/*',
                                'Accept-Encoding': 'identity'
                            }
                        });
                        const chunks = [];
                        await new Promise((resolve, reject) => {
                            audioResponse.data.on('data', c => chunks.push(c));
                            audioResponse.data.on('end', resolve);
                            audioResponse.data.on('error', reject);
                        });
                        audioBuffer = Buffer.concat(chunks);

                        if (audioBuffer && audioBuffer.length > 0) {
                            downloadSuccess = true;
                            console.log(`✅ Downloaded via stream from ${apiMethod.name}`);
                            break;
                        }
                    } catch (streamErr) {
                        const streamStatusCode = streamErr.response?.status || streamErr.status;
                        if (streamStatusCode === 451) {
                            console.log(`Stream download blocked (451) from ${apiMethod.name}, trying next API...`);
                        } else {
                            console.log(`Stream download failed from ${apiMethod.name}:`, streamErr.message);
                        }
                        continue;
                    }
                }
            } catch (apiErr) {
                console.log(`${apiMethod.name} API failed:`, apiErr.message);
                continue;
            }
        }

        // If all APIs failed, throw error
        if (!downloadSuccess || !audioBuffer) {
            throw new Error('All download sources failed. The content may be unavailable or blocked in your region.');
        }

        // Validate buffer
        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error('Downloaded audio buffer is empty');
        }

        // Detect actual file format from signature
        const firstBytes = audioBuffer.slice(0, 12);
        const hexSignature = firstBytes.toString('hex');
        const asciiSignature = firstBytes.toString('ascii', 4, 8);

        let actualMimetype = 'audio/mpeg';
        let fileExtension = 'mp3';
        let detectedFormat = 'unknown';

        // Check for MP4/M4A (ftyp box)
        if (asciiSignature === 'ftyp' || hexSignature.startsWith('000000')) {
            const ftypBox = audioBuffer.slice(4, 8).toString('ascii');
            if (ftypBox === 'ftyp') {
                detectedFormat = 'M4A/MP4';
                actualMimetype = 'audio/mp4';
                fileExtension = 'm4a';
            }
        }
        // Check for MP3 (ID3 tag or MPEG frame sync)
        else if (audioBuffer.toString('ascii', 0, 3) === 'ID3' ||
            (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0)) {
            detectedFormat = 'MP3';
            actualMimetype = 'audio/mpeg';
            fileExtension = 'mp3';
        }
        // Check for OGG/Opus
        else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') {
            detectedFormat = 'OGG/Opus';
            actualMimetype = 'audio/ogg; codecs=opus';
            fileExtension = 'ogg';
        }
        // Check for WAV
        else if (audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
            detectedFormat = 'WAV';
            actualMimetype = 'audio/wav';
            fileExtension = 'wav';
        }
        else {
            actualMimetype = 'audio/mp4';
            fileExtension = 'm4a';
            detectedFormat = 'Unknown (defaulting to M4A)';
        }

        // Convert to MP3 if not already MP3
        let finalBuffer = audioBuffer;
        let finalMimetype = 'audio/mpeg';
        let finalExtension = 'mp3';

        if (fileExtension !== 'mp3') {
            try {
                finalBuffer = await toAudio(audioBuffer, fileExtension);
                if (!finalBuffer || finalBuffer.length === 0) {
                    throw new Error('Conversion returned empty buffer');
                }
                finalMimetype = 'audio/mpeg';
                finalExtension = 'mp3';
            } catch (convErr) {
                throw new Error(`Failed to convert ${detectedFormat} to MP3: ${convErr.message}`);
            }
        }

        // Send audio file
        await conn.sendMessage(from, {
            audio: finalBuffer,
            mimetype: finalMimetype,
            fileName: `${(audioData.title || video.title || 'song').replace(/[^\w\s-]/g, '')}.${finalExtension}`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

        // Cleanup temp files
        try {
            const tempDir = path.join(__dirname, '../temp');
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                const now = Date.now();
                files.forEach(file => {
                    const filePath = path.join(tempDir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (now - stats.mtimeMs > 10000) {
                            if (file.endsWith('.mp3') || file.endsWith('.m4a') || /^\d+\.(mp3|m4a)$/.test(file)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                });
            }
        } catch (cleanupErr) {
            // Ignore cleanup errors
        }

    } catch (err) {
        console.error('DARKZONE-MD Song command error:', err);

        let errorMessage = '❌ Failed to download song.';
        if (err.message && err.message.includes('blocked')) {
            errorMessage = '❌ Download blocked. The content may be unavailable in your region.';
        } else if (err.response?.status === 451 || err.status === 451) {
            errorMessage = '❌ Content unavailable (451). Legal restrictions or regional blocking.';
        } else if (err.message && err.message.includes('All download sources failed')) {
            errorMessage = '❌ All download sources failed. Content may be unavailable.';
        }

        await reply(errorMessage);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
