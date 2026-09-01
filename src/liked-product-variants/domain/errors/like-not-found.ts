export class LikeNotFoundError extends Error {
  constructor(userId: string, productVariantId: string) {
    super(
      `No like found for product variant "${productVariantId}" by user "${userId}"`,
    );
    this.name = 'LikeNotFoundError';
  }
}
