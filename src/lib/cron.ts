import cron from "node-cron";

let isInitialized = false;

export function initCronJobs() {
  // Prevent multiple initializations (Next.js hot reload)
  if (isInitialized) return;
  isInitialized = true;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET;

  // Budget reset - runs daily at midnight
  // Checks for periods that need to be closed and opens new ones
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Running budget reset job...");

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (cronSecret) {
        headers["Authorization"] = `Bearer ${cronSecret}`;
      }

      const response = await fetch(`${baseUrl}/api/cron/budget-reset`, {
        method: "POST",
        headers,
      });

      const result = await response.json();
      console.log("[CRON] Budget reset result:", result);
    } catch (error) {
      console.error("[CRON] Budget reset failed:", error);
    }
  });

  console.log("[CRON] Scheduled jobs initialized");
}
