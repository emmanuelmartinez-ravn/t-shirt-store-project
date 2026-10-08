import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { UnreadableImageError } from '../errors/unreadable-image';
import { ImageProcessorService } from './image-processor.service';

const JPEG_FLATTEN_BACKGROUND = '#ffffff';

@Injectable()
export class SharpImageProcessorService extends ImageProcessorService {
  async getMetadata(image: Buffer): Promise<{
    format: string | undefined;
    width: number | undefined;
    height: number | undefined;
  }> {
    try {
      const metadata = await sharp(image).metadata();

      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      };
    } catch {
      throw new UnreadableImageError();
    }
  }

  async resizeToJpeg(image: Buffer, size: number): Promise<Buffer> {
    return sharp(image)
      .rotate()
      .resize(size, size)
      .flatten({ background: JPEG_FLATTEN_BACKGROUND })
      .jpeg()
      .toBuffer();
  }
}
