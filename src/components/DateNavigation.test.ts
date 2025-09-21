import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DateNavigation from './DateNavigation.vue'

// The goal of these tests is to cover the decorative logo markup and
// ensure basic controls exist, guarding against positional selector regressions.

describe('DateNavigation', () => {
  const minimalProps = {
    formattedDate: 'Mon, 01 Jan 2024',
    dateInputValue: '2024-01-01',
    reportingAppButtonText: '',
    reportingAppUrl: ''
  }

  it('renders decorative app logo with proper accessibility attributes', () => {
    const wrapper = mount(DateNavigation, {
      props: minimalProps
    })

    const logoWrapper = wrapper.get('[data-testid="app-logo"]')
    expect(logoWrapper.attributes('aria-hidden')).toBe('true')

    const img = logoWrapper.get('img')
    // Decorative image should have empty alt and a valid src pointing to the logo asset
    expect(img.attributes('alt')).toBe('')
    // In test environment with Vite, static assets may be inlined as data URLs.
    // Assert that the src either contains the path or is a data URI.
    const src = img.attributes('src')
    expect(src === '' ? '' : src).toBeTruthy()
    const isDataUri = src.startsWith('data:image/svg')
    const isPath = src.includes('/logo.svg')
    expect(isDataUri || isPath).toBe(true)
  })

  it('has previous and next day buttons present', () => {
    const wrapper = mount(DateNavigation, { props: minimalProps })

    // Query by accessible name to avoid reliance on positional selectors
    const prevBtn = wrapper.get('button[aria-label="Previous day"]')
    const nextBtn = wrapper.get('button[aria-label="Next day"]')

    expect(prevBtn.exists()).toBe(true)
    expect(nextBtn.exists()).toBe(true)
  })

  it.each([
    { label: 'Previous day', eventName: 'goToPreviousDay' },
    { label: 'Next day', eventName: 'goToNextDay' }
  ])('emits %s when the %s button is clicked', async ({ label, eventName }) => {
    const wrapper = mount(DateNavigation, { props: minimalProps })
    const btn = wrapper.get(`button[aria-label="${label}"]`)

    await btn.trigger('click')

    const emitted = wrapper.emitted()
    expect(emitted).toHaveProperty(eventName)
    // Ensure only a single emission occurred for this click
    expect(emitted[eventName]?.length).toBe(1)
  })

  describe('Reporting App Button', () => {
    it('does not render reporting app button when URL is empty', () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          reportingAppUrl: ''
        }
      })

      const reportingBtn = wrapper.find('.reporting-app-btn')
      expect(reportingBtn.exists()).toBe(false)
    })

    it('renders reporting app button when URL is provided', () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          reportingAppUrl: 'https://example.com',
          reportingAppButtonText: 'Tempo'
        }
      })

      const reportingBtn = wrapper.find('.reporting-app-btn')
      expect(reportingBtn.exists()).toBe(true)
      expect(reportingBtn.text()).toBe('🌐 Tempo')
    })

    it('renders reporting app button with correct accessibility attributes', () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          reportingAppUrl: 'https://example.com',
          reportingAppButtonText: 'My Time App'
        }
      })

      const reportingBtn = wrapper.get('.reporting-app-btn')
      expect(reportingBtn.attributes('title')).toBe('Open My Time App')
      expect(reportingBtn.attributes('aria-label')).toBe('Open My Time App')
      expect(reportingBtn.attributes('type')).toBe('button')

      // Check icon accessibility
      const icon = reportingBtn.find('.reporting-app-icon')
      expect(icon.exists()).toBe(true)
      expect(icon.attributes('aria-hidden')).toBe('true')
    })

    it('emits openReportingApp when reporting app button is clicked', async () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          reportingAppUrl: 'https://example.com',
          reportingAppButtonText: 'Tempo'
        }
      })

      const reportingBtn = wrapper.get('.reporting-app-btn')
      await reportingBtn.trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted).toHaveProperty('openReportingApp')
      expect(emitted.openReportingApp?.length).toBe(1)
    })

    it('renders reporting app button with default text when empty', () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          reportingAppUrl: 'https://example.com',
          reportingAppButtonText: ''
        }
      })

      const reportingBtn = wrapper.get('.reporting-app-btn')
      expect(reportingBtn.text()).toBe('🌐')
      expect(reportingBtn.attributes('title')).toBe('Open ')
      expect(reportingBtn.attributes('aria-label')).toBe('Open ')
    })

    it('handles different URL formats', () => {
      const testUrls = ['https://example.com', 'http://public-api.com:3000', 'https://my-app.domain.com/path']

      testUrls.forEach(url => {
        const wrapper = mount(DateNavigation, {
          props: {
            ...minimalProps,
            reportingAppUrl: url,
            reportingAppButtonText: 'Test App'
          }
        })

        try {
          const reportingBtn = wrapper.find('.reporting-app-btn')
          expect(reportingBtn.exists()).toBe(true)
        } finally {
          wrapper.unmount()
        }
      })
    })

    it('renders icon with correct content', () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          reportingAppUrl: 'https://example.com',
          reportingAppButtonText: 'Tempo'
        }
      })

      const icon = wrapper.get('.reporting-app-icon')
      expect(icon.text()).toBe('🌐')
    })
  })

  describe('Today Button', () => {
    it('renders today button correctly', () => {
      const wrapper = mount(DateNavigation, { props: minimalProps })

      const todayBtn = wrapper.find('button[aria-label="Today"]')
      expect(todayBtn.exists()).toBe(true)
      expect(todayBtn.text()).toBe('Today')
    })

    it('emits goToToday when today button is clicked', async () => {
      const wrapper = mount(DateNavigation, { props: minimalProps })

      const todayBtn = wrapper.get('button[aria-label="Today"]')
      await todayBtn.trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted).toHaveProperty('goToToday')
      expect(emitted.goToToday?.length).toBe(1)
    })
  })

  describe('Date Picker', () => {
    it('renders date picker with correct value', () => {
      const wrapper = mount(DateNavigation, { props: minimalProps })

      const datePicker = wrapper.find('input[type="date"]')
      expect(datePicker.exists()).toBe(true)
      expect(datePicker.element.value).toBe('2024-01-01')
    })

    it('emits updateDate when date picker value changes', async () => {
      const wrapper = mount(DateNavigation, { props: minimalProps })

      const datePicker = wrapper.get('input[type="date"]')
      await datePicker.setValue('2024-12-31')

      const emitted = wrapper.emitted()
      expect(emitted).toHaveProperty('updateDate')
      expect(emitted.updateDate?.[0]).toEqual(['2024-12-31'])
    })
  })

  describe('Settings Button', () => {
    it('renders settings button correctly', () => {
      const wrapper = mount(DateNavigation, { props: minimalProps })

      const settingsBtn = wrapper.find('button[aria-label="Open settings"]')
      expect(settingsBtn.exists()).toBe(true)
      expect(settingsBtn.text()).toContain('Settings')
    })

    it('emits openSetup when settings button is clicked', async () => {
      const wrapper = mount(DateNavigation, { props: minimalProps })

      const settingsBtn = wrapper.get('button[aria-label="Open settings"]')
      await settingsBtn.trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted).toHaveProperty('openSetup')
      expect(emitted.openSetup?.length).toBe(1)
    })

    it('renders normal settings button when no HTTP server error', () => {
      const wrapper = mount(DateNavigation, { props: minimalProps })

      const settingsBtn = wrapper.get('button[aria-label="Open settings"]')
      expect(settingsBtn.classes()).not.toContain('has-error')
      expect(settingsBtn.attributes('title')).toBe('Open Settings')
      expect(settingsBtn.attributes('aria-label')).toBe('Open settings')

      const errorIndicator = wrapper.find('.error-indicator')
      expect(errorIndicator.exists()).toBe(false)
    })

    it('renders error state when HTTP server error is provided', () => {
      const errorMessage = 'Failed to start server: EADDRINUSE'
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          httpServerError: errorMessage
        }
      })

      const settingsBtn = wrapper.get(
        'button[aria-label="Open settings - HTTP Server Error: Failed to start server: EADDRINUSE"]'
      )
      expect(settingsBtn.classes()).toContain('has-error')
      expect(settingsBtn.attributes('title')).toBe('Settings (HTTP Server Error: Failed to start server: EADDRINUSE)')
      expect(settingsBtn.attributes('aria-label')).toBe(
        'Open settings - HTTP Server Error: Failed to start server: EADDRINUSE'
      )
    })

    it('renders error indicator when HTTP server error is provided', () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          httpServerError: 'Port in use'
        }
      })

      const errorIndicator = wrapper.get('.error-indicator')
      expect(errorIndicator.exists()).toBe(true)
      expect(errorIndicator.attributes('aria-hidden')).toBe('true')
      expect(errorIndicator.text()).toBe('🔴')
    })

    it('handles empty HTTP server error message', () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          httpServerError: ''
        }
      })

      const settingsBtn = wrapper.get('.setup-btn')
      expect(settingsBtn.classes()).not.toContain('has-error')
      expect(settingsBtn.attributes('title')).toBe('Open Settings')

      const errorIndicator = wrapper.find('.error-indicator')
      expect(errorIndicator.exists()).toBe(false)
    })

    it('handles long HTTP server error messages', () => {
      const longError =
        'Very long error message that might exceed typical display limits and needs to be handled gracefully in the UI'
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          httpServerError: longError
        }
      })

      const settingsBtn = wrapper.get('.setup-btn')
      expect(settingsBtn.classes()).toContain('has-error')
      expect(settingsBtn.attributes('title')).toBe(`Settings (HTTP Server Error: ${longError})`)
      expect(settingsBtn.attributes('aria-label')).toBe(`Open settings - HTTP Server Error: ${longError}`)

      const errorIndicator = wrapper.get('.error-indicator')
      expect(errorIndicator.exists()).toBe(true)
    })

    it('maintains button functionality when in error state', async () => {
      const wrapper = mount(DateNavigation, {
        props: {
          ...minimalProps,
          httpServerError: 'Server error'
        }
      })

      const settingsBtn = wrapper.get('.setup-btn.has-error')
      await settingsBtn.trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted).toHaveProperty('openSetup')
      expect(emitted.openSetup?.length).toBe(1)
    })
  })
})
