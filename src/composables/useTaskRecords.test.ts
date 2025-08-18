import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTaskRecords } from './useTaskRecords'
import { ref, type Ref } from 'vue'

describe('useTaskRecords', () => {
  describe('parseTimeInput', () => {
    let selectedDate: Ref<Date>
    let parseTimeInput: (timeInput: string) => string
    let cleanup: (() => void) | undefined

    beforeEach(() => {
      // Create fresh instances for each test
      selectedDate = ref(new Date())
      const composableResult = useTaskRecords(selectedDate)
      parseTimeInput = composableResult.parseTimeInput
      
      // Store any cleanup function if the composable returns one
      cleanup = undefined // useTaskRecords doesn't currently return cleanup, but ready for future
    })

    afterEach(() => {
      // Clean up any watchers or side effects
      if (cleanup) {
        cleanup()
      }
      // Clear refs to help with garbage collection
      selectedDate = null as any
      parseTimeInput = null as any
    })

    describe('Valid input normalization', () => {
      it.each([
        ['9:5', '09:05'],
        ['9:30', '09:30'],
        ['09:05', '09:05'],
        ['14:15', '14:15'],
        ['0:0', '00:00'],
        ['23:59', '23:59']
      ])('should normalize "%s" to "%s"', (input, expected) => {
        const result = parseTimeInput(input)
        expect(result).toBe(expected)
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
        expect(() => parseTimeInput('930')).toThrow(/^Time must be in/)
      })

      it('should throw error for too many parts', () => {
        expect(() => parseTimeInput('9:30:45')).toThrow(/^Time must be in/)
      })

      it('should throw error for non-numeric hours', () => {
        expect(() => parseTimeInput('abc:30')).toThrow(/^Time must be in/)
      })

      it('should throw error for non-numeric minutes', () => {
        expect(() => parseTimeInput('9:abc')).toThrow(/^Time must be in/)
      })

      it('should throw error for empty hours', () => {
        expect(() => parseTimeInput(':30')).toThrow(/^Time must be in/)
      })

      it('should throw error for empty minutes', () => {
        expect(() => parseTimeInput('9:')).toThrow(/^Time must be in/)
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
        expect(() => parseTimeInput('-1:30')).toThrow(/^Time must be in/)
      })

      it('should throw error for very large hours', () => {
        expect(() => parseTimeInput('100:30')).toThrow(/^Time must be in/)
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
        expect(() => parseTimeInput('12:-1')).toThrow(/^Time must be in/)
      })

      it('should throw error for very large minutes', () => {
        expect(() => parseTimeInput('12:100')).toThrow(/^Time must be in/)
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