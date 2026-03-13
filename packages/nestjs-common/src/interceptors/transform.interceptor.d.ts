import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { Observable } from 'rxjs'
export interface SuccessResponse<T> {
  success: true
  data: T
  timestamp: string
}
export declare class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>>
}
//# sourceMappingURL=transform.interceptor.d.ts.map
