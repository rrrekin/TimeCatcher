import { ref, onUnmounted, watch, type Ref } from 'vue'
import { isToday } from '@/utils/dateUtils'

/**
 * Format Date as local YYYY-MM-DD string (avoiding UTC conversion)
 */
function formatLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useAutoRefresh(selectedDate: Ref<Date>, refreshCallback: () => void) {
  // Use number | null type with DOM timer behavior (explicit comment for clarity)
  const autoRefreshInterval: Ref<number | null> = ref(null) // DOM timer type, not Node.js

  /**
   * Start auto-refresh for today's tasks (15-second interval)
   */
  const startAutoRefresh = () => {
    if (autoRefreshInterval.value !== null) {
      return // Already running
    }

    const dateString = formatLocalDateString(selectedDate.value)
    if (!isToday(dateString)) {
      return // Only auto-refresh for today
    }

    autoRefreshInterval.value = window.setInterval(() => {
      const currentDateString = formatLocalDateString(selectedDate.value)

      // Stop auto-refresh if date is no longer today
      if (!isToday(currentDateString)) {
        stopAutoRefresh()
        return
      }

      // Trigger refresh callback with error handling
      try {
        refreshCallback()
      } catch (error) {
        console.error('[useAutoRefresh] Error during auto-refresh callback:', error)
        // Continue running the interval unless the error indicates a critical failure
        // The interval will keep running to allow recovery on subsequent ticks
      }
    }, 15000) // 15 seconds
  }

  /**
   * Stop auto-refresh
   */
  const stopAutoRefresh = () => {
    if (autoRefreshInterval.value !== null) {
      clearInterval(autoRefreshInterval.value)
      autoRefreshInterval.value = null
    }
  }

  /**
   * Restart auto-refresh (stop then start)
   */
  const restartAutoRefresh = () => {
    stopAutoRefresh()
    startAutoRefresh()
  }

  // Watch selectedDate and restart auto-refresh when it changes
  const stopWatcher = watch(selectedDate, () => {
    restartAutoRefresh()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    stopAutoRefresh()
    stopWatcher()
  })

  return {
    startAutoRefresh,
    stopAutoRefresh,
    restartAutoRefresh,
  }
}
