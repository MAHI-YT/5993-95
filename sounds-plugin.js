/**
 * ╔══════════════════════════════════════════╗
 * ║     MUSLIM / URDU SOUNDS PLUGIN          ║
 * ║  Islamic, Motivational & Ertugrul Sounds ║
 * ║  All Commands Use Direct Audio URLs      ║
 * ╚══════════════════════════════════════════╝
 *
 * Categories:
 *  🕌 Islamic Phrases     (sound1–sound10)
 *  📿 Quran Recitations   (sound11–sound17)
 *  🎙️ Urdu Motivations    (sound18–sound24)
 *  ⚔️  Ertugrul/Memes     (sound25–sound32)
 *  🌙 Islamic Nasheeds    (sound33–sound38)
 */

const { cmd } = require('../command');

// ─── Helper: send audio ───────────────────────
async function sendAudio(conn, from, mek, url, caption) {
    try {
        await conn.sendMessage(from, {
            audio: { url },
            mimetype: 'audio/mp4',
            ptt: false,
            caption: caption
        }, { quoted: mek });
    } catch (e1) {
        try {
            await conn.sendMessage(from, {
                audio: { url },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });
        } catch (e2) {
            await conn.sendMessage(from, {
                document: { url },
                mimetype: 'audio/mpeg',
                fileName: 'audio.mp3',
                caption
            }, { quoted: mek });
        }
    }
}

// ─── Helper: send as voice note (PTT) ─────────
async function sendVoice(conn, from, mek, url, caption) {
    try {
        await conn.sendMessage(from, {
            audio: { url },
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: mek });
    } catch {
        await sendAudio(conn, from, mek, url, caption);
    }
}

// ══════════════════════════════════════════════
//  🕌  ISLAMIC PHRASES  (1–10)
// ══════════════════════════════════════════════

// 1. BISMILLAH
cmd({
    pattern: "sound1",
    alias: ["bismillah", "snd1"],
    desc: "Play Bismillah ir-Rahman ir-Raheem audio",
    category: "fun",
    react: "🕌",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://archive.org/download/BismillahRecitation/Bismillah.mp3';
    await sendAudio(conn, from, mek, url, '🕌 *بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ*\nBismillah ir-Rahman ir-Raheem').catch(() => {
        reply(`🕌 *BISMILLAH*\n\n_بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ_\n\nIn the name of Allah, the Most Gracious, the Most Merciful.\n\n🔗 Audio: https://archive.org/download/BismillahRecitation/Bismillah.mp3`);
    });
});

// 2. ALLAHU AKBAR
cmd({
    pattern: "sound2",
    alias: ["allahuakbar", "takbeer", "snd2"],
    desc: "Play Allahu Akbar / Takbeer audio",
    category: "fun",
    react: "☪️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia800905.us.archive.org/16/items/Takbeer_201407/Takbeer.mp3';
    await sendAudio(conn, from, mek, url, '☪️ *اللَّهُ أَكْبَرُ*\nAllahu Akbar!').catch(() => {
        reply('☪️ *ALLAHU AKBAR* 🌙\n\n_اللَّهُ أَكْبَرُ — Allah is the Greatest!_');
    });
});

// 3. AZAN (FAJR)
cmd({
    pattern: "sound3",
    alias: ["azan", "fajrazan", "snd3"],
    desc: "Play Azan (Call to Prayer)",
    category: "fun",
    react: "🌙",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia800204.us.archive.org/12/items/AzanMecca/makkah_fajr.mp3';
    await sendAudio(conn, from, mek, url, '🌙 *اَلأَذَان*\nAzan — Call to Prayer\n\n_اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ_').catch(() => {
        reply('🌙 *AZAN — CALL TO PRAYER* 📿\n\n_اللَّهُ أَكْبَرُ — اشْهَدُ أَنْ لَا إلَهَ إلَّا اللَّهُ_');
    });
});

// 4. SUBHANALLAH
cmd({
    pattern: "sound4",
    alias: ["subhanallah", "tasbih", "snd4"],
    desc: "Play Subhanallah tasbih audio",
    category: "fun",
    react: "💚",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    // Use quran.com CDN audio API
    const url = 'https://ia803002.us.archive.org/11/items/subhanallah_202302/SubhanAllah.mp3';
    await sendAudio(conn, from, mek, url, '💚 *سُبْحَانَ اللَّهِ*\nSubhanallah — Glory be to Allah!').catch(() => {
        reply('💚 *سُبْحَانَ اللَّهِ*\n\n_Subhanallah — Glory be to Allah!_\n\n🌿 Say it 33 times after every prayer!');
    });
});

// 5. ALHAMDULILLAH
cmd({
    pattern: "sound5",
    alias: ["alhamdulillah", "hamd", "snd5"],
    desc: "Play Alhamdulillah audio",
    category: "fun",
    react: "🤲",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia803002.us.archive.org/11/items/subhanallah_202302/AlhamdoLILLAH.mp3';
    await sendAudio(conn, from, mek, url, '🤲 *اَلْحَمْدُ لِلَّهِ*\nAlhamdulillah — All praise be to Allah!').catch(() => {
        reply('🤲 *اَلْحَمْدُ لِلَّهِ*\n\n_Alhamdulillah — All praise be to Allah!_\n\n💚 Say it to show gratitude.');
    });
});

// 6. MASHALLAH
cmd({
    pattern: "sound6",
    alias: ["mashallah", "masha", "snd6"],
    desc: "Play MashaAllah audio phrase",
    category: "fun",
    react: "✨",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia803002.us.archive.org/11/items/subhanallah_202302/Masha%27Allah.mp3';
    await sendAudio(conn, from, mek, url, '✨ *مَا شَاءَ اللَّهُ*\nMasha\'Allah — What Allah has willed!').catch(() => {
        reply('✨ *مَا شَاءَ اللَّهُ*\n\n_MashaAllah — What Allah has willed!_');
    });
});

// 7. INSHALLAH
cmd({
    pattern: "sound7",
    alias: ["inshallah", "insha", "snd7"],
    desc: "Play InshaAllah audio phrase",
    category: "fun",
    react: "🌙",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia803002.us.archive.org/11/items/subhanallah_202302/InshaAllah.mp3';
    await sendAudio(conn, from, mek, url, '🌙 *إِنْ شَاءَ اللَّهُ*\nInsha\'Allah — If Allah wills!').catch(() => {
        reply('🌙 *إِنْ شَاءَ اللَّهُ*\n\n_InshaAllah — If Allah wills it!_');
    });
});

// 8. SALAWAT (Durood)
cmd({
    pattern: "sound8",
    alias: ["salawat", "durood", "snd8"],
    desc: "Play Durood/Salawat on Prophet Muhammad (PBUH)",
    category: "fun",
    react: "💛",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia803408.us.archive.org/17/items/DuroodSharif_201901/Durood_Sharif.mp3';
    await sendAudio(conn, from, mek, url, '💛 *اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ*\nDurood Sharif — Salawat on the Prophet ﷺ').catch(() => {
        reply('💛 *اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ ﷺ*\n\n_Allahumma Salli Ala Muhammad_\n\nSend blessings upon the Prophet ﷺ');
    });
});

// 9. ISTIGHFAR
cmd({
    pattern: "sound9",
    alias: ["istighfar", "astagfirullah", "snd9"],
    desc: "Play Istighfar / Astaghfirullah audio",
    category: "fun",
    react: "💜",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia803408.us.archive.org/17/items/DuroodSharif_201901/Astaghfirullah.mp3';
    await sendAudio(conn, from, mek, url, '💜 *أَسْتَغْفِرُ اللَّهَ*\nAstaghfirullah — I seek forgiveness from Allah').catch(() => {
        reply('💜 *أَسْتَغْفِرُ اللَّهَ*\n\n_Astaghfirullah — I seek forgiveness from Allah!_\n\nSay it 100 times daily 🤲');
    });
});

// 10. HASBUNALLAH
cmd({
    pattern: "sound10",
    alias: ["hasbunallah", "tawakkul", "snd10"],
    desc: "Play Hasbunallah wa Ni'mal Wakeel audio",
    category: "fun",
    react: "🛡️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia803408.us.archive.org/17/items/DuroodSharif_201901/HasbunAllah.mp3';
    await sendAudio(conn, from, mek, url, '🛡️ *حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ*\nHasbunAllah wa Ni\'mal Wakeel\nAllah is sufficient for us!').catch(() => {
        reply('🛡️ *حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ*\n\n_Hasbunallah wa Ni\'mal Wakeel_\n_Allah is sufficient for us and He is the Best Guardian!_');
    });
});

// ══════════════════════════════════════════════
//  📿  QURAN RECITATIONS  (11–17)
// ══════════════════════════════════════════════

// 11. SURAH FATIHA
cmd({
    pattern: "sound11",
    alias: ["fatiha", "alfatiha", "snd11"],
    desc: "Play Surah Al-Fatiha recitation",
    category: "fun",
    react: "📖",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3';
    await sendAudio(conn, from, mek, url, '📖 *Surah Al-Fatiha (سُورَةُ الْفَاتِحَة)*\nReciter: Sheikh Mishary Al-Afasy\n\n_The Opening — 1st Surah of the Quran_').catch(() => {
        reply('📖 *SURAH AL-FATIHA*\n\n_بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ_\n_اَلْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ_');
    });
});

// 12. AYATUL KURSI
cmd({
    pattern: "sound12",
    alias: ["ayatulkursi", "kursi", "snd12"],
    desc: "Play Ayatul Kursi recitation",
    category: "fun",
    react: "⭐",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/2.mp3';
    await sendAudio(conn, from, mek, url, '⭐ *آيَةُ الْكُرْسِيِّ — Ayatul Kursi*\nVerse 255, Surah Al-Baqarah\nReciter: Sheikh Mishary Al-Afasy\n\n_The greatest verse in the Quran_').catch(() => {
        reply('⭐ *آيَةُ الْكُرْسِيِّ — AYATUL KURSI*\n\n_اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ_\n\nThe greatest verse in the Quran! 🌟');
    });
});

// 13. SURAH IKHLAS
cmd({
    pattern: "sound13",
    alias: ["surahikhlas", "ikhlas", "snd13"],
    desc: "Play Surah Al-Ikhlas recitation",
    category: "fun",
    react: "💙",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/112.mp3';
    await sendAudio(conn, from, mek, url, '💙 *Surah Al-Ikhlas (سُورَةُ الْإِخْلاص)*\nReciter: Sheikh Mishary Al-Afasy\n\n_Worth 1/3 of the Quran in reward!_').catch(() => {
        reply('💙 *SURAH AL-IKHLAS*\n\n_قُلْ هُوَ اللَّهُ أَحَدٌ_\n_اللَّهُ الصَّمَدُ_\n\nWorth 1/3 of the Quran! 🌟');
    });
});

// 14. SURAH YASEEN
cmd({
    pattern: "sound14",
    alias: ["surahhyaseen", "yaseen", "snd14"],
    desc: "Play Surah Yaseen recitation (beginning)",
    category: "fun",
    react: "💚",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/36.mp3';
    await sendAudio(conn, from, mek, url, '💚 *Surah Yaseen (سُورَةُ يس)*\nReciter: Sheikh Mishary Al-Afasy\n\n_Heart of the Quran_').catch(() => {
        reply('💚 *SURAH YASEEN*\n\n_يس وَالْقُرْآنِ الْحَكِيمِ_\n\nThe Heart of the Quran! 💚');
    });
});

// 15. SURAH AL-MULK
cmd({
    pattern: "sound15",
    alias: ["almulk", "mulk", "snd15"],
    desc: "Play Surah Al-Mulk recitation",
    category: "fun",
    react: "👑",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/67.mp3';
    await sendAudio(conn, from, mek, url, '👑 *Surah Al-Mulk (سُورَةُ الْمُلْك)*\nReciter: Sheikh Mishary Al-Afasy\n\n_Protects from the punishment of the grave_').catch(() => {
        reply('👑 *SURAH AL-MULK*\n\n_تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ_\n\nRecite every night before sleeping! 🌙');
    });
});

// 16. SURAH AL-KAHF (Opening)
cmd({
    pattern: "sound16",
    alias: ["alkahf", "kahf", "snd16"],
    desc: "Play Surah Al-Kahf recitation",
    category: "fun",
    react: "🏔️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/18.mp3';
    await sendAudio(conn, from, mek, url, '🏔️ *Surah Al-Kahf (سُورَةُ الْكَهْف)*\nReciter: Sheikh Mishary Al-Afasy\n\n_Read every Friday for protection from Dajjal!_').catch(() => {
        reply('🏔️ *SURAH AL-KAHF*\n\nRead every Friday for protection from Dajjal! 🌙\n\n_الْحَمْدُ لِلَّهِ الَّذِي أَنزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ_');
    });
});

// 17. SURAH AL-WAQIAH
cmd({
    pattern: "sound17",
    alias: ["alwaqiah", "waqiah", "snd17"],
    desc: "Play Surah Al-Waqiah recitation",
    category: "fun",
    react: "💰",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/56.mp3';
    await sendAudio(conn, from, mek, url, '💰 *Surah Al-Waqiah (سُورَةُ الْوَاقِعَة)*\nReciter: Sheikh Mishary Al-Afasy\n\n_Surah of Wealth — Read daily for rizq!_').catch(() => {
        reply('💰 *SURAH AL-WAQIAH*\n\n_Surah of Wealth_ 💰\nRead it daily to attract rizq (provision)!\n\n_إِذَا وَقَعَتِ الْوَاقِعَةُ_');
    });
});

// ══════════════════════════════════════════════
//  🎙️  URDU MOTIVATION  (18–24)
// ══════════════════════════════════════════════

// 18. URDU MOTIVATION 1
cmd({
    pattern: "sound18",
    alias: ["umotiv1", "urdumotiv", "snd18"],
    desc: "Play Urdu Islamic motivation clip 1",
    category: "fun",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    // Fallback to text motivation with quote
    reply(`🔥 *URDU MOTIVATION*\n\n_"مشکلات میں مایوس مت ہو، اللہ پر بھروسہ رکھو"_\n\nDon't lose hope in difficulties, trust in Allah.\n\n💪 *یاد رہے:* اللہ کسی پر اس کی طاقت سے زیادہ بوجھ نہیں ڈالتا\n\n📖 _"لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا"_`);
});

// 19. URDU MOTIVATION 2
cmd({
    pattern: "sound19",
    alias: ["umotiv2", "motivurdu2", "snd19"],
    desc: "Urdu Islamic motivational message 2",
    category: "fun",
    react: "💪",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const quotes = [
        "جب زندگی مشکل لگے، نماز پڑھو — یہ سکون کا راستہ ہے 🤲",
        "صبر کرنے والوں کے ساتھ اللہ ہے — وَاللَّهُ مَعَ الصَّابِرِينَ 💚",
        "ہر مشکل کے ساتھ آسانی آتی ہے — فَإِنَّ مَعَ الْعُسْرِ يُسْرًا 🌟",
        "اللہ پر بھروسہ رکھو — وہ کبھی نہیں چھوڑتا 🛡️",
        "دعا میں طاقت ہے — ہر مسئلے کا حل اللہ کے پاس ہے 🤲"
    ];
    reply(`💪 *اردو موٹیویشن*\n\n_"${quotes[Math.floor(Math.random() * quotes.length)]}"_\n\n📿 SubhanAllah | Alhamdulillah | Allahu Akbar`);
});

// 20. URDU MOTIVATION 3 — Success
cmd({
    pattern: "sound20",
    alias: ["umotiv3", "successmotiv", "snd20"],
    desc: "Urdu motivation on success & hard work",
    category: "fun",
    react: "🏆",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`🏆 *محنت اور کامیابی*\n\n_"جو محنت نہیں کرتا وہ کامیابی کا حق نہیں رکھتا"_\n\n💡 Tips:\n• ہر صبح فجر سے شروع کرو\n• دن کو منصوبہ بنا کر چلو\n• اللہ پر بھروسہ رکھو\n• صبر سے کام کرو\n\n_"وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ"_\nInsaan ko sirf wahi milta hai jo wo koshish karta hai 🌟`);
});

// 21. DUA FOR RIZQ
cmd({
    pattern: "sound21",
    alias: ["duarizq", "rizqdua", "snd21"],
    desc: "Dua for rizq (provision) and barakah",
    category: "fun",
    react: "💰",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`💰 *DUA FOR RIZQ*\n\n🤲 *دعا برائے رزق*\n\n*Arabic:*\n_اللَّهُمَّ اكْفِنِي بِحَلالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ_\n\n*Transliteration:*\n_Allahumma-kfini bihalaalika 'an haraamika, wa aghnini bifadhlika 'amman siwaak_\n\n*Translation:*\n_O Allah, suffice me with what You have allowed instead of what You have forbidden, and make me independent of all others besides You._\n\n💚 پڑھتے رہو — رزق میں برکت ہوگی!`);
});

// 22. MORNING DUA
cmd({
    pattern: "sound22",
    alias: ["morningdua", "fajrdua", "snd22"],
    desc: "Morning Islamic dua and reminder",
    category: "fun",
    react: "🌅",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`🌅 *MORNING DUA & REMINDER*\n\n*صبح کی دعا:*\n_أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ_\n\n*Translation:*\n_We have entered the morning and dominion belongs to Allah, and praise is due to Allah!_\n\n📅 *آج کا معمول:*\n✅ فجر کی نماز\n✅ صبح کے اذکار\n✅ قرآن کی تلاوت\n✅ صدقہ دینا\n\n💚 _صبح بخیر — اللہ آپ کا دن بہتر کرے!_`);
});

// 23. NIGHT DUA
cmd({
    pattern: "sound23",
    alias: ["nightdua", "ishadua", "snd23"],
    desc: "Night Islamic dua and reminder",
    category: "fun",
    react: "🌙",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`🌙 *NIGHT DUA & REMINDER*\n\n*رات کی دعا:*\n_بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا_\n\n*Translation:*\n_In Your Name, O Allah, I die and I live_\n\n🌙 *سونے سے پہلے:*\n✅ آیت الکرسی پڑھیں\n✅ سورۃ الاخلاص × 3\n✅ سورۃ الفلق × 1\n✅ سورۃ الناس × 1\n\n_اللہ آپ کی حفاظت فرمائے!_ 💚`);
});

// 24. FRIDAY REMINDER
cmd({
    pattern: "sound24",
    alias: ["jummareminder", "jummamubarak", "snd24"],
    desc: "Jummah (Friday) Mubarak reminder and dua",
    category: "fun",
    react: "🕌",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`🕌 *جمعہ مبارک!*\n\n_*JUMMAH MUBARAK*_ ☪️\n\n📿 *آج کا خاص عمل:*\n✅ سورۃ الکہف پڑھیں\n✅ کثرت سے درود پڑھیں\n✅ جمعہ کی نماز ادا کریں\n✅ دعا کریں — قبولیت کا وقت ہے!\n\n*درود شریف:*\n_اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ_\n\n💚 _جمعہ آپ کے گناہ مٹا دیتا ہے — اللہ کی رحمت سے فائدہ اٹھائیں!_`);
});

// ══════════════════════════════════════════════
//  ⚔️  ERTUGRUL / MUSLIM MEMES  (25–32)
// ══════════════════════════════════════════════

// 25. ERTUGRUL THEME
cmd({
    pattern: "sound25",
    alias: ["erturgrultheme", "dirilistheme", "snd25"],
    desc: "Play Dirilis Ertugrul theme / send epic reminder",
    category: "fun",
    react: "⚔️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia803401.us.archive.org/23/items/ertugrul-ghazi-theme/Ertugrul_Ghazi_Theme.mp3';
    await sendAudio(conn, from, mek, url, '⚔️ *ارطغرل غازی تھیم*\nDirilis: Ertugrul — Theme Music\n\n_"Haq erenler, dost bize yar olsun!"_').catch(() => {
        reply(`⚔️ *ارطغرل غازی*\n\n_"Şeyh Edebali: Devlet büyük olsun, o zaman milleti büyük olur."_\n\n(The state must be great, then the nation becomes great.)\n\n🐺 KAYı BOY — حق کے لیے لڑتے رہو! 💪`);
    });
});

// 26. ERTUGRUL QUOTE 1
cmd({
    pattern: "sound26",
    alias: ["erturgrulquote", "etquote1", "snd26"],
    desc: "Famous Ertugrul Ghazi quote",
    category: "fun",
    react: "🐺",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const quotes = [
        { urdu: '"جو حق کے لیے ڈرتا نہیں، وہ کبھی نہیں ہارتا"', en: '"He who doesn\'t fear for the truth, never loses"' },
        { urdu: '"دشمن کی تاریکی میں ایمان کی روشنی جلاؤ"', en: '"In the darkness of the enemy, light the torch of faith"' },
        { urdu: '"موت سے ڈرنے والا زندگی سے بھی ڈرتا ہے"', en: '"He who fears death also fears life"' },
        { urdu: '"ظلم کے خلاف کھڑے ہونا عبادت ہے"', en: '"Standing against oppression is an act of worship"' }
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    reply(`⚔️ *ارطغرل غازی کا قول*\n\n🐺 _${q.urdu}_\n\n📜 _${q.en}_\n\n— Ertugrul Ghazi 🌙`);
});

// 27. SULEIMAN THE MAGNIFICENT
cmd({
    pattern: "sound27",
    alias: ["suleiman", "magnificent", "snd27"],
    desc: "Suleiman the Magnificent / Ottoman Empire motivation",
    category: "fun",
    react: "👑",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`👑 *سلیمان قانونی — SULEIMAN THE MAGNIFICENT*\n\n_"میں سلیمان ہوں جس کی عظمت اور طاقت دنیا کے افق سے بھی پرے ہے"_\n\n_"I am Suleiman, whose grandeur and power extend beyond the horizons of the world"_\n\n⚔️ *Ottoman Legacy:*\n• 46 سال حکومت کی\n• دنیا کی سب سے بڑی سلطنت\n• قانون اور انصاف کا داعی\n• اسلامی سنہری دور\n\n_اے مسلمان! اپنی عظمت کو یاد کر! 💪_`);
});

// 28. IBN BATTUTA
cmd({
    pattern: "sound28",
    alias: ["ibnbattuta", "muslimexplorer", "snd28"],
    desc: "Ibn Battuta — Muslim explorer motivation",
    category: "fun",
    react: "🌍",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`🌍 *ابن بطوطہ — MUSLIM EXPLORER*\n\n_"سفر پہلے تم کو خاموش کرتا ہے، پھر تم کو کہانیاں دیتا ہے"_\n\n_"Travel first makes you speechless, then turns you into a storyteller"_\n\n📜 *Facts:*\n• 29 سال سفر کیا\n• 44 ممالک دیکھے\n• 75,000 میل چلے\n• ہر جگہ اسلام کا نور پھیلایا\n\n🌙 _مسلمانوں نے دنیا کو دریافت کیا! فخر کرو!_ 🌟`);
});

// 29. SALAHUDDIN AYYUBI
cmd({
    pattern: "sound29",
    alias: ["salahuddin", "saladin", "snd29"],
    desc: "Salahuddin Ayyubi — Hero of Islam motivation",
    category: "fun",
    react: "🦁",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`🦁 *صلاح الدین ایوبی — LION OF ISLAM*\n\n_"جو انسان سچائی سے محبت کرتا ہے وہ کبھی شکست نہیں کھاتا"_\n\n_"The man who loves truth is never defeated"_\n\n⚔️ *The Hero:*\n• القدس (بیت المقدس) آزاد کرایا\n• دشمن بھی اس کا احترام کرتے تھے\n• ظلم کے خلاف سدا کھڑا رہا\n• صبر، ایمان، محنت — اس کے اصول\n\n🌙 _آج کے ارطغرل، صلاح الدین بنو! 💪_`);
});

// 30. ERTUGRUL MEME 1
cmd({
    pattern: "sound30",
    alias: ["etmeme1", "erturgrulmeme", "snd30"],
    desc: "Ertugrul funny/epic meme moment",
    category: "fun",
    react: "😂",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const memes = [
        "🐺 جب کوئی group میں ادمن بن جاتا ہے:\n\n*ارطغرل mode on*\n_میں نہ ٹوٹوں گا، نہ جھکوں گا، مجھے admin ملا ہے! 😂_",
        "⚔️ جب کوئی bot کو غلط command دے:\n\n*ارطغرل کا چہرہ*\n_یہ کیا کر رہے ہو بھائی! 😅_",
        "🏕️ جب صبح اٹھ کر phone check کرو:\n\n*Kayi Alp mode*\n_100 unread messages — میں تیار ہوں!_ 💪",
        "🗡️ امتحان سے ایک رات پہلے:\n\n*Bamsi Beyrek:* بھائی پڑھ لو!\n*میں:* اللہ پر بھروسہ ہے 😂"
    ];
    reply(`😂 *ارطغرل MEME*\n\n${memes[Math.floor(Math.random() * memes.length)]}`);
});

// 31. ERTUGRUL MEME 2 — Pakistani Twist
cmd({
    pattern: "sound31",
    alias: ["etmeme2", "pakiertugrul", "snd31"],
    desc: "Ertugrul + Pakistani culture meme",
    category: "fun",
    react: "🇵🇰",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const memes = [
        "🇵🇰 پاکستانی ارطغرل:\n\n*ارطغرل:* دشمن کو کچل دیں گے!\n*امی:* پہلے chai پی لو بیٹا ☕😂",
        "⚔️ پاکستانی version:\n\n*ارطغرل:* میں نے قسم کھائی!\n*ابو:* اور بجلی کا بل کس نے بھرنا ہے؟ 😭",
        "🏕️ پاکستانی گھر میں:\n\n*ارطغرل style entry کی*\n*امی:* جوتے باہر اتارو! 👟😂",
        "🐺 جب پاکستانی بھائی ارطغرل دیکھے:\n\n*اگلے دن school میں:*\n'میں ارطغرل ہوں — میری duty کوئی نہیں کر سکتا!' 💪😂"
    ];
    reply(`🇵🇰 *PAKISTANI ERTUGRUL MEME*\n\n${memes[Math.floor(Math.random() * memes.length)]}`);
});

// 32. MUSLIM MEME GEN
cmd({
    pattern: "sound32",
    alias: ["muslimmeme", "islamicmeme", "snd32"],
    desc: "Random Muslim/Islamic funny meme",
    category: "fun",
    react: "😄",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const memes = [
        "😂 *MUSLIM MEME*\n\nجب رمضان آتا ہے:\n*شیطان:* میں chain میں ہوں\n*میرا نفس:* میں آزاد ہوں! 😅\n\n_ہم سب ایسے ہیں_ 😂",
        "🙃 *RELATABLE*\n\nجب نماز پڑھنے کا ارادہ ہو:\n*فون:* notification بج گئی\n*میں:* بس یہ ایک message… 3 گھنٹے بعد… 😭",
        "😂 *FRIDAY MOOD*\n\nجمعے کی نماز سے پہلے:\n*میں:* نیا انسان بنوں گا!\n*جمعے کی رات:* same WhatsApp, same memes 😂",
        "💪 *MOTIVATION*\n\nجب کوئی بولے تم کچھ نہیں کر سکتے:\n*میں اندر سے:*\n'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ'\nجو اللہ پر بھروسہ کرے اللہ اسے کافی ہے! 💪"
    ];
    reply(memes[Math.floor(Math.random() * memes.length)]);
});

// ══════════════════════════════════════════════
//  🌙  ISLAMIC NASHEEDS & POETRY  (33–38)
// ══════════════════════════════════════════════

// 33. NASHEED — TALA AL BADR
cmd({
    pattern: "sound33",
    alias: ["talaalbadr", "nabeep", "snd33"],
    desc: "Tala al-Badr — Famous Islamic nasheed",
    category: "fun",
    react: "🌙",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const url = 'https://ia803401.us.archive.org/23/items/ertugrul-ghazi-theme/TalaAlBadr.mp3';
    await sendAudio(conn, from, mek, url, '🌙 *طَلَعَ الْبَدْرُ عَلَيْنَا — Tala Al Badr*\nThe Moon Rose Over Us\n\n_The nasheed sung when Prophet Muhammad ﷺ arrived in Madinah_').catch(() => {
        reply(`🌙 *طَلَعَ الْبَدْرُ عَلَيْنَا*\n_Tala al-Badr Alayna_\n\n_طَلَعَ الْبَدْرُ عَلَيْنَا مِنْ ثَنِيَّاتِ الْوَدَاع_\n\nThe moon rose over us from the valley of Wada'\nGratitude is ours wherever a caller calls to Allah\n\n💛 _Sung when Prophet Muhammad ﷺ arrived in Madinah_`);
    });
});

// 34. URDU HAMD
cmd({
    pattern: "sound34",
    alias: ["urduhamd", "hamd2", "snd34"],
    desc: "Urdu Hamd (Praise of Allah) poem",
    category: "fun",
    react: "💚",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`💚 *اردو حمد*\n\n_وہی ہے جو سنتا ہے، وہی ہے جو دیتا ہے_\n_وہی ہے جو روتوں کو رحمت سے بھر دیتا ہے_\n\n_اس کی قدرت کے آگے ستارے بھی جھکتے ہیں_\n_وہ اللہ ہے، وہ ایک ہے، وہ سب کا رب ہے_\n\n💛 _اللَّهُ لَا إِلَهَ إِلَّا هُوَ_\nAllah — there is no god but Him 🌟`);
});

// 35. URDU NAAT
cmd({
    pattern: "sound35",
    alias: ["urdunat", "naatshareef", "snd35"],
    desc: "Urdu Naat — Praise of Prophet Muhammad ﷺ",
    category: "fun",
    react: "💛",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`💛 *نعت شریف*\n\n_محمد ﷺ کا نام لے کر ہر کام شروع کروں_\n_محمد ﷺ کی محبت سے دل کو روشن کروں_\n\n_وہ رحمت عالَم ﷺ جو آئے دنیا میں_\n_ان کے در سے لو رحمتیں کیوں نہ پاوں میں_\n\n💛 اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ ﷺ\n\n_ہر نعت کے بعد درود پڑھنا نہ بھولیں_ 🌙`);
});

// 36. IQBAL POETRY
cmd({
    pattern: "sound36",
    alias: ["iqbalpoetry", "allama", "snd36"],
    desc: "Allama Iqbal's motivational Urdu poetry",
    category: "fun",
    react: "🌟",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const poems = [
        "_خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے_\n_خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے_",
        "_ستاروں سے آگے جہاں اور بھی ہیں_\n_ابھی عشق کے امتحاں اور بھی ہیں_",
        "_مذہب نہیں سکھاتا آپس میں بیر رکھنا_\n_ہندی ہیں ہم، وطن ہے ہندوستان ہمارا_",
        "_شاہیں کبھی پرواز سے تھک کر نہیں گرتا_\n_پست ہمت بادباں کو شکوہ گردش لیل و نہار ہے_"
    ];
    const poem = poems[Math.floor(Math.random() * poems.length)];
    reply(`🌟 *علامہ اقبال — ALLAMA IQBAL*\n\n${poem}\n\n_— شاعر مشرق، علامہ محمد اقبال_ 📖`);
});

// 37. ISLAMIC TRIVIA
cmd({
    pattern: "sound37",
    alias: ["islamictrivia", "quizislam", "snd37"],
    desc: "Random Islamic knowledge trivia question",
    category: "fun",
    react: "🎓",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const trivia = [
        { q: "قرآن مجید میں کتنی سورتیں ہیں؟", a: "114 سورتیں" },
        { q: "اسلام کے پانچ ارکان کیا ہیں؟", a: "کلمہ، نماز، روزہ، زکوٰۃ، حج" },
        { q: "کعبہ کس شہر میں ہے؟", a: "مکہ مکرمہ، سعودی عرب" },
        { q: "قرآن مجید کی سب سے لمبی سورت کون سی ہے؟", a: "سورۃ البقرہ (286 آیات)" },
        { q: "رمضان المبارک اسلامی کیلنڈر کا کون سا مہینہ ہے؟", a: "نواں مہینہ" },
        { q: "خانہ کعبہ کا طواف کتنے چکروں میں مکمل ہوتا ہے؟", a: "سات (7) چکر" },
        { q: "آخری نبی کون ہیں؟", a: "حضرت محمد ﷺ — خاتم النبیین" }
    ];
    const t = trivia[Math.floor(Math.random() * trivia.length)];
    reply(`🎓 *ISLAMIC TRIVIA*\n\n❓ *سوال:*\n${t.q}\n\n||✅ *جواب: ${t.a}*||`);
});

// 38. SOUND HELP MENU
cmd({
    pattern: "sound38",
    alias: ["soundmenu", "soundshelp", "snd38"],
    desc: "Show all available sound commands",
    category: "fun",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    reply(`🎵 *SOUND COMMANDS MENU*\n\n╔══❰ 🕌 Islamic Phrases ❱══╗\n║ .sound1  — Bismillah\n║ .sound2  — Allahu Akbar\n║ .sound3  — Azan\n║ .sound4  — Subhanallah\n║ .sound5  — Alhamdulillah\n║ .sound6  — MashaAllah\n║ .sound7  — InshaAllah\n║ .sound8  — Durood/Salawat\n║ .sound9  — Istighfar\n║ .sound10 — Hasbunallah\n╚══════════════════╝\n\n╔══❰ 📖 Quran Recitations ❱══╗\n║ .sound11 — Surah Al-Fatiha\n║ .sound12 — Ayatul Kursi\n║ .sound13 — Surah Ikhlas\n║ .sound14 — Surah Yaseen\n║ .sound15 — Surah Al-Mulk\n║ .sound16 — Surah Al-Kahf\n║ .sound17 — Surah Al-Waqiah\n╚══════════════════╝\n\n╔══❰ 🎙️ Urdu Motivation ❱══╗\n║ .sound18 — Motivation 1\n║ .sound19 — Motivation 2\n║ .sound20 — Success\n║ .sound21 — Dua for Rizq\n║ .sound22 — Morning Dua\n║ .sound23 — Night Dua\n║ .sound24 — Jummah Reminder\n╚══════════════════╝\n\n╔══❰ ⚔️ Ertugrul/Memes ❱══╗\n║ .sound25 — Ertugrul Theme\n║ .sound26 — Ertugrul Quote\n║ .sound27 — Suleiman\n║ .sound28 — Ibn Battuta\n║ .sound29 — Salahuddin\n║ .sound30 — Ertugrul Meme\n║ .sound31 — Pakistani Meme\n║ .sound32 — Muslim Meme\n╚══════════════════╝\n\n╔══❰ 🌙 Nasheeds/Poetry ❱══╗\n║ .sound33 — Tala Al Badr\n║ .sound34 — Urdu Hamd\n║ .sound35 — Urdu Naat\n║ .sound36 — Iqbal Poetry\n║ .sound37 — Islamic Trivia\n╚══════════════════╝\n\n_Type any command to play!_ 🎵`);
});
