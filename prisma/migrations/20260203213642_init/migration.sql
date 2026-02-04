-- CreateTable
CREATE TABLE "import" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "file_name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "account_id" INTEGER,
    "period_start" DATETIME,
    "period_end" DATETIME,
    "opening_balance" REAL,
    "closing_balance" REAL,
    "transaction_count" INTEGER NOT NULL DEFAULT 0,
    "added_count" INTEGER NOT NULL DEFAULT 0,
    "matched_count" INTEGER NOT NULL DEFAULT 0,
    "unknown_count" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "file_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'staged',
    "processed_at" DATETIME,
    "ai_status" TEXT NOT NULL DEFAULT 'idle',
    "ai_started_at" DATETIME,
    "ai_result" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "import_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "staging_transaction" (
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
    CONSTRAINT "staging_transaction_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "import" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "original_description" TEXT,
    "amount" REAL NOT NULL,
    "account_id" INTEGER,
    "category_id" INTEGER,
    "merchant_id" INTEGER,
    "person_id" INTEGER,
    "income_id" INTEGER,
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
    "import_id" INTEGER,
    "is_predicted" BOOLEAN NOT NULL DEFAULT false,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_id" INTEGER,
    "has_allocations" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transaction_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transaction_income_id_fkey" FOREIGN KEY ("income_id") REFERENCES "income" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transaction_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "import" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category_id" INTEGER,
    "person_id" INTEGER,
    "account_id" INTEGER,
    "type" TEXT,
    "website" TEXT,
    "has_alternative" BOOLEAN NOT NULL DEFAULT false,
    "alternative_name" TEXT,
    "alternative_savings" REAL,
    "is_impulse_prone" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "merchant_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "merchant_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "merchant_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "institution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "website" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "person" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "institution_id" INTEGER,
    "type" TEXT NOT NULL,
    "nickname" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "credit_limit" REAL,
    "interest_rate" REAL,
    "billing_cycle_day" INTEGER,
    "is_joint" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "account_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "account_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchant_pattern" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "merchant_id" INTEGER NOT NULL,
    "pattern" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "merchant_pattern_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "category_group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "group_id" INTEGER,
    "parent_id" INTEGER,
    "color" TEXT,
    "necessity_level" TEXT NOT NULL DEFAULT 'Discretionary',
    "monthly_budget" REAL,
    "sort_order" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "category_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "category_group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "budget_period" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER NOT NULL,
    "account_id" INTEGER,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "budgeted_amount" REAL NOT NULL,
    "actual_spent" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closed_at" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "budget_period_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "budget_period_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "location" TEXT,
    "website" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "position" (
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
    CONSTRAINT "position_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "income" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Employment',
    "position_id" INTEGER,
    "person_id" INTEGER,
    "category_id" INTEGER,
    "deposit_account_id" INTEGER,
    "pay_frequency" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "initial_gross" REAL,
    "initial_net" REAL,
    "current_gross" REAL,
    "current_net" REAL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "income_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "position" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "income_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "income_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "income_deposit_account_id_fkey" FOREIGN KEY ("deposit_account_id") REFERENCES "account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "income_pattern" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "income_id" INTEGER NOT NULL,
    "pattern" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "income_pattern_income_id_fkey" FOREIGN KEY ("income_id") REFERENCES "income" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payslip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "income_id" INTEGER NOT NULL,
    "effective_date" DATETIME NOT NULL,
    "previous_gross" REAL,
    "previous_net" REAL,
    "new_gross" REAL NOT NULL,
    "new_net" REAL NOT NULL,
    "change_reason" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payslip_income_id_fkey" FOREIGN KEY ("income_id") REFERENCES "income" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_schema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "institution_name" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "sample_data" TEXT NOT NULL,
    "extraction_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "import_file_hash_key" ON "import"("file_hash");

-- CreateIndex
CREATE INDEX "import_status_idx" ON "import"("status");

-- CreateIndex
CREATE INDEX "staging_transaction_status_idx" ON "staging_transaction"("status");

-- CreateIndex
CREATE INDEX "staging_transaction_import_batch_id_idx" ON "staging_transaction"("import_batch_id");

-- CreateIndex
CREATE INDEX "transaction_date_idx" ON "transaction"("date");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_name_key" ON "merchant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "institution_name_key" ON "institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "person_name_key" ON "person"("name");

-- CreateIndex
CREATE UNIQUE INDEX "account_name_institution_id_key" ON "account"("name", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_pattern_pattern_key" ON "merchant_pattern"("pattern");

-- CreateIndex
CREATE UNIQUE INDEX "category_group_name_key" ON "category_group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- CreateIndex
CREATE INDEX "budget_period_status_idx" ON "budget_period"("status");

-- CreateIndex
CREATE UNIQUE INDEX "budget_period_category_id_period_start_key" ON "budget_period"("category_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "employer_name_key" ON "employer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "position_title_employer_id_key" ON "position"("title", "employer_id");

-- CreateIndex
CREATE UNIQUE INDEX "income_name_key" ON "income"("name");

-- CreateIndex
CREATE UNIQUE INDEX "income_pattern_pattern_key" ON "income_pattern"("pattern");

-- CreateIndex
CREATE UNIQUE INDEX "payslip_income_id_effective_date_key" ON "payslip"("income_id", "effective_date");

-- CreateIndex
CREATE UNIQUE INDEX "document_schema_code_key" ON "document_schema"("code");

-- CreateIndex
CREATE INDEX "document_schema_document_type_idx" ON "document_schema"("document_type");

-- CreateIndex
CREATE INDEX "document_schema_institution_name_idx" ON "document_schema"("institution_name");
