export class ProductImageAlreadyLinkedError extends Error {
  constructor(readonly currentVariantId: string) {
    super(`Product image is already linked to variant "${currentVariantId}"`);
    this.name = 'ProductImageAlreadyLinkedError';
  }
}
