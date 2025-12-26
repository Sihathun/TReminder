import axios from "axios";

async function sendDiscordMessage(webhookUrl, title, message) {
  try {
    await axios.post(webhookUrl, {
      embeds: [{
        title: `Reminder: ${title}`,
        description: message,
        color: 0x6366f1,
        timestamp: new Date().toISOString(),
        footer: {
          text: "TReminder"
        }
      }]
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    throw new Error(`Discord webhook failed: ${errorMessage}`);
  }
}

export { sendDiscordMessage };