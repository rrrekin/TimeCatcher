import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useTaskRecords } from './useTaskRecords'
import { TASK_TYPE_END, SPECIAL_TASK_CATEGORY } from '../shared/types'

describe('useTaskRecords', () => {
  let selectedDate: any
  let electronAPI: any

  beforeEach(() => {
    selectedDate = ref(new Date('2025-08-24T10:00:00'))
    electronAPI = {
      getTaskRecordsByDate: vi.fn().mockResolvedValue([{ id: 1, task_type: 'normal' }]),
      addTaskRecord: vi.fn().mockResolvedValue(undefined),
      updateTaskRecord: vi.fn().mockResolvedValue(undefined),
      deleteTaskRecord: vi.fn().mockResolvedValue(undefined)
    }
    ;(window as any).electronAPI = electronAPI
  })

  it('should parse valid time inputs', () => {
    const { parseTimeInput } = useTaskRecords(selectedDate)
    expect(parseTimeInput('9:5')).toBe('09:05')
    expect(parseTimeInput('09:30')).toBe('09:30')
  })

  it('should throw on invalid time inputs', () => {
    const { parseTimeInput } = useTaskRecords(selectedDate)
    expect(() => parseTimeInput('')).toThrow('Time cannot be empty')
    expect(() => parseTimeInput('99:00')).toThrow('Hours must be between 00 and 23')
    expect(() => parseTimeInput('10:99')).toThrow('Minutes must be between 00 and 59')
    expect(() => parseTimeInput('abc')).toThrow('Time must be in H:mm, H:m, HH:mm, or HH:m format')
  })

  it('should load task records', async () => {
    const { loadTaskRecords, taskRecords, isLoadingTasks } = useTaskRecords(selectedDate)
    await loadTaskRecords()
    expect(taskRecords.value.length).toBe(1)
    expect(isLoadingTasks.value).toBe(false)
  })

  it('should throw if API not available in loadTaskRecords', async () => {
    delete (window as any).electronAPI
    const { loadTaskRecords } = useTaskRecords(selectedDate)
    await expect(loadTaskRecords()).rejects.toThrow('API not available')
  })

  it('should add task record', async () => {
    const { addTaskRecord } = useTaskRecords(selectedDate)
    await addTaskRecord({ category_name: 'Work', task_name: 'Task', start_time: '10:00', date: '2025-08-24' })
    expect(electronAPI.addTaskRecord).toHaveBeenCalled()
  })

  it('should add special task', async () => {
    const { addSpecialTask } = useTaskRecords(selectedDate)
    await addSpecialTask('pause', 'Break')
    expect(electronAPI.addTaskRecord).toHaveBeenCalledWith(
      expect.objectContaining({ category_name: SPECIAL_TASK_CATEGORY })
    )
  })

  it('should prevent duplicate end task', async () => {
    const { addSpecialTask, hasEndTaskForSelectedDate, taskRecords } = useTaskRecords(selectedDate)
    taskRecords.value = [{ id: 1, task_type: TASK_TYPE_END } as any]
    await expect(addSpecialTask(TASK_TYPE_END, 'End')).rejects.toThrow('An end task already exists')
  })

  it('should handle duplicate end task error from DB', async () => {
    electronAPI.addTaskRecord.mockRejectedValue({ code: 'END_DUPLICATE' })
    const { addSpecialTask } = useTaskRecords(selectedDate)
    await expect(addSpecialTask(TASK_TYPE_END, 'End')).rejects.toThrow('An end task already exists')
  })

  it('should wrap unknown error in addSpecialTask', async () => {
    electronAPI.addTaskRecord.mockRejectedValue(new Error('fail'))
    const { addSpecialTask } = useTaskRecords(selectedDate)
    await expect(addSpecialTask('pause', 'Break')).rejects.toThrow('Failed to add pause task. Please try again.')
  })

  it('should update task record', async () => {
    const { updateTaskRecord } = useTaskRecords(selectedDate)
    await updateTaskRecord(1, { task_name: 'Updated' })
    expect(electronAPI.updateTaskRecord).toHaveBeenCalled()
  })

  it('should delete task record', async () => {
    const { deleteTaskRecord } = useTaskRecords(selectedDate)
    await deleteTaskRecord(1)
    expect(electronAPI.deleteTaskRecord).toHaveBeenCalled()
  })

  it('should detect special task types', () => {
    const { isSpecial } = useTaskRecords(selectedDate)
    expect(isSpecial('pause')).toBe(true)
    expect(isSpecial('end')).toBe(true)
    expect(isSpecial('normal')).toBe(false)
  })

  it('should get current time in HH:mm format', () => {
    vi.useFakeTimers()
    // Set a known local time: 2024-01-15 14:30:25 (local time)
    vi.setSystemTime(new Date('2024-01-15T14:30:25'))

    const { getCurrentTime } = useTaskRecords(selectedDate)
    const currentTime = getCurrentTime()

    // Should return exact expected time
    expect(currentTime).toBe('14:30')

    vi.useRealTimers()
  })

  // Error handling tests for CRUD operations
  it('should handle error during loadTaskRecords', async () => {
    electronAPI.getTaskRecordsByDate.mockRejectedValue(new Error('Database error'))
    const { loadTaskRecords } = useTaskRecords(selectedDate)
    await expect(loadTaskRecords()).rejects.toThrow('Database error')
  })

  it('should handle error during addTaskRecord', async () => {
    electronAPI.addTaskRecord.mockRejectedValue(new Error('Add failed'))
    const { addTaskRecord } = useTaskRecords(selectedDate)
    await expect(
      addTaskRecord({
        category_name: 'Work',
        task_name: 'Task',
        start_time: '10:00',
        date: '2025-08-24',
        task_type: 'normal'
      })
    ).rejects.toThrow('Add failed')
  })

  it('should handle error during updateTaskRecord', async () => {
    electronAPI.updateTaskRecord.mockRejectedValue(new Error('Update failed'))
    const { updateTaskRecord } = useTaskRecords(selectedDate)
    await expect(updateTaskRecord(1, { task_name: 'Updated' })).rejects.toThrow('Update failed')
  })

  it('should handle error during deleteTaskRecord', async () => {
    electronAPI.deleteTaskRecord.mockRejectedValue(new Error('Delete failed'))
    const { deleteTaskRecord } = useTaskRecords(selectedDate)
    await expect(deleteTaskRecord(1)).rejects.toThrow('Delete failed')
  })

  // Advanced duplicate end task detection tests
  it('should handle SQLite errno 19 duplicate end task error', async () => {
    electronAPI.addTaskRecord.mockRejectedValue({ errno: 19 })
    const { addSpecialTask } = useTaskRecords(selectedDate)
    await expect(addSpecialTask(TASK_TYPE_END, 'End')).rejects.toThrow('An end task already exists')
  })

  it('should handle constraint message regex pattern for duplicate end task', async () => {
    electronAPI.addTaskRecord.mockRejectedValue({
      message: 'UNIQUE constraint failed: idx_end_per_day'
    })
    const { addSpecialTask } = useTaskRecords(selectedDate)
    await expect(addSpecialTask(TASK_TYPE_END, 'End')).rejects.toThrow('An end task already exists')
  })

  it('should handle constraint violation regex pattern for duplicate end task', async () => {
    electronAPI.addTaskRecord.mockRejectedValue({
      message: 'constraint violation on idx_end_per_day'
    })
    const { addSpecialTask } = useTaskRecords(selectedDate)
    await expect(addSpecialTask(TASK_TYPE_END, 'End')).rejects.toThrow('An end task already exists')
  })

  // Context setter functionality tests
  it('should call updateContextSetter when provided in addTaskRecord', async () => {
    const mockContextSetter = vi.fn()
    const { addTaskRecord } = useTaskRecords(selectedDate, mockContextSetter)
    await addTaskRecord(
      {
        category_name: 'Work',
        task_name: 'Task',
        start_time: '10:00',
        date: '2025-08-24',
        task_type: 'normal'
      },
      'edit'
    )
    expect(mockContextSetter).toHaveBeenCalledWith('edit')
  })

  it('should call updateContextSetter when provided in addSpecialTask', async () => {
    const mockContextSetter = vi.fn()
    const { addSpecialTask } = useTaskRecords(selectedDate, mockContextSetter)
    await addSpecialTask('pause', 'Break', 'edit')
    expect(mockContextSetter).toHaveBeenCalledWith('edit')
  })

  it('should call updateContextSetter when provided in updateTaskRecord', async () => {
    const mockContextSetter = vi.fn()
    const { updateTaskRecord } = useTaskRecords(selectedDate, mockContextSetter)
    await updateTaskRecord(1, { task_name: 'Updated' }, 'edit')
    expect(mockContextSetter).toHaveBeenCalledWith('edit')
  })

  // API unavailable scenarios
  it('should throw when electronAPI is unavailable in addTaskRecord', async () => {
    delete (window as any).electronAPI
    const { addTaskRecord } = useTaskRecords(selectedDate)
    await expect(
      addTaskRecord({
        category_name: 'Work',
        task_name: 'Task',
        start_time: '10:00',
        date: '2025-08-24',
        task_type: 'normal'
      })
    ).rejects.toThrow('API not available')
  })

  it('should throw when electronAPI is unavailable in addSpecialTask', async () => {
    delete (window as any).electronAPI
    const { addSpecialTask } = useTaskRecords(selectedDate)
    await expect(addSpecialTask('pause', 'Break')).rejects.toThrow('API not available')
  })

  it('should throw when electronAPI is unavailable in updateTaskRecord', async () => {
    delete (window as any).electronAPI
    const { updateTaskRecord } = useTaskRecords(selectedDate)
    await expect(updateTaskRecord(1, { task_name: 'Updated' })).rejects.toThrow('API not available')
  })

  it('should throw when electronAPI is unavailable in deleteTaskRecord', async () => {
    delete (window as any).electronAPI
    const { deleteTaskRecord } = useTaskRecords(selectedDate)
    await expect(deleteTaskRecord(1)).rejects.toThrow('API not available')
  })

  // Edge case tests
  it('should handle undefined taskType in isSpecial', () => {
    const { isSpecial } = useTaskRecords(selectedDate)
    expect(isSpecial(undefined)).toBe(false)
  })

  it('should correctly compute hasEndTaskForSelectedDate', () => {
    const { hasEndTaskForSelectedDate, taskRecords } = useTaskRecords(selectedDate)
    expect(hasEndTaskForSelectedDate.value).toBe(false)

    taskRecords.value = [{ id: 1, task_type: TASK_TYPE_END } as any]
    expect(hasEndTaskForSelectedDate.value).toBe(true)
  })

  it('should handle error cause assignment in addSpecialTask', async () => {
    const originalError = new Error('Original error')
    electronAPI.addTaskRecord.mockRejectedValue(originalError)

    const { addSpecialTask } = useTaskRecords(selectedDate)

    try {
      await addSpecialTask('pause', 'Break')
    } catch (error: any) {
      expect(error.message).toBe('Failed to add pause task. Please try again.')
      expect(error.cause).toBe(originalError)
    }
  })

  it('should handle different time formats in parseTimeInput', () => {
    const { parseTimeInput } = useTaskRecords(selectedDate)
    expect(parseTimeInput('9:05')).toBe('09:05')
    expect(parseTimeInput('09:5')).toBe('09:05')
    expect(parseTimeInput('9:5')).toBe('09:05')
    expect(parseTimeInput('09:05')).toBe('09:05')
  })

  it('should handle whitespace in parseTimeInput', () => {
    const { parseTimeInput } = useTaskRecords(selectedDate)
    expect(parseTimeInput('  9:30  ')).toBe('09:30')
    expect(parseTimeInput('\t14:15\n')).toBe('14:15')
  })
})
