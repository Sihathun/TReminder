const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all reminders
router.get("/", (req, res) => {
  db.all(
    "SELECT * FROM reminders ORDER BY remind_at ASC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Get a single reminder by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM reminders WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Reminder not found" });
    }
    res.json(row);
  });
});

// Create a new reminder
router.post("/", (req, res) => {
  const { title, message, notify_type, notify_target, remind_at } = req.body;

  // Validation
  if (!title || !message || !notify_type || !notify_target || !remind_at) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!["email", "discord"].includes(notify_type)) {
    return res.status(400).json({ error: "notify_type must be 'email' or 'discord'" });
  }

  db.run(
    `INSERT INTO reminders (title, message, notify_type, notify_target, remind_at)
     VALUES (?, ?, ?, ?, ?)`,
    [title, message, notify_type, notify_target, remind_at],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

// Update a reminder
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { title, message, notify_type, notify_target, remind_at } = req.body;

  db.run(
    `UPDATE reminders 
     SET title = ?, message = ?, notify_type = ?, notify_target = ?, remind_at = ?, sent = 0
     WHERE id = ?`,
    [title, message, notify_type, notify_target, remind_at, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Reminder not found" });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Delete a reminder
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM reminders WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }
    res.json({ success: true, deleted: id });
  });
});

module.exports = router;
