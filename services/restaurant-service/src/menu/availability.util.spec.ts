import { isWithinTimeWindow } from './availability.util'

function dateAt(hh: number, mm: number): Date {
  const d = new Date()
  d.setHours(hh, mm, 0, 0)
  return d
}

describe('isWithinTimeWindow', () => {
  it('returns true when both bounds are null (no schedule)', () => {
    expect(isWithinTimeWindow(null, null, dateAt(3, 0))).toBe(true)
    expect(isWithinTimeWindow(null, null, dateAt(15, 0))).toBe(true)
  })

  it('returns true within breakfast window 06:00-10:30', () => {
    expect(isWithinTimeWindow('06:00', '10:30', dateAt(6, 0))).toBe(true)
    expect(isWithinTimeWindow('06:00', '10:30', dateAt(8, 30))).toBe(true)
    expect(isWithinTimeWindow('06:00', '10:30', dateAt(10, 30))).toBe(true)
  })

  it('returns false outside breakfast window', () => {
    expect(isWithinTimeWindow('06:00', '10:30', dateAt(5, 59))).toBe(false)
    expect(isWithinTimeWindow('06:00', '10:30', dateAt(10, 31))).toBe(false)
    expect(isWithinTimeWindow('06:00', '10:30', dateAt(15, 0))).toBe(false)
  })

  it('handles midnight-crossing windows (22:00 → 02:00)', () => {
    expect(isWithinTimeWindow('22:00', '02:00', dateAt(22, 0))).toBe(true)
    expect(isWithinTimeWindow('22:00', '02:00', dateAt(23, 30))).toBe(true)
    expect(isWithinTimeWindow('22:00', '02:00', dateAt(0, 30))).toBe(true)
    expect(isWithinTimeWindow('22:00', '02:00', dateAt(2, 0))).toBe(true)
    expect(isWithinTimeWindow('22:00', '02:00', dateAt(3, 0))).toBe(false)
    expect(isWithinTimeWindow('22:00', '02:00', dateAt(15, 0))).toBe(false)
  })

  it('treats only-from as "starts at X, available rest of day"', () => {
    expect(isWithinTimeWindow('11:00', null, dateAt(10, 59))).toBe(false)
    expect(isWithinTimeWindow('11:00', null, dateAt(11, 0))).toBe(true)
    expect(isWithinTimeWindow('11:00', null, dateAt(23, 59))).toBe(true)
  })

  it('treats only-to as "available from start of day until X"', () => {
    expect(isWithinTimeWindow(null, '17:00', dateAt(0, 0))).toBe(true)
    expect(isWithinTimeWindow(null, '17:00', dateAt(17, 0))).toBe(true)
    expect(isWithinTimeWindow(null, '17:00', dateAt(17, 1))).toBe(false)
  })
})
