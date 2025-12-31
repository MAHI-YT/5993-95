
const { cmd } = require('../command');
const config = require("../config");

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
        
        return { isBotAdmin, isSenderAdmin };
        
    } catch (err) {
        console.error('❌ Error checking admin status:', err);
        return { isBotAdmin: false, isSenderAdmin: false };
    }
}

// Function to check if user is owner with LID support
function isOwnerUser(senderId) {
    const senderNumber = senderId.includes(':') 
        ? senderId.split(':')[0] 
        : (senderId.includes('@') ? senderId.split('@')[0] : senderId);
    
    const ownerNumbers = [];
    
    if (config.OWNER_NUMBER) {
        const ownerNum = config.OWNER_NUMBER.includes('@') 
            ? config.OWNER_NUMBER.split('@')[0] 
            : config.OWNER_NUMBER;
        ownerNumbers.push(ownerNum.includes(':') ? ownerNum.split(':')[0] : ownerNum);
    }
    
    const validOwnerNumbers = ownerNumbers.filter(Boolean);
    
    return validOwnerNumbers.some(ownerNum => {
        return senderNumber === ownerNum || 
               senderNumber === ownerNum.replace(/[^0-9]/g, '');
    });
}

// Function to extract display number from any ID format (LID compatible)
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

// Function to get participant ID from group (for removal - LID compatible)
async function getParticipantId(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        
        const senderNumber = senderId.includes(':') 
            ? senderId.split(':')[0] 
            : (senderId.includes('@') ? senderId.split('@')[0] : senderId);
        const senderIdWithoutSuffix = senderId.includes('@') ? senderId.split('@')[0] : senderId;
        
        for (let p of participants) {
            const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
            const pId = p.id ? p.id.split('@')[0] : '';
            const pLid = p.lid ? p.lid.split('@')[0] : '';
            const pFullId = p.id || '';
            const pFullLid = p.lid || '';
            
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
                return { found: true, participantId: p.id };
            }
        }
        return { found: false, participantId: senderId };
    } catch (err) {
        console.error('❌ Error getting participant ID:', err);
        return { found: false, participantId: senderId };
    }
}

cmd({
    on: "body"
}, async (conn, m, store, {
    from,
    body,
    sender,
    isGroup,
    reply
}) => {
    try {
        // Only run in groups
        if (!isGroup) return;
        
        // Check if ANTI_LINK is enabled
        if (config.ANTI_LINK !== 'true') return;

        // Get sender ID with LID support
        const senderId = m.key?.participant || sender || m.key?.remoteJid;
        if (!senderId) return;

        // Check admin status using the LID-supported function
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);

        // Check if sender is owner
        const isOwner = isOwnerUser(senderId);

        // Skip if sender is admin or owner (they can post links)
        if (isSenderAdmin || isOwner) return;

        // Skip if bot is not admin (can't delete or kick)
        if (!isBotAdmin) return;

        // 🧠 Regex for all domain types (.com, .io, .net, etc.)
        const allLinksRegex = /\b((https?:\/\/)?(www\.)?([a-z0-9-]+\.)+[a-z]{2,})(\/\S*)?/gi;

        // 🔗 WhatsApp group & channel link regex (for kicking)
        const waDangerLinks = /(chat\.whatsapp\.com\/[A-Za-z0-9]+|whatsapp\.com\/channel\/[A-Za-z0-9]+)/gi;

        const hasAnyLink = allLinksRegex.test(body);
        const hasWaDangerLink = waDangerLinks.test(body);

        // Get display number for mentions
        const displayNumber = extractDisplayNumber(senderId);

        if (hasWaDangerLink) {
            // 🚨 WhatsApp group or channel link detected — delete + kick
            console.log(`🚫 WhatsApp link detected from ${senderId}: ${body}`);

            // Try to delete message
            try {
                await conn.sendMessage(from, { delete: m.key });
                console.log(`✅ Message deleted (WhatsApp link)`);
            } catch (error) {
                console.error("❌ Failed to delete WhatsApp link message:", error);
            }

            // Notify group
            await conn.sendMessage(from, {
                text: `🚨 *FORBIDDEN LINK DETECTED!* 🚨\n\n@${displayNumber} shared a *WhatsApp group/channel link!* 😡\n\n⚠️ User has been removed from this group.`,
                mentions: [senderId]
            });

            // Get correct participant ID for removal (LID compatible)
            const { participantId } = await getParticipantId(conn, from, senderId);

            // Kick user
            try {
                await conn.groupParticipantsUpdate(from, [participantId], "remove");
                console.log(`👢 User removed: ${senderId}`);
            } catch (kickError) {
                console.error(`❌ Failed to kick user: ${kickError}`);
            }
        }

        else if (hasAnyLink) {
            // 🌐 Other normal links (delete only)
            console.log(`🌍 Regular link detected from ${senderId}: ${body}`);

            // Try to delete
            try {
                await conn.sendMessage(from, { delete: m.key });
                console.log(`✅ Message deleted (normal link)`);
            } catch (error) {
                console.error("❌ Failed to delete message:", error);
            }

            // Warn user (no kick)
            await conn.sendMessage(from, {
                text: `⚠️ @${displayNumber}, links are *not allowed* here!\n\n🗑️ Your message has been deleted.`,
                mentions: [senderId]
            });
        }

    } catch (error) {
        console.error("Anti-link error:", error);
    }
});
