export function validateCutoffDate(cutoffDate: unknown): string {
  // Defense-in-depth: validate cutoffDate before calling database method
  if (typeof cutoffDate !== 'string' || cutoffDate.trim() === '') {
    throw new Error('Invalid cutoffDate: must be a non-empty string')
  }

  // Strict regex validation for YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(cutoffDate)) {
    throw new Error('Invalid cutoffDate: must match YYYY-MM-DD format')
  }

  // Parse date and validate it's a real date
  const parsedDate = new Date(cutoffDate)
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid cutoffDate: must be a valid date')
  }

  // Validate year range (reject very old or future years)
  const year = parsedDate.getFullYear()
  const currentYear = new Date().getFullYear()
  if (year < 1970 || year > currentYear) {
    throw new Error('Invalid cutoffDate: year must be reasonable (1970 to current year)')
  }

  // Compare with today using UTC/zeroed time to prevent future dates
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Zero out time for accurate date comparison
  parsedDate.setHours(0, 0, 0, 0) // Zero out time for accurate date comparison

  // Ensure cutoff date is at least 30 days before today
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  if (parsedDate > today) {
    throw new Error('Invalid cutoffDate: cannot be in the future')
  }

  if (parsedDate > thirtyDaysAgo) {
    throw new Error('Invalid cutoffDate: must be at least 30 days before today')
  }

  // Return the validated string
  return cutoffDate
}

export function validateHttpPort(port: unknown): number {
  // Ensure port is a number
  if (typeof port !== 'number' || !Number.isInteger(port)) {
    throw new Error('Invalid port: must be an integer')
  }

  // Validate port range (unprivileged user ports)
  if (port < 1024 || port > 65535) {
    throw new Error('Invalid port: must be between 1024 and 65535 (unprivileged range)')
  }

  return port
}
