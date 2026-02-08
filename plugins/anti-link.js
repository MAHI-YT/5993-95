const { cmd } = require('../command');
const config = require("../config");
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 📁 DATABASE FILES
// ═══════════════════════════════════════════════════════════
const antiLinkDbPath = path.join(__dirname, '../database/antilink.json');
const warningsDbPath = path.join(__dirname, '../database/antilink_warnings.json');

// Ensure database directory exists
function ensureDbExists() {
    const dbDir = path.dirname(antiLinkDbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(antiLinkDbPath)) {
        fs.writeFileSync(antiLinkDbPath, JSON.stringify({}), 'utf8');
    }
    if (!fs.existsSync(warningsDbPath)) {
        fs.writeFileSync(warningsDbPath, JSON.stringify({}), 'utf8');
    }
}

// ═══════════════════════════════════════════════════════════
// ⚠️ WARNING SYSTEM (Auto-reset after 10 minutes)
// ═══════════════════════════════════════════════════════════

// Load warnings
function loadWarnings() {
    try {
        ensureDbExists();
        const data = fs.readFileSync(warningsDbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Save warnings
function saveWarnings(warnings) {
    try {
        ensureDbExists();
        fs.writeFileSync(warningsDbPath, JSON.stringify(warnings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving warnings:', error);
        return false;
    }
}

// Check if user has warning (within 10 minutes)
function hasActiveWarning(groupId, oderId) {
    const warnings = loadWarnings();
    const key = `${groupId}_${senderId}`;
    
    if (!warnings[key]) {
        return false;
    }
    
    const warningTime = warnings[key].timestamp;
    const currentTime = Date.now();
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    // Check if warning is still active (within 10 minutes)
    if (currentTime - warningTime < tenMinutes) {
        return true; // Warning is still active
    } else {
        // Warning expired, remove it
        delete warnings[key];
        saveWarnings(warnings);
        return false;
    }
}

// Add warning for user
function addWarning(groupId, senderId) {
    const warnings = loadWarnings();
    const key = `${groupId}_${senderId}`;
    
    warnings[key] = {
        timestamp: Date.now(),
        count: 1
    };
    
    saveWarnings(warnings);
    
    // Auto-remove warning after 10 minutes
    setTimeout(() => {
        removeWarning(groupId, senderId);
    }, 10 * 60 * 1000);
}

// Remove warning for user
function removeWarning(groupId, senderId) {
    const warnings = loadWarnings();
    const key = `${groupId}_${senderId}`;
    
    if (warnings[key]) {
        delete warnings[key];
        saveWarnings(warnings);
    }
}

// ═══════════════════════════════════════════════════════════
// 📁 ANTI-LINK SETTINGS
// ═══════════════════════════════════════════════════════════

// Load anti-link settings
function loadAntiLinkSettings() {
    try {
        ensureDbExists();
        const data = fs.readFileSync(antiLinkDbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Save anti-link settings
function saveAntiLinkSettings(settings) {
    try {
        ensureDbExists();
        fs.writeFileSync(antiLinkDbPath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving antilink settings:', error);
        return false;
    }
}

// Check if anti-link is enabled for group
function isAntiLinkEnabled(groupId) {
    const settings = loadAntiLinkSettings();
    return settings[groupId]?.enabled === true;
}

// Set anti-link for group
function setAntiLink(groupId, enabled) {
    const settings = loadAntiLinkSettings();
    settings[groupId] = { enabled };
    return saveAntiLinkSettings(settings);
}

// ═══════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

// Extract number from any ID format
function extractNumber(id) {
    if (!id) return '';
    let num = id;
    if (num.includes('@')) num = num.split('@')[0];
    if (num.includes(':')) num = num.split(':')[0];
    return num.replace(/[^0-9]/g, '');
}

// Check admin status
async function checkAdminStatus(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        
        const botId = conn.user?.id || '';
        const botNumber = extractNumber(botId);
        const senderNumber = extractNumber(senderId);
        
        let isBotAdmin = false;
        let isSenderAdmin = false;
        
        for (let p of participants) {
            const pNumber = extractNumber(p.id);
            const isAdmin = p.admin === "admin" || p.admin === "superadmin";
            
            if (isAdmin) {
                if (pNumber === botNumber) {
                    isBotAdmin = true;
                }
                if (pNumber === senderNumber) {
                    isSenderAdmin = true;
                }
            }
        }
        
        return { isBotAdmin, isSenderAdmin };
        
    } catch (err) {
        console.error('Error checking admin status:', err);
        return { isBotAdmin: false, isSenderAdmin: false };
    }
}

// Check if user is owner
function isOwnerUser(senderId) {
    const senderNumber = extractNumber(senderId);
    if (!config.OWNER_NUMBER) return false;
    const ownerNumber = extractNumber(config.OWNER_NUMBER);
    return senderNumber === ownerNumber;
}

// Get participant ID for removal
async function getParticipantId(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        const senderNumber = extractNumber(senderId);
        
        for (let p of participants) {
            const pNumber = extractNumber(p.id);
            if (pNumber === senderNumber) {
                return p.id;
            }
        }
        return senderId;
    } catch (err) {
        return senderId;
    }
}

// ═══════════════════════════════════════════════════════════
// 📋 ANTI-LINK COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "antilink",
    alias: ["al"],
    desc: "Enable/Disable Anti-Link for WhatsApp Group & Channel links",
    category: "group",
    react: "🔗",
    filename: __filename
},
async (conn, mek, m, { from, args, q, isGroup, sender, reply }) => {
    try {
        // Only works in groups
        if (!isGroup) {
            return reply("❌ This command only works in groups!");
        }

        const senderId = m.key?.participant || sender;
        
        // Check admin status
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);
        const isOwner = isOwnerUser(senderId);

        // Only admins and owner can configure
        if (!isSenderAdmin && !isOwner) {
            return reply("❌ Only group admins can configure Anti-Link!");
        }

        const option = q ? q.toLowerCase().trim() : '';
        const isEnabled = isAntiLinkEnabled(from);

        // ═══════════════════════════════════════════════════════════
        // 📊 SHOW MENU (No arguments)
        // ═══════════════════════════════════════════════════════════
        if (!option) {
            const statusEmoji = isEnabled ? "🟢" : "🔴";
            const statusText = isEnabled ? "ON" : "OFF";

            const menuText = `
╔══════════════════════════╗
║   🔗 *ANTI-LINK SYSTEM*  ║
╠══════════════════════════╣
║                          
║  ${statusEmoji} *Status:* ${statusText}
║                          
╠══════════════════════════╣
║     📋 *HOW IT WORKS*    ║
╠══════════════════════════╣
║                          
║  🔍 *Detects:*           
║  • WhatsApp Group Links  
║  • WhatsApp Channel Links
║                          
║  ⚠️ *1st Offense:*       
║  • Link Deleted          
║  • Warning Given         
║                          
║  ⛔ *2nd Offense:*        
║  • (Within 10 minutes)   
║  • Link Deleted          
║  • User KICKED!          
║                          
║  🔄 *Auto-Reset:*        
║  • Warnings reset after  
║  • 10 minutes            
║                          
╠══════════════════════════╣
║      ⌨️ *COMMANDS*       ║
╠══════════════════════════╣
║                          
║  *.antilink on*          
║  ➤ Enable Anti-Link      
║                          
║  *.antilink off*         
║  ➤ Disable Anti-Link     
║                          
╠══════════════════════════╣
║   *DARKZONE-MD*   ║
╚══════════════════════════╝
`.trim();

            return reply(menuText);
        }

        // ═══════════════════════════════════════════════════════════
        // 🟢 TURN ON
        // ═══════════════════════════════════════════════════════════
        if (option === 'on' || option === 'enable' || option === '1') {
            if (!isBotAdmin) {
                return reply("❌ I need to be an admin to use Anti-Link!");
            }

            setAntiLink(from, true);

            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });

            return reply(`✅ *Anti-Link Enabled!*

🔍 *Detecting:*
• WhatsApp Group Links
• WhatsApp Channel Links

⚠️ *1st Time:* Warning + Delete
⛔ *2nd Time (in 10 min):* KICK!

🔄 Warnings auto-reset after 10 minutes.`);
        }

        // ═══════════════════════════════════════════════════════════
        // 🔴 TURN OFF
        // ═══════════════════════════════════════════════════════════
        if (option === 'off' || option === 'disable' || option === '0') {
            setAntiLink(from, false);

            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });

            return reply(`🔴 *Anti-Link Disabled!*

✅ Members can now share WhatsApp links freely.`);
        }

        // Unknown option
        return reply(`❌ Unknown option: *${option}*

💡 Use:
• *.antilink on* - Enable
• *.antilink off* - Disable`);

    } catch (e) {
        console.error("Error in antilink command:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═══════════════════════════════════════════════════════════
// 🔍 ANTI-LINK DETECTOR (Runs on every message)
// ═══════════════════════════════════════════════════════════

cmd({
    on: "body"
}, async (conn, m, store, {
    from,
    body,
    sender,
    isGroup
}) => {
    try {
        // Only run in groups
        if (!isGroup) return;
        if (!body) return;

        // Check if anti-link is enabled
        if (!isAntiLinkEnabled(from)) return;

        const senderId = m.key?.participant || sender;
        if (!senderId) return;

        // Check admin status
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);
        const isOwner = isOwnerUser(senderId);

        // Skip if sender is admin or owner
        if (isSenderAdmin || isOwner) return;

        // Skip if bot is not admin
        if (!isBotAdmin) return;

        // ═══════════════════════════════════════════════════════════
        // 🔗 DETECT ONLY WHATSAPP GROUP & CHANNEL LINKS
        // ═══════════════════════════════════════════════════════════
        
        const waLinkRegex = /(https?:\/\/)?(www\.)?(chat\.whatsapp\.com|whatsapp\.com\/channel)\/[A-Za-z0-9]+/gi;

        const hasWaLink = waLinkRegex.test(body);

        // If no WhatsApp link found, return
        if (!hasWaLink) return;

        // Get display number
        const displayNumber = extractNumber(senderId);

        // ═══════════════════════════════════════════════════════════
        // 🗑️ DELETE THE MESSAGE
        // ═══════════════════════════════════════════════════════════
        try {
            await conn.sendMessage(from, { delete: m.key });
        } catch (delError) {
            console.error("Failed to delete message:", delError);
        }

        // ═══════════════════════════════════════════════════════════
        // ⚠️ CHECK WARNING STATUS
        // ═══════════════════════════════════════════════════════════
        
        if (hasActiveWarning(from, senderId)) {
            // ═══════════════════════════════════════════════════════
            // ⛔ 2ND OFFENSE - KICK USER
            // ═══════════════════════════════════════════════════════
            
            // Remove warning
            removeWarning(from, senderId);
            
            // Send kick message
            await conn.sendMessage(from, {
                text: `⛔ *USER KICKED!*

@${displayNumber} sent a WhatsApp link *AGAIN* within 10 minutes!

🚫 *Reason:* Repeated WhatsApp link sharing
👋 User has been removed from the group.`,
                mentions: [senderId]
            });

            // Kick the user
            const participantId = await getParticipantId(conn, from, senderId);
            
            try {
                await conn.groupParticipantsUpdate(from, [participantId], "remove");
                console.log(`👢 User kicked for 2nd WhatsApp link offense: ${senderId}`);
            } catch (kickError) {
                console.error("Failed to kick user:", kickError);
                await conn.sendMessage(from, {
                    text: `❌ Failed to remove user. Please remove manually.`
                });
            }
            
        } else {
            // ═══════════════════════════════════════════════════════
            // ⚠️ 1ST OFFENSE - WARNING
            // ═══════════════════════════════════════════════════════
            
            // Add warning
            addWarning(from, senderId);
            
            // Send warning message
            await conn.sendMessage(from, {
                text: `⚠️ *WARNING!*

@${displayNumber}, WhatsApp group/channel links are *NOT ALLOWED* here!

🗑️ Your message has been deleted.

⏰ *You have 10 minutes!*
If you send another WhatsApp link within 10 minutes, you will be *KICKED* from this group!

🔄 Warning resets after 10 minutes.`,
                mentions: [senderId]
            });
            
            console.log(`⚠️ Warning given to: ${senderId}`);
        }

    } catch (error) {
        console.error("Anti-link detector error:", error);
    }
});
