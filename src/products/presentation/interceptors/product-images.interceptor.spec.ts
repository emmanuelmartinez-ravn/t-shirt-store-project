import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { ProductImagesInterceptor } from './product-images.interceptor';

describe('ProductImagesInterceptor', () => {
  let interceptor: ProductImagesInterceptor;
  let baseIntercept: jest.SpyInstance<
    Promise<Observable<unknown>>,
    [ExecutionContext, CallHandler]
  >;

  const context = {} as ExecutionContext;
  const next: CallHandler = { handle: () => of('handled') };

  beforeEach(() => {
    // FilesInterceptor() generates the parent class; stubbing its intercept
    // keeps multer (and a real multipart stream) out of this unit test.
    const baseInterceptorPrototype = Object.getPrototypeOf(
      ProductImagesInterceptor.prototype,
    ) as NestInterceptor;
    baseIntercept = jest.spyOn(
      baseInterceptorPrototype,
      'intercept',
    ) as unknown as typeof baseIntercept;

    interceptor = new ProductImagesInterceptor();
  });

  afterEach(() => {
    baseIntercept.mockRestore();
  });

  it('is defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('returns the downstream observable when the upload is parsed successfully', async () => {
      const handled = of('handled');
      baseIntercept.mockResolvedValue(handled);

      const result = await interceptor.intercept(context, next);

      expect(baseIntercept).toHaveBeenCalledWith(context, next);
      expect(result).toBe(handled);
    });

    it('rewrites multer file-size errors into the api 413 payload', async () => {
      baseIntercept.mockRejectedValue(
        new PayloadTooLargeException('File too large'),
      );

      const promise = interceptor.intercept(context, next);

      await expect(promise).rejects.toThrow(PayloadTooLargeException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Each image must be 5 MB or smaller', details: [] },
      });
    });

    it.each(['Unexpected field - images', 'Too many files'])(
      'rewrites the multer "%s" error into the api too-many-images 400 payload',
      async (message) => {
        baseIntercept.mockRejectedValue(new BadRequestException(message));

        const promise = interceptor.intercept(context, next);

        await expect(promise).rejects.toThrow(BadRequestException);
        await expect(promise).rejects.toMatchObject({
          response: {
            error: 'A product can have at most 10 images',
            details: ['Received more than 10 files'],
          },
        });
      },
    );

    it('rethrows an unexpected-field error for another field unchanged', async () => {
      const unexpectedField = new BadRequestException('Unexpected field - foo');
      baseIntercept.mockRejectedValue(unexpectedField);

      await expect(interceptor.intercept(context, next)).rejects.toBe(
        unexpectedField,
      );
    });

    it('rethrows other upload errors unchanged', async () => {
      const failure = new Error('stream aborted');
      baseIntercept.mockRejectedValue(failure);

      await expect(interceptor.intercept(context, next)).rejects.toBe(failure);
    });
  });
});
