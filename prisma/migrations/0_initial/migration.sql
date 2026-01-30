Loaded Prisma config from prisma.config.ts.

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
    "ResolvedIncomeSourceID" INTEGER,
    "ResolvedPersonID" INTEGER,
    "Status" TEXT NOT NULL DEFAULT 'pending',
    "MatchConfidence" REAL,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ImportLogID" INTEGER,
    CONSTRAINT "StagingTransactions_ResolvedMerchantID_fkey" FOREIGN KEY ("ResolvedMerchantID") REFERENCES "Merchants" ("MerchantID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StagingTransactions_ResolvedCategoryID_fkey" FOREIGN KEY ("ResolvedCategoryID") REFERENCES "Categories" ("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StagingTransactions_ResolvedIncomeSourceID_fkey" FOREIGN KEY ("ResolvedIncomeSourceID") REFERENCES "IncomeSources" ("IncomeSourceID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StagingTransactions_ResolvedPersonID_fkey" FOREIGN KEY ("ResolvedPersonID") REFERENCES "Persons" ("PersonID") ON DELETE SET NULL ON UPDATE CASCADE,
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
    "PersonID" INTEGER,
    "IncomeSourceID" INTEGER,
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
    CONSTRAINT "Transactions_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "Categories" ("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transactions_MerchantID_fkey" FOREIGN KEY ("MerchantID") REFERENCES "Merchants" ("MerchantID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transactions_PersonID_fkey" FOREIGN KEY ("PersonID") REFERENCES "Persons" ("PersonID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transactions_IncomeSourceID_fkey" FOREIGN KEY ("IncomeSourceID") REFERENCES "IncomeSources" ("IncomeSourceID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transactions_ImportID_fkey" FOREIGN KEY ("ImportID") REFERENCES "ImportLog" ("ImportID") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Merchants" (
    "MerchantID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "MerchantName" TEXT NOT NULL,
    "DefaultCategoryID" INTEGER,
    "DefaultPersonID" INTEGER,
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
    "UpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "Merchants_DefaultCategoryID_fkey" FOREIGN KEY ("DefaultCategoryID") REFERENCES "Categories" ("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Institutions" (
    "InstitutionID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "InstitutionName" TEXT NOT NULL,
    "InstitutionType" TEXT NOT NULL,
    "Website" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT false,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Persons" (
    "PersonID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "Email" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Accounts" (
    "AccountID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "AccountName" TEXT NOT NULL,
    "AccountNumber" TEXT,
    "InstitutionID" INTEGER,
    "AccountType" TEXT NOT NULL,
    "AccountNickname" TEXT,
    "Currency" TEXT NOT NULL DEFAULT 'CAD',
    "CreditLimit" REAL,
    "InterestRate" REAL,
    "BillingCycleDay" INTEGER,
    "IsJoint" BOOLEAN NOT NULL DEFAULT false,
    "PrimaryHolderID" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "Accounts_InstitutionID_fkey" FOREIGN KEY ("InstitutionID") REFERENCES "Institutions" ("InstitutionID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Accounts_PrimaryHolderID_fkey" FOREIGN KEY ("PrimaryHolderID") REFERENCES "Persons" ("PersonID") ON DELETE SET NULL ON UPDATE CASCADE
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

-- CreateTable
CREATE TABLE "CategoryGroups" (
    "GroupID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "GroupName" TEXT NOT NULL,
    "GroupType" TEXT NOT NULL,
    "SortOrder" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Notes" TEXT
);

-- CreateTable
CREATE TABLE "Categories" (
    "CategoryID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "CategoryName" TEXT NOT NULL,
    "GroupID" INTEGER,
    "ParentCategoryID" INTEGER,
    "NecessityLevel" TEXT NOT NULL DEFAULT 'Discretionary',
    "MonthlyBudget" REAL,
    "SortOrder" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "Categories_GroupID_fkey" FOREIGN KEY ("GroupID") REFERENCES "CategoryGroups" ("GroupID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Categories_ParentCategoryID_fkey" FOREIGN KEY ("ParentCategoryID") REFERENCES "Categories" ("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetPeriods" (
    "PeriodID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "CategoryID" INTEGER NOT NULL,
    "AccountID" INTEGER,
    "PeriodStart" DATETIME NOT NULL,
    "PeriodEnd" DATETIME NOT NULL,
    "BudgetedAmount" REAL NOT NULL,
    "ActualSpent" REAL NOT NULL DEFAULT 0,
    "Status" TEXT NOT NULL DEFAULT 'open',
    "ClosedAt" DATETIME,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetPeriods_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "Categories" ("CategoryID") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncomeSources" (
    "IncomeSourceID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "SourceName" TEXT NOT NULL,
    "PersonID" INTEGER NOT NULL,
    "DefaultCategoryID" INTEGER,
    "DepositAccountID" INTEGER,
    "IncomeType" TEXT NOT NULL DEFAULT 'Employment',
    "PayFrequency" TEXT,
    "Position" TEXT,
    "Industry" TEXT,
    "Location" TEXT,
    "Website" TEXT,
    "StartDate" DATETIME,
    "EndDate" DATETIME,
    "CurrentGross" REAL,
    "CurrentNet" REAL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncomeSources_PersonID_fkey" FOREIGN KEY ("PersonID") REFERENCES "Persons" ("PersonID") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IncomeSources_DefaultCategoryID_fkey" FOREIGN KEY ("DefaultCategoryID") REFERENCES "Categories" ("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IncomeSources_DepositAccountID_fkey" FOREIGN KEY ("DepositAccountID") REFERENCES "Accounts" ("AccountID") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncomeSourcePatterns" (
    "PatternID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "IncomeSourceID" INTEGER NOT NULL,
    "Pattern" TEXT NOT NULL,
    "Priority" INTEGER NOT NULL DEFAULT 10,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncomeSourcePatterns_IncomeSourceID_fkey" FOREIGN KEY ("IncomeSourceID") REFERENCES "IncomeSources" ("IncomeSourceID") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncomeChanges" (
    "IncomeChangeID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "IncomeSourceID" INTEGER NOT NULL,
    "EffectiveDate" DATETIME NOT NULL,
    "PreviousGross" REAL,
    "PreviousNet" REAL,
    "NewGross" REAL NOT NULL,
    "NewNet" REAL NOT NULL,
    "ChangeReason" TEXT NOT NULL,
    "Notes" TEXT,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncomeChanges_IncomeSourceID_fkey" FOREIGN KEY ("IncomeSourceID") REFERENCES "IncomeSources" ("IncomeSourceID") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportLog_ContentHash_key" ON "ImportLog"("ContentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ImportLog_StatementFingerprint_key" ON "ImportLog"("StatementFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Merchants_MerchantName_key" ON "Merchants"("MerchantName");

-- CreateIndex
CREATE UNIQUE INDEX "Institutions_InstitutionName_key" ON "Institutions"("InstitutionName");

-- CreateIndex
CREATE UNIQUE INDEX "Persons_Name_key" ON "Persons"("Name");

-- CreateIndex
CREATE UNIQUE INDEX "Accounts_AccountName_InstitutionID_key" ON "Accounts"("AccountName", "InstitutionID");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPatterns_Pattern_key" ON "MerchantPatterns"("Pattern");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryGroups_GroupName_key" ON "CategoryGroups"("GroupName");

-- CreateIndex
CREATE UNIQUE INDEX "Categories_CategoryName_key" ON "Categories"("CategoryName");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetPeriods_CategoryID_PeriodStart_key" ON "BudgetPeriods"("CategoryID", "PeriodStart");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeSources_SourceName_key" ON "IncomeSources"("SourceName");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeSourcePatterns_Pattern_key" ON "IncomeSourcePatterns"("Pattern");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeChanges_IncomeSourceID_EffectiveDate_key" ON "IncomeChanges"("IncomeSourceID", "EffectiveDate");

