-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_position" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "employer_id" INTEGER NOT NULL,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "position_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_position" ("created_at", "department", "employer_id", "end_date", "id", "is_active", "notes", "start_date", "title", "updated_at") SELECT "created_at", "department", "employer_id", "end_date", "id", "is_active", "notes", "start_date", "title", "updated_at" FROM "position";
DROP TABLE "position";
ALTER TABLE "new_position" RENAME TO "position";
CREATE INDEX "position_employer_id_idx" ON "position"("employer_id");
CREATE UNIQUE INDEX "position_title_employer_id_key" ON "position"("title", "employer_id");
CREATE TABLE "new_staging_transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "import_batch_id" TEXT NOT NULL,
    "raw_date" TEXT,
    "raw_description" TEXT,
    "raw_amount" REAL,
    "account_id" INTEGER,
    "posting_date" DATETIME,
    "card_number" TEXT,
    "location" TEXT,
    "foreign_currency" TEXT,
    "running_balance" REAL,
    "transaction_type" TEXT,
    "reference_number" TEXT,
    "terminal_id" TEXT,
    "target_account" TEXT,
    "source_account" TEXT,
    "category_hint" TEXT,
    "resolved_date" DATETIME,
    "merchant_id" INTEGER,
    "category_id" INTEGER,
    "income_id" INTEGER,
    "person_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "match_confidence" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "import_id" INTEGER,
    CONSTRAINT "staging_transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "staging_transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "staging_transaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "staging_transaction_income_id_fkey" FOREIGN KEY ("income_id") REFERENCES "income" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "staging_transaction_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "staging_transaction_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "import" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_staging_transaction" ("account_id", "card_number", "category_hint", "category_id", "created_at", "foreign_currency", "id", "import_batch_id", "import_id", "income_id", "location", "match_confidence", "merchant_id", "notes", "person_id", "posting_date", "raw_amount", "raw_date", "raw_description", "reference_number", "resolved_date", "running_balance", "source_account", "status", "target_account", "terminal_id", "transaction_type") SELECT "account_id", "card_number", "category_hint", "category_id", "created_at", "foreign_currency", "id", "import_batch_id", "import_id", "income_id", "location", "match_confidence", "merchant_id", "notes", "person_id", "posting_date", "raw_amount", "raw_date", "raw_description", "reference_number", "resolved_date", "running_balance", "source_account", "status", "target_account", "terminal_id", "transaction_type" FROM "staging_transaction";
DROP TABLE "staging_transaction";
ALTER TABLE "new_staging_transaction" RENAME TO "staging_transaction";
CREATE INDEX "staging_transaction_status_idx" ON "staging_transaction"("status");
CREATE INDEX "staging_transaction_import_batch_id_idx" ON "staging_transaction"("import_batch_id");
CREATE INDEX "staging_transaction_import_id_idx" ON "staging_transaction"("import_id");
CREATE INDEX "staging_transaction_merchant_id_idx" ON "staging_transaction"("merchant_id");
CREATE INDEX "staging_transaction_income_id_idx" ON "staging_transaction"("income_id");
CREATE INDEX "staging_transaction_category_id_idx" ON "staging_transaction"("category_id");
CREATE INDEX "staging_transaction_account_id_idx" ON "staging_transaction"("account_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "account_institution_id_idx" ON "account"("institution_id");

-- CreateIndex
CREATE INDEX "account_owner_id_idx" ON "account"("owner_id");

-- CreateIndex
CREATE INDEX "account_type_idx" ON "account"("type");

-- CreateIndex
CREATE INDEX "budget_period_category_id_status_idx" ON "budget_period"("category_id", "status");

-- CreateIndex
CREATE INDEX "budget_period_status_period_end_idx" ON "budget_period"("status", "period_end");

-- CreateIndex
CREATE INDEX "category_group_id_idx" ON "category"("group_id");

-- CreateIndex
CREATE INDEX "category_parent_id_idx" ON "category"("parent_id");

-- CreateIndex
CREATE INDEX "transaction_merchant_id_idx" ON "transaction"("merchant_id");

-- CreateIndex
CREATE INDEX "transaction_income_id_idx" ON "transaction"("income_id");

-- CreateIndex
CREATE INDEX "transaction_category_id_date_idx" ON "transaction"("category_id", "date");

-- CreateIndex
CREATE INDEX "transaction_account_id_idx" ON "transaction"("account_id");

-- CreateIndex
CREATE INDEX "transaction_person_id_idx" ON "transaction"("person_id");

-- CreateIndex
CREATE INDEX "transaction_import_id_idx" ON "transaction"("import_id");
