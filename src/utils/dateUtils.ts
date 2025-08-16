/**
 * Get local date as YYYY-MM-DD string (avoids UTC timezone issues)
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format using local timezone
 */
export const toYMDLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if a date string represents today in local timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns True if the date is today
 */
export const isToday = (dateString: string): boolean => {
  const today = new Date()
  return dateString === toYMDLocal(today)
}

/**
 * Format date string to readable format
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string like "Friday, January 15, 2024"
 */
export const formatDateString = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}