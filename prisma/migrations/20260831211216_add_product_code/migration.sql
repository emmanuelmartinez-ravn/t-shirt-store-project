-- AlterTable
ALTER TABLE "Product" ADD COLUMN "code" TEXT;

-- Backfill existing rows with sequential codes
UPDATE "Product" AS p
SET "code" = 'TS-' || LPAD(sub.rn::text, 6, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM "Product"
) AS sub
WHERE p.id = sub.id;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
