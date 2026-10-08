export class UnsupportedProductImageFormatError extends Error {
  constructor(
    readonly fileName: string,
    readonly format: string | undefined,
  ) {
    super(
      `Image "${fileName}" has unsupported format "${format ?? 'unknown'}"`,
    );
    this.name = 'UnsupportedProductImageFormatError';
  }
}
