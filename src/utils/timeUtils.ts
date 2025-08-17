// Constants
const MINUTES_PER_DAY = 24 * 60 // 1440 minutes in a day

/**
 * Parse time string (HH:mm or HH:mm:ss) into total minutes
 * @param timeString - Time string in format "HH:mm" or "HH:mm:ss"
 * @returns Total minutes as number (including fractional minutes for seconds), or null if invalid
 */
export const parseTimeString = (timeString: string): number | null => {
  const trimmed = timeString.trim()
  if (!trimmed) return null

  // Strict regex: matches exactly HH:mm or HH:mm:ss format with valid ranges
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
  const match = trimmed.match(timeRegex)
  
  if (!match) return null
  
  // Extract captured groups and parse as integers
  const hours = parseInt(match[1]!, 10)
  const minutes = parseInt(match[2]!, 10)
  const seconds = match[3] ? parseInt(match[3], 10) : 0
  
  // Additional validation for parsed numbers (should not be needed due to regex, but defensive)
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null
  
  return hours * 60 + minutes + seconds / 60
}

/**
 * Format duration in minutes to human-readable string
 * @param totalMinutes - Duration in minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export const formatDurationMinutes = (totalMinutes: number): string => {
  // Normalize input: clamp negatives to 0 and round fractional minutes
  const rounded = Math.max(0, Math.round(totalMinutes))
  
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60

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
  // Parse YYYY-MM-DD safely by splitting and using Date constructor
  const [yearStr, monthStr, dayStr] = taskDate.split('-')
  const year = parseInt(yearStr!, 10)
  const month = parseInt(monthStr!, 10)
  const day = parseInt(dayStr!, 10)
  
  // Validate parsed components
  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      month < 1 || month > 12 || day < 1 || day > 31) {
    // Invalid date format - return start time (duration = 0)
    return taskStartTime
  }
  
  // Construct date with explicit year, monthIndex (month - 1), day
  const recordDateOnly = new Date(year, month - 1, day)
  recordDateOnly.setHours(0, 0, 0, 0)
  
  // Validate that the constructed date is valid
  if (isNaN(recordDateOnly.getTime())) {
    // Invalid date - return start time (duration = 0)
    return taskStartTime
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // For future days: end time is start time (duration = 0)
  if (recordDateOnly > today) {
    return taskStartTime
  }
  
  // For past days: end time is midnight (24:00 = 1440 minutes)
  if (recordDateOnly < today) {
    return MINUTES_PER_DAY // midnight in minutes
  }

  // For today: end time is current time (or start time if start is in future)
  const now = new Date()
  const nowMinutes = Math.round(now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60)
  
  // If task start time is in the future, end time is start time (duration = 0)
  if (taskStartTime > nowMinutes) {
    return taskStartTime
  }
  
  return nowMinutes
}