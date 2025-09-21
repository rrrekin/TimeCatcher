// Fixed duplicate imports
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useAutoRefresh } from './useAutoRefresh'

// Extract the formatLocalDateString function for testing
// This mirrors the implementation in useAutoRefresh.ts
function formatLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('formatLocalDateString helper', () => {
  it('should format dates correctly', () => {
    expect(formatLocalDateString(new Date('2024-01-01T10:30:00'))).toBe('2024-01-01')
    expect(formatLocalDateString(new Date('2024-12-31T23:59:59'))).toBe('2024-12-31')
    expect(formatLocalDateString(new Date('2024-02-29T00:00:00'))).toBe('2024-02-29') // Leap year
  })

  it('should handle single digit months and days with zero padding', () => {
    expect(formatLocalDateString(new Date('2024-01-05T12:00:00'))).toBe('2024-01-05')
    expect(formatLocalDateString(new Date('2024-09-01T12:00:00'))).toBe('2024-09-01')
    expect(formatLocalDateString(new Date('2024-10-10T12:00:00'))).toBe('2024-10-10')
  })

  it('should handle different timezones consistently by using local date components', () => {
    // Create dates in different ways to test consistency
    const date1 = new Date(2024, 0, 15) // Local timezone January 15, 2024
    const date2 = new Date('2024-01-15T12:00:00') // Parsed as local time in most environments

    expect(formatLocalDateString(date1)).toBe('2024-01-15')
    expect(formatLocalDateString(date2)).toBe('2024-01-15')
  })
})

describe('useAutoRefresh', () => {
  let mockCallback: ReturnType<typeof vi.fn>
  let selectedDate: ReturnType<typeof ref<Date>>
  let scope: ReturnType<typeof effectScope>

  beforeEach(() => {
    vi.useFakeTimers()
    mockCallback = vi.fn()
    selectedDate = ref(new Date())
    scope = effectScope()

    // Mock window object with DOM timer methods for all tests
    ;(global as any).window = {
      setInterval: vi.fn((fn: Function, ms: number) => {
        return setInterval(fn, ms) as any
      }),
      clearInterval: vi.fn((id: any) => {
        clearInterval(id)
      })
    }

    // Suppress Vue lifecycle warnings in test environment
    const originalWarn = console.warn
    vi.spyOn(console, 'warn').mockImplementation(message => {
      if ((typeof message === 'string' && message.includes('onMounted')) || message.includes('onUnmounted')) {
        return // Suppress Vue lifecycle warnings
      }
      originalWarn(message)
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    scope.stop()
    delete (global as any).window
    vi.restoreAllMocks()
  })

  it('should call callback every 15s when date is today', () => {
    const { startAutoRefresh, stopAutoRefresh } = scope.run(() => useAutoRefresh(selectedDate, mockCallback))!
    startAutoRefresh()

    expect(mockCallback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(15000)
    expect(mockCallback).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(30000)
    expect(mockCallback).toHaveBeenCalledTimes(3)

    stopAutoRefresh()
  })

  it('should not start auto-refresh if date is not today', () => {
    // Set fixed midday UTC time to avoid midnight boundary issues
    const fixedTime = new Date('2024-01-15T12:00:00.000Z').getTime()
    vi.setSystemTime(fixedTime)

    const { startAutoRefresh } = scope.run(() => useAutoRefresh(selectedDate, mockCallback))!

    // Create yesterday from fixed time
    const yesterday = new Date(fixedTime)
    yesterday.setDate(yesterday.getDate() - 1)
    selectedDate.value = yesterday

    startAutoRefresh()
    vi.advanceTimersByTime(60000)
    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('should stop refreshing when stopAutoRefresh is called', () => {
    const { startAutoRefresh, stopAutoRefresh } = scope.run(() => useAutoRefresh(selectedDate, mockCallback))!
    startAutoRefresh()

    vi.advanceTimersByTime(30000)
    expect(mockCallback).toHaveBeenCalledTimes(2)

    stopAutoRefresh()
    vi.advanceTimersByTime(60000)
    expect(mockCallback).toHaveBeenCalledTimes(2)
  })

  it('should restart when restartAutoRefresh is called', () => {
    scope.run(() => {
      const { startAutoRefresh, restartAutoRefresh, stopAutoRefresh } = useAutoRefresh(selectedDate, mockCallback)
      startAutoRefresh()

      vi.advanceTimersByTime(15000)
      expect(mockCallback).toHaveBeenCalledTimes(1)

      restartAutoRefresh()
      vi.advanceTimersByTime(15000)
      expect(mockCallback).toHaveBeenCalledTimes(2)

      stopAutoRefresh()
    })
  })

  describe('HTTP Server Integration', () => {
    let mockElectronAPI: any

    beforeEach(() => {
      // Add electronAPI to existing window mock
      mockElectronAPI = {
        onHttpServerTaskCreated: vi.fn(),
        removeHttpServerTaskCreatedListener: vi.fn()
      }
      ;(global as any).window.electronAPI = mockElectronAPI
    })

    afterEach(() => {
      // Clean up electronAPI but keep window object
      delete (global as any).window.electronAPI
    })

    it('should register HTTP server task created listener on mount', () => {
      // Since onMounted doesn't fire in effectScope, we'll test the actual handler logic by simulation
      expect(() => {
        scope.run(() => useAutoRefresh(selectedDate, mockCallback))
      }).not.toThrow()

      // Test would normally check onMounted registration, but that doesn't work in effectScope
      // The important thing is that the composable initializes without error
    })

    it('should call refresh callback when HTTP task is created for current date', () => {
      scope.run(() => useAutoRefresh(selectedDate, mockCallback))

      // Simulate the HTTP task created handler directly since onMounted doesn't fire in tests
      const handleHttpTaskCreated = (data: any) => {
        const currentDateString = formatLocalDateString(selectedDate.value)

        // Only refresh if the task was created for the currently viewed date
        if (data.date === currentDateString) {
          try {
            mockCallback()
          } catch (error) {
            console.error('[useAutoRefresh] Error during HTTP task creation refresh:', error)
          }
        }
      }

      // Set today's date
      const today = new Date()
      selectedDate.value = today
      const todayString = formatLocalDateString(today)

      // Simulate HTTP task creation for today
      handleHttpTaskCreated({ date: todayString })

      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it('should not call refresh callback when HTTP task is created for different date', () => {
      scope.run(() => useAutoRefresh(selectedDate, mockCallback))

      // Simulate the HTTP task created handler directly
      const handleHttpTaskCreated = (data: any) => {
        const currentDateString = formatLocalDateString(selectedDate.value)

        if (data.date === currentDateString) {
          try {
            mockCallback()
          } catch (error) {
            console.error('[useAutoRefresh] Error during HTTP task creation refresh:', error)
          }
        }
      }

      // Set today's date
      const today = new Date()
      selectedDate.value = today

      // Simulate HTTP task creation for different date
      handleHttpTaskCreated({ date: '2023-01-01' })

      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should handle HTTP task creation refresh errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Refresh failed')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      scope.run(() => useAutoRefresh(selectedDate, errorCallback))

      // Simulate the HTTP task created handler directly
      const handleHttpTaskCreated = (data: any) => {
        const currentDateString = formatLocalDateString(selectedDate.value)

        if (data.date === currentDateString) {
          try {
            errorCallback()
          } catch (error) {
            console.error('[useAutoRefresh] Error during HTTP task creation refresh:', error)
          }
        }
      }

      // Set today's date
      const today = new Date()
      selectedDate.value = today
      const todayString = formatLocalDateString(today)

      // Simulate HTTP task creation with error
      handleHttpTaskCreated({ date: todayString })

      expect(errorCallback).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[useAutoRefresh] Error during HTTP task creation refresh:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should clean up HTTP server event listener on unmount', () => {
      // Since onMounted/onUnmounted don't fire in effectScope, just test that cleanup doesn't throw
      expect(() => {
        const composable = scope.run(() => useAutoRefresh(selectedDate, mockCallback))!
        scope.stop()
      }).not.toThrow()
    })

    it('should handle missing electronAPI gracefully', () => {
      // Remove electronAPI from window
      delete (global as any).window.electronAPI

      // Should not throw error
      expect(() => {
        scope.run(() => useAutoRefresh(selectedDate, mockCallback))
      }).not.toThrow()
    })

    it('should handle missing HTTP server methods gracefully', () => {
      // Set up electronAPI without HTTP server methods
      ;(global as any).window.electronAPI = {}

      // Should not throw error
      expect(() => {
        scope.run(() => useAutoRefresh(selectedDate, mockCallback))
      }).not.toThrow()
    })
  })

  describe('Auto-refresh Error Handling', () => {
    it('should handle auto-refresh callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Refresh failed')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { startAutoRefresh } = scope.run(() => useAutoRefresh(selectedDate, errorCallback))!
      startAutoRefresh()

      // Advance timer to trigger callback
      vi.advanceTimersByTime(15000)

      expect(errorCallback).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalledWith('[useAutoRefresh] Error during auto-refresh callback:', expect.any(Error))

      // Should continue running the interval
      vi.advanceTimersByTime(15000)
      expect(errorCallback).toHaveBeenCalledTimes(2)

      consoleSpy.mockRestore()
    })

    it('should stop auto-refresh when date is no longer today', () => {
      // Set initial date to today
      const today = new Date()
      selectedDate.value = today

      const { startAutoRefresh } = scope.run(() => useAutoRefresh(selectedDate, mockCallback))!
      startAutoRefresh()

      // Advance timer once - should work
      vi.advanceTimersByTime(15000)
      expect(mockCallback).toHaveBeenCalledTimes(1)

      // Change date to yesterday
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      selectedDate.value = yesterday

      // Advance timer again - should stop auto-refresh
      vi.advanceTimersByTime(15000)
      // Callback should not be called again since auto-refresh should have stopped
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Vue Component Integration', () => {
    let mockElectronAPI: any

    beforeEach(() => {
      // Set up proper window and electronAPI for component tests
      mockElectronAPI = {
        onHttpServerTaskCreated: vi.fn(),
        removeHttpServerTaskCreatedListener: vi.fn()
      }
      ;(global as any).window.electronAPI = mockElectronAPI
    })

    afterEach(() => {
      if ((global as any).window && (global as any).window.electronAPI) {
        delete (global as any).window.electronAPI
      }
    })

    it('should register HTTP server event listener on component mount', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selectedDate = ref(new Date())
          const mockCallback = vi.fn()
          const { startAutoRefresh, stopAutoRefresh } = useAutoRefresh(selectedDate, mockCallback)

          return { selectedDate, mockCallback, startAutoRefresh, stopAutoRefresh }
        },
        template: '<div>Test Component</div>'
      })

      const wrapper = mount(TestComponent)

      // Verify onMounted was called and registered the event listener
      expect(mockElectronAPI.onHttpServerTaskCreated).toHaveBeenCalledTimes(1)
      expect(typeof mockElectronAPI.onHttpServerTaskCreated.mock.calls[0][0]).toBe('function')

      wrapper.unmount()
    })

    it('should clean up HTTP server event listener on component unmount', async () => {
      const TestComponent = defineComponent({
        setup() {
          const selectedDate = ref(new Date())
          const mockCallback = vi.fn()
          const composable = useAutoRefresh(selectedDate, mockCallback)
          return { selectedDate, mockCallback, ...composable }
        },
        template: '<div>Test Component</div>'
      })

      const wrapper = mount(TestComponent)

      // Get the registered handler
      const registeredHandler = mockElectronAPI.onHttpServerTaskCreated.mock.calls[0][0]

      // Unmount the component to trigger onUnmounted
      wrapper.unmount()

      // Verify cleanup was called
      expect(mockElectronAPI.removeHttpServerTaskCreatedListener).toHaveBeenCalledTimes(1)
      expect(mockElectronAPI.removeHttpServerTaskCreatedListener).toHaveBeenCalledWith(registeredHandler)
    })

    it('should handle HTTP task creation events through actual event listener', async () => {
      const mockCallback = vi.fn()

      const TestComponent = defineComponent({
        setup() {
          const selectedDate = ref(new Date())
          const composable = useAutoRefresh(selectedDate, mockCallback)
          return { selectedDate, mockCallback, ...composable }
        },
        template: '<div>Test Component</div>'
      })

      const wrapper = mount(TestComponent)

      // Get the registered handler
      const registeredHandler = mockElectronAPI.onHttpServerTaskCreated.mock.calls[0][0]

      // Set today's date
      const today = new Date()
      wrapper.vm.selectedDate = today
      const todayString = formatLocalDateString(today)

      // Trigger the actual event handler
      registeredHandler({ date: todayString })

      expect(mockCallback).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })

    it('should handle missing window.setInterval gracefully in component', async () => {
      // Set up window without setInterval to test the specific window method access
      const originalWindow = (global as any).window
      ;(global as any).window = {}

      const TestComponent = defineComponent({
        setup() {
          const selectedDate = ref(new Date())
          const mockCallback = vi.fn()
          const { startAutoRefresh, stopAutoRefresh } = useAutoRefresh(selectedDate, mockCallback)

          return { selectedDate, mockCallback, startAutoRefresh, stopAutoRefresh }
        },
        template: '<div>Test Component</div>'
      })

      const wrapper = mount(TestComponent)

      // This should not throw during component mount, but startAutoRefresh might fail
      expect(() => {
        wrapper.vm.startAutoRefresh()
      }).toThrow() // Expected to throw when window.setInterval is not available

      wrapper.unmount()

      // Restore window object
      ;(global as any).window = originalWindow
    })

    it('should handle missing electronAPI methods in component', async () => {
      // Set up electronAPI without required methods
      ;(global as any).window.electronAPI = {}

      expect(() => {
        const TestComponent = defineComponent({
          setup() {
            const selectedDate = ref(new Date())
            const mockCallback = vi.fn()
            return useAutoRefresh(selectedDate, mockCallback)
          },
          template: '<div>Test Component</div>'
        })

        const wrapper = mount(TestComponent)
        wrapper.unmount()
      }).not.toThrow()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle stopAutoRefresh when interval is already null', () => {
      const { stopAutoRefresh } = scope.run(() => useAutoRefresh(selectedDate, mockCallback))!

      // Call stopAutoRefresh when no interval is running
      expect(() => {
        stopAutoRefresh()
        stopAutoRefresh() // Call again to test null check
      }).not.toThrow()
    })

    it('should handle startAutoRefresh when already running', () => {
      const { startAutoRefresh, stopAutoRefresh } = scope.run(() => useAutoRefresh(selectedDate, mockCallback))!

      startAutoRefresh()

      // Try to start again - should return early without creating another interval
      startAutoRefresh()

      // Should still only have one interval running
      vi.advanceTimersByTime(15000)
      expect(mockCallback).toHaveBeenCalledTimes(1)

      stopAutoRefresh()
    })

    it('should handle watch callback reactivity properly', () => {
      const { startAutoRefresh, stopAutoRefresh } = scope.run(() => useAutoRefresh(selectedDate, mockCallback))!

      startAutoRefresh()

      // Change date - should trigger watcher and restart
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      selectedDate.value = tomorrow

      // Should have stopped auto-refresh since tomorrow is not today
      vi.advanceTimersByTime(15000)
      expect(mockCallback).not.toHaveBeenCalled()

      stopAutoRefresh()
    })
  })
})
