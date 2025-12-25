const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create or open the database file
const dbPath = path.join(__dirname, "../reminders.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to database", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notify_type TEXT CHECK(notify_type IN ('email', 'discord')),
    notify_target TEXT NOT NULL,
    remind_at DATETIME NOT NULL,
    sent INTEGER DEFAULT 0,
    recurrence TEXT CHECK(recurrence IN ('none', 'daily', 'weekly', 'monthly')) DEFAULT 'none',
    recurrence_end DATETIME,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES reminders(id)
  )
`);

module.exports = db;
