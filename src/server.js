require("dotenv").config();
const express = require("express");
const path = require("path");
const reminderRoutes = require("./routes/reminder");
const { startScheduler } = require("./scheduler");

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/reminders", reminderRoutes);

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the scheduler
startScheduler();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TReminder running on http://localhost:${PORT}`);
});
