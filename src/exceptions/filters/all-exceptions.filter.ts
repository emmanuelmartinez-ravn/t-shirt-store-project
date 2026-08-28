import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status: HttpStatus = this.resolveStatus(exception);
    const body = this.buildBody(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        exception instanceof HttpException
          ? exception.getResponse()
          : exception,
      );
    }

    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildBody(exception: unknown): ErrorResponseDto {
    if (!(exception instanceof HttpException)) {
      return { error: 'Internal Server Error', details: [] };
    }

    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return { error: payload, details: [] };
    }

    const { error, message, details } = payload as {
      error?: string;
      message?: string | string[];
      details?: string[];
    };

    if (Array.isArray(details)) {
      return { error: error ?? exception.message, details };
    }

    if (Array.isArray(message)) {
      return { error: error ?? exception.message, details: message };
    }

    return { error: message ?? exception.message, details: [] };
  }
}
