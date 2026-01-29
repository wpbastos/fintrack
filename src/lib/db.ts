import { PrismaClient } from "@/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  // Use DATABASE_URL from env, or default to dev.db in project root
  const envUrl = process.env.DATABASE_URL;
  if (envUrl) return envUrl;

  // Default: resolve to project root
  const dbPath = path.resolve(process.cwd(), "dev.db");
  return `file:${dbPath}`;
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: getDatabaseUrl(),
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
