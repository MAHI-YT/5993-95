const { cmd } = require('../command');
const config = require("../config");

// Store warnings with timestamps
const warnings = new Map();

// ✅ Admin status checker with LID support
async function checkAdminStatus(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        
        const botId = conn.user?.id || '';
        const botLid = conn.user?.lid || '';
        
        // Normalize bot ID - extract numeric part
        const botNumber = botId.replace(/[:@].*/g, '');
        const botLidNumber = botLid ? botLid.replace(/[:@].*/g, '') : '';
        
        // Normalize sender ID - extract numeric part
        const senderNumber = senderId.replace(/[:@].*/g, '');
        
        let isBotAdmin = false;
        let isSenderAdmin = false;
        
        for (let p of participants) {
            const isAdmin = p.admin === "admin" || p.admin === "superadmin";
            
            if (isAdmin) {
                // Normalize participant ID
                const pNumber = p.id ? p.id.replace(/[:@].*/g, '') : '';
                const pLidNumber = p.lid ? p.lid.replace(/[:@].*/g, '') : '';
                
                // Check if this participant is the bot
                if (pNumber === botNumber || 
                    pLidNumber === botNumber || 
                    pNumber === botLidNumber || 
                    pLidNumber === botLidNumber) {
                    isBotAdmin = true;
                }
                
                // Check if this participant is the sender
                if (pNumber === senderNumber || 
                    pLidNumber === senderNumber) {
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

    // Only continue if ANTI_LINK is enabled
    if (config.ANTI_LINK !== 'true') return;

    // ✅ Check admin status with LID support
    const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, sender);

    // ✅ If sender is admin/owner, don't apply anti-link rules (they are exempt)
    if (isSenderAdmin) return;

    // ✅ If bot is not admin, can't delete messages or kick users
    if (!isBotAdmin) return;

    // 🔗 WhatsApp group & channel link regex
    const waDangerLinks = /(chat\.whatsapp\.com\/[A-Za-z0-9]+|whatsapp\.com\/channel\/[A-Za-z0-9]+)/gi;

    const hasWaDangerLink = waDangerLinks.test(body);

    if (hasWaDangerLink) {
      console.log(`🚫 WhatsApp link detected from ${sender}: ${body}`);

      // Try to delete message
      try {
        await conn.sendMessage(from, { delete: m.key });
        console.log(`✅ Message deleted (WhatsApp link)`);
      } catch (error) {
        console.error("❌ Failed to delete WhatsApp link message:", error);
      }

      // Create unique key for user in this group
      const userKey = `${from}_${sender}`;
      const currentTime = Date.now();
      const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

      // Check if user has a previous warning
      if (warnings.has(userKey)) {
        const warningData = warnings.get(userKey);
        const timeDiff = currentTime - warningData.timestamp;

        if (timeDiff <= tenMinutes) {
          // Within 10 minutes - KICK THE USER
          await conn.sendMessage(from, {
            text: `🚨 *KICKED!* 🚨\n@${sender.split('@')[0]} posted a WhatsApp link again within 10 minutes!\n\n❌ User has been removed from the group.`,
            mentions: [sender]
          });

          // Remove user
          await conn.groupParticipantsUpdate(from, [sender], "remove");
          console.log(`👢 User kicked: ${sender}`);

          // Clear warning after kick
          warnings.delete(userKey);
        } else {
          // After 10 minutes - RESET WARNING
          warnings.set(userKey, { timestamp: currentTime });
          
          await conn.sendMessage(from, {
            text: `⚠️ *WARNING!* ⚠️\n@${sender.split('@')[0]}, WhatsApp group/channel links are *not allowed!*\n\n❗ Your message has been deleted.\n⏰ If you post another link within 10 minutes, you will be kicked!`,
            mentions: [sender]
          });
          console.log(`⚠️ Warning reset for: ${sender}`);
        }
      } else {
        // First warning
        warnings.set(userKey, { timestamp: currentTime });
        
        await conn.sendMessage(from, {
          text: `⚠️ *WARNING!* ⚠️\n@${sender.split('@')[0]}, WhatsApp group/channel links are *not allowed!*\n\n❗ Your message has been deleted.\n⏰ If you post another link within 10 minutes, you will be kicked!`,
          mentions: [sender]
        });
        console.log(`⚠️ First warning given to: ${sender}`);
      }

      // Auto-cleanup: Remove warning after 10 minutes
      setTimeout(() => {
        if (warnings.has(userKey)) {
          const warningData = warnings.get(userKey);
          if (Date.now() - warningData.timestamp >= tenMinutes) {
            warnings.delete(userKey);
            console.log(`🔄 Warning auto-reset for: ${sender}`);
          }
        }
      }, tenMinutes);
    }

  } catch (error) {
    console.error("Anti-link error:", error);
    reply("❌ Error while checking link message.");
  }
});
