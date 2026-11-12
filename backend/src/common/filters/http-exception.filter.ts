import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const parsed = this.parseBody(body, status);
      response.status(status).json(parsed);
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    });
  }

  private parseBody(body: string | object, status: number) {
    if (typeof body === 'string') {
      return {
        error: STATUS_CODES[status] ?? 'HTTP_ERROR',
        message: body,
      };
    }

    const record = body as { error?: string; message?: string | string[] };
    if (Array.isArray(record.message)) {
      return {
        error: 'VALIDATION_ERROR',
        message: record.message.join('. '),
      };
    }

    return {
      error: record.error ?? STATUS_CODES[status] ?? 'HTTP_ERROR',
      message: record.message ?? 'Solicitud no válida',
    };
  }
}
