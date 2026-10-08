import { Product } from '../../domain/models/product';

/**
 * A product image as exposed to clients: a presigned URL for an uploaded image,
 * or the static default image (id and expiresIn null) when the product has none.
 */
export interface ProductImageUrl {
  id: string | null;
  url: string;
  expiresIn: number | null;
  isDefault: boolean;
}

export interface ProductWithImages {
  product: Product;
  images: ProductImageUrl[];
}
