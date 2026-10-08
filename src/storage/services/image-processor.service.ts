export abstract class ImageProcessorService {
  abstract getMetadata(image: Buffer): Promise<{
    format: string | undefined;
    width: number | undefined;
    height: number | undefined;
  }>;
  abstract resizeToJpeg(image: Buffer, size: number): Promise<Buffer>;
}
