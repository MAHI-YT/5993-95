const { cmd } = require('../command');
const config = require("../config");

// Store warnings with timestamps
const warnings = new Map();

cmd({
  on: "body"
}, async (conn, m, store, {
  from,
  body,
  sender,
  isGroup,
  isAdmins,
  isBotAdmins,
  reply
}) => {
  try {
    // Only run in groups where bot is admin and sender isn't admin
    if (!isGroup || isAdmins || !isBotAdmins) return;

    // Only continue if ANTI_LINK is enabled
    if (config.ANTI_LINK !== 'true') return;

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
