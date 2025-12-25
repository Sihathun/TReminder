// src/scheduler.js
const db = require("./db");
const { sendEmail } = require("./services/emailService");
const { sendDiscordMessage } = require("./services/discordService");

function calculateNextRemindAt(currentRemindAt, recurrence) {
  const date = new Date(currentRemindAt);
  
  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return null;
  }
  
  return date.toISOString();
}

function scheduleNextRecurrence(reminder) {
  if (!reminder.recurrence || reminder.recurrence === 'none') {
    return;
  }
  
  const nextRemindAt = calculateNextRemindAt(reminder.remind_at, reminder.recurrence);
  
  if (!nextRemindAt) {
    return;
  }
  
  // Check if next occurrence is past the end date
  if (reminder.recurrence_end) {
    const endDate = new Date(reminder.recurrence_end);
    const nextDate = new Date(nextRemindAt);
    if (nextDate > endDate) {
      console.log(`🔄 Recurrence ended for "${reminder.title}" (past end date)`);
      return;
    }
  }
  
  // Create next occurrence
  db.run(
    `INSERT INTO reminders (title, message, notify_type, notify_target, remind_at, recurrence, recurrence_end, parent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.title,
      reminder.message,
      reminder.notify_type,
      reminder.notify_target,
      nextRemindAt,
      reminder.recurrence,
      reminder.recurrence_end,
      reminder.parent_id || reminder.id
    ],
    function (err) {
      if (err) {
        console.error(`Failed to create next recurrence for "${reminder.title}":`, err.message);
      } else {
        const nextDate = new Date(nextRemindAt).toLocaleString();
        console.log(`🔄 Next ${reminder.recurrence} reminder scheduled for "${reminder.title}" at ${nextDate}`);
      }
    }
  );
}

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
                
                // Schedule next recurrence if applicable
                scheduleNextRecurrence(reminder);
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
