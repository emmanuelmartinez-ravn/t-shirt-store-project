export class AlreadyLikedError extends Error {
  constructor(userId: string, productVariantId: string) {
    super(
      `Product variant "${productVariantId}" is already liked by user "${userId}"`,
    );
    this.name = 'AlreadyLikedError';
  }
}
