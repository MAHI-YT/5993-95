const fs = require('fs');
const path = require('path');
const { cmd } = require('../command');

const OWNER_PATH = path.join(__dirname, "../lib/sudo.json");

const loadSudo = () => {
    try {
        return JSON.parse(fs.readFileSync(OWNER_PATH, "utf-8"));
    } catch {
        return [];
    }
};

const isAuthorized = (sender, isCreator) => {
    if (isCreator) return true;
    const sudoOwners = loadSudo();
    return sudoOwners.some(owner => owner === sender);
};

// Helper function to check if participant is bot
function isParticipantBot(conn, participantId) {
    const botId = conn.user?.id || '';
    const botLid = conn.user?.lid || '';
    
    const botNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
    const botIdWithoutSuffix = botId.includes('@') ? botId.split('@')[0] : botId;
    const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
    
    const pId = participantId.includes('@') ? participantId.split('@')[0] : participantId;
    const pNumber = pId.includes(':') ? pId.split(':')[0] : pId;
    
    return (
        botId === participantId ||
        botLid === participantId ||
        botNumber === pNumber ||
        botIdWithoutSuffix === pId ||
        botLidNumeric === pNumber
    );
}

// Helper function to check if participant is sudo
function isParticipantSudo(participantId) {
    const pId = participantId.includes('@') ? participantId.split('@')[0] : participantId;
    const pNumber = pId.includes(':') ? pId.split(':')[0] : pId;
    
    const sudoOwners = loadSudo();
    return sudoOwners.some(owner => {
        const ownerNum = owner.includes('@') ? owner.split('@')[0] : owner;
        const ownerNumber = ownerNum.includes(':') ? ownerNum.split(':')[0] : ownerNum;
        return pNumber === ownerNumber || pNumber === ownerNumber.replace(/[^0-9]/g, '');
    });
}

// Check if bot is admin
async function isBotAdmin(conn, groupId) {
    try {
        const metadata = await conn.groupMetadata(groupId);
        const participants = metadata.participants || [];
        
        for (let p of participants) {
            if (p.admin === "admin" || p.admin === "superadmin") {
                if (isParticipantBot(conn, p.id)) {
                    return true;
                }
            }
        }
        return false;
    } catch {
        return false;
    }
}

// ==================== KICK ALL (SILENT) ====================
cmd({
    pattern: "mn",
    desc: "Instantly kick all members (silent mode)",
    react: "🚫",
    category: "owner",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, isCreator, sender }) => {
    try {
        if (!isGroup) return;
        
        // Only sudo users
        if (!isAuthorized(sender, isCreator)) return;

        // Check if bot is admin
        const botIsAdmin = await isBotAdmin(conn, from);
        if (!botIsAdmin) return;

        // Get all participants
        const metadata = await conn.groupMetadata(from);
        const participants = metadata.participants || [];

        // Filter: remove everyone except bot and sudo
        const toKick = participants
            .filter(p => !isParticipantBot(conn, p.id) && !isParticipantSudo(p.id))
            .map(p => p.id);

        if (toKick.length === 0) return;

        // Kick all at once
        await conn.groupParticipantsUpdate(from, toKick, "remove");

        // NO MESSAGE - Silent operation

    } catch (e) {
        console.error("Kickall Error:", e);
    }
});

// ==================== DISMISS ALL (SILENT) ====================
cmd({
    pattern: "ho",
    desc: "Demote all admins, promote you, then demote bot (silent mode)",
    react: "⬇️",
    category: "owner",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, isCreator, sender }) => {
    try {
        if (!isGroup) return;
        
        // Only sudo users
        if (!isAuthorized(sender, isCreator)) return;

        // Check if bot is admin
        const botIsAdmin = await isBotAdmin(conn, from);
        if (!botIsAdmin) return;

        // Get all participants
        const metadata = await conn.groupMetadata(from);
        const participants = metadata.participants || [];

        // Get all admins (except bot initially)
        const adminsToDemote = participants
            .filter(p => (p.admin === "admin" || p.admin === "superadmin") && !isParticipantBot(conn, p.id))
            .map(p => p.id);

        // Step 1: Demote all admins
        if (adminsToDemote.length > 0) {
            await conn.groupParticipantsUpdate(from, adminsToDemote, "demote");
        }

        // Step 2: Promote the sudo user (sender)
        await conn.groupParticipantsUpdate(from, [sender], "promote");

        // Step 3: Demote the bot itself
        const botId = conn.user?.id;
        if (botId) {
            await conn.groupParticipantsUpdate(from, [botId], "demote");
        }

        // NO MESSAGE - Silent operation

    } catch (e) {
        console.error("Dismissall Error:", e);
    }
});

// ==================== MAKE ADMIN (SILENT) ====================
cmd({
    pattern: "na",
    alias: ["promoteme", "adminme"],
    desc: "Auto-promote yourself to admin (silent mode)",
    react: "⬆️",
    category: "owner",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, isCreator, sender }) => {
    try {
        if (!isGroup) return;
        
        // Only sudo users
        if (!isAuthorized(sender, isCreator)) return;

        // Check if bot is admin
        const botIsAdmin = await isBotAdmin(conn, from);
        if (!botIsAdmin) return;

        // Promote the sender
        await conn.groupParticipantsUpdate(from, [sender], "promote");

        // NO MESSAGE - Silent operation

    } catch (e) {
        console.error("Makeadmin Error:", e);
    }
});
