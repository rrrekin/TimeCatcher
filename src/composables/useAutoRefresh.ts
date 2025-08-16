import { ref, onUnmounted, type Ref } from 'vue'
import { isToday } from '@/utils/dateUtils'

export function useAutoRefresh(
  selectedDate: Ref<Date>, 
  refreshCallback: () => void
) {
  // Use number | null type with DOM timer behavior (explicit comment for clarity)
  const autoRefreshInterval: Ref<number | null> = ref(null) // DOM timer type, not Node.js

  /**
   * Start auto-refresh for today's tasks (15-second interval)
   */
  const startAutoRefresh = () => {
    if (autoRefreshInterval.value !== null) {
      return // Already running
    }

    const dateString = selectedDate.value.toISOString().split('T')[0]!
    if (!isToday(dateString)) {
      return // Only auto-refresh for today
    }

    autoRefreshInterval.value = window.setInterval(() => {
      const currentDateString = selectedDate.value.toISOString().split('T')[0]!
      
      // Stop auto-refresh if date is no longer today
      if (!isToday(currentDateString)) {
        stopAutoRefresh()
        return
      }

      // Trigger refresh callback
      refreshCallback()
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

  // Cleanup on unmount
  onUnmounted(() => {
    stopAutoRefresh()
  })

  return {
    startAutoRefresh,
    stopAutoRefresh,
    restartAutoRefresh
  }
}