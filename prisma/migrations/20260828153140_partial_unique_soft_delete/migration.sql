-- DropIndex
DROP INDEX "AccountActivationToken_jti_key";

-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "PasswordResetToken_jti_key";

-- DropIndex
DROP INDEX "Product_name_key";

-- DropIndex
DROP INDEX "ProductVariant_sku_key";

-- DropIndex
DROP INDEX "Promo_code_key";

-- DropIndex
DROP INDEX "RefreshToken_jti_key";

-- DropIndex
DROP INDEX "Role_name_key";

-- DropIndex
DROP INDEX "User_email_key";

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "AccountActivationToken_jti_key" ON "AccountActivationToken"("jti") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "PasswordResetToken_jti_key" ON "PasswordResetToken"("jti") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "Promo_code_key" ON "Promo"("code") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "RefreshToken_jti_key" ON "RefreshToken"("jti") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: unique only among non soft-deleted rows)
CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE "deleted_at" IS NULL;
