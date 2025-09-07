import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SetupModal from './SetupModal.vue'
import type { Category } from '@/shared/types'

// Mock data
const mockCategories: Category[] = [
  { id: 1, name: 'Work', is_default: true, created_at: '2023-01-01' },
  { id: 2, name: 'Personal', is_default: false, created_at: '2023-01-02' }
]

describe('SetupModal Component', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(SetupModal, {
      props: {
        isOpen: true,
        tempTheme: 'light',
        tempTargetWorkHours: 8,
        categories: mockCategories,
        isLoadingCategories: false,
        isAddingCategory: false,
        isUpdatingCategory: false,
        isDeletingCategory: false,
        isSettingDefault: false,
        editingCategoryId: null,
        editingCategoryName: '',
        newCategoryName: ''
      }
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('Basic Rendering', () => {
    it('should render modal when isOpen is true', () => {
      expect(wrapper.find('.modal').exists()).toBe(true)
      expect(wrapper.find('#modal-title').text()).toBe('Settings')
    })

    it('should not render modal when isOpen is false', async () => {
      await wrapper.setProps({ isOpen: false })
      expect(wrapper.find('.modal').exists()).toBe(false)
    })

    it('should render theme buttons', () => {
      const themeButtons = wrapper.findAll('.theme-btn')
      expect(themeButtons).toHaveLength(3)
      expect(themeButtons[0].text()).toBe('Light')
      expect(themeButtons[1].text()).toBe('Dark')
      expect(themeButtons[2].text()).toBe('Auto')
    })

    it('should render target hours input', () => {
      const input = wrapper.find('#target-hours')
      expect(input.exists()).toBe(true)
      expect(input.element.value).toBe('8')
    })

    it('should render categories list', () => {
      const categories = wrapper.findAll('.category-item')
      expect(categories).toHaveLength(2)
      expect(categories[0].find('.category-name').text()).toBe('Work')
      expect(categories[1].find('.category-name').text()).toBe('Personal')
    })

    it('should render Save and Cancel buttons', () => {
      const saveBtn = wrapper.find('.save-btn')
      const cancelBtn = wrapper.find('.cancel-btn')
      expect(saveBtn.exists()).toBe(true)
      expect(cancelBtn.exists()).toBe(true)
      expect(saveBtn.text()).toBe('Save')
      expect(cancelBtn.text()).toBe('Cancel')
    })
  })

  describe('Keyboard Behavior', () => {
    it('should handle Escape key to close modal when not busy', () => {
      const vm = wrapper.vm as any

      // Simulate Escape key press
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      const preventDefaultSpy = vi.spyOn(escapeEvent, 'preventDefault')

      vm.handleSetupModalKeydown(escapeEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should ignore Enter key (modal stays open)', () => {
      const vm = wrapper.vm as any

      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })

      vm.handleSetupModalKeydown(enterEvent)

      // Should not emit save or close events
      expect(wrapper.emitted('save')).toBeFalsy()
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should ignore keyboard events when modal is closed', async () => {
      await wrapper.setProps({ isOpen: false })

      const vm = wrapper.vm as any

      // Simulate Escape key press when modal is closed
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      vm.handleSetupModalKeydown(escapeEvent)

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should ignore Escape key when modal is busy', async () => {
      // Set modal to busy state
      await wrapper.setProps({ isAddingCategory: true })

      const vm = wrapper.vm as any

      // Simulate Escape key press when busy
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      vm.handleSetupModalKeydown(escapeEvent)

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should ignore Escape key when updating category', async () => {
      await wrapper.setProps({ isUpdatingCategory: true })

      const vm = wrapper.vm as any

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      vm.handleSetupModalKeydown(escapeEvent)

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should ignore Escape key when deleting category', async () => {
      await wrapper.setProps({ isDeletingCategory: true })

      const vm = wrapper.vm as any

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      vm.handleSetupModalKeydown(escapeEvent)

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should ignore Escape key when setting default', async () => {
      await wrapper.setProps({ isSettingDefault: true })

      const vm = wrapper.vm as any

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      vm.handleSetupModalKeydown(escapeEvent)

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Event Emissions', () => {
    it('should emit close when cancel button is clicked', async () => {
      const cancelBtn = wrapper.find('.cancel-btn')
      await cancelBtn.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit save when save button is clicked', async () => {
      const saveBtn = wrapper.find('.save-btn')
      await saveBtn.trigger('click')

      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should emit updateTempTheme when theme button is clicked', async () => {
      const darkThemeBtn = wrapper.findAll('.theme-btn')[1]
      await darkThemeBtn.trigger('click')

      expect(wrapper.emitted('updateTempTheme')).toBeTruthy()
      expect(wrapper.emitted('updateTempTheme')![0]).toEqual(['dark'])
    })
  })

  describe('Computed Properties', () => {
    it('should compute isBusy correctly when no operations in progress', () => {
      const vm = wrapper.vm as any
      expect(vm.isBusy).toBe(false)
    })

    it('should compute isBusy as true when adding category', async () => {
      await wrapper.setProps({ isAddingCategory: true })
      const vm = wrapper.vm as any
      expect(vm.isBusy).toBe(true)
    })

    it('should compute canClose correctly when not busy', () => {
      const vm = wrapper.vm as any
      expect(vm.canClose).toBe(true)
    })

    it('should compute canClose as false when busy', async () => {
      await wrapper.setProps({ isUpdatingCategory: true })
      const vm = wrapper.vm as any
      expect(vm.canClose).toBe(false)
    })
  })
})
