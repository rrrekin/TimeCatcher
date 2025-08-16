/**
 * Parse time string (HH:mm or HH:mm:ss) into total minutes
 * @param timeString - Time string in format "HH:mm" or "HH:mm:ss"
 * @returns Total minutes as number (including fractional minutes for seconds), or null if invalid
 */
export const parseTimeString = (timeString: string): number | null => {
  if (!timeString) return null

  const parts = timeString.split(':').map(Number)
  if (parts.length < 2 || parts.some(isNaN)) return null

  const hours = parts[0] || 0
  const minutes = parts[1] || 0
  const seconds = parts[2] || 0

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null
  }
  return hours * 60 + minutes + seconds / 60
}

/**
 * Format duration in minutes to human-readable string
 * @param totalMinutes - Duration in minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export const formatDurationMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

/**
 * Determine the end time for the last task based on date context
 * @param taskDate - Date string in YYYY-MM-DD format
 * @param taskStartTime - Task start time in minutes
 * @returns End time in minutes based on date context
 */
export const getLastTaskEndTime = (taskDate: string, taskStartTime: number): number => {
  const recordDate = new Date(taskDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const recordDateOnly = new Date(recordDate)
  recordDateOnly.setHours(0, 0, 0, 0)
  
  // For future days: end time is start time (duration = 0)
  if (recordDateOnly > today) {
    return taskStartTime
  }
  
  // For past days: end time is midnight (24:00 = 1440 minutes)
  if (recordDateOnly < today) {
    return 24 * 60 // midnight in minutes
  }
  
  // For today: end time is current time (or start time if start is in future)
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  
  // If task start time is in the future, end time is start time (duration = 0)
  if (taskStartTime > nowMinutes) {
    return taskStartTime
  }
  
  return nowMinutes
}