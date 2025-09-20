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
    it('should accept valid past dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayISO = yesterday.toISOString().split('T')[0]

      const result = validateCutoffDate(yesterdayISO)

      expect(result).toBe(yesterdayISO)
    })

    it('should accept today as cutoff date', () => {
      const today = new Date().toISOString().split('T')[0]

      const result = validateCutoffDate(today)

      expect(result).toBe(today)
    })

    it('should accept dates from the valid year range', () => {
      const validDates = ['1970-01-01', '2000-06-15', '2020-12-25']

      for (const date of validDates) {
        const result = validateCutoffDate(date)
        expect(result).toBe(date)
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle leap year dates correctly', () => {
      // Test a leap year date (2020 was a leap year)
      const leapYearDate = '2020-02-29'

      const result = validateCutoffDate(leapYearDate)

      expect(result).toBe(leapYearDate)
    })

    it('should handle different ISO date formats correctly', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      // Test YYYY-MM-DD format
      const dateOnly = yesterday.toISOString().split('T')[0]

      const result = validateCutoffDate(dateOnly)

      expect(result).toBe(dateOnly)
    })
  })
})
