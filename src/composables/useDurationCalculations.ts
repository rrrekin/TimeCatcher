import { computed, type Ref } from 'vue'
import type { TaskRecord } from '@/shared/types'
import { parseTimeString, formatDurationMinutes, getLastTaskEndTime } from '@/utils/timeUtils'
import { DURATION_VISIBLE_BY_TASK_TYPE } from '@/shared/types'

export function useDurationCalculations(taskRecords: Ref<TaskRecord[]>) {
  // Pre-sorted records for performance (computed once per render/refresh)
  const sortedTaskRecords = computed(() => {
    return taskRecords.value
      .filter(record => record.start_time)
      .sort((a, b) => {
        const timeA = parseTimeString(a.start_time)
        const timeB = parseTimeString(b.start_time)
        if (timeA === null || timeB === null) return 0
        return timeA - timeB
      })
  })

  /**
   * Calculate duration for a specific task record
   * @param currentRecord - The task record to calculate duration for
   * @returns Formatted duration string or '-' if invalid
   */
  const calculateDuration = (currentRecord: TaskRecord): string => {
    if (!DURATION_VISIBLE_BY_TASK_TYPE[currentRecord.task_type]) {
      return '-'
    }

    const sortedRecords = sortedTaskRecords.value
    const currentIndex = sortedRecords.findIndex(record => record.id === currentRecord.id)
    
    if (currentIndex === -1) {
      return '-'
    }

    const currentTime = parseTimeString(currentRecord.start_time)
    if (currentTime === null) {
      return '-'
    }

    // If this is NOT the last task, calculate duration to next task
    if (currentIndex < sortedRecords.length - 1) {
      const nextRecord = sortedRecords[currentIndex + 1]
      const nextTime = parseTimeString(nextRecord.start_time)
      
      if (nextTime === null || nextTime <= currentTime) {
        return '-'
      }
      
      return formatDurationMinutes(Math.floor(nextTime - currentTime))
    }

    // This is the last task - use helper to get end time based on date context
    const endTime = getLastTaskEndTime(currentRecord.date, currentTime)
    const durationMinutes = endTime - currentTime
    return durationMinutes > 0 ? formatDurationMinutes(Math.floor(durationMinutes)) : '0m'
  }

  /**
   * Get total minutes tracked for standard tasks only
   * @returns Total tracked minutes
   */
  const getTotalMinutesTracked = (): number => {
    const standardRecords = taskRecords.value.filter(record => record.task_type === 'normal')
    const sortedRecords = sortedTaskRecords.value
    let totalMinutes = 0

    for (const standardRecord of standardRecords) {
      const currentIndex = sortedRecords.findIndex(record => record.id === standardRecord.id)
      
      if (currentIndex === -1) continue

      const currentTime = parseTimeString(standardRecord.start_time)
      if (currentTime === null) continue

      let durationMinutes = 0

      // If this is NOT the last task, calculate duration to next task
      if (currentIndex < sortedRecords.length - 1) {
        const nextRecord = sortedRecords[currentIndex + 1]
        const nextTime = parseTimeString(nextRecord.start_time)
        
        if (nextTime !== null && nextTime > currentTime) {
          durationMinutes = nextTime - currentTime
        }
      } else {
        // This is the last task - use helper to get end time based on date context
        const endTime = getLastTaskEndTime(standardRecord.date, currentTime)
        durationMinutes = Math.max(0, endTime - currentTime)
      }

      totalMinutes += Math.floor(durationMinutes)
    }

    return totalMinutes
  }

  /**
   * Get category breakdown with time distribution
   * @returns Array of category breakdowns with minutes and percentages
   */
  const getCategoryBreakdown = () => {
    const standardRecords = taskRecords.value.filter(record => record.task_type === 'normal')
    const sortedRecords = sortedTaskRecords.value
    const categoryTotals: { [categoryName: string]: number } = {}

    // Calculate duration for each standard task
    for (const standardRecord of standardRecords) {
      const currentIndex = sortedRecords.findIndex(record => record.id === standardRecord.id)
      
      if (currentIndex === -1) continue

      const currentTime = parseTimeString(standardRecord.start_time)
      if (currentTime === null) continue

      let durationMinutes = 0

      // If this is NOT the last task, calculate duration to next task
      if (currentIndex < sortedRecords.length - 1) {
        const nextRecord = sortedRecords[currentIndex + 1]
        const nextTime = parseTimeString(nextRecord.start_time)
        
        if (nextTime !== null && nextTime > currentTime) {
          durationMinutes = nextTime - currentTime
        }
      } else {
        // This is the last task - use helper to get end time based on date context
        const endTime = getLastTaskEndTime(standardRecord.date, currentTime)
        durationMinutes = Math.max(0, endTime - currentTime)
      }

      const categoryName = standardRecord.category_name
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + Math.floor(durationMinutes)
    }

    const totalMinutes = Object.values(categoryTotals).reduce((sum, minutes) => sum + minutes, 0)
    
    return Object.entries(categoryTotals)
      .map(([categoryName, minutes]) => ({
        categoryName,
        minutes,
        percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0
      }))
      .sort((a, b) => b.minutes - a.minutes)
  }

  return {
    sortedTaskRecords,
    calculateDuration,
    getTotalMinutesTracked,
    getCategoryBreakdown
  }
}