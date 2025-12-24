// src/scheduler.js
const db = require("./db");
const { sendEmail } = require("./services/emailService");
const { sendDiscordMessage } = require("./services/discordService");

function startScheduler() {
  console.log("⏰ Reminder scheduler started - checking every 10 seconds");
  
  setInterval(async () => {
    const now = new Date().toISOString();

    db.all(
      "SELECT * FROM reminders WHERE remind_at <= ? AND sent = 0",
      [now],
      async (err, rows) => {
        if (err) {
          console.error("Error fetching reminders:", err.message);
          return;
        }

        for (const reminder of rows) {
          try {
            console.log(`📤 Sending reminder: "${reminder.title}" via ${reminder.notify_type}`);
            
            if (reminder.notify_type === "email") {
              await sendEmail(
                reminder.notify_target,
                reminder.title,
                reminder.message
              );
            } else if (reminder.notify_type === "discord") {
              await sendDiscordMessage(
                reminder.notify_target,
                reminder.title,
                reminder.message
              );
            }

            // Mark as sent
            db.run("UPDATE reminders SET sent = 1 WHERE id = ?", [reminder.id], (err) => {
              if (err) {
                console.error(`Failed to update reminder ${reminder.id}:`, err.message);
              } else {
                console.log(`✅ Reminder "${reminder.title}" sent successfully`);
              }
            });
          } catch (error) {
            console.error(`❌ Failed to send reminder "${reminder.title}":`, error.message);
          }
        }
      }
    );
  }, 10000); // every 10 seconds
}

module.exports = { startScheduler };
