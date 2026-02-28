/**
 * ╔══════════════════════════════════════════╗
 * ║        GROUP COMMANDS PLUGIN             ║
 * ║  100 Brand-New Unique Group Commands     ║
 * ║  Zero overlap with existing commands     ║
 * ╚══════════════════════════════════════════╝
 */

const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// ─── Shared utility: check admin status ───
async function getAdminStatus(conn, chatId, senderId) {
    const meta = await conn.groupMetadata(chatId);
    const parts = meta.participants || [];
    const botId = conn.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const botAdmin = parts.some(p => (p.id === botId || p.id?.split(':')[0] === botId?.split('@')[0]) && (p.admin === 'admin' || p.admin === 'superadmin'));
    const senderAdmin = parts.some(p => (p.id === senderId) && (p.admin === 'admin' || p.admin === 'superadmin'));
    return { botAdmin, senderAdmin, meta, parts };
}

// ─── Persistent data store (JSON file) ───
const DB_PATH = path.join(__dirname, '../data/group_db.json');
function loadDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
            fs.writeFileSync(DB_PATH, '{}');
        }
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch { return {}; }
}
function saveDB(data) {
    try {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) { console.log('DB save error:', e.message); }
}
function getGroupData(groupId) {
    const db = loadDB();
    if (!db[groupId]) db[groupId] = {};
    return db[groupId];
}
function setGroupData(groupId, data) {
    const db = loadDB();
    db[groupId] = { ...(db[groupId] || {}), ...data };
    saveDB(db);
}

// ─────────────────────────────────────────────
// ⚠️  WARNING SYSTEM  (1–7)
// ─────────────────────────────────────────────

// 1. WARN
cmd({
    pattern: "warn",
    alias: ["warning"],
    use: ".warn @user [reason]",
    desc: "Warn a member. Auto-kick after limit.",
    category: "group",
    react: "⚠️",
    filename: __filename
}, async (conn, mek, m, { from, sender, args, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ You must be admin!");
    const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const target = mentioned?.[0];
    if (!target) return reply("❌ Tag a user to warn. Usage: .warn @user [reason]");
    const reason = args.slice(1).join(' ') || 'No reason given';
    const gd = getGroupData(from);
    if (!gd.warns) gd.warns = {};
    if (!gd.warns[target]) gd.warns[target] = 0;
    gd.warns[target]++;
    const limit = gd.warnlimit || 3;
    setGroupData(from, gd);
    const num = target.split('@')[0];
    if (gd.warns[target] >= limit) {
        await conn.groupParticipantsUpdate(from, [target], 'remove');
        reply(`⚠️ @${num} has been warned ${gd.warns[target]}/${limit} times.\n\n🚫 *AUTO-KICKED* for reaching warn limit!\n📝 Last Reason: ${reason}`, [target]);
        gd.warns[target] = 0;
        setGroupData(from, gd);
    } else {
        reply(`⚠️ *WARNING #${gd.warns[target]}/${limit}*\n\n👤 User: @${num}\n📝 Reason: ${reason}\n\n_${limit - gd.warns[target]} more warns = kick!_`, [target]);
    }
});

// 2. WARNLIST
cmd({
    pattern: "warnlist",
    alias: ["warnings"],
    desc: "Show all warned members in the group",
    category: "group",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const gd = getGroupData(from);
    const warns = gd.warns || {};
    const entries = Object.entries(warns).filter(([, v]) => v > 0);
    if (!entries.length) return reply("✅ No warned members in this group!");
    const limit = gd.warnlimit || 3;
    const list = entries.map(([jid, count]) => `👤 @${jid.split('@')[0]} — ⚠️ ${count}/${limit}`).join('\n');
    reply(`📋 *WARN LIST*\n\n${list}`);
});

// 3. RESETWARN
cmd({
    pattern: "resetwarn",
    alias: ["clearwarn"],
    use: ".resetwarn @user",
    desc: "Reset warnings for a user",
    category: "group",
    react: "🔄",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const target = mentioned?.[0];
    if (!target) return reply("❌ Tag a user! Usage: .resetwarn @user");
    const gd = getGroupData(from);
    if (!gd.warns) gd.warns = {};
    gd.warns[target] = 0;
    setGroupData(from, gd);
    reply(`✅ Warnings reset for @${target.split('@')[0]}!`, [target]);
});

// 4. SETWARNLIMIT
cmd({
    pattern: "setwarnlimit",
    alias: ["warnlimit"],
    use: ".setwarnlimit 5",
    desc: "Set how many warns before auto-kick",
    category: "group",
    react: "🔢",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const num = parseInt(args[0]);
    if (!num || num < 1 || num > 20) return reply("❌ Usage: .setwarnlimit 3 (between 1–20)");
    setGroupData(from, { warnlimit: num });
    reply(`✅ Warn limit set to *${num}*\n\nMembers will be kicked after ${num} warnings!`);
});

// 5. WARNALL
cmd({
    pattern: "warnall",
    alias: ["globalwarn"],
    use: ".warnall [reason]",
    desc: "Warn all non-admin members at once",
    category: "group",
    react: "🔴",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const reason = args.join(' ') || 'General warning';
    const meta = await conn.groupMetadata(from);
    const gd = getGroupData(from);
    if (!gd.warns) gd.warns = {};
    const limit = gd.warnlimit || 3;
    const nonAdmins = meta.participants.filter(p => !p.admin);
    nonAdmins.forEach(p => {
        if (!gd.warns[p.id]) gd.warns[p.id] = 0;
        gd.warns[p.id]++;
    });
    setGroupData(from, gd);
    reply(`🔴 *ALL MEMBERS WARNED!*\n\n👥 ${nonAdmins.length} members warned\n📝 Reason: ${reason}\n⚠️ Warn limit: ${limit}`);
});

// 6. WARNKICK
cmd({
    pattern: "warnkick",
    alias: ["removewarn"],
    use: ".warnkick @user",
    desc: "Kick a user who has any warnings",
    category: "group",
    react: "🚫",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    const count = gd.warns?.[target] || 0;
    await conn.groupParticipantsUpdate(from, [target], 'remove');
    reply(`🚫 @${target.split('@')[0]} kicked!\n⚠️ Had ${count} warning(s).`, [target]);
});

// 7. WARNSTATUS
cmd({
    pattern: "warnstatus",
    alias: ["mywarns"],
    use: ".warnstatus @user",
    desc: "Check warnings for yourself or a tagged user",
    category: "group",
    react: "🔍",
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
    const gd = getGroupData(from);
    const count = gd.warns?.[target] || 0;
    const limit = gd.warnlimit || 3;
    reply(`🔍 *WARN STATUS*\n\n👤 @${target.split('@')[0]}\n⚠️ Warns: ${count}/${limit}\n${count >= limit ? '🚫 At kick limit!' : `✅ ${limit - count} remaining`}`, [target]);
});

// ─────────────────────────────────────────────
// 🚫  ANTI-SYSTEM  (8–16)
// ─────────────────────────────────────────────

// 8. ANTISPAM (toggle)
cmd({
    pattern: "antispam",
    alias: ["spamblock"],
    use: ".antispam on/off",
    desc: "Toggle anti-spam system in group",
    category: "group",
    react: "🛡️",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const toggle = args[0]?.toLowerCase();
    if (!['on','off'].includes(toggle)) return reply("❌ Usage: .antispam on/off");
    setGroupData(from, { antispam: toggle === 'on' });
    reply(`🛡️ *Anti-Spam ${toggle === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\n${toggle === 'on' ? 'Repeated messages will be detected & user warned!' : 'Spam protection is now off.'}`);
});

// 9. ANTIFLOOD
cmd({
    pattern: "antiflood",
    alias: ["floodprot"],
    use: ".antiflood on/off [messages]",
    desc: "Toggle anti-flood protection",
    category: "group",
    react: "🌊",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const toggle = args[0]?.toLowerCase();
    if (!['on','off'].includes(toggle)) return reply("❌ Usage: .antiflood on/off [max_messages]");
    const limit = parseInt(args[1]) || 5;
    setGroupData(from, { antiflood: toggle === 'on', floodlimit: limit });
    reply(`🌊 *Anti-Flood ${toggle === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\n${toggle === 'on' ? `Members sending more than ${limit} messages/10 seconds will be warned!` : 'Flood protection is now off.'}`);
});

// 10. ANTINSFW
cmd({
    pattern: "antinsfw",
    alias: ["nsfwblock"],
    use: ".antinsfw on/off",
    desc: "Toggle NSFW content blocking in group",
    category: "group",
    react: "🔞",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const toggle = args[0]?.toLowerCase();
    if (!['on','off'].includes(toggle)) return reply("❌ Usage: .antinsfw on/off");
    setGroupData(from, { antinsfw: toggle === 'on' });
    reply(`🔞 *Anti-NSFW ${toggle === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\n${toggle === 'on' ? 'NSFW images will be deleted automatically!' : 'NSFW protection off.'}`);
});

// 11. ANTIWORD (custom word filter)
cmd({
    pattern: "antiword",
    alias: ["wordfilter"],
    use: ".antiword on/off",
    desc: "Toggle word filter system",
    category: "group",
    react: "🤐",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const toggle = args[0]?.toLowerCase();
    if (!['on','off'].includes(toggle)) return reply("❌ Usage: .antiword on/off");
    setGroupData(from, { antiword: toggle === 'on' });
    reply(`🤐 *Word Filter ${toggle === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\nUse .addword to add banned words.`);
});

// 12. ADDWORD
cmd({
    pattern: "addword",
    alias: ["banword"],
    use: ".addword badword",
    desc: "Add a word to the group ban list",
    category: "group",
    react: "➕",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const word = args[0]?.toLowerCase();
    if (!word) return reply("❌ Usage: .addword <word>");
    const gd = getGroupData(from);
    if (!gd.bannedwords) gd.bannedwords = [];
    if (gd.bannedwords.includes(word)) return reply(`❌ "${word}" is already banned!`);
    gd.bannedwords.push(word);
    setGroupData(from, gd);
    reply(`✅ Word "*${word}*" added to ban list!\n\nTotal banned words: ${gd.bannedwords.length}`);
});

// 13. REMOVEWORD
cmd({
    pattern: "removeword",
    alias: ["unbanword"],
    use: ".removeword word",
    desc: "Remove a word from the group ban list",
    category: "group",
    react: "➖",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const word = args[0]?.toLowerCase();
    if (!word) return reply("❌ Usage: .removeword <word>");
    const gd = getGroupData(from);
    if (!gd.bannedwords) gd.bannedwords = [];
    const idx = gd.bannedwords.indexOf(word);
    if (idx === -1) return reply(`❌ "${word}" not in ban list!`);
    gd.bannedwords.splice(idx, 1);
    setGroupData(from, gd);
    reply(`✅ Word "*${word}*" removed from ban list!`);
});

// 14. WORDLIST
cmd({
    pattern: "wordlist",
    alias: ["bannedwords"],
    desc: "Show all banned words in this group",
    category: "group",
    react: "📝",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const gd = getGroupData(from);
    const words = gd.bannedwords || [];
    if (!words.length) return reply("✅ No banned words set for this group!");
    reply(`🤐 *BANNED WORDS LIST*\n\n${words.map((w, i) => `${i+1}. ${w}`).join('\n')}\n\nTotal: ${words.length} words`);
});

// 15. ANTIBOTADD
cmd({
    pattern: "antibotadd",
    alias: ["botguard"],
    use: ".antibotadd on/off",
    desc: "Prevent bots from being added to the group",
    category: "group",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const toggle = args[0]?.toLowerCase();
    if (!['on','off'].includes(toggle)) return reply("❌ Usage: .antibotadd on/off");
    setGroupData(from, { antibotadd: toggle === 'on' });
    reply(`🤖 *Anti-Bot Add ${toggle === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\n${toggle === 'on' ? 'Bot accounts will be auto-kicked when added!' : 'Bot protection disabled.'}`);
});

// 16. ANTIFAKE
cmd({
    pattern: "antifake",
    alias: ["fakeblock"],
    use: ".antifake on/off",
    desc: "Block fake/temporary number accounts",
    category: "group",
    react: "🕵️",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const toggle = args[0]?.toLowerCase();
    if (!['on','off'].includes(toggle)) return reply("❌ Usage: .antifake on/off");
    setGroupData(from, { antifake: toggle === 'on' });
    reply(`🕵️ *Anti-Fake Number ${toggle === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\n${toggle === 'on' ? 'Virtual/temp numbers will be auto-removed!' : 'Fake number protection disabled.'}`);
});

// ─────────────────────────────────────────────
// 📋  GROUP RULES  (17–20)
// ─────────────────────────────────────────────

// 17. SETRULES
cmd({
    pattern: "setrules",
    alias: ["grouprules"],
    use: ".setrules Rule 1 | Rule 2 | Rule 3",
    desc: "Set group rules (separate with |)",
    category: "group",
    react: "📜",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const text = args.join(' ');
    if (!text) return reply("❌ Usage: .setrules Rule 1 | Rule 2 | Rule 3");
    const rules = text.split('|').map((r, i) => `${i+1}. ${r.trim()}`).filter(r => r.length > 3);
    if (!rules.length) return reply("❌ Please add at least 1 rule!");
    setGroupData(from, { rules });
    reply(`📜 *GROUP RULES SET!*\n\n${rules.join('\n')}\n\nMembers can see rules with .rules`);
});

// 18. RULES
cmd({
    pattern: "rules",
    alias: ["showrules", "grules"],
    desc: "Show group rules",
    category: "group",
    react: "📜",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const meta = await conn.groupMetadata(from);
    const gd = getGroupData(from);
    const rules = gd.rules || [];
    if (!rules.length) return reply("❌ No rules set for this group!\n\nAdmins can use .setrules to add rules.");
    reply(`📜 *${meta.subject} — GROUP RULES*\n\n${rules.join('\n')}\n\n_Please follow the rules to stay in this group!_`);
});

// 19. CLEARRULES
cmd({
    pattern: "clearrules",
    alias: ["delrules"],
    desc: "Clear all group rules",
    category: "group",
    react: "🗑️",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { rules: [] });
    reply("✅ Group rules cleared!");
});

// 20. ADDRULE
cmd({
    pattern: "addrule",
    alias: ["newrule"],
    use: ".addrule No spamming",
    desc: "Add a single rule to group rules",
    category: "group",
    react: "➕",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const rule = args.join(' ');
    if (!rule) return reply("❌ Usage: .addrule <rule text>");
    const gd = getGroupData(from);
    if (!gd.rules) gd.rules = [];
    gd.rules.push(`${gd.rules.length + 1}. ${rule}`);
    setGroupData(from, gd);
    reply(`✅ Rule added!\n\n📜 Total rules: ${gd.rules.length}\nUse .rules to view all.`);
});

// ─────────────────────────────────────────────
// 📊  GROUP STATS & INFO  (21–30)
// ─────────────────────────────────────────────

// 21. GROUPSTATS
cmd({
    pattern: "groupstats",
    alias: ["gstats"],
    desc: "Show detailed group statistics",
    category: "group",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const meta = await conn.groupMetadata(from);
    const total = meta.participants.length;
    const admins = meta.participants.filter(p => p.admin).length;
    const members = total - admins;
    const creator = meta.owner || 'Unknown';
    const created = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString('en-PK') : 'Unknown';
    const desc = meta.desc ? meta.desc.toString().slice(0, 80) : 'No description';
    const gd = getGroupData(from);
    const warnedCount = Object.values(gd.warns || {}).filter(v => v > 0).length;
    const bannedWords = (gd.bannedwords || []).length;
    reply(`📊 *GROUP STATISTICS*\n\n╔══════════════════╗\n║ 📛 *${meta.subject}*\n╚══════════════════╝\n\n👥 Total Members: ${total}\n👑 Admins: ${admins}\n🙍 Members: ${members}\n📅 Created: ${created}\n📝 Description: ${desc}...\n\n🛡️ *Protection Status:*\n⚠️ Warned Members: ${warnedCount}\n🤐 Banned Words: ${bannedWords}\n🌊 Anti-Flood: ${gd.antiflood ? '✅' : '❌'}\n🛡️ Anti-Spam: ${gd.antispam ? '✅' : '❌'}\n🔞 Anti-NSFW: ${gd.antinsfw ? '✅' : '❌'}`);
});

// 22. MEMBERCOUNT
cmd({
    pattern: "membercount",
    alias: ["mcount", "countmembers"],
    desc: "Show total member count with breakdown",
    category: "group",
    react: "👥",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const meta = await conn.groupMetadata(from);
    const admins = meta.participants.filter(p => p.admin === 'admin').length;
    const superAdmins = meta.participants.filter(p => p.admin === 'superadmin').length;
    const regular = meta.participants.length - admins - superAdmins;
    reply(`👥 *MEMBER COUNT*\n\n📌 Total: *${meta.participants.length}*\n👑 Super Admins: ${superAdmins}\n⭐ Admins: ${admins}\n🙍 Regular: ${regular}`);
});

// 23. ADMINLIST
cmd({
    pattern: "adminlist",
    alias: ["listadmins", "gadmins"],
    desc: "List all group admins with numbers",
    category: "group",
    react: "👑",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const meta = await conn.groupMetadata(from);
    const admins = meta.participants.filter(p => p.admin);
    if (!admins.length) return reply("❌ No admins found!");
    const list = admins.map((a, i) => `${i+1}. @${a.id.split('@')[0]} ${a.admin === 'superadmin' ? '👑' : '⭐'}`).join('\n');
    reply(`👑 *ADMIN LIST — ${meta.subject}*\n\n${list}\n\nTotal: ${admins.length} admin(s)`, admins.map(a => a.id));
});

// 24. MEMBERLIST
cmd({
    pattern: "memberlist",
    alias: ["listmembers", "gmembers"],
    desc: "Show all group members",
    category: "group",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const meta = await conn.groupMetadata(from);
    const parts = meta.participants;
    const chunks = [];
    for (let i = 0; i < parts.length; i += 30) chunks.push(parts.slice(i, i+30));
    let msg = `📋 *MEMBER LIST — ${meta.subject}*\n(Total: ${parts.length})\n\n`;
    chunks[0].forEach((p, i) => {
        const role = p.admin === 'superadmin' ? '👑' : p.admin === 'admin' ? '⭐' : '🙍';
        msg += `${i+1}. ${role} @${p.id.split('@')[0]}\n`;
    });
    if (parts.length > 30) msg += `\n_...and ${parts.length - 30} more members_`;
    reply(msg);
});

// 25. GROUPAGE
cmd({
    pattern: "groupage",
    alias: ["gcage", "howoldgc"],
    desc: "Show how old this group is",
    category: "group",
    react: "🎂",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const meta = await conn.groupMetadata(from);
    if (!meta.creation) return reply("❌ Could not fetch group creation date!");
    const created = new Date(meta.creation * 1000);
    const now = new Date();
    const diff = now - created;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    reply(`🎂 *GROUP AGE*\n\n📛 Group: ${meta.subject}\n📅 Created: ${created.toDateString()}\n\n⏳ Age: ${years > 0 ? years + ' years, ' : ''}${months % 12} months, ${days % 30} days\n(${days} total days old)`);
});

// 26. GROUPOWNER
cmd({
    pattern: "groupowner",
    alias: ["gcowner", "whoowns"],
    desc: "Show who created/owns this group",
    category: "group",
    react: "👑",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const meta = await conn.groupMetadata(from);
    const ownerId = meta.owner;
    if (!ownerId) return reply("❌ Could not find group owner!");
    reply(`👑 *GROUP OWNER*\n\n📛 Group: ${meta.subject}\n👤 Owner: @${ownerId.split('@')[0]}\n📞 Number: +${ownerId.split('@')[0]}`, [ownerId]);
});

// 27. GROUPLINK2
cmd({
    pattern: "grouplink2",
    alias: ["glink2", "invitelink"],
    desc: "Get the group invite link with QR info",
    category: "group",
    react: "🔗",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const code = await conn.groupInviteCode(from);
    const link = `https://chat.whatsapp.com/${code}`;
    const meta = await conn.groupMetadata(from);
    reply(`🔗 *GROUP INVITE LINK*\n\n📛 Group: ${meta.subject}\n👥 Members: ${meta.participants.length}\n\n🌐 Link: ${link}\n\n_Share this link to invite people!_`);
});

// 28. GROUPSETTINGS
cmd({
    pattern: "groupsettings",
    alias: ["gcsettings", "settings"],
    desc: "View all current group protection settings",
    category: "group",
    react: "⚙️",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const gd = getGroupData(from);
    const meta = await conn.groupMetadata(from);
    reply(`⚙️ *GROUP SETTINGS — ${meta.subject}*\n\n🛡️ *Protection:*\n🌊 Anti-Flood: ${gd.antiflood ? '✅' : '❌'}\n🛡️ Anti-Spam: ${gd.antispam ? '✅' : '❌'}\n🔞 Anti-NSFW: ${gd.antinsfw ? '✅' : '❌'}\n🤐 Word Filter: ${gd.antiword ? '✅' : '❌'}\n🤖 Anti-Bot Add: ${gd.antibotadd ? '✅' : '❌'}\n🕵️ Anti-Fake: ${gd.antifake ? '✅' : '❌'}\n\n⚠️ *Warning System:*\nWarn Limit: ${gd.warnlimit || 3}\nBanned Words: ${(gd.bannedwords||[]).length}\n\n🎮 *Features:*\nWelcome Msg: ${gd.customwelcome ? '✅' : '❌'}\nGoodbye Msg: ${gd.customgoodbye ? '✅' : '❌'}\nGroup Quiz: ${gd.quizmode ? '✅' : '❌'}\nMute Mode: ${gd.mutemode ? '✅' : '❌'}`);
});

// 29. TOPACTIVE
cmd({
    pattern: "topactive",
    alias: ["mostactive", "topmembers"],
    desc: "Show message stats (tracked by bot)",
    category: "group",
    react: "🏆",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    const msgStats = gd.msgcount || {};
    const sorted = Object.entries(msgStats).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!sorted.length) return reply("❌ No message stats yet!\n\nThe bot tracks messages after being added. Stats will show soon!");
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const list = sorted.map(([jid, count], i) => `${medals[i]} @${jid.split('@')[0]} — ${count} msgs`).join('\n');
    reply(`🏆 *TOP ACTIVE MEMBERS*\n\n${list}`, sorted.map(([jid]) => jid));
});

// 30. GROUPFREEZE
cmd({
    pattern: "groupfreeze",
    alias: ["freezegc", "freeze"],
    desc: "Freeze the group (only admins can send messages)",
    category: "group",
    react: "🧊",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    await conn.groupSettingUpdate(from, 'announcement');
    setGroupData(from, { frozen: true });
    reply("🧊 *GROUP FROZEN!*\n\nOnly admins can send messages now.\n\nUse .unfreeze to restore.");
});

// ─────────────────────────────────────────────
// 🎮  GROUP GAMES  (31–42)
// ─────────────────────────────────────────────

// 31. GTRUTH
cmd({
    pattern: "gtruth",
    alias: ["grouptruth", "grptruth"],
    desc: "Send a truth question to the group",
    category: "group",
    react: "🎭",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const questions = [
        "Who in this group do you have a crush on? 👀",
        "What is the most embarrassing thing you have done in public?",
        "Have you ever lied to someone in this group?",
        "What is your biggest secret that no one in this group knows?",
        "If you had to date someone from this group, who would it be?",
        "What is your biggest fear?",
        "Have you ever cheated on an exam?",
        "What is the most childish thing you still do?",
        "Who in this group do you think is the most attractive?",
        "What is something you have done that you are ashamed of?"
    ];
    const q = questions[Math.floor(Math.random() * questions.length)];
    reply(`🤫 *GROUP TRUTH!*\n\n❓ ${q}\n\n_Be honest! Reply in the group!_`);
});

// 32. GDARE
cmd({
    pattern: "gdare",
    alias: ["groupdare", "grpdare"],
    desc: "Send a dare to the group",
    category: "group",
    react: "😈",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const dares = [
        "Send a voice note singing 'Happy Birthday' right now! 🎂",
        "Change your profile photo to something funny for 1 hour!",
        "Tag 3 people and say something nice about each one! 💕",
        "Send your most embarrassing photo in this group!",
        "Do 20 push-ups and send a voice note counting them!",
        "Write a love poem about the last person who texted you!",
        "Send a voice note talking like a baby for 30 seconds!",
        "Tell us your most embarrassing WhatsApp moment!",
        "Send a screenshot of your WhatsApp notifications right now!",
        "Text your mom 'I saw a ghost' and share her reply here!"
    ];
    const d = dares[Math.floor(Math.random() * dares.length)];
    reply(`😈 *GROUP DARE!*\n\n🎯 ${d}\n\n_Complete it or take a truth!_`);
});

// 33. GROUPQUIZ
cmd({
    pattern: "groupquiz",
    alias: ["gcquiz", "grpquiz"],
    desc: "Start a quiz in the group",
    category: "group",
    react: "🎓",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const quizzes = [
        { q: "What is the capital of Pakistan?", a: "Islamabad", opts: ["Karachi", "Islamabad", "Lahore", "Peshawar"] },
        { q: "Who was the first Muslim Caliph?", a: "Hazrat Abu Bakr (RA)", opts: ["Hazrat Umar (RA)", "Hazrat Abu Bakr (RA)", "Hazrat Ali (RA)", "Hazrat Usman (RA)"] },
        { q: "What is 2 + 2 × 2?", a: "6", opts: ["8", "6", "4", "10"] },
        { q: "Which is the longest river in the world?", a: "Nile", opts: ["Amazon", "Nile", "Yangtze", "Mississippi"] },
        { q: "How many Surahs are in the Quran?", a: "114", opts: ["113", "115", "114", "112"] },
        { q: "In which year did Pakistan gain independence?", a: "1947", opts: ["1945", "1947", "1948", "1946"] }
    ];
    const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
    const letters = ['A', 'B', 'C', 'D'];
    const opts = quiz.opts.map((o, i) => `${letters[i]}. ${o}`).join('\n');
    const gd = getGroupData(from);
    gd.activequiz = { answer: quiz.a, asked: Date.now() };
    setGroupData(from, gd);
    reply(`🎓 *GROUP QUIZ!*\n\n❓ *${quiz.q}*\n\n${opts}\n\n_Reply with A, B, C, or D!\nFirst correct answer wins! 🏆_`);
});

// 34. GROUPANSWER
cmd({
    pattern: "groupanswer",
    alias: ["ganswer", "answer"],
    use: ".answer A",
    desc: "Answer the current group quiz",
    category: "group",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, sender, args, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    if (!gd.activequiz) return reply("❌ No active quiz! Use .groupquiz to start one.");
    const userAns = args[0]?.toUpperCase();
    if (!userAns) return reply("❌ Usage: .answer A");
    const correct = gd.activequiz.answer;
    // simple check - user typed answer letter or full answer
    const isCorrect = correct.toLowerCase().includes(userAns.toLowerCase()) || userAns.toLowerCase() === correct.toLowerCase();
    if (isCorrect) {
        gd.activequiz = null;
        if (!gd.quizscores) gd.quizscores = {};
        if (!gd.quizscores[sender]) gd.quizscores[sender] = 0;
        gd.quizscores[sender]++;
        setGroupData(from, gd);
        reply(`🏆 *CORRECT!*\n\n✅ @${sender.split('@')[0]} got it right!\n📝 Answer: ${correct}\n🎯 Total score: ${gd.quizscores[sender]} point(s)!\n\nUse .groupquiz for next question!`, [sender]);
    } else {
        reply(`❌ *WRONG!*\n\n@${sender.split('@')[0]}, that's not correct!\nKeep trying! Others can still answer.`, [sender]);
    }
});

// 35. QUIZSCORES
cmd({
    pattern: "quizscores",
    alias: ["quizleaderboard", "gscores"],
    desc: "Show group quiz leaderboard",
    category: "group",
    react: "🏆",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    const scores = gd.quizscores || {};
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!sorted.length) return reply("❌ No quiz scores yet! Use .groupquiz to start.");
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const list = sorted.map(([jid, pts], i) => `${medals[i]} @${jid.split('@')[0]} — ${pts} pts`).join('\n');
    reply(`🏆 *QUIZ LEADERBOARD*\n\n${list}`, sorted.map(([jid]) => jid));
});

// 36. RESETQUIZ
cmd({
    pattern: "resetquiz",
    alias: ["clearquiz"],
    desc: "Reset all quiz scores in the group",
    category: "group",
    react: "🔄",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { quizscores: {}, activequiz: null });
    reply("✅ Quiz scores reset! Start fresh with .groupquiz");
});

// 37. GROLL
cmd({
    pattern: "groll",
    alias: ["grouproll", "randompick"],
    desc: "Pick a random member from the group",
    category: "group",
    react: "🎲",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const meta = await conn.groupMetadata(from);
    const nonBot = meta.participants.filter(p => p.id !== conn.user.id);
    const picked = nonBot[Math.floor(Math.random() * nonBot.length)];
    reply(`🎲 *RANDOM PICK!*\n\n🎯 The lucky member is:\n\n@${picked.id.split('@')[0]} 🎉\n\n_Picked from ${nonBot.length} members!_`, [picked.id]);
});

// 38. GCOUPLE
cmd({
    pattern: "gcouple",
    alias: ["groupcouple", "shipmatch"],
    desc: "Ship/couple two random group members",
    category: "group",
    react: "💘",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const meta = await conn.groupMetadata(from);
    const parts = meta.participants.filter(p => p.id !== conn.user.id);
    if (parts.length < 2) return reply("❌ Need at least 2 members!");
    const shuffled = [...parts].sort(() => Math.random() - 0.5);
    const p1 = shuffled[0]; const p2 = shuffled[1];
    const score = Math.floor(Math.random() * 40) + 61;
    const bars = '█'.repeat(Math.floor(score/10)) + '░'.repeat(10-Math.floor(score/10));
    reply(`💘 *GROUP COUPLE OF THE DAY!*\n\n@${p1.id.split('@')[0]}\n        ❤️\n@${p2.id.split('@')[0]}\n\n💑 Compatibility: ${score}%\n[${bars}]\n\n_Match made by the bot!_ 😄`, [p1.id, p2.id]);
});

// 39. GSLAP
cmd({
    pattern: "gslap",
    alias: ["groupslap", "slapall"],
    use: ".gslap @user",
    desc: "Humorously slap someone in the group",
    category: "group",
    react: "👋",
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag someone! Usage: .gslap @user");
    const msgs = [
        `💥 @${sender.split('@')[0]} slapped @${target.split('@')[0]} with a fish! 🐟`,
        `👋 @${sender.split('@')[0]} hit @${target.split('@')[0]} with a massive slap! 😂`,
        `🌪️ @${sender.split('@')[0]} sent @${target.split('@')[0]} flying across the room!`,
        `⚡ @${sender.split('@')[0]} gave @${target.split('@')[0]} an electric slap! ⚡`
    ];
    reply(msgs[Math.floor(Math.random() * msgs.length)], [sender, target]);
});

// 40. GKILL
cmd({
    pattern: "gkill",
    alias: ["groupkill", "assassinate"],
    use: ".gkill @user",
    desc: "Playfully 'assassinate' someone in the group",
    category: "group",
    react: "💀",
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag someone!");
    const msgs = [
        `🗡️ @${sender.split('@')[0]} has assassinated @${target.split('@')[0]}! 💀`,
        `☠️ @${target.split('@')[0]} was eliminated by @${sender.split('@')[0]}! 🎯`,
        `🔫 @${sender.split('@')[0]} took down @${target.split('@')[0]} from a mile away!`,
        `🪓 @${sender.split('@')[0]} challenged @${target.split('@')[0]} to a duel... and won! 💀`
    ];
    reply(msgs[Math.floor(Math.random() * msgs.length)], [sender, target]);
});

// 41. GROUPJOKE
cmd({
    pattern: "groupjoke",
    alias: ["gcjoke", "grpjoke"],
    desc: "Send a random group-friendly joke",
    category: "group",
    react: "😂",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const jokes = [
        "Why do programmers prefer dark mode?\n\n_Because light attracts bugs!_ 🐛",
        "Teacher: Name 5 animals.\nStudent: Dog, cat, and 3 more dogs 🐕",
        "I told my wife she should embrace her mistakes.\nShe gave me a hug 😂",
        "Why can't a bicycle stand on its own?\nBecause it's two-tired! 🚲",
        "I asked my cat what 2 minus 2 is.\nHe said nothing 😹",
        "Why don't scientists trust atoms?\nBecause they make up everything! 😂",
        "My boss told me to have a good day.\nSo I went home! 🏠",
        "I'm reading a book about anti-gravity.\nIt's impossible to put down! 📚"
    ];
    reply(`😂 *GROUP JOKE*\n\n${jokes[Math.floor(Math.random() * jokes.length)]}`);
});

// 42. GROUPTAUNT
cmd({
    pattern: "grouptaunt",
    alias: ["taunt", "gcmock"],
    use: ".grouptaunt @user",
    desc: "Playfully taunt someone in the group",
    category: "group",
    react: "😏",
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag someone!");
    const taunts = [
        `😏 @${sender.split('@')[0]} says @${target.split('@')[0]} talks too much!`,
        `🤣 @${sender.split('@')[0]} thinks @${target.split('@')[0]}'s jokes aren't funny!`,
        `😂 @${sender.split('@')[0]} bet @${target.split('@')[0]} can't do 10 pushups!`,
        `😜 @${sender.split('@')[0]} says @${target.split('@')[0]} is the group sleepyhead! 😴`
    ];
    reply(taunts[Math.floor(Math.random() * taunts.length)], [sender, target]);
});

// ─────────────────────────────────────────────
// 🔧  MEDIA CONTROLS  (43–53)
// ─────────────────────────────────────────────

// 43. LOCKIMG
cmd({
    pattern: "lockimg",
    alias: ["noimages", "blockimg"],
    desc: "Restrict image sending in group (bot tracks & deletes)",
    category: "group",
    react: "🚫",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { lockimg: true });
    reply("🚫 *IMAGES LOCKED!*\n\nImages from non-admins will be auto-deleted.");
});

// 44. UNLOCKIMG
cmd({
    pattern: "unlockimg",
    alias: ["allowimages"],
    desc: "Allow image sending again in group",
    category: "group",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { lockimg: false });
    reply("✅ *IMAGES UNLOCKED!*\n\nMembers can now send images.");
});

// 45. LOCKVID
cmd({
    pattern: "lockvid",
    alias: ["novideos", "blockvid"],
    desc: "Restrict video sending in group",
    category: "group",
    react: "🚫",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { lockvid: true });
    reply("🚫 *VIDEOS LOCKED!*\n\nVideos from non-admins will be auto-deleted.");
});

// 46. UNLOCKVID
cmd({
    pattern: "unlockvid",
    alias: ["allowvideos"],
    desc: "Allow video sending in group",
    category: "group",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { lockvid: false });
    reply("✅ *VIDEOS UNLOCKED!*\n\nMembers can now send videos.");
});

// 47. LOCKAUDIO
cmd({
    pattern: "lockaudio",
    alias: ["noaudio", "blockaudio"],
    desc: "Restrict audio/voice note sending in group",
    category: "group",
    react: "🔇",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { lockaudio: true });
    reply("🔇 *AUDIO LOCKED!*\n\nVoice notes/audio from non-admins will be auto-deleted.");
});

// 48. UNLOCKAUDIO
cmd({
    pattern: "unlockaudio",
    alias: ["allowaudio"],
    desc: "Allow audio sending in group",
    category: "group",
    react: "🔊",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { lockaudio: false });
    reply("🔊 *AUDIO UNLOCKED!*\n\nMembers can now send voice notes.");
});

// 49. LOCKDOC
cmd({
    pattern: "lockdoc",
    alias: ["nodocs", "blockdoc"],
    desc: "Restrict document/file sending in group",
    category: "group",
    react: "📵",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { lockdoc: true });
    reply("📵 *DOCUMENTS LOCKED!*\n\nFile sharing from non-admins will be auto-deleted.");
});

// 50. UNLOCKDOC
cmd({
    pattern: "unlockdoc",
    alias: ["allowdocs"],
    desc: "Allow document sending in group",
    category: "group",
    react: "📄",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { lockdoc: false });
    reply("📄 *DOCUMENTS UNLOCKED!*\n\nMembers can now share files.");
});

// 51. LOCKSTICKER
cmd({
    pattern: "locksticker",
    alias: ["nostickers", "blocksticker"],
    desc: "Restrict sticker sending in group",
    category: "group",
    react: "🚫",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { locksticker: true });
    reply("🚫 *STICKERS LOCKED!*\n\nStickers from non-admins will be auto-deleted.");
});

// 52. UNLOCKSTICKER
cmd({
    pattern: "unlocksticker",
    alias: ["allowstickers"],
    desc: "Allow sticker sending in group",
    category: "group",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { locksticker: false });
    reply("✅ *STICKERS UNLOCKED!*\n\nMembers can now send stickers.");
});

// 53. MEDIASTATUS
cmd({
    pattern: "mediastatus",
    alias: ["medialocks", "lockstatus"],
    desc: "Show current media lock status in group",
    category: "group",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const gd = getGroupData(from);
    reply(`📊 *MEDIA LOCK STATUS*\n\n🖼️ Images: ${gd.lockimg ? '🔒 LOCKED' : '✅ OPEN'}\n🎥 Videos: ${gd.lockvid ? '🔒 LOCKED' : '✅ OPEN'}\n🎵 Audio: ${gd.lockaudio ? '🔒 LOCKED' : '✅ OPEN'}\n📄 Docs: ${gd.lockdoc ? '🔒 LOCKED' : '✅ OPEN'}\n🎭 Stickers: ${gd.locksticker ? '🔒 LOCKED' : '✅ OPEN'}`);
});

// ─────────────────────────────────────────────
// 💬  CUSTOM MESSAGES  (54–63)
// ─────────────────────────────────────────────

// 54. SETWELCOME
cmd({
    pattern: "setwelcome",
    alias: ["customwelcome"],
    use: ".setwelcome Welcome {user} to {group}!",
    desc: "Set custom welcome message. Use {user} and {group} as placeholders",
    category: "group",
    react: "👋",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const msg = args.join(' ');
    if (!msg) return reply("❌ Usage: .setwelcome Welcome {user} to {group}!\n\nUse {user} for member name and {group} for group name.");
    setGroupData(from, { customwelcome: msg });
    const meta = await conn.groupMetadata(from);
    const preview = msg.replace('{user}', '@NewMember').replace('{group}', meta.subject);
    reply(`✅ *Custom Welcome Set!*\n\n📝 Preview:\n${preview}`);
});

// 55. SETGOODBYE
cmd({
    pattern: "setgoodbye",
    alias: ["customgoodbye", "setleave"],
    use: ".setgoodbye Goodbye {user}! We'll miss you.",
    desc: "Set custom goodbye/leave message",
    category: "group",
    react: "👋",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const msg = args.join(' ');
    if (!msg) return reply("❌ Usage: .setgoodbye Goodbye {user}! We'll miss you.\n\nUse {user} for member name.");
    setGroupData(from, { customgoodbye: msg });
    const meta = await conn.groupMetadata(from);
    const preview = msg.replace('{user}', '@LeftMember').replace('{group}', meta.subject);
    reply(`✅ *Custom Goodbye Set!*\n\n📝 Preview:\n${preview}`);
});

// 56. CLEARWELCOME
cmd({
    pattern: "clearwelcome",
    alias: ["resetwelcome"],
    desc: "Reset welcome message to default",
    category: "group",
    react: "🔄",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { customwelcome: null });
    reply("✅ Welcome message reset to default!");
});

// 57. SETANNOUNCE
cmd({
    pattern: "setannounce",
    alias: ["announce", "gcannounce"],
    use: ".setannounce Important message here",
    desc: "Send a pinned-style announcement to the group",
    category: "group",
    react: "📣",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const msg = args.join(' ');
    if (!msg) return reply("❌ Usage: .setannounce <message>");
    const meta = await conn.groupMetadata(from);
    const time = new Date().toLocaleString('en-PK');
    conn.sendMessage(from, {
        text: `📣 *ANNOUNCEMENT — ${meta.subject}*\n\n${msg}\n\n🕐 ${time}`,
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true
        }
    });
    reply("✅ Announcement sent!");
});

// 58. GROUPNOTE
cmd({
    pattern: "groupnote",
    alias: ["setnote", "gcnote"],
    use: ".groupnote <note text>",
    desc: "Save a group note that members can recall",
    category: "group",
    react: "📝",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const note = args.join(' ');
    if (!note) return reply("❌ Usage: .groupnote <note text>");
    setGroupData(from, { note });
    reply(`📝 *Group Note Saved!*\n\nMembers can view it with .shownote`);
});

// 59. SHOWNOTE
cmd({
    pattern: "shownote",
    alias: ["getnote", "note"],
    desc: "View the saved group note",
    category: "group",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    if (!gd.note) return reply("❌ No note saved!\n\nAdmins can use .groupnote to save one.");
    reply(`📋 *GROUP NOTE*\n\n${gd.note}`);
});

// 60. CLEARNOTE
cmd({
    pattern: "clearnote",
    alias: ["delnote"],
    desc: "Delete the saved group note",
    category: "group",
    react: "🗑️",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { note: null });
    reply("✅ Group note cleared!");
});

// 61. GROUPTOPIC
cmd({
    pattern: "grouptopic",
    alias: ["topic", "gctopic"],
    use: ".grouptopic Today's discussion: AI in Pakistan",
    desc: "Set a discussion topic for the group",
    category: "group",
    react: "💬",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const topic = args.join(' ');
    if (!topic) return reply("❌ Usage: .grouptopic <topic>");
    setGroupData(from, { topic });
    reply(`💬 *GROUP TOPIC SET!*\n\n📌 Today's Topic:\n_${topic}_\n\nMembers can discuss! 🗣️`);
});

// 62. SHOWTOPIC
cmd({
    pattern: "showtopic",
    alias: ["gettopic", "whattopic"],
    desc: "Show the current group discussion topic",
    category: "group",
    react: "💬",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    if (!gd.topic) return reply("❌ No topic set! Admins use .grouptopic to set one.");
    reply(`💬 *CURRENT TOPIC*\n\n📌 ${gd.topic}`);
});

// 63. GROUPMOTD
cmd({
    pattern: "groupmotd",
    alias: ["motd", "messageofday"],
    use: ".groupmotd <message>",
    desc: "Set message of the day for the group",
    category: "group",
    react: "☀️",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const msg = args.join(' ');
    if (!msg) return reply("❌ Usage: .groupmotd <message>");
    const date = new Date().toDateString();
    setGroupData(from, { motd: msg, motddate: date });
    reply(`☀️ *MESSAGE OF THE DAY*\n\n📅 ${date}\n\n_${msg}_\n\nMembers can read with .showmotd`);
});

// ─────────────────────────────────────────────
// 🔨  MODERATION TOOLS  (64–80)
// ─────────────────────────────────────────────

// 64. SOFTBAN
cmd({
    pattern: "softban",
    alias: ["tempkick", "kickreadd"],
    use: ".softban @user",
    desc: "Kick a user then re-add them (soft reset)",
    category: "group",
    react: "🔨",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag a user! Usage: .softban @user");
    await conn.groupParticipantsUpdate(from, [target], 'remove');
    setTimeout(async () => {
        await conn.groupParticipantsUpdate(from, [target], 'add');
    }, 3000);
    reply(`🔨 *SOFT BAN*\n\n@${target.split('@')[0]} was kicked and re-added.\n_(Warnings/cache reset)_`, [target]);
});

// 65. MUTEUSER
cmd({
    pattern: "muteuser",
    alias: ["silenceuser", "shushuser"],
    use: ".muteuser @user",
    desc: "Add a user to the group mute list (tracked by bot)",
    category: "group",
    react: "🔇",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    if (!gd.mutedusers) gd.mutedusers = [];
    if (gd.mutedusers.includes(target)) return reply("❌ User is already muted!");
    gd.mutedusers.push(target);
    setGroupData(from, gd);
    reply(`🔇 @${target.split('@')[0]} has been muted!\n\nTheir messages will be auto-deleted.\nUse .unmuteuser to restore.`, [target]);
});

// 66. UNMUTEUSER
cmd({
    pattern: "unmuteuser",
    alias: ["silenceoff", "shushoff"],
    use: ".unmuteuser @user",
    desc: "Remove a user from the mute list",
    category: "group",
    react: "🔊",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    if (!gd.mutedusers) gd.mutedusers = [];
    const idx = gd.mutedusers.indexOf(target);
    if (idx === -1) return reply("❌ User is not muted!");
    gd.mutedusers.splice(idx, 1);
    setGroupData(from, gd);
    reply(`🔊 @${target.split('@')[0]} has been unmuted!`, [target]);
});

// 67. MUTELIST
cmd({
    pattern: "mutelist",
    alias: ["listmuted"],
    desc: "Show all muted users in the group",
    category: "group",
    react: "🔇",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const gd = getGroupData(from);
    const muted = gd.mutedusers || [];
    if (!muted.length) return reply("✅ No muted users!");
    reply(`🔇 *MUTED USERS*\n\n${muted.map((j, i) => `${i+1}. @${j.split('@')[0]}`).join('\n')}`, muted);
});

// 68. SETMSGCOOLDOWN
cmd({
    pattern: "setmsgcooldown",
    alias: ["msgcooldown", "slowmode"],
    use: ".setmsgcooldown 10",
    desc: "Set message cooldown (slowmode) in seconds",
    category: "group",
    react: "⏱️",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const secs = parseInt(args[0]);
    if (!secs || secs < 1 || secs > 300) return reply("❌ Usage: .setmsgcooldown 10\n(1–300 seconds)");
    setGroupData(from, { cooldown: secs });
    reply(`⏱️ *MESSAGE COOLDOWN SET!*\n\nMembers must wait ${secs} seconds between messages.\nUse .setmsgcooldown 0 to disable.`);
});

// 69. KICKALL
cmd({
    pattern: "kickall",
    alias: ["cleargroup", "removeall2"],
    desc: "Kick all non-admin members from the group",
    category: "group",
    react: "🔴",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const meta = await conn.groupMetadata(from);
    const nonAdmins = meta.participants.filter(p => !p.admin && p.id !== conn.user.id);
    if (!nonAdmins.length) return reply("❌ No regular members to kick!");
    reply(`⏳ Kicking ${nonAdmins.length} members... Please wait.`);
    for (const p of nonAdmins) {
        try { await conn.groupParticipantsUpdate(from, [p.id], 'remove'); await new Promise(r => setTimeout(r, 500)); } catch {}
    }
    reply(`✅ Kicked ${nonAdmins.length} non-admin members!`);
});

// 70. KICKBOTS
cmd({
    pattern: "kickbots",
    alias: ["removebots", "botclean"],
    desc: "Kick all bot accounts from the group",
    category: "group",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const meta = await conn.groupMetadata(from);
    const bots = meta.participants.filter(p => {
        const num = p.id.split('@')[0];
        return num.length > 15 || num.startsWith('0') || (p.id && p.id.includes(':'));
    });
    if (!bots.length) return reply("✅ No bot accounts detected!");
    for (const b of bots) {
        try { await conn.groupParticipantsUpdate(from, [b.id], 'remove'); } catch {}
    }
    reply(`✅ Removed ${bots.length} suspected bot(s)!`);
});

// 71. TEMPKICK
cmd({
    pattern: "tempkick",
    alias: ["timedkick", "kicktemp"],
    use: ".tempkick @user 10",
    desc: "Temporarily kick a user for X minutes then re-add",
    category: "group",
    react: "⏰",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const mins = parseInt(args[1] || args[0]) || 5;
    if (!target) return reply("❌ Tag a user! Usage: .tempkick @user 10");
    await conn.groupParticipantsUpdate(from, [target], 'remove');
    reply(`⏰ @${target.split('@')[0]} temporarily kicked for ${mins} minute(s)!\n\nThey will be re-added automatically.`, [target]);
    setTimeout(async () => {
        try {
            await conn.groupParticipantsUpdate(from, [target], 'add');
            conn.sendMessage(from, { text: `✅ @${target.split('@')[0]} has been re-added after ${mins} min timeout.`, mentions: [target] });
        } catch {}
    }, mins * 60 * 1000);
});

// 72. DEMOTEALL
cmd({
    pattern: "demoteall",
    alias: ["removeallpromote", "clearadmins"],
    desc: "Demote all admins (except group creator and bot)",
    category: "group",
    react: "⬇️",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const meta = await conn.groupMetadata(from);
    const admins = meta.participants.filter(p => p.admin === 'admin' && p.id !== conn.user.id);
    if (!admins.length) return reply("❌ No regular admins to demote!");
    for (const a of admins) {
        try { await conn.groupParticipantsUpdate(from, [a.id], 'demote'); } catch {}
    }
    reply(`✅ Demoted ${admins.length} admin(s)!`);
});

// 73. PROMOTEALL
cmd({
    pattern: "promoteall",
    alias: ["makeallpromote", "allasadmins"],
    desc: "Promote all members to admin",
    category: "group",
    react: "⬆️",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const meta = await conn.groupMetadata(from);
    const nonAdmins = meta.participants.filter(p => !p.admin);
    if (!nonAdmins.length) return reply("❌ All members are already admins!");
    for (const p of nonAdmins) {
        try { await conn.groupParticipantsUpdate(from, [p.id], 'promote'); await new Promise(r => setTimeout(r, 300)); } catch {}
    }
    reply(`✅ Promoted ${nonAdmins.length} member(s) to admin!`);
});

// 74. GROUPREPORT
cmd({
    pattern: "groupreport",
    alias: ["report2", "gcreport"],
    use: ".groupreport @user [reason]",
    desc: "Report a member to group admins",
    category: "group",
    react: "🚨",
    filename: __filename
}, async (conn, mek, m, { from, sender, args, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag someone to report!");
    const reason = args.slice(1).join(' ') || 'No reason given';
    const meta = await conn.groupMetadata(from);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    const reportMsg = `🚨 *MEMBER REPORT*\n\n👤 Reported: @${target.split('@')[0]}\n📞 By: @${sender.split('@')[0]}\n📝 Reason: ${reason}\n📅 Time: ${new Date().toLocaleString()}\n\n_Attention admins!_`;
    conn.sendMessage(from, { text: reportMsg, mentions: [target, sender, ...admins] });
    reply("✅ Report sent to admins!");
});

// 75. GROUPBLACKLIST
cmd({
    pattern: "groupblacklist",
    alias: ["gcblacklist", "blacklist"],
    use: ".groupblacklist @user",
    desc: "Add user to blacklist (auto-kick if they try to join)",
    category: "group",
    react: "⛔",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    if (!gd.blacklist) gd.blacklist = [];
    if (gd.blacklist.includes(target)) return reply("❌ Already blacklisted!");
    gd.blacklist.push(target);
    setGroupData(from, gd);
    reply(`⛔ @${target.split('@')[0]} added to group blacklist!\nThey will be auto-kicked if they join.`, [target]);
});

// 76. UNGROUPBLACKLIST
cmd({
    pattern: "ungroupblacklist",
    alias: ["gcunblacklist", "unblacklist"],
    use: ".ungroupblacklist @user",
    desc: "Remove user from group blacklist",
    category: "group",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    if (!gd.blacklist) gd.blacklist = [];
    const idx = gd.blacklist.indexOf(target);
    if (idx === -1) return reply("❌ User not in blacklist!");
    gd.blacklist.splice(idx, 1);
    setGroupData(from, gd);
    reply(`✅ @${target.split('@')[0]} removed from blacklist!`, [target]);
});

// 77. SHOWBLACKLIST
cmd({
    pattern: "showblacklist",
    alias: ["listblacklist", "gcblist"],
    desc: "Show the group blacklist",
    category: "group",
    react: "⛔",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const gd = getGroupData(from);
    const bl = gd.blacklist || [];
    if (!bl.length) return reply("✅ Blacklist is empty!");
    reply(`⛔ *GROUP BLACKLIST*\n\n${bl.map((j, i) => `${i+1}. @${j.split('@')[0]}`).join('\n')}`, bl);
});

// 78. UNFREEZE
cmd({
    pattern: "unfreeze",
    alias: ["unfreezegc", "thaw"],
    desc: "Unfreeze group (allow all members to send messages)",
    category: "group",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    await conn.groupSettingUpdate(from, 'not_announcement');
    setGroupData(from, { frozen: false });
    reply("🔥 *GROUP UNFROZEN!*\n\nAll members can now send messages again!");
});

// 79. SETGROUPNAME
cmd({
    pattern: "setgroupname",
    alias: ["renamegc", "gcname"],
    use: ".setgroupname New Group Name",
    desc: "Change the group's name",
    category: "group",
    react: "✏️",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const name = args.join(' ');
    if (!name) return reply("❌ Usage: .setgroupname <new name>");
    await conn.groupUpdateSubject(from, name);
    reply(`✅ Group name changed to "*${name}*"!`);
});

// 80. SETGROUPDESC
cmd({
    pattern: "setgroupdesc",
    alias: ["gcsetdesc", "groupdescription"],
    use: ".setgroupdesc New group description here",
    desc: "Change the group's description",
    category: "group",
    react: "📝",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isBotAdmins, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isBotAdmins) return reply("❌ Bot must be admin!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const desc = args.join(' ');
    if (!desc) return reply("❌ Usage: .setgroupdesc <description>");
    await conn.groupUpdateDescription(from, desc);
    reply(`✅ Group description updated!`);
});

// ─────────────────────────────────────────────
// 🎁  POINTS & ENGAGEMENT  (81–90)
// ─────────────────────────────────────────────

// 81. GIVEPOINTS
cmd({
    pattern: "givepoints",
    alias: ["addpoints", "award"],
    use: ".givepoints @user 10",
    desc: "Give points to a member",
    category: "group",
    react: "⭐",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const pts = parseInt(args[1] || args[0]) || 10;
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    if (!gd.points) gd.points = {};
    if (!gd.points[target]) gd.points[target] = 0;
    gd.points[target] += pts;
    setGroupData(from, gd);
    reply(`⭐ @${target.split('@')[0]} received *${pts} points*!\n\nTotal: ${gd.points[target]} points 🎯`, [target]);
});

// 82. MYPOINTS
cmd({
    pattern: "mypoints",
    alias: ["checkpoints", "pointsme"],
    desc: "Check your points in the group",
    category: "group",
    react: "💎",
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    const pts = gd.points?.[sender] || 0;
    const sorted = Object.entries(gd.points || {}).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([j]) => j === sender) + 1;
    reply(`💎 *YOUR POINTS*\n\n👤 @${sender.split('@')[0]}\n⭐ Points: ${pts}\n🏆 Rank: #${rank || 'N/A'}\n\nUse .pointsboard to see the full board!`, [sender]);
});

// 83. POINTSBOARD
cmd({
    pattern: "pointsboard",
    alias: ["leaderboard2", "toppoints"],
    desc: "Show the group points leaderboard",
    category: "group",
    react: "🏆",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    const pts = gd.points || {};
    const sorted = Object.entries(pts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!sorted.length) return reply("❌ No points yet! Use .givepoints to start.");
    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const list = sorted.map(([jid, p], i) => `${medals[i]} @${jid.split('@')[0]} — ⭐ ${p}`).join('\n');
    reply(`🏆 *POINTS LEADERBOARD*\n\n${list}`, sorted.map(([j]) => j));
});

// 84. RESETPOINTS
cmd({
    pattern: "resetpoints",
    alias: ["clearpoints"],
    desc: "Reset all group points",
    category: "group",
    react: "🔄",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    setGroupData(from, { points: {} });
    reply("✅ All group points reset!");
});

// 85. TAKEPOINTS
cmd({
    pattern: "takepoints",
    alias: ["deductpoints", "removepoints"],
    use: ".takepoints @user 5",
    desc: "Remove points from a member",
    category: "group",
    react: "⬇️",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const pts = parseInt(args[1] || args[0]) || 5;
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    if (!gd.points) gd.points = {};
    if (!gd.points[target]) gd.points[target] = 0;
    gd.points[target] = Math.max(0, gd.points[target] - pts);
    setGroupData(from, gd);
    reply(`⬇️ ${pts} points deducted from @${target.split('@')[0]}!\n\nRemaining: ${gd.points[target]} points`, [target]);
});

// 86. DAILYREWARD
cmd({
    pattern: "dailyreward",
    alias: ["daily", "claimdaily"],
    desc: "Claim your daily reward points",
    category: "group",
    react: "🎁",
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    if (!gd.daily) gd.daily = {};
    if (!gd.points) gd.points = {};
    const lastClaim = gd.daily[sender] || 0;
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    if (now - lastClaim < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastClaim)) / (1000 * 60 * 60));
        return reply(`❌ Already claimed!\n\n⏳ Come back in ${remaining} hour(s) to claim again!`);
    }
    const reward = Math.floor(Math.random() * 50) + 10;
    gd.daily[sender] = now;
    gd.points[sender] = (gd.points[sender] || 0) + reward;
    setGroupData(from, gd);
    reply(`🎁 *DAILY REWARD CLAIMED!*\n\n💰 @${sender.split('@')[0]} earned *${reward} points*!\n⭐ Total: ${gd.points[sender]} points\n\n_Come back tomorrow for more!_`, [sender]);
});

// 87. GROUPTAG2
cmd({
    pattern: "grouptag2",
    alias: ["tagspecial", "customtag"],
    use: ".grouptag2 [message]",
    desc: "Tag all members with a custom message",
    category: "group",
    react: "📣",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const message = args.join(' ') || 'Attention everyone!';
    const meta = await conn.groupMetadata(from);
    const members = meta.participants.map(p => p.id);
    const mentions = members.map(id => `@${id.split('@')[0]}`).join(' ');
    conn.sendMessage(from, {
        text: `📣 *${message}*\n\n${mentions}`,
        mentions: members
    });
});

// 88. GROUPPOLL2
cmd({
    pattern: "grouppoll2",
    alias: ["advpoll", "multipoll"],
    use: ".grouppoll2 Question? | Option1 | Option2 | Option3",
    desc: "Create an advanced multi-option text poll",
    category: "group",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const input = args.join(' ');
    const parts = input.split('|').map(p => p.trim());
    if (parts.length < 3) return reply("❌ Usage: .grouppoll2 Question? | Option A | Option B | Option C");
    const question = parts[0];
    const options = parts.slice(1);
    const letters = ['🅰️','🅱️','🅲️','🅳️','🅴️','🅵️'];
    const optText = options.map((o, i) => `${letters[i] || (i+1+'.')} ${o}`).join('\n');
    const gd = getGroupData(from);
    gd.activepoll = { question, options, votes: {}, started: Date.now() };
    setGroupData(from, gd);
    reply(`📊 *GROUP POLL*\n\n❓ *${question}*\n\n${optText}\n\n_Reply .pollvote A/B/C to vote!_`);
});

// 89. POLLVOTE
cmd({
    pattern: "pollvote",
    alias: ["vote", "myvote"],
    use: ".pollvote A",
    desc: "Vote in the active group poll",
    category: "group",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, sender, args, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    if (!gd.activepoll) return reply("❌ No active poll! Admin can use .grouppoll2 to create one.");
    const choice = args[0]?.toUpperCase();
    const letters = ['A','B','C','D','E','F'];
    const idx = letters.indexOf(choice);
    if (idx === -1 || idx >= gd.activepoll.options.length) return reply(`❌ Invalid vote! Choose: ${letters.slice(0, gd.activepoll.options.length).join(', ')}`);
    gd.activepoll.votes[sender] = idx;
    setGroupData(from, gd);
    reply(`✅ Vote recorded!\n\n@${sender.split('@')[0]} voted for: *${choice}. ${gd.activepoll.options[idx]}*\n\nUse .pollresults to see current standings.`, [sender]);
});

// 90. POLLRESULTS
cmd({
    pattern: "pollresults",
    alias: ["voteresults", "showvotes"],
    desc: "Show the current poll results",
    category: "group",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    if (!gd.activepoll) return reply("❌ No active poll!");
    const { question, options, votes } = gd.activepoll;
    const counts = options.map((_, i) => Object.values(votes).filter(v => v === i).length);
    const total = Object.keys(votes).length || 1;
    const letters = ['A','B','C','D','E','F'];
    const bars = counts.map((c, i) => {
        const pct = Math.round((c / total) * 100);
        const bar = '█'.repeat(Math.floor(pct/10)) + '░'.repeat(10-Math.floor(pct/10));
        return `${letters[i]}. ${options[i]}\n   [${bar}] ${pct}% (${c} votes)`;
    }).join('\n\n');
    reply(`📊 *POLL RESULTS*\n\n❓ ${question}\n\n${bars}\n\n👥 Total votes: ${Object.keys(votes).length}`);
});

// ─────────────────────────────────────────────
// 🔔  MISC GROUP TOOLS  (91–100)
// ─────────────────────────────────────────────

// 91. GROUPREMINDER
cmd({
    pattern: "groupreminder",
    alias: ["reminder", "gcreminder"],
    use: ".groupreminder 5 Meeting starts soon!",
    desc: "Set a group reminder (in minutes)",
    category: "group",
    react: "⏰",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const mins = parseInt(args[0]);
    const msg = args.slice(1).join(' ');
    if (!mins || !msg) return reply("❌ Usage: .groupreminder 5 Meeting starts soon!");
    reply(`✅ Reminder set! I'll remind the group in ${mins} minute(s).`);
    setTimeout(() => {
        conn.sendMessage(from, { text: `⏰ *REMINDER!*\n\n${msg}\n\n_Set ${mins} minute(s) ago_` });
    }, mins * 60 * 1000);
});

// 92. GROUPCOUNTDOWN
cmd({
    pattern: "groupcountdown",
    alias: ["countdown", "gccountdown"],
    use: ".groupcountdown 10 New Year celebration!",
    desc: "Send a countdown in the group (up to 30 seconds)",
    category: "group",
    react: "⏳",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const secs = Math.min(parseInt(args[0]) || 5, 30);
    const event = args.slice(1).join(' ') || 'Event starting!';
    reply(`⏳ Starting countdown for: *${event}*`);
    for (let i = secs; i > 0; i--) {
        await new Promise(r => setTimeout(r, 1000));
        if (i <= 5 || i % 5 === 0) {
            await conn.sendMessage(from, { text: `⏳ *${i}...*` });
        }
    }
    await conn.sendMessage(from, { text: `🎉 *${event.toUpperCase()}!*\n\n🚀 Let's go!` });
});

// 93. GROUPVIP
cmd({
    pattern: "groupvip",
    alias: ["viplist", "gcvip"],
    use: ".groupvip @user",
    desc: "Give VIP status to a member",
    category: "group",
    react: "💎",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    if (!gd.vip) gd.vip = [];
    if (gd.vip.includes(target)) return reply("❌ Already VIP!");
    gd.vip.push(target);
    setGroupData(from, gd);
    reply(`💎 *VIP STATUS GRANTED!*\n\n👑 @${target.split('@')[0]} is now a VIP member!\n\nTotal VIPs: ${gd.vip.length}`, [target]);
});

// 94. REMOVEVIP
cmd({
    pattern: "removevip",
    alias: ["unvip", "gcunvip"],
    use: ".removevip @user",
    desc: "Remove VIP status from a member",
    category: "group",
    react: "⬇️",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const target = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply("❌ Tag a user!");
    const gd = getGroupData(from);
    if (!gd.vip) gd.vip = [];
    const idx = gd.vip.indexOf(target);
    if (idx === -1) return reply("❌ User is not VIP!");
    gd.vip.splice(idx, 1);
    setGroupData(from, gd);
    reply(`✅ VIP status removed from @${target.split('@')[0]}!`, [target]);
});

// 95. SHOWVIP
cmd({
    pattern: "showvip",
    alias: ["listvip", "gcviplist"],
    desc: "Show all VIP members in the group",
    category: "group",
    react: "💎",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    const vips = gd.vip || [];
    if (!vips.length) return reply("❌ No VIP members yet!");
    reply(`💎 *VIP MEMBERS*\n\n${vips.map((j, i) => `${i+1}. 💎 @${j.split('@')[0]}`).join('\n')}`, vips);
});

// 96. GROUPMOOD
cmd({
    pattern: "groupmood",
    alias: ["setmood", "gcmood"],
    use: ".groupmood 🎉 Party time!",
    desc: "Set the group mood/vibe for the day",
    category: "group",
    react: "🎭",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const mood = args.join(' ');
    if (!mood) return reply("❌ Usage: .groupmood 🎉 Party time!");
    const date = new Date().toDateString();
    setGroupData(from, { mood, mooddate: date });
    reply(`🎭 *GROUP MOOD SET!*\n\n${mood}\n\n📅 ${date}\n\n_Members can check with .showmood_`);
});

// 97. SHOWMOOD
cmd({
    pattern: "showmood",
    alias: ["getmood", "gcvibes"],
    desc: "Show current group mood/vibe",
    category: "group",
    react: "🎭",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    if (!gd.mood) return reply("❌ No mood set! Admins use .groupmood to set one.");
    reply(`🎭 *GROUP MOOD*\n\n${gd.mood}\n\n📅 ${gd.mooddate || 'Today'}`);
});

// 98. GROUPEVENT
cmd({
    pattern: "groupevent2",
    alias: ["event", "setevent"],
    use: ".groupevent2 Eid Celebration | Dec 25 | Join us for Eid party!",
    desc: "Create a group event announcement",
    category: "group",
    react: "🎉",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    const parts = args.join(' ').split('|').map(p => p.trim());
    if (parts.length < 2) return reply("❌ Usage: .groupevent2 EventName | Date | Description");
    const [name, date, desc = 'Join us!'] = parts;
    setGroupData(from, { event: { name, date, desc, created: Date.now() } });
    reply(`🎉 *GROUP EVENT CREATED!*\n\n📌 Event: *${name}*\n📅 Date: ${date}\n📝 Details: ${desc}\n\n_Spread the word!_ 🎊`);
});

// 99. SHOWEVENT
cmd({
    pattern: "showevent",
    alias: ["getevent", "nextevent"],
    desc: "Show the current group event",
    category: "group",
    react: "🎉",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    const gd = getGroupData(from);
    if (!gd.event) return reply("❌ No event set! Admins use .groupevent2 to create one.");
    const { name, date, desc } = gd.event;
    reply(`🎉 *UPCOMING EVENT*\n\n📌 *${name}*\n📅 Date: ${date}\n📝 Details: ${desc}\n\n_Mark your calendars!_ 📆`);
});

// 100. GROUPWIPE
cmd({
    pattern: "groupwipe",
    alias: ["wipegcdata", "resetgroupdata"],
    desc: "⚠️ Reset ALL bot data for this group (warns, points, settings, etc.)",
    category: "group",
    react: "⚠️",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isSenderAdmins, reply }) => {
    if (!isGroup) return reply("❌ Group only!");
    if (!isSenderAdmins) return reply("❌ Admins only!");
    if (args[0] !== 'confirm') return reply("⚠️ *WARNING!*\n\nThis will DELETE all bot data for this group:\n• All warns\n• All points\n• All settings\n• Word filters\n• Quiz scores\n\nType *.groupwipe confirm* to proceed!");
    const db = loadDB();
    delete db[from];
    saveDB(db);
    reply("✅ All group bot data has been wiped!\n\nFresh start! 🔄");
});
