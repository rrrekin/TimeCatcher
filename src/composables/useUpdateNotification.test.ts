import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useUpdateNotification } from './useUpdateNotification'
import type { UpdateCheckResult, ReleaseInfo } from '../shared/types'

// Mock data helpers
const createMockReleaseInfo = (version = '1.1.0'): ReleaseInfo => ({
  version,
  publishedAt: '2023-01-01T00:00:00Z',
  htmlUrl: `https://github.com/test/repo/releases/tag/v${version}`,
  downloadUrl: `https://github.com/test/repo/releases/download/v${version}/test.dmg`,
  body: 'New features and bug fixes'
})

const createMockUpdateResult = (hasUpdate = true, version = '1.1.0'): UpdateCheckResult => ({
  hasUpdate,
  currentVersion: '1.0.0',
  latestVersion: version,
  releaseInfo: hasUpdate ? createMockReleaseInfo(version) : undefined
})

// Mock implementations
const mockElectronAPI = {
  checkForUpdates: vi.fn(),
  openExternalUrl: vi.fn()
}

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

// Remove manual timer mocks - Vitest will handle this

// Test wrapper component
const TestComponent = defineComponent({
  setup() {
    const composable = useUpdateNotification()
    return {
      ...composable
    }
  },
  template: '<div>Test</div>'
})

describe('useUpdateNotification', () => {
  let wrapper: any

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1609459200000)) // 2021-01-01 00:00:00
    vi.clearAllMocks()

    // Reset mock implementations
    mockLocalStorage.getItem.mockReturnValue(null)
    mockLocalStorage.setItem.mockImplementation(() => {}) // Default: no error
    mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(false))

    // Mock window objects
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    })

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with default values', async () => {
      // Mock to prevent initial API call from affecting test
      mockElectronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {})) // Never resolves

      wrapper = mount(TestComponent)
      await nextTick()

      // Values before any API call completes
      expect(wrapper.vm.hasUpdate).toBe(false)
      expect(wrapper.vm.releaseInfo).toBe(null)
      expect(wrapper.vm.lastCheckTime).toBe(null)
      expect(wrapper.vm.error).toBe(null)
      expect(wrapper.vm.shouldShowNotification).toBe(false)
    })

    it('should load settings from localStorage on mount', async () => {
      const timestamp = 1609459200000 // Fixed timestamp
      const dismissedVersions = ['1.0.5', '1.0.6']

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return timestamp.toString()
        if (key === 'updateCheck.dismissedVersions') return JSON.stringify(dismissedVersions)
        return null
      })

      // Prevent initial check to isolate storage loading
      mockElectronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('updateCheck.lastCheck')
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('updateCheck.dismissedVersions')
      expect(wrapper.vm.lastCheckTime?.getTime()).toBe(timestamp)
    })

    it('should handle invalid localStorage data gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return 'invalid-timestamp'
        if (key === 'updateCheck.dismissedVersions') return 'invalid-json'
        return null
      })

      // Prevent initial check to isolate storage loading
      mockElectronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.lastCheckTime).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load update notification settings from storage:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should check for updates immediately on mount', async () => {
      wrapper = mount(TestComponent)
      await nextTick()

      expect(mockElectronAPI.checkForUpdates).toHaveBeenCalledTimes(1)
    })

    it('should start periodic checking on mount', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      wrapper = mount(TestComponent)
      await nextTick()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60 * 1000)

      setIntervalSpy.mockRestore()
    })

    it('should clean up interval on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      wrapper = mount(TestComponent)
      await nextTick()

      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
    })
  })

  describe('Storage Operations', () => {
    it('should load valid timestamp from localStorage', async () => {
      const timestamp = 1609459200000 // Fixed timestamp
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return timestamp.toString()
        return null
      })

      // Prevent initial check to isolate storage loading
      mockElectronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.lastCheckTime?.getTime()).toBe(timestamp)
    })

    it('should ignore invalid timestamp from localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return 'not-a-number'
        return null
      })

      // Prevent initial check to isolate storage test
      mockElectronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.lastCheckTime).toBe(null)
    })

    it('should load dismissed versions from localStorage', async () => {
      const dismissedVersions = ['1.0.5', '1.0.6']
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.dismissedVersions') return JSON.stringify(dismissedVersions)
        return null
      })

      // Set up a release and check that it's dismissed
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(true, '1.0.5'))

      wrapper = mount(TestComponent)
      await nextTick()

      // Should not show notification for dismissed version
      expect(wrapper.vm.shouldShowNotification).toBe(false)
    })

    it('should handle invalid dismissed versions array', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.dismissedVersions') return 'not-an-array'
        return null
      })

      wrapper = mount(TestComponent)
      await nextTick()

      // Should not crash and should work normally
      expect(wrapper.vm.shouldShowNotification).toBe(false)
    })

    it('should save to storage after successful update check', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(false))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('updateCheck.lastCheck', expect.any(String))
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('updateCheck.dismissedVersions', '[]')
    })

    it('should handle storage save errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // First mount without error to initialize
      wrapper = mount(TestComponent)
      await nextTick()

      // Now set up the error and trigger save
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      // Trigger a save operation
      await wrapper.vm.checkForUpdates(true)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save update notification settings to storage:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Update Checking Logic', () => {
    it('should update state when update is available', async () => {
      const mockResult = createMockUpdateResult(true, '1.2.0')
      mockElectronAPI.checkForUpdates.mockResolvedValue(mockResult)

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.hasUpdate).toBe(true)
      expect(wrapper.vm.currentVersion).toBe('1.0.0')
      expect(wrapper.vm.latestVersion).toBe('1.2.0')
      expect(wrapper.vm.releaseInfo).toEqual(mockResult.releaseInfo)
      expect(wrapper.vm.shouldShowNotification).toBe(true)
    })

    it('should update state when no update is available', async () => {
      const mockResult = createMockUpdateResult(false)
      mockElectronAPI.checkForUpdates.mockResolvedValue(mockResult)

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.hasUpdate).toBe(false)
      expect(wrapper.vm.currentVersion).toBe('1.0.0')
      expect(wrapper.vm.latestVersion).toBe('1.1.0')
      expect(wrapper.vm.releaseInfo).toBe(null)
      expect(wrapper.vm.shouldShowNotification).toBe(false)
    })

    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorMessage = 'Network error'
      mockElectronAPI.checkForUpdates.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.error).toBe(errorMessage)
      expect(wrapper.vm.hasUpdate).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to check for updates:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })

    it('should handle missing electronAPI', async () => {
      delete (window as any).electronAPI

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.error).toBe('Update check API not available')
      expect(wrapper.vm.hasUpdate).toBe(false)

      // Restore for other tests
      window.electronAPI = mockElectronAPI
    })

    it('should handle missing checkForUpdates method', async () => {
      const originalMethod = mockElectronAPI.checkForUpdates
      delete (mockElectronAPI as any).checkForUpdates

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.error).toBe('Update check API not available')

      // Restore for other tests
      mockElectronAPI.checkForUpdates = originalMethod
    })

    it('should set isCheckingForUpdates during check', async () => {
      let resolvePromise: (value: UpdateCheckResult) => void
      const promise = new Promise<UpdateCheckResult>(resolve => {
        resolvePromise = resolve
      })
      mockElectronAPI.checkForUpdates.mockReturnValue(promise)

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.isCheckingForUpdates).toBe(true)

      resolvePromise!(createMockUpdateResult(false))
      await nextTick()

      expect(wrapper.vm.isCheckingForUpdates).toBe(false)
    })

    it('should prevent concurrent checks', async () => {
      // Make the first call hang
      const promise1 = new Promise(() => {}) // Never resolves
      mockElectronAPI.checkForUpdates.mockReturnValueOnce(promise1)

      wrapper = mount(TestComponent)
      await nextTick()

      // Clear the call from mount
      mockElectronAPI.checkForUpdates.mockClear()

      // Try to trigger another check
      await wrapper.vm.checkForUpdates(true)

      // Should not have been called again due to concurrent check prevention
      expect(mockElectronAPI.checkForUpdates).not.toHaveBeenCalled()
    })

    it('should skip check if not forced and too recent', async () => {
      // Set last check to 1 hour ago (less than 24 hours)
      const recentTime = Date.now() - 60 * 60 * 1000
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return recentTime.toString()
        return null
      })

      wrapper = mount(TestComponent)
      await nextTick()

      // Clear the initial mount call
      mockElectronAPI.checkForUpdates.mockClear()

      // Try non-forced check
      await wrapper.vm.checkForUpdates(false)

      expect(mockElectronAPI.checkForUpdates).not.toHaveBeenCalled()
    })

    it('should check if forced even if recent', async () => {
      // Set last check to 1 hour ago
      const recentTime = Date.now() - 60 * 60 * 1000
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return recentTime.toString()
        return null
      })

      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(false))

      wrapper = mount(TestComponent)
      await nextTick()

      // Clear the initial mount call
      mockElectronAPI.checkForUpdates.mockClear()

      // Forced check should work
      await wrapper.vm.checkForUpdates(true)

      expect(mockElectronAPI.checkForUpdates).toHaveBeenCalledTimes(1)
    })

    it('should check if enough time has passed', async () => {
      // Set last check to 25 hours ago (more than 24 hours)
      const currentTime = 1609459200000 // 2021-01-01 00:00:00
      const oldTime = currentTime - 25 * 60 * 60 * 1000
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return oldTime.toString()
        return null
      })

      // Let initial check resolve properly
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(false))

      wrapper = mount(TestComponent)
      await nextTick()

      // Wait for initial check to complete so isCheckingForUpdates resets to false
      await wrapper.vm.$nextTick()

      // After initial check completes, manually set lastCheckTime to 25 hours ago
      // to simulate the elapsed time condition
      wrapper.vm.lastCheckTime = new Date(oldTime)

      // Clear the initial mount call to count only the follow-up call
      mockElectronAPI.checkForUpdates.mockClear()

      // Non-forced check should work due to time elapsed
      await wrapper.vm.checkForUpdates(false)

      expect(mockElectronAPI.checkForUpdates).toHaveBeenCalledTimes(1)
    })
  })

  describe('Computed Properties', () => {
    it('should show notification when update available and not dismissed', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(true, '1.2.0'))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.shouldShowNotification).toBe(true)
    })

    it('should not show notification when update is dismissed', async () => {
      const dismissedVersions = ['1.2.0']
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.dismissedVersions') return JSON.stringify(dismissedVersions)
        return null
      })

      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(true, '1.2.0'))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.shouldShowNotification).toBe(false)
    })

    it('should not show notification when no update available', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(false))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.shouldShowNotification).toBe(false)
    })

    it('should not show notification when no release info', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        releaseInfo: null
      })

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.shouldShowNotification).toBeFalsy()
    })
  })

  describe('User Actions', () => {
    it('should dismiss current update and save to storage', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(true, '1.2.0'))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.shouldShowNotification).toBe(true)

      // Clear previous calls from initialization
      mockLocalStorage.setItem.mockClear()

      wrapper.vm.dismissCurrentUpdate()
      await nextTick()

      expect(wrapper.vm.shouldShowNotification).toBe(false)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('updateCheck.dismissedVersions', JSON.stringify(['1.2.0']))
    })

    it('should do nothing when dismissing with no release info', async () => {
      wrapper = mount(TestComponent)
      await nextTick()

      // Clear previous calls from initialization
      mockLocalStorage.setItem.mockClear()

      wrapper.vm.dismissCurrentUpdate()
      await nextTick()

      // Should not have made any storage calls
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })

    it('should dismiss specific version', async () => {
      wrapper = mount(TestComponent)
      await nextTick()

      // Clear previous calls from initialization
      mockLocalStorage.setItem.mockClear()

      wrapper.vm.dismissVersion('1.3.0')
      await nextTick()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('updateCheck.dismissedVersions', JSON.stringify(['1.3.0']))
    })

    it('should clear all dismissed versions', async () => {
      // Start with some dismissed versions
      const dismissedVersions = ['1.0.5', '1.0.6']
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.dismissedVersions') return JSON.stringify(dismissedVersions)
        return null
      })

      wrapper = mount(TestComponent)
      await nextTick()

      // Clear previous calls from initialization
      mockLocalStorage.setItem.mockClear()

      wrapper.vm.clearDismissedVersions()
      await nextTick()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('updateCheck.dismissedVersions', '[]')
    })

    it('should open release page when available', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(true, '1.2.0'))

      wrapper = mount(TestComponent)
      await nextTick()

      wrapper.vm.openReleasePage()

      expect(mockElectronAPI.openExternalUrl).toHaveBeenCalledWith('https://github.com/test/repo/releases/tag/v1.2.0')
    })

    it('should do nothing when opening release page with no release info', async () => {
      wrapper = mount(TestComponent)
      await nextTick()

      wrapper.vm.openReleasePage()

      expect(mockElectronAPI.openExternalUrl).not.toHaveBeenCalled()
    })

    it('should handle missing openExternalUrl method', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(true, '1.2.0'))
      const originalMethod = mockElectronAPI.openExternalUrl
      delete (mockElectronAPI as any).openExternalUrl

      wrapper = mount(TestComponent)
      await nextTick()

      // Should not throw error
      expect(() => wrapper.vm.openReleasePage()).not.toThrow()

      // Restore for other tests
      mockElectronAPI.openExternalUrl = originalMethod
    })
  })

  describe('Interval Management', () => {
    it('should start periodic checking', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      wrapper = mount(TestComponent)
      await nextTick()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60 * 1000)

      setIntervalSpy.mockRestore()
    })

    it('should clear existing interval before starting new one', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      wrapper = mount(TestComponent)
      await nextTick()

      // Manually trigger startPeriodicCheck to test clearing logic
      // Since startPeriodicCheck is not exposed, we test the behavior through unmount/remount
      wrapper.unmount()

      wrapper = mount(TestComponent)
      await nextTick()

      expect(clearIntervalSpy).toHaveBeenCalled()
      expect(setIntervalSpy).toHaveBeenCalledTimes(2)

      setIntervalSpy.mockRestore()
      clearIntervalSpy.mockRestore()
    })

    it('should trigger periodic check through interval callback', async () => {
      // Set last check to old time so periodic check will proceed
      const oldTime = 1609459200000 - 25 * 60 * 60 * 1000 // 25 hours ago
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return oldTime.toString()
        return null
      })

      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      // Prevent initial check during mount
      mockElectronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(TestComponent)
      await nextTick()

      // Restore the mock to return a proper result for the interval callback
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(false))

      // Get the callback function passed to setInterval
      const intervalCallback = setIntervalSpy.mock.calls[0][0] as Function

      // Execute the callback
      await intervalCallback()

      expect(mockElectronAPI.checkForUpdates).toHaveBeenCalledTimes(1)

      setIntervalSpy.mockRestore()
    })

    it('should stop periodic checking on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      wrapper = mount(TestComponent)
      await nextTick()

      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle non-Error exceptions gracefully', async () => {
      mockElectronAPI.checkForUpdates.mockRejectedValue('String error')

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.error).toBe('Unknown error occurred')
    })

    it('should clear error on successful check after previous error', async () => {
      // First call fails
      mockElectronAPI.checkForUpdates.mockRejectedValueOnce(new Error('Network error'))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.error).toBe('Network error')

      // Second call succeeds
      mockElectronAPI.checkForUpdates.mockResolvedValue(createMockUpdateResult(false))
      await wrapper.vm.checkForUpdates(true)

      expect(wrapper.vm.error).toBe(null)
    })

    it('should handle result with error field', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue({
        hasUpdate: false,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        error: 'API rate limit exceeded'
      })

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.error).toBe('API rate limit exceeded')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing latestVersion in result', async () => {
      mockElectronAPI.checkForUpdates.mockResolvedValue({
        hasUpdate: false,
        currentVersion: '1.0.0'
        // latestVersion is missing
      } as any)

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.latestVersion).toBe('1.0.0') // Should fallback to currentVersion
    })

    it('should handle storage getItem returning non-null but empty string', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return ''
        if (key === 'updateCheck.dismissedVersions') return ''
        return null
      })

      // Prevent initial check to isolate storage test
      mockElectronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(TestComponent)
      await nextTick()

      // Should handle gracefully without errors
      expect(wrapper.vm.lastCheckTime).toBe(null)
    })

    it('should handle very large timestamp values', async () => {
      const largeTimestamp = 8640000000000000 // Maximum valid timestamp for Date (year 275760)
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'updateCheck.lastCheck') return largeTimestamp.toString()
        return null
      })

      // Prevent initial check to isolate storage test
      mockElectronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(TestComponent)
      await nextTick()

      expect(wrapper.vm.lastCheckTime?.getTime()).toBe(largeTimestamp)
    })
  })
})
