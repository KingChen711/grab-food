import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  timestamp: string
  path: string
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let code = 'INTERNAL_ERROR'
    let details: unknown

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exResponse = exception.getResponse()

      if (typeof exResponse === 'string') {
        message = exResponse
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const body = exResponse as Record<string, unknown>
        message = (body['message'] as string) ?? exception.message
        details = Array.isArray(body['message']) ? body['message'] : undefined
        code = (body['error'] as string) ?? this.statusToCode(status)
      }

      code = this.statusToCode(status)
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack)
    }

    const errorBody: ErrorResponse = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      timestamp: new Date().toISOString(),
      path: request.url,
    }

    response.status(status).json(errorBody)
  }

  private statusToCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    }
    return codes[status] ?? 'UNKNOWN_ERROR'
  }
}
