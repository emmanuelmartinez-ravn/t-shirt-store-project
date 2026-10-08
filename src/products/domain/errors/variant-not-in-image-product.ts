export class VariantNotInImageProductError extends Error {
  constructor(variantId: string, productId: string) {
    super(`Variant "${variantId}" does not belong to product "${productId}"`);
    this.name = 'VariantNotInImageProductError';
  }
}
