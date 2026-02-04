export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize logger first (creates log file if LOG_FILE is set)
    await import("@/lib/logger");

    // Initialize database if it doesn't exist
    const { initDatabase } = await import("@/lib/db-init");
    await initDatabase();

    // Start cron jobs
    const { initCronJobs } = await import("@/lib/cron");
    initCronJobs();
  }
}
