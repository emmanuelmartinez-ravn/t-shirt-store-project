import { ProductImage } from '../../domain/models/product-image';

export abstract class ProductImageRepository {
  abstract countActiveImages(productId: string): Promise<number>;
  abstract createImages(images: ProductImage[]): Promise<void>;
  abstract getActiveImagesByProductIds(
    productIds: string[],
  ): Promise<ProductImage[]>;
  abstract getActiveImagesByVariantIds(
    variantIds: string[],
  ): Promise<ProductImage[]>;
  abstract getActiveImageById(id: string): Promise<ProductImage | null>;
  abstract deleteImage(image: ProductImage): Promise<ProductImage>;
  abstract updateImageVariant(image: ProductImage): Promise<ProductImage>;
}
