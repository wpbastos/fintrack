import { getSettings, getDatabaseStats, getBudgetStatus } from "./actions";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const [settings, dbStats, budgetStatus] = await Promise.all([
    getSettings(["currency", "dateFormat"]),
    getDatabaseStats(),
    getBudgetStatus(),
  ]);

  const extractConcurrency = process.env.EXTRACT_CONCURRENCY ?? "1";

  return (
    <SettingsClient
      initialSettings={settings}
      dbStats={dbStats}
      budgetStatus={budgetStatus}
      extractConcurrency={extractConcurrency}
    />
  );
}
