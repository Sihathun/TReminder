import db from "./db.js";
import { sendEmail } from "./services/emailService.js";
import { sendDiscordMessage } from "./services/discordService.js";

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
  return new Promise((resolve, reject) => {
    if (!reminder.recurrence || reminder.recurrence === 'none') {
      return resolve();
    }
    
    const nextRemindAt = calculateNextRemindAt(reminder.remind_at, reminder.recurrence);
    
    if (!nextRemindAt) {
      return resolve();
    }
    
    // Check if next occurrence is past the end date
    if (reminder.recurrence_end) {
      const endDate = new Date(reminder.recurrence_end);
      const nextDate = new Date(nextRemindAt);
      if (nextDate > endDate) {
        console.log(`Recurrence ended for "${reminder.title}" (past end date)`);
        return resolve();
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
          reject(err);
        } else {
          const nextDate = new Date(nextRemindAt).toLocaleString();
          console.log(`Next ${reminder.recurrence} reminder scheduled for "${reminder.title}" at ${nextDate}`);
          resolve();
        }
      }
    );
  });
}

// Main function to check and send due reminders
async function checkReminders() {
  const now = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM reminders WHERE remind_at <= ? AND sent = 0",
      [now],
      async (err, rows) => {
        if (err) {
          console.error("Error fetching reminders:", err.message);
          return reject(err);
        }

        const results = {
          checked: rows.length,
          sent: 0,
          failed: 0,
          errors: []
        };

        for (const reminder of rows) {
          try {
            console.log(`Sending reminder: "${reminder.title}" via ${reminder.notify_type}`);
            
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
            await new Promise((res, rej) => {
              db.run("UPDATE reminders SET sent = 1 WHERE id = ?", [reminder.id], async (err) => {
                if (err) {
                  console.error(`Failed to update reminder ${reminder.id}:`, err.message);
                  rej(err);
                } else {
                  console.log(`Reminder "${reminder.title}" sent successfully`);
                  // Schedule next recurrence if applicable
                  await scheduleNextRecurrence(reminder);
                  res();
                }
              });
            });
            
            results.sent++;
          } catch (error) {
            console.error(`Failed to send reminder "${reminder.title}":`, error.message);
            results.failed++;
            results.errors.push({ id: reminder.id, title: reminder.title, error: error.message });
          }
        }

        resolve(results);
      }
    );
  });
}

// Optional: Keep the interval-based scheduler for local development
function startScheduler() {
  console.log("Reminder scheduler started - checking every 60 seconds");
  
  // Check immediately on startup
  checkReminders().catch(console.error);
  
  // Then check every 60 seconds
  setInterval(() => {
    checkReminders().catch(console.error);
  }, 60000);
}

export { startScheduler, checkReminders };
