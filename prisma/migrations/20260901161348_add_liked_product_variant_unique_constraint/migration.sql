-- CreateIndex
CREATE UNIQUE INDEX "LikedProductVariant_user_id_product_variant_id_key" ON "LikedProductVariant"("user_id", "product_variant_id");
