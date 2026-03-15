import type { ApiError } from '@grab/types'

type MaybeAxiosError = { response?: { data?: ApiError } }

/**
 * Extracts field-level validation errors from an API error response.
 * Returns { fieldName: 'error description' } or {} if none.
 */
export function getFieldErrors(err: unknown): Record<string, string> {
  return (err as MaybeAxiosError)?.response?.data?.error?.fields ?? {}
}

/**
 * Extracts the top-level error message from an API error response.
 */
export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  return (err as MaybeAxiosError)?.response?.data?.error?.message ?? fallback
}
