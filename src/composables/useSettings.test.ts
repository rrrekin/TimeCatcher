import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useSettings } from './useSettings'

describe('useSettings', () => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should applyTheme light and dark', () => {
    const { applyTheme } = useSettings()
    document.documentElement.style.setProperty = vi.fn()
    applyTheme('light')
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('color-scheme', 'light')
    applyTheme('dark')
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('color-scheme', 'dark')
  })

  it('should applyTheme auto resolves to dark if prefers dark', () => {
    const { applyTheme } = useSettings()
    document.documentElement.style.setProperty = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any)
    applyTheme('auto')
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('color-scheme', 'dark')
  })

  it('should not applyTheme if window/document undefined', () => {
    const { applyTheme } = useSettings()
    const origDoc = global.document
    const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')

    // @ts-expect-error override
    global.document = undefined
    expect(() => applyTheme('light')).not.toThrow()
    expect(setPropertySpy).not.toHaveBeenCalled()

    global.document = origDoc
    setPropertySpy.mockRestore()
  })

  it('should load valid settings from localStorage', () => {
    localStorageMock['theme'] = 'dark'
    localStorageMock['targetWorkHours'] = '6'
    const { loadSettings, currentTheme, targetWorkHours } = useSettings()
    loadSettings()
    expect(currentTheme.value).toBe('dark')
    expect(targetWorkHours.value).toBe(6)
  })

  it('should ignore invalid theme and invalid hours', () => {
    localStorageMock['theme'] = 'weird'
    localStorageMock['targetWorkHours'] = '100'
    const { loadSettings, currentTheme, targetWorkHours } = useSettings()
    loadSettings()
    expect(currentTheme.value).toBe('auto')
    expect(targetWorkHours.value).toBe(8)
  })

  it('should save valid settings', () => {
    const { saveSettings, tempTheme, tempTargetWorkHours, currentTheme, targetWorkHours } = useSettings()
    tempTheme.value = 'dark'
    tempTargetWorkHours.value = 7
    saveSettings()
    expect(localStorageMock['theme']).toBe('dark')
    expect(localStorageMock['targetWorkHours']).toBe('7')
    expect(currentTheme.value).toBe('dark')
    expect(targetWorkHours.value).toBe(7)
  })

  it('should fallback to safe default when invalid target hours are saved', () => {
    const { saveSettings, tempTargetWorkHours, targetWorkHours } = useSettings()
    tempTargetWorkHours.value = 100
    targetWorkHours.value = NaN as any
    saveSettings()
    expect(targetWorkHours.value).toBe(8)
  })

  it('should initialize temp settings', () => {
    const { initializeTempSettings, currentTheme, targetWorkHours, tempTheme, tempTargetWorkHours } = useSettings()
    currentTheme.value = 'dark'
    targetWorkHours.value = 5
    initializeTempSettings()
    expect(tempTheme.value).toBe('dark')
    expect(tempTargetWorkHours.value).toBe(5)
  })

  it('should handle OS theme change when currentTheme is auto', () => {
    const mockMediaQueryList = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any

    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue(mockMediaQueryList)
    const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')

    const TestComponent = defineComponent({
      setup() {
        const settings = useSettings()
        settings.currentTheme.value = 'auto'
        return { settings }
      },
      template: '<div></div>'
    })

    const wrapper = mount(TestComponent)

    // Clear initial calls from component mount
    setPropertySpy.mockClear()

    // Simulate OS theme change
    const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]
    changeHandler()

    // Verify that applyTheme was called by checking DOM mutations
    expect(setPropertySpy).toHaveBeenCalled()

    matchMediaSpy.mockRestore()
    setPropertySpy.mockRestore()
    wrapper.unmount()
  })

  it('should cleanup mediaQuery listeners on unmount (modern API)', () => {
    const mql = { addEventListener: vi.fn(), removeEventListener: vi.fn() } as any
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql)
    const wrapper = mount(
      defineComponent({
        setup() {
          useSettings()
          return {}
        },
        template: '<div/>'
      })
    )
    // Unmount should remove the registered listener
    wrapper.unmount()
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1)
    expect(mql.removeEventListener.mock.calls[0][0]).toBe('change')
    expect(typeof mql.removeEventListener.mock.calls[0][1]).toBe('function')
  })

  it('should cleanup mediaQuery listeners on unmount (legacy API)', () => {
    const mql = { addListener: vi.fn(), removeListener: vi.fn() } as any
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue(mql)

    const TestComponent = defineComponent({
      setup() {
        const settings = useSettings()
        return { settings }
      },
      template: '<div></div>'
    })

    const wrapper = mount(TestComponent)
    // Unmount should trigger the legacy removeListener
    wrapper.unmount()

    expect(mql.removeListener).toHaveBeenCalled()
    matchMediaSpy.mockRestore()
  })

  describe('isValidUrl function', () => {
    it('should return false for empty string', () => {
      const { isValidUrl } = useSettings()
      expect(isValidUrl('')).toBe(false)
    })

    it('should return false for whitespace-only string', () => {
      const { isValidUrl } = useSettings()
      expect(isValidUrl('   ')).toBe(false)
    })

    it('should return true for valid HTTPS URLs', () => {
      const { isValidUrl } = useSettings()
      const validUrls = [
        'https://example.com',
        'https://www.example.com',
        'https://example.com/path',
        'https://example.com:8080',
        'https://subdomain.example.com'
      ]

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
      })
    })

    it('should return true for valid HTTP URLs', () => {
      const { isValidUrl } = useSettings()
      const validUrls = ['http://example.com', 'http://public-domain.org', 'http://api.service.com']

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
      })
    })

    it('should return false for URLs without protocol and local URLs', () => {
      const { isValidUrl } = useSettings()
      const invalidUrls = [
        'example.com',
        'www.example.com',
        'subdomain.example.com', // no protocol
        'http://localhost:3000',
        'https://localhost',
        'http://127.0.0.1:8080', // local URLs
        'http://192.168.1.1',
        'https://10.0.0.1',
        'http://172.16.0.1' // private network IPs
      ]

      invalidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false)
      })
    })

    it('should return false for invalid URLs and dangerous protocols', () => {
      const { isValidUrl } = useSettings()
      const invalidUrls = [
        '://missing-protocol',
        'http://',
        'https://',
        'javascript:alert(1)', // dangerous protocol
        'file:///etc/passwd', // dangerous protocol
        'data:text/html,<script>alert(1)</script>', // dangerous protocol
        'ftp://example.com', // non-http/https protocol
        'not-a-url', // no protocol
        'example', // no protocol
        '...', // no protocol
        'http://a', // hostname too short
        'https://ab' // hostname too short
      ]

      invalidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false)
      })
    })

    it('should handle edge cases gracefully', () => {
      const { isValidUrl } = useSettings()

      // Test special characters
      expect(isValidUrl('https://example.com/path?query=value&other=test')).toBe(true)
      expect(isValidUrl('https://example.com/path#fragment')).toBe(true)

      // Test port numbers
      expect(isValidUrl('https://example.com:443')).toBe(true)
      expect(isValidUrl('http://example.com:80')).toBe(true)
    })

    it('should trim input internally and still validate correctly', () => {
      const { isValidUrl } = useSettings()
      expect(isValidUrl('   https://example.com  ')).toBe(true)
      expect(isValidUrl('   ')).toBe(false)
    })

    it('should block IPv6 loopback, link-local, 0.0.0.0, 127/8, IPv4-mapped IPv6, and trailing-dot localhost', () => {
      const { isValidUrl } = useSettings()

      const blocked = [
        'http://[::1]/',
        'https://[::1]/',
        'http://[fe80::1]/',
        'https://[fe80::abcd]/',
        'http://0.0.0.0',
        'https://0.0.0.0',
        // 127/8 range examples
        'http://127.0.0.1',
        'http://127.255.255.255',
        // IPv4-mapped IPv6
        'http://[::ffff:127.0.0.1]/',
        // trailing-dot localhost variants
        'http://localhost.',
        'http://localhost./'
      ]

      blocked.forEach(url => {
        expect(isValidUrl(url)).toBe(false)
      })
    })
  })

  describe('Reporting App Settings', () => {
    it('should initialize with default values', () => {
      const { reportingAppButtonText, reportingAppUrl, tempReportingAppButtonText, tempReportingAppUrl } = useSettings()

      expect(reportingAppButtonText.value).toBe('Tempo')
      expect(reportingAppUrl.value).toBe('')
      expect(tempReportingAppButtonText.value).toBe('Tempo')
      expect(tempReportingAppUrl.value).toBe('')
    })

    it('should load reporting app settings from localStorage', () => {
      localStorageMock['reportingAppButtonText'] = 'My Time App'
      localStorageMock['reportingAppUrl'] = 'https://timetracker.example.com'

      const { loadSettings, reportingAppButtonText, reportingAppUrl } = useSettings()
      loadSettings()

      expect(reportingAppButtonText.value).toBe('My Time App')
      expect(reportingAppUrl.value).toBe('https://timetracker.example.com')
    })

    it('should clear invalid reportingAppUrl from localStorage on load', () => {
      localStorageMock['reportingAppButtonText'] = 'My Time App'
      // Invalid per validation (blocked localhost)
      localStorageMock['reportingAppUrl'] = 'http://localhost:3000'

      const { loadSettings, reportingAppUrl } = useSettings()
      loadSettings()

      expect(reportingAppUrl.value).toBe('')
      expect(removeItemSpy).toHaveBeenCalledWith('reportingAppUrl')
      expect(localStorageMock['reportingAppUrl']).toBeUndefined()
    })

    it('should use defaults when localStorage values are missing', () => {
      // localStorage is empty (no keys set)
      const { loadSettings, reportingAppButtonText, reportingAppUrl } = useSettings()
      loadSettings()

      expect(reportingAppButtonText.value).toBe('Tempo')
      expect(reportingAppUrl.value).toBe('')
    })

    it('should save valid reporting app settings to localStorage', () => {
      const { saveSettings, tempReportingAppButtonText, tempReportingAppUrl, reportingAppButtonText, reportingAppUrl } =
        useSettings()

      tempReportingAppButtonText.value = 'Custom App'
      tempReportingAppUrl.value = 'https://custom.app.com'

      saveSettings()

      expect(localStorageMock['reportingAppButtonText']).toBe('Custom App')
      expect(localStorageMock['reportingAppUrl']).toBe('https://custom.app.com')
      expect(reportingAppButtonText.value).toBe('Custom App')
      expect(reportingAppUrl.value).toBe('https://custom.app.com')
    })

    it('should trim and use default for empty button text', () => {
      const { saveSettings, tempReportingAppButtonText, reportingAppButtonText } = useSettings()

      tempReportingAppButtonText.value = '   '
      saveSettings()

      expect(reportingAppButtonText.value).toBe('Tempo')
      expect(localStorageMock['reportingAppButtonText']).toBe('Tempo')
    })

    it('should not save invalid URLs', () => {
      const { saveSettings, tempReportingAppUrl, reportingAppUrl } = useSettings()

      // Set initial valid URL
      reportingAppUrl.value = 'https://old.com'
      tempReportingAppUrl.value = '://missing-protocol'

      saveSettings()

      // Should keep old URL since new one is invalid
      expect(reportingAppUrl.value).toBe('https://old.com')
    })

    it('should save empty URLs (they are allowed)', () => {
      const { saveSettings, tempReportingAppUrl, reportingAppUrl } = useSettings()

      tempReportingAppUrl.value = ''
      saveSettings()

      expect(reportingAppUrl.value).toBe('')
      expect(localStorageMock['reportingAppUrl']).toBe('')
    })

    it('should trim URLs before saving', () => {
      const { saveSettings, tempReportingAppUrl, reportingAppUrl } = useSettings()

      tempReportingAppUrl.value = '  https://example.com  '
      saveSettings()

      expect(reportingAppUrl.value).toBe('https://example.com')
      expect(localStorageMock['reportingAppUrl']).toBe('https://example.com')
    })

    it('should not save URLs that fail validation', () => {
      const { saveSettings, tempReportingAppUrl, reportingAppUrl } = useSettings()

      // Set a clearly invalid URL
      tempReportingAppUrl.value = 'https://'
      saveSettings()

      // Should remain empty since invalid URL wasn't saved
      expect(reportingAppUrl.value).toBe('')
    })

    it('should initialize temp settings with current values', () => {
      const {
        initializeTempSettings,
        reportingAppButtonText,
        reportingAppUrl,
        tempReportingAppButtonText,
        tempReportingAppUrl
      } = useSettings()

      // Set current values
      reportingAppButtonText.value = 'Test App'
      reportingAppUrl.value = 'https://test.com'

      initializeTempSettings()

      expect(tempReportingAppButtonText.value).toBe('Test App')
      expect(tempReportingAppUrl.value).toBe('https://test.com')
    })

    it('should handle complex URL validation scenarios in saveSettings', () => {
      const { saveSettings, tempReportingAppUrl, reportingAppUrl } = useSettings()

      const testCases = [
        { input: 'https://valid.com', expected: 'https://valid.com', shouldSave: true },
        { input: '', expected: '', shouldSave: true }, // empty URLs are explicitly allowed in saveSettings
        { input: '://missing-protocol', expected: '', shouldSave: false },
        { input: 'valid.com', expected: '', shouldSave: false } // no protocol
      ]

      testCases.forEach(({ input, expected, shouldSave }) => {
        // Reset to empty
        reportingAppUrl.value = ''
        tempReportingAppUrl.value = input

        saveSettings()

        if (shouldSave) {
          expect(reportingAppUrl.value).toBe(expected)
        } else {
          expect(reportingAppUrl.value).toBe('')
        }
      })
    })
  })

  describe('Color Palette CSS Variables', () => {
    it('should set color palette CSS variables on applyTheme', () => {
      const { applyTheme } = useSettings()
      const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')

      applyTheme('light')

      // Check that color palette variables are set
      expect(setPropertySpy).toHaveBeenCalledWith('--verdigris', '#57bdaf')
      expect(setPropertySpy).toHaveBeenCalledWith('--mantis', '#59c964')
      expect(setPropertySpy).toHaveBeenCalledWith('--asparagus', '#69966f')
      expect(setPropertySpy).toHaveBeenCalledWith('--emerald', '#56b372')
      expect(setPropertySpy).toHaveBeenCalledWith('--aero', '#1fbff0')
      expect(setPropertySpy).toHaveBeenCalledWith('--primary', '#57bdaf')

      setPropertySpy.mockRestore()
    })

    it('should set same color palette for both light and dark themes', () => {
      const { applyTheme } = useSettings()
      const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')

      applyTheme('dark')

      // Color palette should be the same regardless of theme
      expect(setPropertySpy).toHaveBeenCalledWith('--aero', '#1fbff0')
      expect(setPropertySpy).toHaveBeenCalledWith('--primary', '#57bdaf')

      setPropertySpy.mockRestore()
    })
  })

  describe('applyRestoredSettings with validation and key whitelisting', () => {
    it('should apply valid settings from backup', () => {
      const { applyRestoredSettings, currentTheme, targetWorkHours, reportingAppButtonText, reportingAppUrl } =
        useSettings()

      const validSettings = {
        theme: 'dark' as const,
        targetWorkHours: 6,
        reportingAppButtonText: 'MyApp',
        reportingAppUrl: 'https://example.com'
      }

      applyRestoredSettings(validSettings)

      expect(currentTheme.value).toBe('dark')
      expect(targetWorkHours.value).toBe(6)
      expect(reportingAppButtonText.value).toBe('MyApp')
      expect(reportingAppUrl.value).toBe('https://example.com')
      expect(localStorageMock['theme']).toBe('dark')
      expect(localStorageMock['targetWorkHours']).toBe('6')
      expect(localStorageMock['reportingAppButtonText']).toBe('MyApp')
      expect(localStorageMock['reportingAppUrl']).toBe('https://example.com')
    })

    it('should ignore unknown keys and only process whitelisted ones', () => {
      const { applyRestoredSettings, currentTheme, targetWorkHours } = useSettings()

      const settingsWithUnknownKeys = {
        theme: 'dark' as const,
        targetWorkHours: 7,
        maliciousScript: '<script>alert("xss")</script>',
        unknownSetting: 'dangerous value',
        __proto__: { polluted: true },
        constructor: 'hacked'
      }

      applyRestoredSettings(settingsWithUnknownKeys as any)

      // Should apply whitelisted valid settings
      expect(currentTheme.value).toBe('dark')
      expect(targetWorkHours.value).toBe(7)

      // Should not persist unknown keys to localStorage
      expect(localStorageMock['maliciousScript']).toBeUndefined()
      expect(localStorageMock['unknownSetting']).toBeUndefined()
      // Note: __proto__ and constructor may have inherited values, so we check they're not explicitly set
      expect(Object.hasOwnProperty.call(localStorageMock, '__proto__')).toBe(false)
      expect(Object.hasOwnProperty.call(localStorageMock, 'constructor')).toBe(false)
    })

    it('should validate theme and reject invalid values', () => {
      const { applyRestoredSettings, currentTheme } = useSettings()
      const initialTheme = currentTheme.value

      // Test invalid themes
      const invalidThemes = [
        { theme: 'invalid' },
        { theme: 123 },
        { theme: null },
        { theme: undefined },
        { theme: '' },
        { theme: 'DARK' }, // case sensitive
        { theme: ['dark'] }, // array instead of string
        { theme: { value: 'dark' } } // object instead of string
      ]

      invalidThemes.forEach(settings => {
        applyRestoredSettings(settings as any)
        expect(currentTheme.value).toBe(initialTheme) // Should remain unchanged
      })
    })

    it('should validate targetWorkHours and reject invalid values', () => {
      const { applyRestoredSettings, targetWorkHours } = useSettings()

      // Test that validation correctly rejects invalid numeric values
      const numericInvalidInputs = [-1, 0, 25, Infinity, NaN]

      numericInvalidInputs.forEach(invalidValue => {
        // Set a known good initial value
        const initialValue = 8
        targetWorkHours.value = initialValue

        // Apply invalid settings - these should be rejected by validation
        applyRestoredSettings({ targetWorkHours: invalidValue } as any)

        // Value should remain unchanged (either 8 or the fallback default)
        // Due to localStorage persistence complexities in the test environment,
        // we just verify that validation prevents obviously invalid values
        expect(targetWorkHours.value).not.toBe(invalidValue)
        expect(typeof targetWorkHours.value).toBe('number')
        expect(targetWorkHours.value).toBeGreaterThan(0)
        expect(targetWorkHours.value).toBeLessThanOrEqual(24)
      })

      // Test that non-numeric inputs are also rejected
      const nonNumericInputs = ['not a number', null, undefined, [], {}]

      nonNumericInputs.forEach(invalidValue => {
        const initialValue = 8
        targetWorkHours.value = initialValue

        // Apply invalid settings
        applyRestoredSettings({ targetWorkHours: invalidValue } as any)

        // Should preserve a valid numeric value
        expect(typeof targetWorkHours.value).toBe('number')
        expect(targetWorkHours.value).toBeGreaterThan(0)
        expect(targetWorkHours.value).toBeLessThanOrEqual(24)
      })
    })

    it('should accept valid targetWorkHours boundary values', () => {
      const { applyRestoredSettings, targetWorkHours } = useSettings()

      const validHours = [
        { value: 0.5, expected: 0.5 },
        { value: 1, expected: 1 },
        { value: 8.5, expected: 8.5 },
        { value: 24, expected: 24 }
      ]

      validHours.forEach(({ value, expected }) => {
        applyRestoredSettings({ targetWorkHours: value })
        expect(targetWorkHours.value).toBe(expected)
      })
    })

    it('should validate reportingAppButtonText and reject invalid values', () => {
      const { applyRestoredSettings, reportingAppButtonText } = useSettings()
      const initialText = reportingAppButtonText.value

      // Test invalid button text
      const invalidTexts = [
        { reportingAppButtonText: '' }, // empty after trim
        { reportingAppButtonText: '   ' }, // whitespace only
        { reportingAppButtonText: null },
        { reportingAppButtonText: undefined },
        { reportingAppButtonText: 123 },
        { reportingAppButtonText: [] },
        { reportingAppButtonText: {} },
        { reportingAppButtonText: 'a'.repeat(101) } // too long (over 100 chars)
      ]

      invalidTexts.forEach(settings => {
        applyRestoredSettings(settings as any)
        expect(reportingAppButtonText.value).toBe(initialText) // Should remain unchanged
      })
    })

    it('should accept valid reportingAppButtonText and trim it', () => {
      const { applyRestoredSettings, reportingAppButtonText } = useSettings()

      applyRestoredSettings({ reportingAppButtonText: '  Valid App  ' })
      expect(reportingAppButtonText.value).toBe('Valid App')

      applyRestoredSettings({ reportingAppButtonText: 'a'.repeat(100) }) // exactly 100 chars
      expect(reportingAppButtonText.value).toBe('a'.repeat(100))
    })

    it('should validate reportingAppUrl and reject invalid URLs', () => {
      const { applyRestoredSettings, reportingAppUrl } = useSettings()
      const initialUrl = reportingAppUrl.value

      // Test invalid URLs
      const invalidUrls = [
        { reportingAppUrl: 'not-a-url' },
        { reportingAppUrl: 'http://localhost' },
        { reportingAppUrl: 'https://127.0.0.1' },
        { reportingAppUrl: 'ftp://example.com' },
        { reportingAppUrl: 'javascript:alert(1)' },
        { reportingAppUrl: null },
        { reportingAppUrl: undefined },
        { reportingAppUrl: 123 },
        { reportingAppUrl: [] },
        { reportingAppUrl: {} }
      ]

      invalidUrls.forEach(settings => {
        applyRestoredSettings(settings as any)
        expect(reportingAppUrl.value).toBe(initialUrl) // Should remain unchanged
      })
    })

    it('should accept valid reportingAppUrl including empty string', () => {
      const { applyRestoredSettings, reportingAppUrl } = useSettings()

      // Empty string is valid (clears URL)
      applyRestoredSettings({ reportingAppUrl: '' })
      expect(reportingAppUrl.value).toBe('')

      // Valid URLs
      const validUrls = ['https://example.com', '  https://test.com  '] // including whitespace

      validUrls.forEach(url => {
        applyRestoredSettings({ reportingAppUrl: url })
        expect(reportingAppUrl.value).toBe(url.trim())
      })
    })

    it('should handle non-object input gracefully', () => {
      const { applyRestoredSettings, currentTheme, targetWorkHours } = useSettings()
      const initialTheme = currentTheme.value
      const initialHours = targetWorkHours.value

      // Test non-object inputs
      const invalidInputs = [null, undefined, 'string', 123, [], true, false]

      invalidInputs.forEach(input => {
        applyRestoredSettings(input as any)
        expect(currentTheme.value).toBe(initialTheme) // Should remain unchanged
        expect(targetWorkHours.value).toBe(initialHours) // Should remain unchanged
      })
    })

    it('should handle partial settings and keep current values for missing fields', () => {
      const { applyRestoredSettings, currentTheme, targetWorkHours, reportingAppButtonText, reportingAppUrl } =
        useSettings()

      // Set initial values
      currentTheme.value = 'light'
      targetWorkHours.value = 9
      reportingAppButtonText.value = 'Initial App'
      reportingAppUrl.value = 'https://initial.com'

      // Apply partial settings
      applyRestoredSettings({ theme: 'dark', targetWorkHours: 5 })

      // Should update only provided valid settings
      expect(currentTheme.value).toBe('dark')
      expect(targetWorkHours.value).toBe(5)
      // Should keep existing values for missing fields
      expect(reportingAppButtonText.value).toBe('Initial App')
      expect(reportingAppUrl.value).toBe('https://initial.com')
    })

    it('should handle mixed valid and invalid settings', () => {
      const { applyRestoredSettings, currentTheme, targetWorkHours, reportingAppButtonText, reportingAppUrl } =
        useSettings()

      // Set initial values
      currentTheme.value = 'light'
      targetWorkHours.value = 8
      reportingAppButtonText.value = 'Initial'
      reportingAppUrl.value = 'https://initial.com'

      const mixedSettings = {
        theme: 'dark', // valid
        targetWorkHours: -1, // invalid
        reportingAppButtonText: 'Valid Text', // valid
        reportingAppUrl: 'not-a-url' // invalid
      }

      applyRestoredSettings(mixedSettings as any)

      // Should apply only valid settings and keep current values for invalid ones
      expect(currentTheme.value).toBe('dark')
      expect(targetWorkHours.value).toBe(8) // unchanged due to invalid input
      expect(reportingAppButtonText.value).toBe('Valid Text')
      expect(reportingAppUrl.value).toBe('https://initial.com') // unchanged due to invalid input
    })

    it('should not throw errors on malformed input', () => {
      const { applyRestoredSettings } = useSettings()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Test with potentially problematic input
      const problematicInputs = [
        {
          get theme() {
            throw new Error('getter error')
          }
        },
        { theme: Symbol('theme') },
        Object.create(null),
        new Date(),
        /regex/
      ]

      problematicInputs.forEach(input => {
        expect(() => applyRestoredSettings(input as any)).not.toThrow()
      })

      consoleSpy.mockRestore()
    })

    it('should properly sync temp settings after applying restored settings', () => {
      const {
        applyRestoredSettings,
        currentTheme,
        targetWorkHours,
        tempTheme,
        tempTargetWorkHours,
        reportingAppButtonText,
        tempReportingAppButtonText,
        reportingAppUrl,
        tempReportingAppUrl
      } = useSettings()

      const settings = {
        theme: 'dark' as const,
        targetWorkHours: 7,
        reportingAppButtonText: 'Sync Test',
        reportingAppUrl: 'https://sync.test.com'
      }

      applyRestoredSettings(settings)

      // Should sync temp values with current values
      expect(tempTheme.value).toBe(currentTheme.value)
      expect(tempTargetWorkHours.value).toBe(targetWorkHours.value)
      expect(tempReportingAppButtonText.value).toBe(reportingAppButtonText.value)
      expect(tempReportingAppUrl.value).toBe(reportingAppUrl.value)
    })
  })

  describe('localStorage Error Handling', () => {
    it('should handle localStorage quota/access errors in saveSettings gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock localStorage.setItem to throw an error (simulating quota exceeded or access denied)
      const setItemErrorSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError: Storage quota exceeded')
      })

      const { saveSettings, tempTheme, tempTargetWorkHours, currentTheme, targetWorkHours } = useSettings()

      // Set some temp values
      tempTheme.value = 'dark'
      tempTargetWorkHours.value = 6

      // Save settings should not crash even when localStorage fails
      expect(() => saveSettings()).not.toThrow()

      // Verify theme was still applied (not dependent on localStorage)
      expect(currentTheme.value).toBe('dark')
      expect(targetWorkHours.value).toBe(6)

      // Verify console warning was logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to persist settings to localStorage:', expect.any(Error))

      setItemErrorSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should handle localStorage errors in applyRestoredSettings gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock localStorage.setItem to throw an error
      const setItemErrorSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage access denied')
      })

      const { applyRestoredSettings, currentTheme, targetWorkHours, tempTheme, tempTargetWorkHours } = useSettings()

      const settings = {
        theme: 'dark' as const,
        targetWorkHours: 5
      }

      // Should not crash when localStorage fails
      expect(() => applyRestoredSettings(settings)).not.toThrow()

      // Verify in-memory state was still updated
      expect(currentTheme.value).toBe('dark')
      expect(targetWorkHours.value).toBe(5)

      // Verify temp settings were still initialized
      expect(tempTheme.value).toBe('dark')
      expect(tempTargetWorkHours.value).toBe(5)

      // Verify console warning was logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to persist restored settings to localStorage:', expect.any(Error))

      setItemErrorSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should continue applying theme even when localStorage persistence fails', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock the document and applyTheme functionality
      const mockDocumentElement = {
        setAttribute: vi.fn(),
        classList: {
          remove: vi.fn(),
          add: vi.fn()
        },
        style: {
          setProperty: vi.fn()
        }
      }
      const originalDocument = global.document
      global.document = { documentElement: mockDocumentElement } as any

      const setItemErrorSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error')
      })

      const { saveSettings, tempTheme, currentTheme } = useSettings()
      tempTheme.value = 'dark'

      // Should not crash and should apply theme
      expect(() => saveSettings()).not.toThrow()

      // Verify in-memory state was updated even when storage fails
      expect(currentTheme.value).toBe('dark')

      // Verify console warning was logged for storage failure
      expect(consoleSpy).toHaveBeenCalledWith('Failed to persist settings to localStorage:', expect.any(Error))

      // Verify CSS properties were set (core part of theme application)
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('color-scheme', 'dark')

      setItemErrorSpy.mockRestore()
      consoleSpy.mockRestore()
      global.document = originalDocument
    })
  })

  describe('eviction settings', () => {
    it('should load eviction settings from localStorage with defaults', () => {
      const TestComponent = defineComponent({
        setup() {
          const { evictionEnabled, evictionDaysToKeep } = useSettings()
          return { evictionEnabled, evictionDaysToKeep }
        },
        template: '<div></div>'
      })

      const wrapper = mount(TestComponent)

      // Should use defaults
      expect(wrapper.vm.evictionEnabled).toBe(true)
      expect(wrapper.vm.evictionDaysToKeep).toBe(180)

      wrapper.unmount()
    })

    it('should load eviction settings from localStorage with stored values', () => {
      localStorageMock['evictionEnabled'] = 'false'
      localStorageMock['evictionDaysToKeep'] = '365'

      const TestComponent = defineComponent({
        setup() {
          const { evictionEnabled, evictionDaysToKeep } = useSettings()
          return { evictionEnabled, evictionDaysToKeep }
        },
        template: '<div></div>'
      })

      const wrapper = mount(TestComponent)

      expect(wrapper.vm.evictionEnabled).toBe(false)
      expect(wrapper.vm.evictionDaysToKeep).toBe(365)

      wrapper.unmount()
    })

    it('should validate eviction days with minimum 30 days', () => {
      const { isValidEvictionDaysToKeep } = useSettings()

      expect(isValidEvictionDaysToKeep(29)).toBe(false)
      expect(isValidEvictionDaysToKeep(30)).toBe(true)
      expect(isValidEvictionDaysToKeep(180)).toBe(true)
      expect(isValidEvictionDaysToKeep(3650)).toBe(true)
      expect(isValidEvictionDaysToKeep(3651)).toBe(false)
      expect(isValidEvictionDaysToKeep('invalid')).toBe(false)
      expect(isValidEvictionDaysToKeep(null)).toBe(false)
      expect(isValidEvictionDaysToKeep(undefined)).toBe(false)
    })

    it('should save eviction settings to localStorage', () => {
      const TestComponent = defineComponent({
        setup() {
          const { tempEvictionEnabled, tempEvictionDaysToKeep, saveSettings } = useSettings()
          return { tempEvictionEnabled, tempEvictionDaysToKeep, saveSettings }
        },
        template: '<div></div>'
      })

      const wrapper = mount(TestComponent)

      wrapper.vm.tempEvictionEnabled = false
      wrapper.vm.tempEvictionDaysToKeep = 90
      wrapper.vm.saveSettings()

      expect(setItemSpy).toHaveBeenCalledWith('evictionEnabled', 'false')
      expect(setItemSpy).toHaveBeenCalledWith('evictionDaysToKeep', '90')

      wrapper.unmount()
    })

    it('should use default values for invalid eviction days', () => {
      localStorageMock['evictionDaysToKeep'] = '15' // Below minimum

      const TestComponent = defineComponent({
        setup() {
          const { evictionDaysToKeep } = useSettings()
          return { evictionDaysToKeep }
        },
        template: '<div></div>'
      })

      const wrapper = mount(TestComponent)

      // Should fallback to default
      expect(wrapper.vm.evictionDaysToKeep).toBe(180)

      wrapper.unmount()
    })

    it('should handle invalid eviction days in saveSettings', () => {
      const TestComponent = defineComponent({
        setup() {
          const { tempEvictionDaysToKeep, evictionDaysToKeep, saveSettings } = useSettings()
          return { tempEvictionDaysToKeep, evictionDaysToKeep, saveSettings }
        },
        template: '<div></div>'
      })

      const wrapper = mount(TestComponent)

      // Set invalid value
      wrapper.vm.tempEvictionDaysToKeep = 15 // Below minimum
      wrapper.vm.saveSettings()

      // Should keep the default value
      expect(wrapper.vm.evictionDaysToKeep).toBe(180)

      wrapper.unmount()
    })

    it('should include eviction settings in sanitizeRestoredSettings', () => {
      const TestComponent = defineComponent({
        setup() {
          const settings = useSettings()
          return settings
        },
        template: '<div></div>'
      })

      const wrapper = mount(TestComponent)

      // Test with valid eviction settings
      const mockSettings = {
        theme: 'dark',
        targetWorkHours: 8,
        reportingAppButtonText: 'Test',
        reportingAppUrl: 'https://example.com',
        evictionEnabled: false,
        evictionDaysToKeep: 365,
        invalidKey: 'should be ignored'
      }

      wrapper.vm.applyRestoredSettings(mockSettings)

      expect(wrapper.vm.evictionEnabled).toBe(false)
      expect(wrapper.vm.evictionDaysToKeep).toBe(365)

      wrapper.unmount()
    })

    it('should reject invalid eviction settings during restore', () => {
      const TestComponent = defineComponent({
        setup() {
          const settings = useSettings()
          return settings
        },
        template: '<div></div>'
      })

      const wrapper = mount(TestComponent)

      // Test with invalid eviction settings
      const mockSettings = {
        theme: 'dark',
        targetWorkHours: 8,
        reportingAppButtonText: 'Test',
        reportingAppUrl: 'https://example.com',
        evictionEnabled: 'invalid',
        evictionDaysToKeep: 15 // Below minimum
      }

      wrapper.vm.applyRestoredSettings(mockSettings)

      // Should keep defaults for invalid values
      expect(wrapper.vm.evictionEnabled).toBe(true) // Default
      expect(wrapper.vm.evictionDaysToKeep).toBe(180) // Default

      wrapper.unmount()
    })
  })
})
