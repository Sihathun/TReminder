import axios from "axios";

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendDiscordMessage(webhookUrl, title, message, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
      return; // Success, exit the function
    } catch (error) {
      const status = error.response?.status;
      const retryAfter = error.response?.headers?.['retry-after'];
      
      // Handle rate limiting (429)
      if (status === 429) {
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        console.log(`Discord rate limited. Waiting ${waitTime}ms before retry ${attempt}/${retries}...`);
        
        if (attempt < retries) {
          await sleep(waitTime);
          continue;
        }
      }
      
      // If it's the last attempt or not a rate limit error, throw
      if (attempt === retries) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`Discord webhook failed: ${errorMessage} (status: ${status})`);
      }
      
      // For other errors, wait a bit before retrying
      await sleep(1000 * attempt);
    }
  }
}

export { sendDiscordMessage };