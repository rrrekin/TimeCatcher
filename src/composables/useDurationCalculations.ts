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
        
        // Handle invalid times deterministically - push nulls to end
        if (timeA === null && timeB === null) return 0
        if (timeA === null) return 1  // a goes after b
        if (timeB === null) return -1 // b goes after a
        
        return timeA - timeB
      })
  })

  // Precomputed maps for O(1) lookups (computed once per refresh)
  const indexMaps = computed(() => {
    const records = sortedTaskRecords.value
    const indexByRecord = new Map<TaskRecord, number>()
    const nextRecordByRecord = new Map<TaskRecord, TaskRecord | null>()
    
    records.forEach((record, index) => {
      indexByRecord.set(record, index)
      nextRecordByRecord.set(record, index < records.length - 1 ? records[index + 1]! : null)
    })
    
    return { indexByRecord, nextRecordByRecord }
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

    const { nextRecordByRecord } = indexMaps.value
    const nextRecord = nextRecordByRecord.get(currentRecord)
    
    // Check if record exists in sorted list
    if (nextRecord === undefined) {
      return '-'
    }

    const currentTime = parseTimeString(currentRecord.start_time)
    if (currentTime === null) {
      return '-'
    }

    // If this is NOT the last task, calculate duration to next task
    if (nextRecord !== null) {
      const nextTime = parseTimeString(nextRecord.start_time)
      
      if (nextTime === null || nextTime <= currentTime) {
        return '-'
      }
      
      return formatDurationMinutes(nextTime - currentTime)
    }

    // This is the last task - use helper to get end time based on date context
    const endTime = getLastTaskEndTime(currentRecord.date, currentTime)
    const durationMinutes = endTime - currentTime
    return durationMinutes > 0 ? formatDurationMinutes(durationMinutes) : '0m'
  }

  /**
   * Get total minutes tracked for standard tasks only
   * @returns Total tracked minutes
   */
  const getTotalMinutesTracked = (): number => {
    const standardRecords = taskRecords.value.filter(record => record.task_type === 'normal')
    const { nextRecordByRecord } = indexMaps.value
    let totalMinutes = 0

    for (const standardRecord of standardRecords) {
      const nextRecord = nextRecordByRecord.get(standardRecord)
      
      // Skip if record not found in sorted list
      if (nextRecord === undefined) continue

      const currentTime = parseTimeString(standardRecord.start_time)
      if (currentTime === null) continue

      let durationMinutes = 0

      // If this is NOT the last task, calculate duration to next task
      if (nextRecord !== null) {
        const nextTime = parseTimeString(nextRecord.start_time)
        
        if (nextTime !== null && nextTime > currentTime) {
          durationMinutes = nextTime - currentTime
        }
      } else {
        // This is the last task - use helper to get end time based on date context
        const endTime = getLastTaskEndTime(standardRecord.date, currentTime)
        durationMinutes = Math.max(0, endTime - currentTime)
      }

      totalMinutes += durationMinutes
    }

    return Math.round(totalMinutes)
  }

  /**
   * Get category breakdown with time distribution
   * @returns Array of category breakdowns with minutes and percentages
   */
  const getCategoryBreakdown = () => {
    const standardRecords = taskRecords.value.filter(record => record.task_type === 'normal')
    const { nextRecordByRecord } = indexMaps.value
    const categoryTotals: { [categoryName: string]: number } = {}

    // Calculate duration for each standard task
    for (const standardRecord of standardRecords) {
      const nextRecord = nextRecordByRecord.get(standardRecord)
      
      // Skip if record not found in sorted list
      if (nextRecord === undefined) continue

      const currentTime = parseTimeString(standardRecord.start_time)
      if (currentTime === null) continue

      let durationMinutes = 0

      // If this is NOT the last task, calculate duration to next task
      if (nextRecord !== null) {
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
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + durationMinutes
    }

    const totalRawMinutes = Object.values(categoryTotals).reduce((sum, minutes) => sum + minutes, 0)
    
    return Object.entries(categoryTotals)
      .map(([categoryName, rawMinutes]) => ({
        categoryName,
        minutes: Math.floor(rawMinutes),
        percentage: totalRawMinutes > 0 ? (rawMinutes / totalRawMinutes) * 100 : 0
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