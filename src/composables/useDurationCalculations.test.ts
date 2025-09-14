import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDurationCalculations } from './useDurationCalculations'
import { ref, type Ref } from 'vue'
import type { TaskRecord } from '@/shared/types'

// Mock the timeUtils module
vi.mock('@/utils/timeUtils', () => ({
  parseTimeString: vi.fn((timeString: string) => {
    const trimmed = timeString.trim()
    if (!trimmed) return null

    // Simple mock: parse HH:mm format to minutes
    const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/)
    if (!match) return null

    const hours = parseInt(match[1]!, 10)
    const minutes = parseInt(match[2]!, 10)

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

    return hours * 60 + minutes
  }),
  formatDurationMinutes: vi.fn((totalMinutes: number) => {
    const rounded = Math.max(0, Math.floor(totalMinutes))
    const hours = Math.floor(rounded / 60)
    const minutes = rounded % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }),
  getLastTaskEndTime: vi.fn((taskDate: string, taskStartTime: number) => {
    // Mock implementation:
    // - Past dates: return end of day (1440 minutes)
    // - Today: return current time mock (10:30 AM = 630 minutes)
    // - Future dates: return start time (duration = 0)

    const today = '2024-01-15' // Fixed mock date

    if (taskDate < today) {
      return 1440 // midnight (end of day)
    } else if (taskDate === today) {
      const currentTimeMock = 10 * 60 + 30 // 10:30 AM
      return Math.max(taskStartTime, currentTimeMock)
    } else {
      return taskStartTime // future date, duration = 0
    }
  })
}))

describe('useDurationCalculations', () => {
  let taskRecords: Ref<TaskRecord[]>
  let composable: ReturnType<typeof useDurationCalculations>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock current date for consistency
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-01-15T10:30:00'))
    taskRecords = ref([])
    composable = useDurationCalculations(taskRecords)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('sortedTaskRecords', () => {
    it('should filter out records with empty start_time', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Task 2',
          start_time: '',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const sorted = composable.sortedTaskRecords.value
      expect(sorted).toHaveLength(1)
      expect(sorted[0]!.id).toBe(1)
    })

    it('should sort records by start_time chronologically', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '10:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Task 2',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 3,
          category_name: 'Work',
          task_name: 'Task 3',
          start_time: '11:00',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const sorted = composable.sortedTaskRecords.value
      expect(sorted).toHaveLength(3)
      expect(sorted[0]!.start_time).toBe('09:00')
      expect(sorted[1]!.start_time).toBe('10:00')
      expect(sorted[2]!.start_time).toBe('11:00')
    })

    it('should handle invalid time formats by pushing them to the end', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '10:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Task 2',
          start_time: 'invalid',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 3,
          category_name: 'Work',
          task_name: 'Task 3',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const sorted = composable.sortedTaskRecords.value
      expect(sorted).toHaveLength(3)
      expect(sorted[0]!.start_time).toBe('09:00')
      expect(sorted[1]!.start_time).toBe('10:00')
      expect(sorted[2]!.start_time).toBe('invalid') // Invalid time pushed to end
    })
  })

  describe('calculateDuration', () => {
    it('should return "-" for task types that are not duration visible', () => {
      const endTaskRecord: TaskRecord = {
        id: 1,
        category_name: 'Work',
        task_name: 'End Task',
        start_time: '17:00',
        date: '2024-01-15',
        task_type: 'end'
      }

      taskRecords.value = [endTaskRecord]

      const duration = composable.calculateDuration(endTaskRecord)
      expect(duration).toBe('-')
    })

    it('should calculate duration between consecutive tasks', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Task 2',
          start_time: '10:30',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      // Use the task from the reactive array, not a separate object
      const duration = composable.calculateDuration(taskRecords.value[0]!)
      expect(duration).toBe('1h 30m') // 90 minutes = 1h 30m
    })

    it('should return "-" for invalid time formats', () => {
      const invalidTask: TaskRecord = {
        id: 1,
        category_name: 'Work',
        task_name: 'Invalid Task',
        start_time: 'invalid',
        date: '2024-01-15',
        task_type: 'normal'
      }

      taskRecords.value = [invalidTask]

      const duration = composable.calculateDuration(invalidTask)
      expect(duration).toBe('-')
    })

    it('should handle zero duration between consecutive tasks', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Task 2',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const duration = composable.calculateDuration(taskRecords.value[0]!)
      expect(duration).toBe('0m')
    })

    it('should calculate duration for last task using getLastTaskEndTime', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Last Task',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const duration = composable.calculateDuration(taskRecords.value[0]!)
      // Mock getLastTaskEndTime returns 10:30 (630 minutes) for today
      // Task starts at 09:00 (540 minutes)
      // Duration: 630 - 540 = 90 minutes = 1h 30m
      expect(duration).toBe('1h 30m')
    })

    it('should return "-" when record is not part of sorted list (object identity mismatch)', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Task 2',
          start_time: '10:00',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      // Intentionally use a shallow copy to change object identity.
      // calculateDuration looks up records by reference (object identity) from the sorted map,
      // not by id/field equality, so a cloned object should not be found and must return '-'.
      const copyOfFirst = { ...taskRecords.value[0]! }
      const duration = composable.calculateDuration(copyOfFirst)
      expect(duration).toBe('-')
    })

    it('should return "-" when next record has invalid/unknown time', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Valid Task',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Invalid Next',
          start_time: 'invalid', // parseTimeString -> null
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const duration = composable.calculateDuration(taskRecords.value[0]!)
      expect(duration).toBe('-')
    })

    it('should return "0m" for last task when start time is after current time (today)', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Future Today',
          start_time: '11:30', // 690 > mocked now 630
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const duration = composable.calculateDuration(taskRecords.value[0]!)
      expect(duration).toBe('0m')
    })
  })

  describe('getTotalMinutesTracked', () => {
    it('should only count normal task types', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Normal Task',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Pause Task',
          start_time: '10:00',
          date: '2024-01-15',
          task_type: 'pause'
        },
        {
          id: 3,
          category_name: 'Work',
          task_name: 'End Task',
          start_time: '10:30',
          date: '2024-01-15',
          task_type: 'end'
        }
      ]

      const total = composable.getTotalMinutesTracked()
      // Only the normal task from 09:00 to 10:00 = 60 minutes
      expect(total).toBe(60)
    })

    it('should calculate total minutes for multiple normal tasks', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Task 2',
          start_time: '10:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 3,
          category_name: 'Work',
          task_name: 'Task 3',
          start_time: '11:30',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const total = composable.getTotalMinutesTracked()
      // Task 1: 09:00-10:00 = 60 minutes
      // Task 2: 10:00-11:30 = 90 minutes
      // Task 3: 11:30-10:30 (current time) = 0 minutes (negative, so 0)
      expect(total).toBe(150) // 60 + 90 + 0
    })

    it('should return 0 when no normal tasks exist', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Pause Task',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'pause'
        }
      ]

      const total = composable.getTotalMinutesTracked()
      expect(total).toBe(0)
    })
  })

  describe('getCategoryBreakdown', () => {
    it('should group tasks by category and calculate minutes', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Personal',
          task_name: 'Task 2',
          start_time: '10:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 3,
          category_name: 'Work',
          task_name: 'Task 3',
          start_time: '11:00',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const breakdown = composable.getCategoryBreakdown()

      expect(breakdown).toHaveLength(2)

      const workCategory = breakdown.find(cat => cat.categoryName === 'Work')
      const personalCategory = breakdown.find(cat => cat.categoryName === 'Personal')

      expect(workCategory).toBeDefined()
      expect(personalCategory).toBeDefined()

      // Work: 09:00-10:00 (60min) + no duration for last task at 11:00 (ends at 10:30, so 0)
      // Personal: 10:00-11:00 (60min)
      expect(workCategory!.minutes).toBe(60)
      expect(personalCategory!.minutes).toBe(60)
    })

    it('should sort categories by minutes descending', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task 1',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Personal',
          task_name: 'Task 2',
          start_time: '09:30',
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 3,
          category_name: 'Learning',
          task_name: 'Task 3',
          start_time: '10:00',
          date: '2024-01-15',
          task_type: 'normal'
        }
      ]

      const breakdown = composable.getCategoryBreakdown()

      // Work: 09:00-09:30 = 30 minutes
      // Personal: 09:30-10:00 = 30 minutes
      // Learning: 10:00-10:30 = 30 minutes

      // Should be sorted by minutes descending, then by category name for ties
      expect(breakdown[0]!.categoryName).toBe('Learning')
      expect(breakdown[1]!.categoryName).toBe('Personal')
      expect(breakdown[2]!.categoryName).toBe('Work')
    })

    it('should return empty array when no normal tasks exist', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Pause Task',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'pause'
        }
      ]

      const breakdown = composable.getCategoryBreakdown()
      expect(breakdown).toHaveLength(0)
    })
  })

  describe('edge cases for totals and breakdowns', () => {
    it('getTotalMinutesTracked should skip normal tasks with empty start_time', () => {
      taskRecords.value = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'No Start',
          start_time: '', // filtered out of sorted list -> nextRecord undefined
          date: '2024-01-15',
          task_type: 'normal'
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'End',
          start_time: '10:00',
          date: '2024-01-15',
          task_type: 'end'
        }
      ]

      const total = composable.getTotalMinutesTracked()
      expect(total).toBe(0)
    })
  })
})
