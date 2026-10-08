import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { AvatarImageInterceptor } from './avatar-image.interceptor';

describe('AvatarImageInterceptor', () => {
  let interceptor: AvatarImageInterceptor;
  let baseIntercept: jest.SpyInstance<
    Promise<Observable<unknown>>,
    [ExecutionContext, CallHandler]
  >;

  const context = {} as ExecutionContext;
  const next: CallHandler = { handle: () => of('handled') };

  beforeEach(() => {
    // FileInterceptor() generates the parent class; stubbing its intercept
    // keeps multer (and a real multipart stream) out of this unit test.
    const baseInterceptorPrototype = Object.getPrototypeOf(
      AvatarImageInterceptor.prototype,
    ) as NestInterceptor;
    baseIntercept = jest.spyOn(
      baseInterceptorPrototype,
      'intercept',
    ) as unknown as typeof baseIntercept;

    interceptor = new AvatarImageInterceptor();
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
        response: { error: 'Image must be 2 MB or smaller', details: [] },
      });
    });

    it('rethrows other upload errors unchanged', async () => {
      const unexpectedField = new BadRequestException('Unexpected field');
      baseIntercept.mockRejectedValue(unexpectedField);

      await expect(interceptor.intercept(context, next)).rejects.toBe(
        unexpectedField,
      );
    });
  });
});
