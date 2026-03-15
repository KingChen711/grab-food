import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    fields?: Record<string, string>
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
    let fields: Record<string, string> | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exResponse = exception.getResponse()

      if (typeof exResponse === 'string') {
        message = exResponse
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const body = exResponse as Record<string, unknown>
        const rawMessage = body['message']

        if (Array.isArray(rawMessage)) {
          // class-validator produces an array of "fieldName error description" strings
          message = 'Validation failed'
          fields = this.parseValidationMessages(rawMessage as string[])
        } else {
          message = (rawMessage as string) ?? exception.message
        }
      }

      code = this.statusToCode(status)
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack)
    }

    const errorBody: ErrorResponse = {
      success: false,
      error: { code, message, ...(fields ? { fields } : {}) },
      timestamp: new Date().toISOString(),
      path: request.url,
    }

    response.status(status).json(errorBody)
  }

  private parseValidationMessages(messages: string[]): Record<string, string> {
    const result: Record<string, string> = {}
    for (const msg of messages) {
      const spaceIdx = msg.indexOf(' ')
      if (spaceIdx > 0) {
        const field = msg.slice(0, spaceIdx)
        // Keep first error per field (class-validator may emit multiple per field)
        if (!(field in result)) result[field] = msg.slice(spaceIdx + 1)
      }
    }
    return result
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
