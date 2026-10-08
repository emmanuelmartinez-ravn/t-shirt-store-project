import sharp from 'sharp';
import { UnreadableImageError } from '../errors/unreadable-image';
import { SharpImageProcessorService } from './sharp-image-processor.service';

describe('SharpImageProcessorService', () => {
  let service: SharpImageProcessorService;

  const opaqueRed = { r: 255, g: 0, b: 0, alpha: 1 };
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

  const blankImage = (
    width: number,
    height: number,
    background: sharp.Color = opaqueRed,
  ): sharp.Sharp =>
    sharp({ create: { width, height, channels: 4, background } });

  let png800: Buffer;
  let jpeg600: Buffer;
  let gif600: Buffer;
  let transparentPng800: Buffer;

  beforeAll(async () => {
    [png800, jpeg600, gif600, transparentPng800] = await Promise.all([
      blankImage(800, 800).png().toBuffer(),
      blankImage(600, 600).jpeg().toBuffer(),
      blankImage(600, 600).gif().toBuffer(),
      blankImage(800, 800, transparent).png().toBuffer(),
    ]);
  });

  beforeEach(() => {
    service = new SharpImageProcessorService();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetadata', () => {
    it('reports the format and dimensions of a png', async () => {
      await expect(service.getMetadata(png800)).resolves.toEqual({
        format: 'png',
        width: 800,
        height: 800,
      });
    });

    it('reports the format and dimensions of a jpeg', async () => {
      await expect(service.getMetadata(jpeg600)).resolves.toEqual({
        format: 'jpeg',
        width: 600,
        height: 600,
      });
    });

    it('reports non-accepted formats such as gif as-is', async () => {
      await expect(service.getMetadata(gif600)).resolves.toEqual({
        format: 'gif',
        width: 600,
        height: 600,
      });
    });

    it('translates unreadable bytes into UnreadableImageError', async () => {
      await expect(
        service.getMetadata(Buffer.from('definitely not an image')),
      ).rejects.toThrow(UnreadableImageError);
    });

    it('translates an empty buffer into UnreadableImageError', async () => {
      await expect(service.getMetadata(Buffer.alloc(0))).rejects.toThrow(
        UnreadableImageError,
      );
    });
  });

  describe('resizeToJpeg', () => {
    it('resizes a png into a jpeg of the requested square size', async () => {
      const result = await service.resizeToJpeg(png800, 512);

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(512);
      expect(metadata.height).toBe(512);
    });

    it('re-encodes a jpeg at the requested square size', async () => {
      const result = await service.resizeToJpeg(jpeg600, 512);

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(512);
      expect(metadata.height).toBe(512);
    });

    it('flattens transparent pixels onto a white background', async () => {
      const result = await service.resizeToJpeg(transparentPng800, 512);

      const { data, info } = await sharp(result)
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.channels).toBe(3);
      expect(info.width).toBe(512);
      expect(info.height).toBe(512);
      const [r, g, b] = data;
      expect([r, g, b]).toEqual([255, 255, 255]);
    });
  });
});
