import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { parseTimeString, formatDurationMinutes, getLastTaskEndTime, MINUTES_PER_DAY } from './timeUtils'

describe('timeUtils', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    // Set a fixed date/time: 2024-01-15 12:34:30 (12:34:30 PM)
    vi.setSystemTime(new Date('2024-01-15T12:34:30'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })
  describe('parseTimeString', () => {
    it('should parse valid HH:mm', () => {
      expect(parseTimeString('09:30')).toBe(570)
    })

    it('should parse valid HH:mm:ss', () => {
      expect(parseTimeString('09:30:30')).toBeCloseTo(570.5, 1)
    })

    it.each(['', '25:00', '12:60', '12:30:99', 'abc'])("should return null for invalid format: '%s'", invalidInput => {
      expect(parseTimeString(invalidInput)).toBeNull()
    })
  })

  describe('formatDurationMinutes', () => {
    it('should format minutes less than 60', () => {
      expect(formatDurationMinutes(45)).toBe('45m')
    })

    it('should format hours and minutes', () => {
      expect(formatDurationMinutes(125)).toBe('2h 5m')
    })

    it('should round fractional minutes', () => {
      expect(formatDurationMinutes(90.7)).toBe('1h 31m')
    })

    it('should clamp negative values to 0', () => {
      expect(formatDurationMinutes(-50)).toBe('0m')
    })
  })

  describe('getLastTaskEndTime', () => {
    it('should return start time for invalid date', () => {
      expect(getLastTaskEndTime('invalid-date', 100)).toBe(100)
      expect(getLastTaskEndTime('2025-13-01', 200)).toBe(200)
      expect(getLastTaskEndTime('2025-02-31', 300)).toBe(300)
    })

    it('should return 1440 for past dates', () => {
      const pastDate = '2000-01-01'
      expect(getLastTaskEndTime(pastDate, 100)).toBe(MINUTES_PER_DAY)
    })

    it('should return start time for future dates', () => {
      const futureDate = '2999-01-01'
      expect(getLastTaskEndTime(futureDate, 200)).toBe(200)
    })

    it('should return now minutes for today if start time <= now', () => {
      // With fake time set to 2024-01-15 12:34:30, "today" is 2024-01-15
      // 12:34:30 = 12*60 + 34 + 0.5 = 754.5 minutes, which rounds to 755
      const result = getLastTaskEndTime('2024-01-15', 0)
      expect(result).toBe(755) // Exact expected "now" minutes with precise rounding
    })

    it('should return start time if start time is in the future today', () => {
      // With fake time set to 2024-01-15 12:34:30 (755 minutes from midnight)
      // Start time of 800 minutes (13:20) is in the future, so should return start time
      const result = getLastTaskEndTime('2024-01-15', 800)
      expect(result).toBe(800)
    })

    it('should clamp 23:59:30 to 1439 minutes', () => {
      // Override system time to 23:59:30 to test boundary clamping
      vi.setSystemTime(new Date('2024-01-15T23:59:30'))

      // 23:59:30 should be clamped to 1439 minutes (not 1440)
      const result = getLastTaskEndTime('2024-01-15', 0)
      expect(result).toBe(1439)
    })
  })
})
