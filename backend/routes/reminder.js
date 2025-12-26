import express from "express";
import db from "../db.js";

const router = express.Router();

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
  const { title, message, notify_type, notify_target, remind_at, recurrence, recurrence_end } = req.body;

  // Validation
  if (!title || !message || !notify_type || !notify_target || !remind_at) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!["email", "discord"].includes(notify_type)) {
    return res.status(400).json({ error: "notify_type must be 'email' or 'discord'" });
  }

  const validRecurrence = ['none', 'daily', 'weekly', 'monthly'];
  const recurrenceValue = recurrence && validRecurrence.includes(recurrence) ? recurrence : 'none';

  db.run(
    `INSERT INTO reminders (title, message, notify_type, notify_target, remind_at, recurrence, recurrence_end)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, message, notify_type, notify_target, remind_at, recurrenceValue, recurrence_end || null],
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
  const { title, message, notify_type, notify_target, remind_at, recurrence, recurrence_end } = req.body;

  const validRecurrence = ['none', 'daily', 'weekly', 'monthly'];
  const recurrenceValue = recurrence && validRecurrence.includes(recurrence) ? recurrence : 'none';

  db.run(
    `UPDATE reminders 
     SET title = ?, message = ?, notify_type = ?, notify_target = ?, remind_at = ?, sent = 0, recurrence = ?, recurrence_end = ?
     WHERE id = ?`,
    [title, message, notify_type, notify_target, remind_at, recurrenceValue, recurrence_end || null, id],
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

export default router;
