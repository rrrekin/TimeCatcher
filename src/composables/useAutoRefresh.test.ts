// Fixed duplicate imports
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope } from 'vue'
import { useAutoRefresh } from './useAutoRefresh'

describe('useAutoRefresh', () => {
  let mockCallback: ReturnType<typeof vi.fn>
  let selectedDate: ReturnType<typeof ref<Date>>
  let scope: ReturnType<typeof effectScope>

  beforeEach(() => {
    vi.useFakeTimers()
    mockCallback = vi.fn()
    selectedDate = ref(new Date())
    scope = effectScope()
  })

  afterEach(() => {
    vi.useRealTimers()
    scope.stop()
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
})
