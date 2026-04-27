const fs = require('fs');
const path = require('path');
const config = require('../config');
const { cmd } = require('../command');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sudo authorization system
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

// Function to check admin status with LID support
async function checkAdminStatus(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        
        const botId = conn.user?.id || '';
        const botLid = conn.user?.lid || '';
        
        // Extract bot information
        const botNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
        const botIdWithoutSuffix = botId.includes('@') ? botId.split('@')[0] : botId;
        const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
        const botLidWithoutSuffix = botLid.includes('@') ? botLid.split('@')[0] : botLid;
        
        // Extract sender information
        const senderNumber = senderId.includes(':') ? senderId.split(':')[0] : (senderId.includes('@') ? senderId.split('@')[0] : senderId);
        const senderIdWithoutSuffix = senderId.includes('@') ? senderId.split('@')[0] : senderId;
        
        let isBotAdmin = false;
        let isSenderAdmin = false;
        
        for (let p of participants) {
            if (p.admin === "admin" || p.admin === "superadmin") {
                // Check participant IDs
                const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
                const pId = p.id ? p.id.split('@')[0] : '';
                const pLid = p.lid ? p.lid.split('@')[0] : '';
                const pFullId = p.id || '';
                const pFullLid = p.lid || '';
                
                // Extract numeric part from participant LID
                const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : pLid;
                
                // Check if this participant is the bot
                const botMatches = (
                    botId === pFullId ||
                    botId === pFullLid ||
                    botLid === pFullLid ||
                    botLidNumeric === pLidNumeric ||
                    botLidWithoutSuffix === pLid ||
                    botNumber === pPhoneNumber ||
                    botNumber === pId ||
                    botIdWithoutSuffix === pPhoneNumber ||
                    botIdWithoutSuffix === pId ||
                    (botLid && botLid.split('@')[0].split(':')[0] === pLid)
                );
                
                if (botMatches) {
                    isBotAdmin = true;
                }
                
                // Check if this participant is the sender
                const senderMatches = (
                    senderId === pFullId ||
                    senderId === pFullLid ||
                    senderNumber === pPhoneNumber ||
                    senderNumber === pId ||
                    senderIdWithoutSuffix === pPhoneNumber ||
                    senderIdWithoutSuffix === pId ||
                    (pLid && senderIdWithoutSuffix === pLid)
                );
                
                if (senderMatches) {
                    isSenderAdmin = true;
                }
            }
        }
        
        return { isBotAdmin, isSenderAdmin, participants };
        
    } catch (err) {
        console.error('❌ Error checking admin status:', err);
        return { isBotAdmin: false, isSenderAdmin: false, participants: [] };
    }
}

// Function to check if a participant is the bot (LID compatible)
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

// Function to check if a participant is authorized owner/sudo (LID compatible)
function isParticipantAuthorized(participantId) {
    const pId = participantId.includes('@') ? participantId.split('@')[0] : participantId;
    const pNumber = pId.includes(':') ? pId.split(':')[0] : pId;
    
    const sudoOwners = loadSudo();
    return sudoOwners.some(owner => {
        const ownerNum = owner.includes('@') ? owner.split('@')[0] : owner;
        const ownerNumber = ownerNum.includes(':') ? ownerNum.split(':')[0] : ownerNum;
        return pNumber === ownerNumber || pNumber === ownerNumber.replace(/[^0-9]/g, '');
    });
}

// Function to check if a participant is admin (LID compatible)
function isParticipantAdmin(participant) {
    return participant.admin === "admin" || participant.admin === "superadmin";
}

// Function to extract display number from any ID format
function extractDisplayNumber(id) {
    if (!id) return 'Unknown';
    if (id.includes(':')) {
        return id.split(':')[0];
    }
    if (id.includes('@')) {
        return id.split('@')[0];
    }
    return id;
}

// ==================== REMOVE MEMBERS ONLY ====================
cmd({
    pattern: "removemembers",
    alias: ["kickall", "endgc", "endgroup"],
    desc: "Remove all non-admin members from the group",
    react: "🚫",
    category: "group",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, reply, isCreator, sender }) => {
    try {
        // Check if in group
        if (!isGroup) return reply("❌ This command can only be used in groups!");

        // Authorization check - ONLY bot owner or sudo users
        if (!isAuthorized(sender, isCreator)) {
            return reply("❌ This command is only for bot owners!");
        }

        // Get sender ID with LID support
        const senderId = mek.key.participant || mek.key.remoteJid || (mek.key.fromMe ? conn.user?.id : null);
        if (!senderId) return reply("❌ Could not identify sender.");

        // Check admin status
        const { isBotAdmin, participants } = await checkAdminStatus(conn, from, senderId);

        // Check if bot is admin
        if (!isBotAdmin) {
            return reply("❌ I need to be an admin to remove members!");
        }

        // Filter non-admin participants (excluding bot and authorized users)
        const nonAdminParticipants = participants.filter(member => {
            // Skip if member is admin
            if (isParticipantAdmin(member)) return false;
            // Skip if member is bot
            if (isParticipantBot(conn, member.id)) return false;
            // Skip if member is authorized (sudo)
            if (isParticipantAuthorized(member.id)) return false;
            return true;
        });

        if (nonAdminParticipants.length === 0) {
            return reply("ℹ️ There are no non-admin members to remove.");
        }

        // Show processing
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`🚫 Starting to remove ${nonAdminParticipants.length} non-admin members...\n\n⏳ This may take some time.`);

        let removedCount = 0;
        let failedCount = 0;

        for (let participant of nonAdminParticipants) {
            try {
                await conn.groupParticipantsUpdate(from, [participant.id], "remove");
                removedCount++;
                await sleep(2000); // 2-second delay between removals
            } catch (e) {
                console.error(`Failed to remove ${participant.id}:`, e);
                failedCount++;
            }
        }

        // Success reaction
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

        await reply(`✅ *Remove Members Complete!*\n\n👥 *Removed:* ${removedCount} members\n❌ *Failed:* ${failedCount} members`);

    } catch (e) {
        console.error("Remove Members Error:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply("❌ An error occurred while removing members. Please try again.");
    }
});

// ==================== REMOVE ADMINS ONLY ====================
cmd({
    pattern: "removeadmins",
    alias: ["kickadmins", "deladmins"],
    desc: "Remove all admin members from the group (except bot and owner)",
    react: "🚫",
    category: "group",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, reply, isCreator, sender }) => {
    try {
        // Check if in group
        if (!isGroup) return reply("❌ This command can only be used in groups!");

        // Authorization check - ONLY bot owner or sudo users
        if (!isAuthorized(sender, isCreator)) {
            return reply("❌ This command is only for bot owners!");
        }

        // Get sender ID with LID support
        const senderId = mek.key.participant || mek.key.remoteJid || (mek.key.fromMe ? conn.user?.id : null);
        if (!senderId) return reply("❌ Could not identify sender.");

        // Check admin status
        const { isBotAdmin, participants } = await checkAdminStatus(conn, from, senderId);

        // Check if bot is admin
        if (!isBotAdmin) {
            return reply("❌ I need to be an admin to remove admins!");
        }

        // Filter admin participants (excluding bot and authorized users)
        const adminParticipants = participants.filter(member => {
            // Only include if member is admin
            if (!isParticipantAdmin(member)) return false;
            // Skip if member is bot
            if (isParticipantBot(conn, member.id)) return false;
            // Skip if member is authorized (sudo)
            if (isParticipantAuthorized(member.id)) return false;
            return true;
        });

        if (adminParticipants.length === 0) {
            return reply("ℹ️ There are no admin members to remove (excluding bot and owner).");
        }

        // Show processing
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`🚫 Starting to remove ${adminParticipants.length} admin members...\n\n⏳ This may take some time.`);

        let removedCount = 0;
        let failedCount = 0;

        for (let participant of adminParticipants) {
            try {
                await conn.groupParticipantsUpdate(from, [participant.id], "remove");
                removedCount++;
                await sleep(2000); // 2-second delay between removals
            } catch (e) {
                console.error(`Failed to remove ${participant.id}:`, e);
                failedCount++;
            }
        }

        // Success reaction
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

        await reply(`✅ *Remove Admins Complete!*\n\n👥 *Removed:* ${removedCount} admins\n❌ *Failed:* ${failedCount} admins`);

    } catch (e) {
        console.error("Remove Admins Error:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply("❌ An error occurred while removing admins. Please try again.");
    }
});

// ==================== REMOVE ALL (MEMBERS + ADMINS) ====================
cmd({
    pattern: "removeall",
    alias: ["kickall2", "endgc2", "endgroup2", "nukegroup"],
    desc: "Remove all members and admins from the group (except bot and owner)",
    react: "💀",
    category: "group",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, reply, isCreator, sender }) => {
    try {
        // Check if in group
        if (!isGroup) return reply("❌ This command can only be used in groups!");

        // Authorization check - ONLY bot owner or sudo users
        if (!isAuthorized(sender, isCreator)) {
            return reply("❌ This command is only for bot owners!");
        }

        // Get sender ID with LID support
        const senderId = mek.key.participant || mek.key.remoteJid || (mek.key.fromMe ? conn.user?.id : null);
        if (!senderId) return reply("❌ Could not identify sender.");

        // Check admin status
        const { isBotAdmin, participants } = await checkAdminStatus(conn, from, senderId);

        // Check if bot is admin
        if (!isBotAdmin) {
            return reply("❌ I need to be an admin to remove members!");
        }

        // Filter all participants (excluding bot and authorized users)
        const participantsToRemove = participants.filter(member => {
            // Skip if member is bot
            if (isParticipantBot(conn, member.id)) return false;
            // Skip if member is authorized (sudo)
            if (isParticipantAuthorized(member.id)) return false;
            return true;
        });

        if (participantsToRemove.length === 0) {
            return reply("ℹ️ There are no members to remove (excluding bot and owner).");
        }

        // Show processing
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`💀 Starting to remove ${participantsToRemove.length} members...\n\n⚠️ *Warning:* This will remove everyone except bot and owner!\n⏳ This may take some time.`);

        let removedCount = 0;
        let failedCount = 0;

        for (let participant of participantsToRemove) {
            try {
                await conn.groupParticipantsUpdate(from, [participant.id], "remove");
                removedCount++;
                await sleep(2000); // 2-second delay between removals
            } catch (e) {
                console.error(`Failed to remove ${participant.id}:`, e);
                failedCount++;
            }
        }

        // Success reaction
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

        await reply(`✅ *Remove All Complete!*\n\n👥 *Removed:* ${removedCount} members\n❌ *Failed:* ${failedCount} members`);

    } catch (e) {
        console.error("Remove All Error:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply("❌ An error occurred while removing members. Please try again.");
    }
});
