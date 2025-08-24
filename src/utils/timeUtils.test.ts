import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getLastTaskEndTime, MINUTES_PER_DAY } from './timeUtils'

describe('getLastTaskEndTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Helper to mock Date to a specific date/time
   */
  function mockDateToTime(dateTime: string) {
    const mockDate = new Date(dateTime)
    vi.setSystemTime(mockDate)
  }

  describe('Future dates', () => {
    it('should return taskStartTime for future dates (duration = 0)', () => {
      // Mock current time to Dec 15, 2024, 10:00 AM
      mockDateToTime('2024-12-15T10:00:00')

      // Test with future date
      const futureDate = '2024-12-16' // tomorrow
      const taskStartTime = 540 // 9:00 AM

      const result = getLastTaskEndTime(futureDate, taskStartTime)

      expect(result).toBe(taskStartTime)
    })
  })

  describe('Past dates', () => {
    it('should return MINUTES_PER_DAY (1440) for past dates', () => {
      // Mock current time to Dec 15, 2024, 10:00 AM
      mockDateToTime('2024-12-15T10:00:00')

      // Test with past date
      const pastDate = '2024-12-14' // yesterday
      const taskStartTime = 480 // 8:00 AM

      const result = getLastTaskEndTime(pastDate, taskStartTime)

      expect(result).toBe(MINUTES_PER_DAY) // 1440 minutes = midnight
    })
  })

  describe('Today with various start times', () => {
    it('should return current time for today with past start time', () => {
      // Mock current time to Dec 15, 2024, 14:30:30 (2:30:30 PM)
      mockDateToTime('2024-12-15T14:30:30')

      const todayDate = '2024-12-15'
      const pastStartTime = 480 // 8:00 AM (past)

      const result = getLastTaskEndTime(todayDate, pastStartTime)

      // Expected: 14*60 + 30 + 30/60 = 840 + 30 + 0.5 = 870.5, rounded = 871
      const expectedNowMinutes = Math.round(14 * 60 + 30 + 30 / 60)
      expect(result).toBe(expectedNowMinutes)
    })

    it('should return taskStartTime for today with future start time', () => {
      // Mock current time to Dec 15, 2024, 10:00:00 (10:00 AM)
      mockDateToTime('2024-12-15T10:00:00')

      const todayDate = '2024-12-15'
      const futureStartTime = 720 // 12:00 PM (future)

      const result = getLastTaskEndTime(todayDate, futureStartTime)

      expect(result).toBe(futureStartTime)
    })
  })

  describe('DST transitions', () => {
    it('should handle DST spring forward transition correctly', () => {
      // Mock current time to after DST spring forward: March 15, 2024, 10:00 AM
      mockDateToTime('2024-03-15T10:00:00')

      // Test with DST spring forward date (March 10, 2024 - second Sunday in March)
      const dstSpringDate = '2024-03-10'
      const taskStartTime = 120 // 2:00 AM (during DST transition)

      const result = getLastTaskEndTime(dstSpringDate, taskStartTime)

      // Should be past date, so return 1440
      expect(result).toBe(MINUTES_PER_DAY)
    })

    it('should handle DST fall back transition correctly', () => {
      // Mock current time to after DST fall back: November 10, 2024, 10:00 AM
      mockDateToTime('2024-11-10T10:00:00')

      // Test with DST fall back date (November 3, 2024 - first Sunday in November)
      const dstFallDate = '2024-11-03'
      const taskStartTime = 120 // 2:00 AM (during DST transition)

      const result = getLastTaskEndTime(dstFallDate, taskStartTime)

      // Should be past date, so return 1440
      expect(result).toBe(MINUTES_PER_DAY)
    })

    it('should handle DST transition on current day correctly', () => {
      // Mock current time to DST spring forward day: March 10, 2024, 10:00 AM
      // Note: During spring forward, 2:00 AM jumps to 3:00 AM
      mockDateToTime('2024-03-10T10:00:00')

      const todayDate = '2024-03-10' // DST transition day
      const taskStartTime = 480 // 8:00 AM (past start time)

      const result = getLastTaskEndTime(todayDate, taskStartTime)

      // Should return current time since it's today with past start
      const expectedNowMinutes = Math.round(10 * 60 + 0 + 0 / 60) // 600 minutes
      expect(result).toBe(expectedNowMinutes)
    })
  })

  describe('Edge cases', () => {
    it('should handle midnight start time correctly', () => {
      // Mock current time to Dec 15, 2024, 10:00 AM
      mockDateToTime('2024-12-15T10:00:00')

      const pastDate = '2024-12-14' // yesterday
      const midnightStartTime = 0 // 00:00 (midnight)

      const result = getLastTaskEndTime(pastDate, midnightStartTime)

      expect(result).toBe(MINUTES_PER_DAY)
    })

    it('should handle near-midnight start time correctly', () => {
      // Mock current time to Dec 15, 2024, 10:00 AM
      mockDateToTime('2024-12-15T10:00:00')

      const pastDate = '2024-12-14' // yesterday
      const nearMidnightStartTime = 1439 // 23:59

      const result = getLastTaskEndTime(pastDate, nearMidnightStartTime)

      expect(result).toBe(MINUTES_PER_DAY)
    })

    it('should handle invalid date strings gracefully', () => {
      // Mock current time to Dec 15, 2024, 10:00 AM
      mockDateToTime('2024-12-15T10:00:00')

      const invalidDate = '2024-13-40' // invalid month and day
      const taskStartTime = 540 // 9:00 AM

      const result = getLastTaskEndTime(invalidDate, taskStartTime)

      // Should return taskStartTime as fallback for invalid dates
      expect(result).toBe(taskStartTime)
    })

    it('should handle empty date string gracefully', () => {
      // Mock current time to Dec 15, 2024, 10:00 AM
      mockDateToTime('2024-12-15T10:00:00')

      const emptyDate = ''
      const taskStartTime = 540 // 9:00 AM

      const result = getLastTaskEndTime(emptyDate, taskStartTime)

      // Should return taskStartTime as fallback for empty dates
      expect(result).toBe(taskStartTime)
    })

    it('should handle non-existent calendar dates gracefully', () => {
      // Mock current time to Dec 15, 2024, 10:00 AM
      mockDateToTime('2024-12-15T10:00:00')

      const nonExistentDate = '2024-02-31' // February 31st doesn't exist
      const taskStartTime = 540 // 9:00 AM

      const result = getLastTaskEndTime(nonExistentDate, taskStartTime)

      // Should return taskStartTime as fallback for non-existent dates
      expect(result).toBe(taskStartTime)
    })
  })

  describe('Timezone handling', () => {
    it('should work correctly across different local times', () => {
      // Test with different times of day to ensure consistency
      const testCases = [
        { hour: 0, minute: 0 }, // midnight
        { hour: 6, minute: 30 }, // early morning
        { hour: 12, minute: 0 }, // noon
        { hour: 18, minute: 45 }, // evening
        { hour: 23, minute: 59 }, // late night
      ]

      testCases.forEach(({ hour, minute }) => {
        // Mock current time to specific hour/minute on Dec 15, 2024
        const timeString = `2024-12-15T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
        mockDateToTime(timeString)

        const todayDate = '2024-12-15'
        const pastStartTime = 300 // 5:00 AM (should be past for most test cases)

        const result = getLastTaskEndTime(todayDate, pastStartTime)

        if (hour * 60 + minute > pastStartTime) {
          // Current time is after start time, should return current time
          const expectedNowMinutes = Math.round(hour * 60 + minute)
          expect(result).toBe(expectedNowMinutes)
        } else {
          // Current time is before start time, should return start time
          expect(result).toBe(pastStartTime)
        }
      })
    })
  })
})
