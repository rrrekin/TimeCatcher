import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { SettingsSnapshot } from '@/shared/types'

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
  const evictionEnabled = ref(true)
  const tempEvictionEnabled = ref(true)
  const evictionDaysToKeep = ref(180)
  const tempEvictionDaysToKeep = ref(180)
  const httpServerEnabled = ref(false)
  const tempHttpServerEnabled = ref(false)
  const httpServerPort = ref(14474)
  const tempHttpServerPort = ref(14474)

  // Media query for OS theme detection
  let mediaQueryList: MediaQueryList | null = null
  let usedModernAPI = false

  /**
   * Validate URL format with internal trimming and local-address blocking.
   * Mirrors main-process checks and also blocks IPv6 loopback and link-local.
   */
  const isValidUrl = (url: string): boolean => {
    const trimmed = (url ?? '').trim()
    if (!trimmed) return false // Empty or whitespace-only URL is not allowed
    try {
      const parsedUrl = new URL(trimmed)
      // Only allow http and https protocols
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return false
      }

      // Additional security checks for shell.openExternal
      // Prevent localhost/local network access for security
      // Normalize hostname and strip IPv6 square brackets if present; also remove trailing dots
      let hostname = (parsedUrl.hostname || '').toLowerCase()
      if (hostname.startsWith('[') && hostname.endsWith(']')) {
        hostname = hostname.slice(1, -1)
      }
      // Remove any trailing dots (e.g., 'localhost.' -> 'localhost')
      hostname = hostname.replace(/\.+$/, '')

      // Normalize IPv4-mapped IPv6 dotted-quad forms (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
      const v4Mapped = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
      if (v4Mapped) {
        hostname = v4Mapped[1] ?? hostname
      }

      // Expanded local/private checks
      const isLocalhost = hostname === 'localhost'
      const isAnyV4 = hostname === '0.0.0.0'
      const isLoopbackV4 = /^127\./.test(hostname) // 127/8
      const isLinkLocalV4 = /^169\.254\./.test(hostname) // 169.254/16
      const isRfc1918 =
        /^192\.168\./.test(hostname) || /^10\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)
      const isLoopbackV6 = hostname === '::1'
      const isLinkLocalV6 = /^fe(8|9|a|b)/i.test(hostname) // fe80::/10 family
      // Any remaining IPv4-mapped IPv6 not in dotted form, or explicit 127.0.0.1 suffix
      const isV4MappedIPv6 = /^::ffff:/i.test(hostname) || /127\.0\.0\.1$/.test(hostname)

      if (
        isLocalhost ||
        isAnyV4 ||
        isLoopbackV4 ||
        isLinkLocalV4 ||
        isRfc1918 ||
        isLoopbackV6 ||
        isLinkLocalV6 ||
        isV4MappedIPv6
      ) {
        return false
      }

      // Ensure hostname looks valid: allow domains with dots, localhost, or IP addresses (IPv4/IPv6)
      const isIpAddress = (h: string): boolean => {
        const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/
        if (ipv4.test(h)) return true
        // Simple IPv6 heuristic: presence of ':' after normalization
        return h.includes(':')
      }
      const looksLikeDomain = hostname.includes('.')
      const isLocalHostName = hostname === 'localhost'
      if (!hostname || !(looksLikeDomain || isLocalHostName || isIpAddress(hostname))) {
        return false
      }
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

    const savedUrlRaw = localStorage.getItem('reportingAppUrl')
    // Validate persisted URL and only apply if valid. If invalid, clear value
    // and remove the bad entry to avoid stale/broken URLs in the UI.
    if (savedUrlRaw !== null) {
      const trimmed = savedUrlRaw.trim()
      if (!trimmed) {
        reportingAppUrl.value = ''
      } else if (isValidUrl(trimmed)) {
        reportingAppUrl.value = trimmed
      } else {
        reportingAppUrl.value = ''
        try {
          localStorage.removeItem('reportingAppUrl')
        } catch {
          // ignore storage removal errors
        }
      }
    }

    // Load eviction settings
    const savedEvictionEnabled = localStorage.getItem('evictionEnabled')
    if (savedEvictionEnabled !== null) {
      // Only accept explicit 'true' or 'false' strings; reject corrupted values
      if (savedEvictionEnabled === 'true') {
        evictionEnabled.value = true
      } else if (savedEvictionEnabled === 'false') {
        evictionEnabled.value = false
      }
      // If corrupted (e.g., 'maybe'), keep current/default value
    }

    const savedEvictionDaysToKeep = localStorage.getItem('evictionDaysToKeep')
    if (savedEvictionDaysToKeep !== null) {
      // Use Number() for consistency with save validation
      const days = Number(savedEvictionDaysToKeep)
      if (Number.isFinite(days) && days >= 30 && days <= 3650) {
        evictionDaysToKeep.value = Math.floor(days) // Normalize to integer
      }
    }

    // Load HTTP server settings
    const savedHttpServerEnabled = localStorage.getItem('httpServerEnabled')
    if (savedHttpServerEnabled !== null) {
      // Only accept explicit 'true' or 'false' strings; reject corrupted values
      if (savedHttpServerEnabled === 'true') {
        httpServerEnabled.value = true
      } else if (savedHttpServerEnabled === 'false') {
        httpServerEnabled.value = false
      }
      // If corrupted, keep current/default value (false)
    }

    const savedHttpServerPort = localStorage.getItem('httpServerPort')
    if (savedHttpServerPort !== null) {
      const port = Number(savedHttpServerPort)
      if (isValidHttpPort(port)) {
        httpServerPort.value = port
      }
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
    const trimmedUrl = tempReportingAppUrl.value.trim()
    if (!trimmedUrl || isValidUrl(trimmedUrl)) {
      reportingAppUrl.value = trimmedUrl
    }

    // Validate and update eviction settings
    evictionEnabled.value = tempEvictionEnabled.value
    const coercedDays = Number(tempEvictionDaysToKeep.value)
    if (Number.isFinite(coercedDays) && coercedDays >= 30 && coercedDays <= 3650) {
      evictionDaysToKeep.value = coercedDays
    } else {
      // Keep old value or use safe default if current value is also invalid
      if (
        !Number.isFinite(evictionDaysToKeep.value) ||
        evictionDaysToKeep.value < 30 ||
        evictionDaysToKeep.value > 3650
      ) {
        evictionDaysToKeep.value = 180 // Safe default
      }
      // Note: tempEvictionDaysToKeep remains invalid, evictionDaysToKeep keeps valid value
    }

    // Validate and update HTTP server settings
    httpServerEnabled.value = tempHttpServerEnabled.value
    const coercedPort = Number(tempHttpServerPort.value)
    if (isValidHttpPort(coercedPort)) {
      httpServerPort.value = coercedPort
    } else {
      // Keep old value or use safe default if current value is also invalid
      if (!isValidHttpPort(httpServerPort.value)) {
        httpServerPort.value = 14474 // Safe default
      }
      // Note: tempHttpServerPort remains invalid, httpServerPort keeps valid value
    }

    applyTheme(currentTheme.value)

    // Persist settings with error handling for storage quota/access issues
    try {
      localStorage.setItem('theme', currentTheme.value)
      localStorage.setItem('targetWorkHours', targetWorkHours.value.toString())
      localStorage.setItem('reportingAppButtonText', reportingAppButtonText.value)
      localStorage.setItem('reportingAppUrl', reportingAppUrl.value)
      localStorage.setItem('evictionEnabled', evictionEnabled.value.toString())
      localStorage.setItem('evictionDaysToKeep', evictionDaysToKeep.value.toString())
      localStorage.setItem('httpServerEnabled', httpServerEnabled.value.toString())
      localStorage.setItem('httpServerPort', httpServerPort.value.toString())
    } catch (error) {
      console.warn('Failed to persist settings to localStorage:', error)
      // Continue execution - theme is already applied and in-memory state is updated
    }
  }

  /**
   * Validate theme string
   */
  const isValidTheme = (value: unknown): value is Theme => {
    return typeof value === 'string' && ['light', 'dark', 'auto'].includes(value)
  }

  /**
   * Validate target work hours
   */
  const isValidTargetWorkHours = (value: unknown): value is number => {
    const num = Number(value)
    return Number.isFinite(num) && num > 0 && num <= 24
  }

  /**
   * Validate reporting app button text
   */
  const isValidButtonText = (value: unknown): boolean => {
    if (typeof value !== 'string') return false
    const trimmed = value.trim()
    return trimmed.length > 0 && trimmed.length <= 100 // reasonable length limit
  }

  /**
   * Validate eviction enabled setting
   */
  const isValidEvictionEnabled = (value: unknown): value is boolean => {
    return typeof value === 'boolean'
  }

  /**
   * Validate eviction days to keep (minimum 30 days)
   */
  const isValidEvictionDaysToKeep = (value: unknown): value is number => {
    const num = Number(value)
    return Number.isFinite(num) && num >= 30 && num <= 3650 // 30 days to 10 years
  }

  /**
   * Validate HTTP server port (unprivileged port range)
   */
  const isValidHttpPort = (value: unknown): value is number => {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return false
    }
    return value >= 1024 && value <= 65535
  }

  /**
   * Sanitize and validate restored settings with strict key whitelisting
   */
  const sanitizeRestoredSettings = (input: unknown): Partial<SettingsSnapshot> => {
    if (!input || typeof input !== 'object') {
      return {}
    }

    const settings = input as Record<string, unknown>
    const sanitized: Partial<SettingsSnapshot> = {}

    // Whitelist of allowed setting keys
    const allowedKeys: (keyof SettingsSnapshot)[] = [
      'theme',
      'targetWorkHours',
      'reportingAppButtonText',
      'reportingAppUrl',
      'evictionEnabled',
      'evictionDaysToKeep',
      'httpServerEnabled',
      'httpServerPort'
    ]

    for (const key of allowedKeys) {
      if (key in settings) {
        const value = settings[key]

        switch (key) {
          case 'theme':
            if (isValidTheme(value)) {
              sanitized.theme = value
            }
            break
          case 'targetWorkHours':
            if (isValidTargetWorkHours(value)) {
              sanitized.targetWorkHours = value
            }
            break
          case 'reportingAppButtonText':
            if (isValidButtonText(value)) {
              sanitized.reportingAppButtonText = String(value).trim()
            }
            break
          case 'reportingAppUrl':
            const urlStr = typeof value === 'string' ? value.trim() : ''
            // Empty string is valid (clears URL), only validate non-empty URLs
            if (urlStr === '' || isValidUrl(urlStr)) {
              sanitized.reportingAppUrl = urlStr
            }
            break
          case 'evictionEnabled':
            if (isValidEvictionEnabled(value)) {
              sanitized.evictionEnabled = value
            }
            break
          case 'evictionDaysToKeep':
            if (isValidEvictionDaysToKeep(value)) {
              sanitized.evictionDaysToKeep = value
            }
            break
          case 'httpServerEnabled':
            if (typeof value === 'boolean') {
              sanitized.httpServerEnabled = value
            }
            break
          case 'httpServerPort':
            if (isValidHttpPort(value)) {
              sanitized.httpServerPort = value
            }
            break
        }
      }
    }

    return sanitized
  }

  /**
   * Apply restored settings from backup: set values, validate, persist, and apply theme.
   */
  const applyRestoredSettings = (settings: Partial<SettingsSnapshot>) => {
    try {
      // Sanitize and validate all input with key whitelisting
      const sanitizedSettings = sanitizeRestoredSettings(settings)

      // Apply validated settings or keep current values as fallback
      const theme = sanitizedSettings.theme ?? currentTheme.value
      const hours = sanitizedSettings.targetWorkHours ?? targetWorkHours.value
      const buttonText = sanitizedSettings.reportingAppButtonText ?? reportingAppButtonText.value
      const url = sanitizedSettings.reportingAppUrl ?? reportingAppUrl.value
      const evictionEnabledValue = sanitizedSettings.evictionEnabled ?? evictionEnabled.value
      const evictionDaysValue = sanitizedSettings.evictionDaysToKeep ?? evictionDaysToKeep.value
      const httpEnabledValue = sanitizedSettings.httpServerEnabled ?? httpServerEnabled.value
      const httpPortValue = sanitizedSettings.httpServerPort ?? httpServerPort.value

      currentTheme.value = theme
      targetWorkHours.value = hours
      reportingAppButtonText.value = buttonText
      reportingAppUrl.value = url
      evictionEnabled.value = evictionEnabledValue
      evictionDaysToKeep.value = evictionDaysValue
      httpServerEnabled.value = httpEnabledValue
      httpServerPort.value = httpPortValue

      // Apply theme now
      applyTheme(currentTheme.value)

      // Persist with error handling for storage quota/access issues
      try {
        localStorage.setItem('theme', currentTheme.value)
        localStorage.setItem('targetWorkHours', targetWorkHours.value.toString())
        localStorage.setItem('reportingAppButtonText', reportingAppButtonText.value)
        localStorage.setItem('reportingAppUrl', reportingAppUrl.value)
        localStorage.setItem('evictionEnabled', evictionEnabled.value.toString())
        localStorage.setItem('evictionDaysToKeep', evictionDaysToKeep.value.toString())
        localStorage.setItem('httpServerEnabled', httpServerEnabled.value.toString())
        localStorage.setItem('httpServerPort', httpServerPort.value.toString())
      } catch (error) {
        console.warn('Failed to persist restored settings to localStorage:', error)
        // Continue execution - theme is already applied and in-memory state is updated
      }

      // Sync temps
      initializeTempSettings()
    } catch (e) {
      // Best-effort; do not throw in renderer composable
      console.warn('Failed to apply restored settings:', e)
    }
  }

  /**
   * Initialize temporary settings with current values
   */
  const initializeTempSettings = () => {
    tempTheme.value = currentTheme.value
    tempTargetWorkHours.value = targetWorkHours.value
    tempReportingAppButtonText.value = reportingAppButtonText.value
    tempReportingAppUrl.value = reportingAppUrl.value
    tempEvictionEnabled.value = evictionEnabled.value
    tempEvictionDaysToKeep.value = evictionDaysToKeep.value
    tempHttpServerEnabled.value = httpServerEnabled.value
    tempHttpServerPort.value = httpServerPort.value
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
    evictionEnabled,
    tempEvictionEnabled,
    evictionDaysToKeep,
    tempEvictionDaysToKeep,
    httpServerEnabled,
    tempHttpServerEnabled,
    httpServerPort,
    tempHttpServerPort,
    isValidUrl,
    isValidEvictionDaysToKeep,
    isValidHttpPort,
    applyTheme,
    loadSettings,
    saveSettings,
    applyRestoredSettings,
    initializeTempSettings
  }
}
