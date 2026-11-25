import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE } from './response-message.decorator';

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

/** Wraps every successful response in { success, message, data }. */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const message = this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) ?? 'Success';
    return next.handle().pipe(map((data) => ({ success: true as const, message, data })));
  }
}
