import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface PgError {
  code?: string;
  detail?: string;
}

/** Converts any thrown error into { success:false, statusCode, message, errors? }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message, errors } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(statusCode).json({ success: false, statusCode, message, ...(errors && { errors }) });
  }

  private normalize(exception: unknown): { statusCode: number; message: string; errors?: string[] } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') return { statusCode: status, message: body };
      const raw = (body as { message?: string | string[] }).message;
      if (Array.isArray(raw)) return { statusCode: status, message: 'Validation failed', errors: raw };
      return { statusCode: status, message: raw ?? exception.message };
    }

    if (exception instanceof QueryFailedError) {
      const pg = exception.driverError as PgError;
      switch (pg?.code) {
        case '23505': // unique_violation
          return { statusCode: HttpStatus.CONFLICT, message: this.describeUniqueViolation(pg.detail) };
        case '23503': // foreign_key_violation
          return { statusCode: HttpStatus.CONFLICT, message: 'Operation violates a relationship with other records' };
        case '22P02': // invalid_text_representation
          return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid value supplied' };
        default:
          return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error. Please try again later.' };
      }
    }

    const code = (exception as { code?: string })?.code;
    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === '57P01') {
      return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: 'Database is unavailable. Please try again later.' };
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }

  private describeUniqueViolation(detail?: string): string {
    const field = detail?.match(/\((\w+)\)=/)?.[1];
    return field ? `A record with this ${field} already exists` : 'Duplicate record';
  }
}
