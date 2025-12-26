import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import reminderRoutes from "./routes/reminder.js";
import { startScheduler, checkReminders } from "./scheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/reminders", reminderRoutes);

// Cron endpoint - called by external cron service to check and send reminders
app.get("/api/cron/check-reminders", async (req, res) => {
  // Optional: Add a secret key for security
  const cronSecret = req.headers["x-cron-secret"] || req.query.secret;
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("Cron job triggered - checking reminders...");
    const results = await checkReminders();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    });
  } catch (error) {
    console.error("Cron job failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start the scheduler (for local dev, also runs on server but less frequently)
startScheduler();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TReminder running on http://localhost:${PORT}`);
});
