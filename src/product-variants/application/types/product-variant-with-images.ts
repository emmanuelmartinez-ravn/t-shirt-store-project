import { ProductImageUrl } from '../../../products/application/types/product-image-url';
import { ProductVariant } from '../../domain/models/product-variant';

export interface ProductVariantWithImages {
  variant: ProductVariant;
  images: ProductImageUrl[];
}
