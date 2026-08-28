import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
  });

  const knownError = (code: string, meta?: Record<string, unknown>) =>
    new Prisma.PrismaClientKnownRequestError('Prisma error', {
      code,
      clientVersion: '7.9.1',
      meta,
    });

  it('maps P2002 to 409 with the violated field in the message', () => {
    filter.catch(knownError('P2002', { target: ['name'] }), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      error: 'Unique constraint violation on name',
      details: [],
    });
  });

  it('maps P2025 to 404', () => {
    filter.catch(knownError('P2025'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      error: 'Record not found',
      details: [],
    });
  });

  it('maps P2003 to 400', () => {
    filter.catch(knownError('P2003', { target: 'roleId' }), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: 'Invalid reference on roleId',
      details: [],
    });
  });

  it('maps an unrecognized code to 500', () => {
    filter.catch(knownError('P9999'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: 'Database error',
      details: [],
    });
  });
});
