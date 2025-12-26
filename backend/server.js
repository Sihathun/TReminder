import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import reminderRoutes from "./routes/reminder.js";
import { startScheduler } from "./scheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/reminders", reminderRoutes);


// Start the scheduler
startScheduler();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TReminder running on http://localhost:${PORT}`);
});
