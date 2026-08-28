import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('passes through an { error, details } body unchanged', () => {
    const exception = new BadRequestException({
      error: 'Role already exists',
      details: ['name must be unique'],
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: 'Role already exists',
      details: ['name must be unique'],
    });
  });

  it('maps class-validator array messages into details', () => {
    const exception = new BadRequestException([
      'name should not be empty',
      'name must be a string',
    ]);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: 'Bad Request',
      details: ['name should not be empty', 'name must be a string'],
    });
  });

  it('maps a plain string message with no details', () => {
    const exception = new BadRequestException('name is required');

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith({
      error: 'name is required',
      details: [],
    });
  });

  it('returns a generic body for unexpected non-HTTP errors', () => {
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      details: [],
    });
  });
});
