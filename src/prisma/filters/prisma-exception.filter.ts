import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';
import { ErrorResponseDto } from '../../exceptions/dto/error-response.dto';

type KnownRequestError = Prisma.PrismaClientKnownRequestError;

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: KnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(exception);
    const status: HttpStatus = httpException.getStatus();
    const body = httpException.getResponse() as ErrorResponseDto;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception.stack);
    }

    response.status(status).json(body);
  }

  private toHttpException(exception: KnownRequestError): HttpException {
    switch (exception.code) {
      case 'P2002':
        this.logger.warn(
          `Unique constraint violation on ${this.target(exception)}`,
        );
        return new ConflictException({
          error: `Unique constraint violation on ${this.target(exception)}`,
          details: [],
        });
      case 'P2025':
        this.logger.warn(`Record not found on ${this.target(exception)}`);
        return new NotFoundException({
          error: 'Record not found',
          details: [],
        });
      case 'P2003':
        this.logger.warn(`Invalid reference on ${this.target(exception)}`);
        return new BadRequestException({
          error: `Invalid reference on ${this.target(exception)}`,
          details: [],
        });
      default:
        return new InternalServerErrorException({
          error: 'Database error',
          details: [],
        });
    }
  }

  private target(exception: KnownRequestError): string {
    const target = exception.meta?.target;

    if (Array.isArray(target)) {
      return target.join(', ');
    }

    if (typeof target === 'string') {
      return target;
    }

    return 'unknown field';
  }
}
