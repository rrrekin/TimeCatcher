import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { UpdateCheckResult, ReleaseInfo } from '../shared/types'

export function useUpdateNotification() {
  // State
  const isCheckingForUpdates = ref(false)
  const hasUpdate = ref(false)
  const currentVersion = ref('')
  const latestVersion = ref('')
  const releaseInfo = ref<ReleaseInfo | null>(null)
  const lastCheckTime = ref<Date | null>(null)
  const error = ref<string | null>(null)
  const dismissedVersions = ref<Set<string>>(new Set())

  // Constants
  const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours (once daily)

  // Local storage keys
  const STORAGE_KEYS = {
    lastCheck: 'updateCheck.lastCheck',
    dismissedVersions: 'updateCheck.dismissedVersions'
  } as const

  let intervalId: number | null = null

  // Computed
  const shouldShowNotification = computed(() => {
    return hasUpdate.value && releaseInfo.value && !dismissedVersions.value.has(releaseInfo.value.version)
  })

  const timeSinceLastCheck = computed(() => {
    if (!lastCheckTime.value) return null
    return Date.now() - lastCheckTime.value.getTime()
  })

  const shouldCheckForUpdates = computed(() => {
    if (!lastCheckTime.value) return true
    return timeSinceLastCheck.value !== null && timeSinceLastCheck.value >= CHECK_INTERVAL
  })

  // Methods
  const loadFromStorage = () => {
    try {
      // Load last check time
      const lastCheckStored = localStorage.getItem(STORAGE_KEYS.lastCheck)
      if (lastCheckStored) {
        const timestamp = parseInt(lastCheckStored)
        if (!isNaN(timestamp)) {
          lastCheckTime.value = new Date(timestamp)
        }
      }

      // Load dismissed versions
      const dismissedStored = localStorage.getItem(STORAGE_KEYS.dismissedVersions)
      if (dismissedStored) {
        const parsed = JSON.parse(dismissedStored)
        if (Array.isArray(parsed)) {
          dismissedVersions.value = new Set(parsed)
        }
      }
    } catch (error) {
      console.warn('Failed to load update notification settings from storage:', error)
    }
  }

  const saveToStorage = () => {
    try {
      if (lastCheckTime.value) {
        localStorage.setItem(STORAGE_KEYS.lastCheck, lastCheckTime.value.getTime().toString())
      }

      localStorage.setItem(STORAGE_KEYS.dismissedVersions, JSON.stringify(Array.from(dismissedVersions.value)))
    } catch (error) {
      console.warn('Failed to save update notification settings to storage:', error)
    }
  }

  const checkForUpdates = async (force = false): Promise<void> => {
    if (!force && !shouldCheckForUpdates.value) {
      return
    }

    if (isCheckingForUpdates.value) {
      return
    }

    isCheckingForUpdates.value = true
    error.value = null

    try {
      if (!window.electronAPI?.checkForUpdates) {
        throw new Error('Update check API not available')
      }

      const result: UpdateCheckResult = await window.electronAPI.checkForUpdates()

      currentVersion.value = result.currentVersion
      latestVersion.value = result.latestVersion || result.currentVersion
      hasUpdate.value = result.hasUpdate
      releaseInfo.value = result.releaseInfo || null
      error.value = result.error || null

      lastCheckTime.value = new Date()
      saveToStorage()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Failed to check for updates:', err)
    } finally {
      isCheckingForUpdates.value = false
    }
  }

  const startPeriodicCheck = () => {
    // Clear any existing interval
    if (intervalId !== null) {
      clearInterval(intervalId)
    }

    // Set up new interval for daily checks
    intervalId = window.setInterval(() => {
      checkForUpdates(false)
    }, CHECK_INTERVAL)
  }

  const stopPeriodicCheck = () => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const dismissCurrentUpdate = () => {
    if (releaseInfo.value) {
      dismissedVersions.value.add(releaseInfo.value.version)
      saveToStorage()
    }
  }

  const dismissVersion = (version: string) => {
    dismissedVersions.value.add(version)
    saveToStorage()
  }

  const clearDismissedVersions = () => {
    dismissedVersions.value.clear()
    saveToStorage()
  }

  const openReleasePage = () => {
    if (releaseInfo.value?.htmlUrl) {
      window.electronAPI?.openExternalUrl?.(releaseInfo.value.htmlUrl)
    }
  }

  // Initialize
  onMounted(() => {
    loadFromStorage()

    // Always check immediately after application start
    checkForUpdates(true)

    // Start periodic checking
    startPeriodicCheck()
  })

  onUnmounted(() => {
    stopPeriodicCheck()
  })

  // Public API
  return {
    // State
    isCheckingForUpdates,
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseInfo,
    lastCheckTime,
    error,
    shouldShowNotification,

    // Methods
    checkForUpdates,
    dismissCurrentUpdate,
    dismissVersion,
    openReleasePage,
    clearDismissedVersions
  }
}
