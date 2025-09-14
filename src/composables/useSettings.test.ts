import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useSettings } from './useSettings'

describe('useSettings', () => {
  let localStorageMock: Record<string, string | undefined>
  let setItemSpy: any
  let getItemSpy: any

  beforeEach(() => {
    localStorageMock = {}
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => {
      localStorageMock[k] = v
    })
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(k => localStorageMock[k] ?? null)
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
    it('should return true for empty string', () => {
      const { isValidUrl } = useSettings()
      expect(isValidUrl('')).toBe(true)
    })

    it('should return true for whitespace-only string', () => {
      const { isValidUrl } = useSettings()
      expect(isValidUrl('   ')).toBe(true)
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
      const validUrls = ['http://example.com', 'http://localhost:3000', 'http://127.0.0.1:8080']

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
      })
    })

    it('should return true for URLs without protocol (adds https:// automatically)', () => {
      const { isValidUrl } = useSettings()
      const validUrls = ['example.com', 'www.example.com', 'subdomain.example.com', 'localhost:3000']

      validUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
      })
    })

    it('should return false for invalid URLs', () => {
      const { isValidUrl } = useSettings()
      const invalidUrls = [
        '://missing-protocol',
        'http://',
        'https://',
        'javascript:alert(1)' // becomes https://javascript:alert(1) which is invalid
      ]

      invalidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(false)
      })

      // These are actually valid according to URL constructor
      const actuallyValidUrls = [
        'not-a-url', // becomes https://not-a-url which is valid
        'ftp://example.com', // valid URL with ftp protocol
        'example', // becomes https://example which is valid
        '...' // becomes https://... which is valid
      ]

      actuallyValidUrls.forEach(url => {
        expect(isValidUrl(url)).toBe(true)
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
        { input: 'valid.com', expected: 'valid.com', shouldSave: true },
        { input: '', expected: '', shouldSave: true },
        { input: '://missing-protocol', expected: '', shouldSave: false }
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
})
