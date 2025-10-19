import { ref, onUnmounted, watch, type Ref } from 'vue'

/**
 * HTTP server task creation event payload
 */
interface HttpTaskCreatedEvent {
  date: string
  taskId?: number
}

/**
 * Format Date as local YYYY-MM-DD string (avoiding UTC conversion)
 */
function formatLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useAutoRefresh(
  selectedDate: Ref<Date>,
  refreshCallback: () => void | Promise<void>,
  scrollToTaskCallback?: (taskId: number) => void | Promise<void>
) {
  /**
   * NOTE: Periodic auto-refresh (15-second interval) has been removed.
   * Duration updates are now handled by TaskList component's internal timer.
   * This composable only handles HTTP server task creation events.
   */

  /**
   * Start auto-refresh - now a no-op, kept for API compatibility
   * Periodic refresh removed; duration updates handled by TaskList timer
   */
  const startAutoRefresh = () => {
    // No-op: periodic refresh removed
  }

  /**
   * Stop auto-refresh - now a no-op, kept for API compatibility
   */
  const stopAutoRefresh = () => {
    // No-op: periodic refresh removed
  }

  /**
   * Restart auto-refresh - now a no-op, kept for API compatibility
   */
  const restartAutoRefresh = () => {
    // No-op: periodic refresh removed
  }

  // Watch selectedDate - kept for potential future use
  const stopWatcher = watch(selectedDate, () => {
    // No action needed - periodic refresh removed
  })

  // Listen for HTTP server task creation events
  const handleHttpTaskCreated = async (data: HttpTaskCreatedEvent) => {
    const currentDateString = formatLocalDateString(selectedDate.value)

    // Only refresh if the task was created for the currently viewed date
    if (data.date === currentDateString) {
      try {
        // Await data refresh to ensure DOM is updated
        await Promise.resolve(refreshCallback())

        // Wait for DOM update tick before scrolling
        await Promise.resolve(
          typeof requestAnimationFrame === 'function'
            ? new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
            : new Promise<void>(resolve => setTimeout(resolve, 0))
        )

        // Scroll to the newly created task if callback provided and task ID available
        if (scrollToTaskCallback && typeof data.taskId === 'number') {
          await Promise.resolve(scrollToTaskCallback(data.taskId))
        }
      } catch (error) {
        console.error('[useAutoRefresh] Error during HTTP task creation refresh:', error)
      }
    }
  }

  // Set up HTTP server event listener immediately (not in onMounted to avoid test warnings)
  // This is safe because it only adds event listeners without DOM operations
  if (typeof window !== 'undefined' && window.electronAPI?.onHttpServerTaskCreated) {
    window.electronAPI.onHttpServerTaskCreated(handleHttpTaskCreated)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopWatcher()

    // Clean up HTTP server event listener
    if (typeof window !== 'undefined' && window.electronAPI?.removeHttpServerTaskCreatedListener) {
      window.electronAPI.removeHttpServerTaskCreatedListener(handleHttpTaskCreated)
    }
  })

  return {
    startAutoRefresh,
    stopAutoRefresh,
    restartAutoRefresh
  }
}
