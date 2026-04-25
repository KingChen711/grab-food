/**
 * Check whether a menu item is currently within its time-of-day availability window.
 *
 * - If both bounds are null → always available (no schedule).
 * - If only one bound is set → treated as if the other is the day boundary
 *   (00:00 for `from`, 23:59 for `to`).
 * - If `to < from` (e.g. 22:00 → 02:00) → window crosses midnight.
 *
 * Times are interpreted in the server's local timezone. For multi-region deployments,
 * the caller should pass a Date already converted to restaurant-local time.
 */
export function isWithinTimeWindow(
  availableFrom: string | null,
  availableTo: string | null,
  now: Date = new Date(),
): boolean {
  if (!availableFrom && !availableTo) return true

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const fromMinutes = availableFrom ? toMinutes(availableFrom) : 0
  const toMinutes_ = availableTo ? toMinutes(availableTo) : 23 * 60 + 59

  if (fromMinutes <= toMinutes_) {
    // Same-day window
    return nowMinutes >= fromMinutes && nowMinutes <= toMinutes_
  }
  // Window crosses midnight (e.g. 22:00 → 02:00)
  return nowMinutes >= fromMinutes || nowMinutes <= toMinutes_
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
