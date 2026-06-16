import type { ArgumentMetadata, PipeTransform } from '@nestjs/common'
import { BadRequestException, Injectable } from '@nestjs/common'
import type { ZodSchema } from 'zod'

/**
 * Validates (and coerces) an incoming value against a Zod schema.
 *
 * Apply it per-parameter so the parsed, typed value reaches the handler:
 *   `@Body(new ZodValidationPipe(processPaymentSchema)) dto: ProcessPaymentInput`
 *
 * The global class-validator `ValidationPipe` skips parameters whose runtime
 * metatype is a plain object (a Zod-inferred type erases to `Object`), so it
 * leaves the body untouched and this pipe becomes the single source of truth.
 */
@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodSchema<TOutput>) {}

  public transform(value: unknown, _metadata: ArgumentMetadata): TOutput {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      })
    }
    return result.data
  }
}
