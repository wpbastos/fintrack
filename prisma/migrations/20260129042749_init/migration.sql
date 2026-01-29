-- CreateTable
CREATE TABLE "ImportLog" (
    "ImportID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "FileName" TEXT NOT NULL,
    "FilePath" TEXT,
    "SourceType" TEXT NOT NULL,
    "AccountID" INTEGER,
    "PeriodStart" DATETIME,
    "PeriodEnd" DATETIME,
    "OpeningBalance" REAL,
    "ClosingBalance" REAL,
    "TransactionCount" INTEGER NOT NULL DEFAULT 0,
    "AddedCount" INTEGER NOT NULL DEFAULT 0,
    "MatchedCount" INTEGER NOT NULL DEFAULT 0,
    "SkippedCount" INTEGER NOT NULL DEFAULT 0,
    "UnknownCount" INTEGER NOT NULL DEFAULT 0,
    "ContentHash" TEXT,
    "StatementFingerprint" TEXT,
    "Status" TEXT NOT NULL DEFAULT 'Pending',
    "ProcessedAt" DATETIME,
    "ArchivedPath" TEXT,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StagingTransactions" (
    "StagingID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ImportBatchID" TEXT NOT NULL,
    "RawDate" TEXT,
    "RawDescription" TEXT,
    "RawAmount" REAL,
    "AccountID" INTEGER,
    "SourceFile" TEXT,
    "ResolvedDate" DATETIME,
    "ResolvedMerchantID" INTEGER,
    "ResolvedCategoryID" INTEGER,
    "ResolvedEmployerID" INTEGER,
    "ResolvedCardholderID" INTEGER,
    "Status" TEXT NOT NULL DEFAULT 'pending',
    "MatchConfidence" REAL,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ImportLogID" INTEGER,
    CONSTRAINT "StagingTransactions_ResolvedMerchantID_fkey" FOREIGN KEY ("ResolvedMerchantID") REFERENCES "Merchants" ("MerchantID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StagingTransactions_ImportLogID_fkey" FOREIGN KEY ("ImportLogID") REFERENCES "ImportLog" ("ImportID") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transactions" (
    "TransactionID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Date" DATETIME NOT NULL,
    "Description" TEXT NOT NULL,
    "OriginalDescription" TEXT,
    "Amount" REAL NOT NULL,
    "AccountID" INTEGER,
    "CategoryID" INTEGER,
    "MerchantID" INTEGER,
    "CardholderID" INTEGER,
    "EmployerID" INTEGER,
    "ImportID" INTEGER,
    "Reconciled" BOOLEAN NOT NULL DEFAULT false,
    "IsDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "IsPredicted" BOOLEAN NOT NULL DEFAULT false,
    "IsRecurring" BOOLEAN NOT NULL DEFAULT false,
    "RecurringID" INTEGER,
    "HasAllocations" BOOLEAN NOT NULL DEFAULT false,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transactions_MerchantID_fkey" FOREIGN KEY ("MerchantID") REFERENCES "Merchants" ("MerchantID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transactions_ImportID_fkey" FOREIGN KEY ("ImportID") REFERENCES "ImportLog" ("ImportID") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Merchants" (
    "MerchantID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "MerchantName" TEXT NOT NULL,
    "DefaultCategoryID" INTEGER,
    "DefaultCardholderID" INTEGER,
    "DefaultAccountID" INTEGER,
    "MerchantType" TEXT,
    "Website" TEXT,
    "HasAlternative" BOOLEAN NOT NULL DEFAULT false,
    "AlternativeName" TEXT,
    "AlternativeSavings" REAL,
    "IsImpulseProne" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MerchantPatterns" (
    "PatternID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "MerchantID" INTEGER NOT NULL,
    "Pattern" TEXT NOT NULL,
    "Priority" INTEGER NOT NULL DEFAULT 0,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MerchantPatterns_MerchantID_fkey" FOREIGN KEY ("MerchantID") REFERENCES "Merchants" ("MerchantID") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportLog_ContentHash_key" ON "ImportLog"("ContentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ImportLog_StatementFingerprint_key" ON "ImportLog"("StatementFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Merchants_MerchantName_key" ON "Merchants"("MerchantName");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPatterns_Pattern_key" ON "MerchantPatterns"("Pattern");

-- Enable Foreign Keys
PRAGMA foreign_keys = ON;

-- Performance indexes for merchant resolution
CREATE INDEX "idx_merchant_patterns_merchant" ON "MerchantPatterns"("MerchantID");
CREATE INDEX "idx_merchant_patterns_priority" ON "MerchantPatterns"("Priority" DESC);
CREATE INDEX "idx_staging_merchant" ON "StagingTransactions"("ResolvedMerchantID");
CREATE INDEX "idx_staging_raw_description" ON "StagingTransactions"("RawDescription");

-- CreateView: TransactionsWithPeriod
-- Adds computed Year and Month columns for filtering/grouping
CREATE VIEW TransactionsWithPeriod AS
SELECT
    *,
    CAST(strftime('%Y', Date) AS INTEGER) AS Year,
    strftime('%m', Date) AS Month
FROM Transactions;
