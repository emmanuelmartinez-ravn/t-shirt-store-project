export class UnreadableImageError extends Error {
  constructor() {
    super('Image could not be read');
    this.name = 'UnreadableImageError';
  }
}
