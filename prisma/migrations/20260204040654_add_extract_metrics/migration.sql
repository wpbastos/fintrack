-- AlterTable
ALTER TABLE "import" ADD COLUMN "extract_cache_tokens" INTEGER;
ALTER TABLE "import" ADD COLUMN "extract_cost_usd" REAL;
ALTER TABLE "import" ADD COLUMN "extract_duration_ms" INTEGER;
ALTER TABLE "import" ADD COLUMN "extract_input_tokens" INTEGER;
ALTER TABLE "import" ADD COLUMN "extract_output_tokens" INTEGER;
ALTER TABLE "import" ADD COLUMN "extract_pdf_size_bytes" INTEGER;
