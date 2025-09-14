import { ref, onMounted, onUnmounted, type Ref } from 'vue'

type Theme = 'light' | 'dark' | 'auto'

export function useSettings() {
  const currentTheme: Ref<Theme> = ref('auto')
  const tempTheme: Ref<Theme> = ref('auto')
  const targetWorkHours = ref(8)
  const tempTargetWorkHours = ref(8)
  const reportingAppButtonText = ref('Tempo')
  const reportingAppUrl = ref('')
  const tempReportingAppButtonText = ref('Tempo')
  const tempReportingAppUrl = ref('')

  // Media query for OS theme detection
  let mediaQueryList: MediaQueryList | null = null
  let usedModernAPI = false

  /**
   * Validate URL format
   */
  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true // Empty URL is allowed
    try {
      // Add https:// if no protocol specified
      const urlToTest = url.match(/^https?:\/\//) ? url : `https://${url}`
      new URL(urlToTest)
      return true
    } catch {
      return false
    }
  }

  /**
   * Handle OS theme changes
   */
  const handleOSThemeChange = () => {
    // Only re-apply theme if current theme is set to 'auto'
    if (currentTheme.value === 'auto') {
      applyTheme('auto')
    }
  }

  /**
   * Apply theme to document root
   */
  const applyTheme = (theme: Theme) => {
    // Guard against non-browser environments
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const root = document.documentElement
    let resolvedTheme = theme

    if (theme === 'auto') {
      const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
      resolvedTheme = prefersDark ? 'dark' : 'light'
    }

    // Set color-scheme for native UI elements
    root.style.setProperty('color-scheme', resolvedTheme)

    // Set color palette (same for both themes)
    root.style.setProperty('--verdigris', '#57bdaf')
    root.style.setProperty('--mantis', '#59c964')
    root.style.setProperty('--asparagus', '#69966f')
    root.style.setProperty('--emerald', '#56b372')
    root.style.setProperty('--aero', '#1fbff0')
    root.style.setProperty('--primary', '#57bdaf') // verdigris

    if (resolvedTheme === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1f2e')
      root.style.setProperty('--bg-secondary', '#232937')
      root.style.setProperty('--text-primary', '#e8f0ed')
      root.style.setProperty('--text-secondary', '#b8c5bf')
      root.style.setProperty('--text-muted', '#8a9690')
      root.style.setProperty('--border-color', '#3a4249')
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)')
    } else {
      root.style.setProperty('--bg-primary', '#ffffff')
      root.style.setProperty('--bg-secondary', '#f8fffe')
      root.style.setProperty('--text-primary', '#2d4a3d')
      root.style.setProperty('--text-secondary', '#4a6b56')
      root.style.setProperty('--text-muted', '#7a9184')
      root.style.setProperty('--border-color', '#e0ede8')
      root.style.setProperty('--shadow-color', 'rgba(87, 189, 175, 0.1)')
    }
  }

  /**
   * Load settings from localStorage
   */
  const loadSettings = () => {
    // Load theme
    const savedTheme = localStorage.getItem('theme')
    if (typeof savedTheme === 'string' && ['light', 'dark', 'auto'].includes(savedTheme)) {
      currentTheme.value = savedTheme as Theme
    }

    // Load target work hours
    const savedTargetHours = localStorage.getItem('targetWorkHours')
    if (savedTargetHours) {
      const hours = parseFloat(savedTargetHours)
      if (!isNaN(hours) && hours > 0 && hours <= 24) {
        targetWorkHours.value = hours
      }
    }

    // Load reporting app settings
    const savedButtonText = localStorage.getItem('reportingAppButtonText')
    if (savedButtonText) {
      reportingAppButtonText.value = savedButtonText
    }

    const savedUrl = localStorage.getItem('reportingAppUrl')
    if (savedUrl) {
      reportingAppUrl.value = savedUrl
    }

    applyTheme(currentTheme.value)
  }

  /**
   * Save settings to localStorage
   */
  const saveSettings = () => {
    // Validate and update theme
    currentTheme.value = tempTheme.value

    // Validate tempTargetWorkHours before committing (coerce to number first)
    const coerced = Number(tempTargetWorkHours.value)
    if (Number.isFinite(coerced) && coerced > 0 && coerced <= 24) {
      targetWorkHours.value = coerced
    } else {
      // Keep old value or use safe default if current value is also invalid
      if (!Number.isFinite(targetWorkHours.value) || targetWorkHours.value <= 0 || targetWorkHours.value > 24) {
        targetWorkHours.value = 8 // Safe default
      }
      // Note: tempTargetWorkHours remains invalid, targetWorkHours keeps valid value
    }

    // Validate and update reporting app settings
    reportingAppButtonText.value = tempReportingAppButtonText.value.trim() || 'Tempo'
    if (isValidUrl(tempReportingAppUrl.value)) {
      reportingAppUrl.value = tempReportingAppUrl.value.trim()
    }

    applyTheme(currentTheme.value)
    localStorage.setItem('theme', currentTheme.value)
    localStorage.setItem('targetWorkHours', targetWorkHours.value.toString())
    localStorage.setItem('reportingAppButtonText', reportingAppButtonText.value)
    localStorage.setItem('reportingAppUrl', reportingAppUrl.value)
  }

  /**
   * Initialize temporary settings with current values
   */
  const initializeTempSettings = () => {
    tempTheme.value = currentTheme.value
    tempTargetWorkHours.value = targetWorkHours.value
    tempReportingAppButtonText.value = reportingAppButtonText.value
    tempReportingAppUrl.value = reportingAppUrl.value
  }

  // Load settings on mount and setup OS theme detection
  onMounted(() => {
    loadSettings()

    // Set up OS theme change detection
    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener('change', handleOSThemeChange)
        usedModernAPI = true
      } else {
        // Fallback for older Safari
        mediaQueryList.addListener(handleOSThemeChange)
        usedModernAPI = false
      }
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    if (mediaQueryList) {
      if (usedModernAPI) {
        mediaQueryList.removeEventListener('change', handleOSThemeChange)
      } else {
        // Fallback for older Safari
        mediaQueryList.removeListener(handleOSThemeChange)
      }
      mediaQueryList = null
    }
  })

  return {
    currentTheme,
    tempTheme,
    targetWorkHours,
    tempTargetWorkHours,
    reportingAppButtonText,
    reportingAppUrl,
    tempReportingAppButtonText,
    tempReportingAppUrl,
    isValidUrl,
    applyTheme,
    loadSettings,
    saveSettings,
    initializeTempSettings
  }
}
