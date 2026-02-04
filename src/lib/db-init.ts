/**
 * Database initialization module
 * Checks if the database exists and creates/seeds it if not
 */

import { existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";

/**
 * Parse DATABASE_URL to extract the file path
 * Supports formats: "file:/path/to/db" or "file:./relative/path"
 */
function getDatabasePath(): string {
  const envUrl = process.env.DATABASE_URL;

  if (!envUrl) {
    // Default to dev.db in project root
    return path.resolve(process.cwd(), "dev.db");
  }

  // Parse the file: URL format
  if (envUrl.startsWith("file:")) {
    const filePath = envUrl.slice(5); // Remove "file:" prefix

    // Handle absolute vs relative paths
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(process.cwd(), filePath);
  }

  // Fallback: treat as direct path
  return envUrl;
}

/**
 * Initialize the database if it doesn't exist
 * Runs migrations and seeds the database
 */
export async function initDatabase(): Promise<void> {
  const dbPath = getDatabasePath();

  if (existsSync(dbPath)) {
    console.log(`[db-init] Database exists at ${dbPath}`);
    return;
  }

  console.log(`[db-init] Database not found at ${dbPath}, initializing...`);

  try {
    // Run Prisma migrations to create the database schema
    console.log("[db-init] Running migrations...");
    const migrateOutput = execSync("npx prisma migrate deploy", {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    if (migrateOutput) console.log(migrateOutput.trim());

    // Seed the database with initial data
    console.log("[db-init] Seeding database...");
    const seedOutput = execSync("npx prisma db seed", {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    if (seedOutput) console.log(seedOutput.trim());

    console.log("[db-init] Database initialized successfully");
  } catch (error) {
    // execSync throws an error object with stdout/stderr
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    if (execError.stdout) console.log(execError.stdout);
    if (execError.stderr) console.error(execError.stderr);
    console.error("[db-init] Failed to initialize database:", execError.message);
    throw error;
  }
}
