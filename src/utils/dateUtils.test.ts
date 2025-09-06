import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { toYMDLocal, isToday, formatDateString } from './dateUtils'

describe('dateUtils', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    // Set a fixed date/time: 2024-01-15 12:00:00 (midday to avoid timezone issues)
    vi.setSystemTime(new Date('2024-01-15T12:00:00'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })
  it('should format date to YYYY-MM-DD with toYMDLocal', () => {
    const date = new Date(2025, 0, 5) // Jan 5, 2025
    expect(toYMDLocal(date)).toBe('2025-01-05')
  })

  it('should check if date string is today with isToday', () => {
    // With fake timers set to 2024-01-15, this should be "today"
    expect(isToday('2024-01-15')).toBe(true)
    expect(isToday('2000-01-01')).toBe(false)
  })

  it('should format date string to readable format with default locale', () => {
    const formatted = formatDateString('2025-01-15')
    expect(formatted).toMatch(/2025/)
    // Should contain weekday and month name in some locale
    expect(formatted.split(' ').length).toBeGreaterThan(2)
  })

  it('should format date string with custom locale', () => {
    const formatted = formatDateString('2025-01-15', 'en-GB')
    expect(formatted).toMatch(/15 January 2025/)
  })

  it('should handle leap year dates correctly', () => {
    const formatted = formatDateString('2024-02-29', 'en-US')
    expect(formatted).toMatch(/February 29, 2024/)
  })

  it('should handle generic valid date strings gracefully', () => {
    const formatted = formatDateString('2025-12-01')
    expect(formatted).toContain('2025')
  })
})
