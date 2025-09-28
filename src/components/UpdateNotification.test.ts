import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import UpdateNotification from './UpdateNotification.vue'

// Create reactive refs for the mock
const shouldShowNotification = ref(false)
const isCheckingForUpdates = ref(false)
const currentVersion = ref('1.0.0')
const latestVersion = ref('1.1.0')
const releaseInfo = ref(null)

// Mock the composable
const mockFunctions = {
  dismissCurrentUpdate: vi.fn(),
  openReleasePage: vi.fn()
}

vi.mock('@/composables/useUpdateNotification', () => ({
  useUpdateNotification: () => ({
    shouldShowNotification,
    isCheckingForUpdates,
    currentVersion,
    latestVersion,
    releaseInfo,
    ...mockFunctions
  })
}))

describe('UpdateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset all reactive values
    shouldShowNotification.value = false
    isCheckingForUpdates.value = false
    currentVersion.value = '1.0.0'
    latestVersion.value = '1.1.0'
    releaseInfo.value = null
    vi.clearAllMocks()
  })

  it('should not render when no update is available', () => {
    shouldShowNotification.value = false

    const wrapper = mount(UpdateNotification)

    expect(wrapper.find('.update-notification').exists()).toBe(false)
  })

  it('should render bell icon when update is available', () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      downloadUrl: 'https://github.com/test/repo/releases/download/v1.1.0/TimeCatcher-1.1.0-mac-arm64.dmg',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    expect(wrapper.find('.update-notification').exists()).toBe(true)
    expect(wrapper.find('.bell-icon').exists()).toBe(true)
    expect(wrapper.find('.bell-icon').text()).toBe('🔔')
  })

  it('should show tooltip on hover', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      downloadUrl: 'https://github.com/test/repo/releases/download/v1.1.0/TimeCatcher-1.1.0-mac-arm64.dmg',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    // Initially tooltip should not be visible
    expect(wrapper.find('.tooltip').exists()).toBe(false)

    // Hover over the bell icon
    await wrapper.find('.update-notification').trigger('mouseenter')
    await nextTick()

    // Tooltip should now be visible
    expect(wrapper.find('.tooltip').exists()).toBe(true)
    expect(wrapper.find('.update-title').text()).toBe('Update Available')
  })

  it('should display version information in tooltip', async () => {
    shouldShowNotification.value = true
    currentVersion.value = '1.0.0'
    latestVersion.value = '1.1.0'
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    await wrapper.find('.update-notification').trigger('mouseenter')
    await nextTick()

    const updateTitle = wrapper.find('.update-title')
    const versionText = wrapper.find('.version-text')

    expect(updateTitle.text()).toBe('Update Available')
    expect(versionText.text()).toBe('v1.0.0 → v1.1.0')
  })

  it('should handle view release button click', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    await wrapper.find('.update-notification').trigger('mouseenter')
    await nextTick()

    const viewButton = wrapper.find('.view-btn')
    expect(viewButton.text()).toBe('View Release')

    await viewButton.trigger('click')

    expect(mockFunctions.openReleasePage).toHaveBeenCalledTimes(1)
  })

  it('should handle dismiss button click', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      downloadUrl: 'https://github.com/test/repo/releases/download/v1.1.0/TimeCatcher-1.1.0-mac-arm64.dmg',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    await wrapper.find('.update-notification').trigger('mouseenter')
    await nextTick()

    const dismissButton = wrapper.find('.dismiss-btn')
    await dismissButton.trigger('click')

    expect(mockFunctions.dismissCurrentUpdate).toHaveBeenCalledTimes(1)
  })

  it('should show animation when checking for updates', () => {
    shouldShowNotification.value = true
    isCheckingForUpdates.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      downloadUrl: 'https://github.com/test/repo/releases/download/v1.1.0/TimeCatcher-1.1.0-mac-arm64.dmg',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    const bellIcon = wrapper.find('.bell-icon')
    expect(bellIcon.classes()).toContain('bell-animate')
  })

  it('should support keyboard navigation', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      downloadUrl: 'https://github.com/test/repo/releases/download/v1.1.0/TimeCatcher-1.1.0-mac-arm64.dmg',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    const bellIcon = wrapper.find('.bell-icon')

    // Test Enter key to show tooltip
    await bellIcon.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(true)

    // Test Escape key to hide tooltip
    await bellIcon.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(false)
  })

  it('should toggle tooltip on bell icon click', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    const bellIcon = wrapper.find('.bell-icon')

    // Click to show tooltip
    await bellIcon.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(true)

    // Click again to hide tooltip
    await bellIcon.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(false)
  })

  it('should close tooltip when clicking outside', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification, {
      attachTo: document.body
    })

    const bellIcon = wrapper.find('.bell-icon')

    // Show tooltip first
    await bellIcon.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(true)

    // Click outside the component
    const outsideElement = document.createElement('div')
    document.body.appendChild(outsideElement)

    const clickEvent = new MouseEvent('click', { bubbles: true })
    outsideElement.dispatchEvent(clickEvent)

    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(false)

    // Cleanup
    document.body.removeChild(outsideElement)
    wrapper.unmount()
  })

  it('should not close tooltip when clicking inside', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    const bellIcon = wrapper.find('.bell-icon')

    // Show tooltip first
    await bellIcon.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(true)

    // Click inside the tooltip
    const tooltip = wrapper.find('.tooltip')
    await tooltip.trigger('click')
    await nextTick()

    // Tooltip should still be visible
    expect(wrapper.find('.tooltip').exists()).toBe(true)
  })

  it('should auto-close tooltip after 10 seconds', async () => {
    vi.useFakeTimers()

    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    const bellIcon = wrapper.find('.bell-icon')

    // Show tooltip
    await bellIcon.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(true)

    // Fast forward 10 seconds
    vi.advanceTimersByTime(10000)
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(false)

    vi.useRealTimers()
  })

  it('should not auto-close tooltip if already closed', async () => {
    vi.useFakeTimers()

    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    const bellIcon = wrapper.find('.bell-icon')

    // Show tooltip
    await bellIcon.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(true)

    // Manually close tooltip
    await bellIcon.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(false)

    // Fast forward 10 seconds - tooltip should remain closed
    vi.advanceTimersByTime(10000)
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(false)

    vi.useRealTimers()
  })

  it('should close tooltip after dismiss button click', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    // Show tooltip first
    await wrapper.find('.update-notification').trigger('mouseenter')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(true)

    const dismissButton = wrapper.find('.dismiss-btn')
    await dismissButton.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(false)
    expect(mockFunctions.dismissCurrentUpdate).toHaveBeenCalledTimes(1)
  })

  it('should close tooltip after view release button click', async () => {
    shouldShowNotification.value = true
    releaseInfo.value = {
      version: '1.1.0',
      publishedAt: '2023-01-01T00:00:00Z',
      htmlUrl: 'https://github.com/test/repo/releases/tag/v1.1.0',
      body: 'New features and bug fixes'
    }

    const wrapper = mount(UpdateNotification)

    // Show tooltip first
    await wrapper.find('.update-notification').trigger('mouseenter')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(true)

    const viewButton = wrapper.find('.view-btn')
    await viewButton.trigger('click')
    await nextTick()

    expect(wrapper.find('.tooltip').exists()).toBe(false)
    expect(mockFunctions.openReleasePage).toHaveBeenCalledTimes(1)
  })

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const wrapper = mount(UpdateNotification)
    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })
})
