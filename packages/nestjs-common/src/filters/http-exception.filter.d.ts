import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
export declare class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger
  catch(exception: unknown, host: ArgumentsHost): void
  private parseValidationMessages
  private statusToCode
}
//# sourceMappingURL=http-exception.filter.d.ts.map
