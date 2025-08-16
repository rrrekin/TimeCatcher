import { ref, computed, type Ref } from 'vue'
import type { TaskRecord, TaskRecordInsert, TaskRecordUpdate, TaskType, SpecialTaskType } from '@/shared/types'
import { SPECIAL_TASK_CATEGORY, SPECIAL_TASK_TYPES } from '@/shared/types'
import { toYMDLocal } from '@/utils/dateUtils'

export function useTaskRecords(selectedDate: Ref<Date>) {
  const taskRecords: Ref<TaskRecord[]> = ref([])
  const isLoadingTasks = ref(false)

  // Helper functions
  const isSpecial = (taskType: TaskType | undefined): taskType is SpecialTaskType => {
    return SPECIAL_TASK_TYPES.includes(taskType as SpecialTaskType)
  }

  const hasEndTaskForSelectedDate = computed(() => {
    return taskRecords.value.some(record => record.task_type === 'end')
  })

  /**
   * Get current time as HH:mm string
   */
  const getCurrentTime = (): string => {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  /**
   * Parse and validate time input
   */
  const parseTimeInput = (timeInput: string): string => {
    const trimmed = timeInput.trim()
    
    if (!trimmed) {
      throw new Error('Time cannot be empty')
    }
    
    // Allow formats: HH:mm, H:mm, HH:m, H:m
    const timeRegex = /^(\d{1,2}):(\d{1,2})$/
    const match = trimmed.match(timeRegex)
    
    if (!match) {
      throw new Error('Time must be in HH:mm format (e.g., 09:30 or 14:15)')
    }
    
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    
    if (hours < 0 || hours > 23) {
      throw new Error('Hours must be between 00 and 23')
    }
    
    if (minutes < 0 || minutes > 59) {
      throw new Error('Minutes must be between 00 and 59')
    }
    
    // Return normalized format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  /**
   * Load task records for selected date
   */
  const loadTaskRecords = async (): Promise<void> => {
    isLoadingTasks.value = true
    try {
      if (!window.electronAPI) {
        throw new Error('API not available. Please restart the application.')
      }
      const dateString = toYMDLocal(selectedDate.value)
      taskRecords.value = await window.electronAPI.getTaskRecordsByDate(dateString)
    } catch (error) {
      console.error('Failed to load task records:', error)
      throw error
    } finally {
      isLoadingTasks.value = false
    }
  }

  /**
   * Add a new task record
   */
  const addTaskRecord = async (record: TaskRecordInsert): Promise<void> => {
    if (!window.electronAPI) {
      throw new Error('API not available. Please restart the application.')
    }

    try {
      await window.electronAPI.addTaskRecord(record)
      await loadTaskRecords()
    } catch (error) {
      console.error('Failed to add task record:', error)
      throw error
    }
  }

  /**
   * Add a special task (pause or end)
   */
  const addSpecialTask = async (
    taskType: SpecialTaskType, 
    taskName: string
  ): Promise<void> => {
    try {
      if (!window.electronAPI) {
        throw new Error('API not available. Please restart the application.')
      }

      const dateString = toYMDLocal(selectedDate.value)
      const currentTime = getCurrentTime()

      const taskRecord: TaskRecordInsert = {
        category_name: SPECIAL_TASK_CATEGORY,
        task_name: taskName,
        start_time: currentTime,
        date: dateString,
        task_type: taskType
      }

      await window.electronAPI.addTaskRecord(taskRecord)
      await loadTaskRecords()
    } catch (error) {
      console.error(`Failed to add ${taskType} task:`, error)
      
      // Check if error is due to duplicate end task constraint
      const isDuplicateEndTask = 
        // Primary check: custom error code
        (error && typeof error === 'object' && 'code' in error && (error as any).code === 'END_DUPLICATE') ||
        // Fallback check: regex pattern matching error message for duplicate end task
        (error && typeof error === 'object' && 'message' in error && 
         /(?:unique.*constraint.*failed|constraint.*violation).*(?:task_records.*idx_end_per_day|idx_end_per_day.*task_records)/i.test((error as any).message))
      
      if (isDuplicateEndTask) {
        throw new Error('An end task already exists for this day. Only one end task is allowed per day.')
      }
      
      throw new Error(`Failed to add ${taskType} task. Please try again.`)
    }
  }

  /**
   * Update an existing task record
   */
  const updateTaskRecord = async (id: number, updates: TaskRecordUpdate): Promise<void> => {
    if (!window.electronAPI) {
      throw new Error('API not available. Please restart the application.')
    }

    try {
      await window.electronAPI.updateTaskRecord(id, updates)
      await loadTaskRecords()
    } catch (error) {
      console.error('Failed to update task record:', error)
      throw error
    }
  }

  /**
   * Delete a task record
   */
  const deleteTaskRecord = async (id: number): Promise<void> => {
    if (!window.electronAPI) {
      throw new Error('API not available. Please restart the application.')
    }

    try {
      await window.electronAPI.deleteTaskRecord(id)
      await loadTaskRecords()
    } catch (error) {
      console.error('Failed to delete task record:', error)
      throw error
    }
  }

  return {
    taskRecords,
    isLoadingTasks,
    hasEndTaskForSelectedDate,
    isSpecial,
    getCurrentTime,
    parseTimeInput,
    loadTaskRecords,
    addTaskRecord,
    addSpecialTask,
    updateTaskRecord,
    deleteTaskRecord
  }
}