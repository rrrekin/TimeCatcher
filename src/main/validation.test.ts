// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validateCutoffDate } from './validation'

describe('validateCutoffDate', () => {
  describe('Input validation', () => {
    it('should reject non-string inputs', () => {
      const invalidInputs = [null, undefined, 123, {}, [], true]

      for (const input of invalidInputs) {
        expect(() => validateCutoffDate(input as any)).toThrow('Invalid cutoffDate: must be a non-empty string')
      }
    })

    it('should reject empty or whitespace-only strings', () => {
      const invalidStrings = ['', '   ', '\t\n  ']

      for (const input of invalidStrings) {
        expect(() => validateCutoffDate(input)).toThrow('Invalid cutoffDate: must be a non-empty string')
      }
    })

    it('should reject invalid date strings', () => {
      const invalidDates = ['not-a-date', 'invalid-date-format']

      for (const input of invalidDates) {
        expect(() => validateCutoffDate(input)).toThrow('Invalid cutoffDate: must match YYYY-MM-DD format')
      }
    })

    it('should reject future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().split('T')[0]

      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekISO = nextWeek.toISOString().split('T')[0]

      expect(() => validateCutoffDate(tomorrowISO)).toThrow('Invalid cutoffDate: cannot be in the future')

      expect(() => validateCutoffDate(nextWeekISO)).toThrow('Invalid cutoffDate: cannot be in the future')
    })

    it('should reject dates that are less than 30 days before today', () => {
      const today = new Date()

      // Test yesterday (too recent)
      const yesterday = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
      const yesterdayISO = yesterday.toISOString().split('T')[0]

      // Test 29 days ago (still too recent)
      const twentyNineDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      const twentyNineDaysAgoISO = twentyNineDaysAgo.toISOString().split('T')[0]

      expect(() => validateCutoffDate(yesterdayISO)).toThrow(
        'Invalid cutoffDate: must be at least 30 days before today'
      )
      expect(() => validateCutoffDate(twentyNineDaysAgoISO)).toThrow(
        'Invalid cutoffDate: must be at least 30 days before today'
      )
    })

    it('should reject dates with unreasonable years', () => {
      const veryOldDate = '1969-01-01'
      const veryFutureDate = '2050-01-01' // Far enough in future to trigger year check

      expect(() => validateCutoffDate(veryOldDate)).toThrow(
        'Invalid cutoffDate: year must be reasonable (1970 to current year)'
      )

      expect(() => validateCutoffDate(veryFutureDate)).toThrow(
        'Invalid cutoffDate: year must be reasonable (1970 to current year)'
      )
    })
  })

  describe('Valid inputs', () => {
    it('should accept dates that are exactly 30 days before today', () => {
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0]

      const result = validateCutoffDate(thirtyDaysAgoISO)

      expect(result).toBe(thirtyDaysAgoISO)
    })

    it('should accept dates that are more than 30 days before today', () => {
      const today = new Date()

      // Test 31 days ago
      const thirtyOneDaysAgo = new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000)
      const thirtyOneDaysAgoISO = thirtyOneDaysAgo.toISOString().split('T')[0]

      // Test 60 days ago
      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgoISO = sixtyDaysAgo.toISOString().split('T')[0]

      expect(validateCutoffDate(thirtyOneDaysAgoISO)).toBe(thirtyOneDaysAgoISO)
      expect(validateCutoffDate(sixtyDaysAgoISO)).toBe(sixtyDaysAgoISO)
    })

    it('should accept old dates from the valid year range', () => {
      // Use dates that are definitely more than 30 days old
      const validOldDates = ['1970-01-01', '2000-06-15', '2020-12-25']

      for (const date of validOldDates) {
        const result = validateCutoffDate(date)
        expect(result).toBe(date)
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle leap year dates correctly', () => {
      // Test a leap year date (2020 was a leap year) - this is definitely more than 30 days old
      const leapYearDate = '2020-02-29'

      const result = validateCutoffDate(leapYearDate)

      expect(result).toBe(leapYearDate)
    })

    it('should handle different ISO date formats correctly', () => {
      // Use a date that's definitely more than 30 days old
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 60) // 60 days ago

      // Test YYYY-MM-DD format
      const dateOnly = oldDate.toISOString().split('T')[0]

      const result = validateCutoffDate(dateOnly)

      expect(result).toBe(dateOnly)
    })
  })
})
