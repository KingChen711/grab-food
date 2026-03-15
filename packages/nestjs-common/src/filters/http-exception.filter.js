'use strict'
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc)
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r
    return (c > 3 && r && Object.defineProperty(target, key, r), r)
  }
var HttpExceptionFilter_1
Object.defineProperty(exports, '__esModule', { value: true })
exports.HttpExceptionFilter = void 0
const common_1 = require('@nestjs/common')
let HttpExceptionFilter = (HttpExceptionFilter_1 = class HttpExceptionFilter {
  logger = new common_1.Logger(HttpExceptionFilter_1.name)
  catch(exception, host) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()
    let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let code = 'INTERNAL_ERROR'
    let fields
    if (exception instanceof common_1.HttpException) {
      status = exception.getStatus()
      const exResponse = exception.getResponse()
      if (typeof exResponse === 'string') {
        message = exResponse
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const body = exResponse
        const rawMessage = body['message']
        if (Array.isArray(rawMessage)) {
          // class-validator produces an array of "fieldName error description" strings
          message = 'Validation failed'
          fields = this.parseValidationMessages(rawMessage)
        } else {
          message = rawMessage ?? exception.message
        }
      }
      code = this.statusToCode(status)
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack)
    }
    const errorBody = {
      success: false,
      error: { code, message, ...(fields ? { fields } : {}) },
      timestamp: new Date().toISOString(),
      path: request.url,
    }
    response.status(status).json(errorBody)
  }
  parseValidationMessages(messages) {
    const result = {}
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
  statusToCode(status) {
    const codes = {
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
})
exports.HttpExceptionFilter = HttpExceptionFilter
exports.HttpExceptionFilter =
  HttpExceptionFilter =
  HttpExceptionFilter_1 =
    __decorate([(0, common_1.Catch)()], HttpExceptionFilter)
//# sourceMappingURL=http-exception.filter.js.map
