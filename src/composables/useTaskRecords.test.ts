import { describe, it, expect } from 'vitest'
import { useTaskRecords } from './useTaskRecords'
import { ref } from 'vue'

describe('useTaskRecords', () => {
  describe('parseTimeInput', () => {
    // Create a minimal setup to access parseTimeInput
    const selectedDate = ref(new Date())
    const { parseTimeInput } = useTaskRecords(selectedDate)

    describe('Valid input normalization', () => {
      it('should normalize "9:5" to "09:05"', () => {
        const result = parseTimeInput('9:5')
        expect(result).toBe('09:05')
      })

      it('should normalize "9:30" to "09:30"', () => {
        const result = parseTimeInput('9:30')
        expect(result).toBe('09:30')
      })

      it('should keep "09:05" as "09:05"', () => {
        const result = parseTimeInput('09:05')
        expect(result).toBe('09:05')
      })

      it('should keep "14:15" as "14:15"', () => {
        const result = parseTimeInput('14:15')
        expect(result).toBe('14:15')
      })

      it('should handle edge case "0:0" to "00:00"', () => {
        const result = parseTimeInput('0:0')
        expect(result).toBe('00:00')
      })

      it('should handle edge case "23:59" to "23:59"', () => {
        const result = parseTimeInput('23:59')
        expect(result).toBe('23:59')
      })
    })

    describe('Empty or whitespace input', () => {
      it('should throw error for empty string', () => {
        expect(() => parseTimeInput('')).toThrow('Time cannot be empty')
      })

      it('should throw error for whitespace-only string', () => {
        expect(() => parseTimeInput('   ')).toThrow('Time cannot be empty')
      })

      it('should throw error for tab and newline whitespace', () => {
        expect(() => parseTimeInput('\t\n')).toThrow('Time cannot be empty')
      })
    })

    describe('Malformed format input', () => {
      it('should throw error for missing colon', () => {
        expect(() => parseTimeInput('930')).toThrow('Time must be in H:mm, H:m, HH:mm, or HH:m format (e.g., 9:5, 9:30, 09:05, or 14:15)')
      })

      it('should throw error for too many parts', () => {
        expect(() => parseTimeInput('9:30:45')).toThrow('Time must be in H:mm, H:m, HH:mm, or HH:m format (e.g., 9:5, 9:30, 09:05, or 14:15)')
      })

      it('should throw error for non-numeric hours', () => {
        expect(() => parseTimeInput('abc:30')).toThrow('Time must be in H:mm, H:m, HH:mm, or HH:m format (e.g., 9:5, 9:30, 09:05, or 14:15)')
      })

      it('should throw error for non-numeric minutes', () => {
        expect(() => parseTimeInput('9:abc')).toThrow('Time must be in H:mm, H:m, HH:mm, or HH:m format (e.g., 9:5, 9:30, 09:05, or 14:15)')
      })

      it('should throw error for empty hours', () => {
        expect(() => parseTimeInput(':30')).toThrow('Time must be in H:mm, H:m, HH:mm, or HH:m format (e.g., 9:5, 9:30, 09:05, or 14:15)')
      })

      it('should throw error for empty minutes', () => {
        expect(() => parseTimeInput('9:')).toThrow('Time must be in H:mm, H:m, HH:mm, or HH:m format (e.g., 9:5, 9:30, 09:05, or 14:15)')
      })
    })

    describe('Out-of-range hours', () => {
      it('should throw error for hours = 24', () => {
        expect(() => parseTimeInput('24:00')).toThrow('Hours must be between 00 and 23')
      })

      it('should throw error for hours = 25', () => {
        expect(() => parseTimeInput('25:30')).toThrow('Hours must be between 00 and 23')
      })

      it('should throw error for negative hours', () => {
        expect(() => parseTimeInput('-1:30')).toThrow('Hours must be between 00 and 23')
      })

      it('should throw error for very large hours', () => {
        expect(() => parseTimeInput('100:30')).toThrow('Hours must be between 00 and 23')
      })
    })

    describe('Out-of-range minutes', () => {
      it('should throw error for minutes = 60', () => {
        expect(() => parseTimeInput('12:60')).toThrow('Minutes must be between 00 and 59')
      })

      it('should throw error for minutes = 99', () => {
        expect(() => parseTimeInput('12:99')).toThrow('Minutes must be between 00 and 59')
      })

      it('should throw error for negative minutes', () => {
        expect(() => parseTimeInput('12:-1')).toThrow('Minutes must be between 00 and 59')
      })

      it('should throw error for very large minutes', () => {
        expect(() => parseTimeInput('12:100')).toThrow('Minutes must be between 00 and 59')
      })
    })

    describe('Whitespace handling', () => {
      it('should handle leading and trailing whitespace', () => {
        const result = parseTimeInput('  9:5  ')
        expect(result).toBe('09:05')
      })

      it('should handle tabs and other whitespace', () => {
        const result = parseTimeInput('\t14:15\n')
        expect(result).toBe('14:15')
      })
    })
  })
})