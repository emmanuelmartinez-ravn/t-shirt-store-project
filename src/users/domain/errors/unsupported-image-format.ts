export class UnsupportedImageFormatError extends Error {
  constructor(readonly format: string | undefined) {
    super(`Unsupported image format "${format ?? 'unknown'}"`);
    this.name = 'UnsupportedImageFormatError';
  }
}
