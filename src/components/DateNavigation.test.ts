import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DateNavigation from './DateNavigation.vue'

// The goal of these tests is to cover the decorative logo markup and
// ensure basic controls exist, guarding against positional selector regressions.

describe('DateNavigation', () => {
  const minimalProps = {
    formattedDate: 'Mon, 01 Jan 2024',
    dateInputValue: '2024-01-01'
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
})
