import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSettings } from './useSettings'

describe('useSettings HTTP Server functionality', () => {
  let localStorageMock: Record<string, string | undefined>
  let setItemSpy: any
  let getItemSpy: any
  let removeItemSpy: any

  beforeEach(() => {
    localStorageMock = {}
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => {
      localStorageMock[k] = v
    })
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(k => localStorageMock[k] ?? null)
    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(k => {
      delete localStorageMock[k]
    })

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('default values', () => {
    it('should have correct default HTTP server settings', () => {
      const { httpServerEnabled, httpServerPort, tempHttpServerEnabled, tempHttpServerPort } = useSettings()

      expect(httpServerEnabled.value).toBe(false)
      expect(httpServerPort.value).toBe(14474)
      expect(tempHttpServerEnabled.value).toBe(false)
      expect(tempHttpServerPort.value).toBe(14474)
    })
  })

  describe('loading from localStorage', () => {
    it('should load HTTP server enabled setting from localStorage', () => {
      localStorageMock['httpServerEnabled'] = 'true'

      const { httpServerEnabled, loadSettings } = useSettings()
      loadSettings()
      expect(httpServerEnabled.value).toBe(true)
    })

    it('should load HTTP server port from localStorage', () => {
      localStorageMock['httpServerPort'] = '8080'

      const { httpServerPort, loadSettings } = useSettings()
      loadSettings()
      expect(httpServerPort.value).toBe(8080)
    })

    it('should reject invalid HTTP server enabled values', () => {
      localStorageMock['httpServerEnabled'] = 'maybe'

      const { httpServerEnabled, loadSettings } = useSettings()
      loadSettings()
      expect(httpServerEnabled.value).toBe(false) // Should keep default
    })

    it('should reject invalid HTTP server ports', () => {
      localStorageMock['httpServerPort'] = '80' // Below 1024

      const { httpServerPort, loadSettings } = useSettings()
      loadSettings()
      expect(httpServerPort.value).toBe(14474) // Should keep default
    })
  })

  describe('port validation', () => {
    it('should validate HTTP ports correctly', () => {
      const { isValidHttpPort } = useSettings()

      // Valid ports
      expect(isValidHttpPort(1024)).toBe(true)
      expect(isValidHttpPort(8080)).toBe(true)
      expect(isValidHttpPort(65535)).toBe(true)
      expect(isValidHttpPort(14474)).toBe(true)

      // Invalid ports
      expect(isValidHttpPort(1023)).toBe(false)
      expect(isValidHttpPort(65536)).toBe(false)
      expect(isValidHttpPort(0)).toBe(false)
      expect(isValidHttpPort(-1)).toBe(false)

      // Invalid types
      expect(isValidHttpPort('8080')).toBe(false)
      expect(isValidHttpPort(null)).toBe(false)
      expect(isValidHttpPort(undefined)).toBe(false)
      expect(isValidHttpPort(8080.5)).toBe(false)
    })
  })

  describe('saving settings', () => {
    it('should save valid HTTP server settings', () => {
      const { tempHttpServerEnabled, tempHttpServerPort, saveSettings } = useSettings()

      tempHttpServerEnabled.value = true
      tempHttpServerPort.value = 8080

      saveSettings()

      expect(setItemSpy).toHaveBeenCalledWith('httpServerEnabled', 'true')
      expect(setItemSpy).toHaveBeenCalledWith('httpServerPort', '8080')
    })

    it('should handle invalid HTTP server port during save', () => {
      const { tempHttpServerPort, httpServerPort, saveSettings } = useSettings()

      tempHttpServerPort.value = 80 // Invalid port

      saveSettings()

      // Should keep default valid port
      expect(httpServerPort.value).toBe(14474)
      expect(setItemSpy).toHaveBeenCalledWith('httpServerPort', '14474')
    })
  })

  describe('initialization', () => {
    it('should initialize temp settings correctly', () => {
      const { httpServerEnabled, httpServerPort, tempHttpServerEnabled, tempHttpServerPort, initializeTempSettings } =
        useSettings()

      httpServerEnabled.value = true
      httpServerPort.value = 8080

      initializeTempSettings()

      expect(tempHttpServerEnabled.value).toBe(true)
      expect(tempHttpServerPort.value).toBe(8080)
    })
  })

  describe('settings restoration', () => {
    it('should restore HTTP server settings from backup', () => {
      const { httpServerEnabled, httpServerPort, applyRestoredSettings } = useSettings()

      const restoredSettings = {
        theme: 'dark' as const,
        targetWorkHours: 8,
        reportingAppButtonText: 'Test',
        reportingAppUrl: '',
        evictionEnabled: true,
        evictionDaysToKeep: 180,
        httpServerEnabled: true,
        httpServerPort: 8080
      }

      applyRestoredSettings(restoredSettings)

      expect(httpServerEnabled.value).toBe(true)
      expect(httpServerPort.value).toBe(8080)
      expect(setItemSpy).toHaveBeenCalledWith('httpServerEnabled', 'true')
      expect(setItemSpy).toHaveBeenCalledWith('httpServerPort', '8080')
    })

    it('should reject invalid HTTP server settings during restoration', () => {
      const { httpServerEnabled, httpServerPort, applyRestoredSettings } = useSettings()

      const invalidSettings = {
        theme: 'dark' as const,
        targetWorkHours: 8,
        reportingAppButtonText: 'Test',
        reportingAppUrl: '',
        evictionEnabled: true,
        evictionDaysToKeep: 180,
        httpServerEnabled: 'maybe' as any, // Invalid
        httpServerPort: 80 // Invalid
      }

      applyRestoredSettings(invalidSettings)

      expect(httpServerEnabled.value).toBe(false) // Should keep default
      expect(httpServerPort.value).toBe(14474) // Should keep default
    })
  })
})
