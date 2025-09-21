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
        editingCategoryId: 0,
        editingCategoryName: '',
        newCategoryName: '',
        tempReportingAppButtonText: 'Tempo',
        tempReportingAppUrl: '',
        tempEvictionEnabled: true,
        tempEvictionDaysToKeep: 180,
        tempHttpServerEnabled: false,
        tempHttpServerPort: 14474,
        isValidUrl: () => true,
        isValidEvictionDaysToKeep: () => true,
        isValidHttpPort: () => true
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

  describe('Reporting App URL validation', () => {
    it('shows error and invalid class for invalid URL', async () => {
      await wrapper.setProps({
        tempReportingAppButtonText: 'Tempo',
        tempReportingAppUrl: 'http://invalid',
        isValidUrl: () => false
      })

      const urlInput = wrapper.find('#reporting-app-url')
      expect(urlInput.exists()).toBe(true)
      expect(urlInput.classes()).toContain('invalid-url')

      const error = wrapper.find('.url-error')
      expect(error.exists()).toBe(true)
      expect(error.text()).toContain('Please enter a valid URL')
    })

    it('hides error and class for valid URL', async () => {
      await wrapper.setProps({
        tempReportingAppButtonText: 'Tempo',
        tempReportingAppUrl: 'https://example.com',
        isValidUrl: () => true
      })

      const urlInput = wrapper.find('#reporting-app-url')
      expect(urlInput.exists()).toBe(true)
      expect(urlInput.classes()).not.toContain('invalid-url')

      const error = wrapper.find('.url-error')
      expect(error.exists()).toBe(false)
    })

    it('hides error and class for empty URL regardless of validator', async () => {
      await wrapper.setProps({
        tempReportingAppButtonText: 'Tempo',
        tempReportingAppUrl: '',
        isValidUrl: () => false
      })

      const urlInput = wrapper.find('#reporting-app-url')
      expect(urlInput.exists()).toBe(true)
      expect(urlInput.classes()).not.toContain('invalid-url')
      expect(wrapper.find('.url-error').exists()).toBe(false)
    })

    it('emits updates for reporting app inputs', async () => {
      await wrapper.setProps({
        tempReportingAppButtonText: 'Tempo',
        tempReportingAppUrl: '',
        isValidUrl: () => true
      })

      const textInput = wrapper.find('#reporting-button-text')
      await textInput.setValue('My App')
      await textInput.trigger('input')
      expect(wrapper.emitted('updateTempReportingAppButtonText')).toBeTruthy()
      expect(wrapper.emitted('updateTempReportingAppButtonText')![0]).toEqual(['My App'])

      const urlInput = wrapper.find('#reporting-app-url')
      await urlInput.setValue('https://foo.example.com')
      await urlInput.trigger('input')
      expect(wrapper.emitted('updateTempReportingAppUrl')).toBeTruthy()
      expect(wrapper.emitted('updateTempReportingAppUrl')![0]).toEqual(['https://foo.example.com'])
    })
  })

  describe('Backup & Restore actions', () => {
    it('renders backup and restore buttons and emits on click', async () => {
      const backupBtn = wrapper.find('[data-testid="backup-button"]')
      const restoreBtn = wrapper.find('[data-testid="restore-button"]')

      expect(backupBtn.exists()).toBe(true)
      expect(restoreBtn.exists()).toBe(true)

      await backupBtn.trigger('click')
      await restoreBtn.trigger('click')

      expect(wrapper.emitted('backup')).toBeTruthy()
      expect(wrapper.emitted('restoreBackup')).toBeTruthy()
    })

    it('disables backup and restore while busy', async () => {
      await wrapper.setProps({ isAddingCategory: true })
      const backupBtn = wrapper.find('[data-testid="backup-button"]')
      const restoreBtn = wrapper.find('[data-testid="restore-button"]')
      expect(backupBtn.element).toHaveProperty('disabled', true)
      expect(restoreBtn.element).toHaveProperty('disabled', true)
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

  describe('Target Hours Input Functionality', () => {
    it('should handle valid target hours input', async () => {
      const input = wrapper.find('#target-hours')

      // Simulate input event with valid value
      await input.setValue('10.5')
      await input.trigger('input')

      expect(wrapper.emitted('updateTempTargetWorkHours')).toBeTruthy()
      expect(wrapper.emitted('updateTempTargetWorkHours')![0]).toEqual([10.5])
    })

    it('should clamp target hours to minimum 1', async () => {
      const input = wrapper.find('#target-hours')

      // Test with value less than 1
      await input.setValue('0.5')
      await input.trigger('input')

      expect(wrapper.emitted('updateTempTargetWorkHours')).toBeTruthy()
      expect(wrapper.emitted('updateTempTargetWorkHours')![0]).toEqual([1])
    })

    it('should clamp target hours to maximum 24', async () => {
      const input = wrapper.find('#target-hours')

      // Test with value greater than 24
      await input.setValue('25')
      await input.trigger('input')

      expect(wrapper.emitted('updateTempTargetWorkHours')).toBeTruthy()
      expect(wrapper.emitted('updateTempTargetWorkHours')![0]).toEqual([24])
    })

    it('should default to 1 for non-finite input', async () => {
      const input = wrapper.find('#target-hours')

      // Test with invalid input
      await input.setValue('invalid')
      await input.trigger('input')

      expect(wrapper.emitted('updateTempTargetWorkHours')).toBeTruthy()
      expect(wrapper.emitted('updateTempTargetWorkHours')![0]).toEqual([1])
    })

    it('should handle empty input gracefully', async () => {
      const input = wrapper.find('#target-hours')

      // Test with empty input
      await input.setValue('')
      await input.trigger('input')

      expect(wrapper.emitted('updateTempTargetWorkHours')).toBeTruthy()
      expect(wrapper.emitted('updateTempTargetWorkHours')![0]).toEqual([1])
    })
  })

  describe('Category Management Interactions', () => {
    it('should render category in editing mode when editingCategoryId matches', async () => {
      await wrapper.setProps({ editingCategoryId: 1, editingCategoryName: 'New Name' })

      const categoryInput = wrapper.find('.category-input')
      expect(categoryInput.exists()).toBe(true)
      expect(categoryInput.element.value).toBe('New Name')
    })

    it('should emit saveEditCategory when Enter key is pressed on category input', async () => {
      await wrapper.setProps({ editingCategoryId: 1, editingCategoryName: 'Updated Work' })

      const categoryInput = wrapper.find('.category-input')
      await categoryInput.trigger('keyup.enter')

      expect(wrapper.emitted('saveEditCategory')).toBeTruthy()
      expect(wrapper.emitted('saveEditCategory')![0]).toEqual([mockCategories[0]])
    })

    it('should handle escape key on category input to cancel editing', async () => {
      await wrapper.setProps({ editingCategoryId: 1, editingCategoryName: 'Updated Work' })

      const categoryInput = wrapper.find('.category-input')
      await categoryInput.trigger('keyup.escape')

      expect(wrapper.emitted('cancelEditCategory')).toBeTruthy()
    })

    it('should emit saveEditCategory on blur when not cancelling edit', async () => {
      await wrapper.setProps({ editingCategoryId: 1, editingCategoryName: 'Updated Work' })

      const categoryInput = wrapper.find('.category-input')
      await categoryInput.trigger('blur')

      expect(wrapper.emitted('saveEditCategory')).toBeTruthy()
      expect(wrapper.emitted('saveEditCategory')![0]).toEqual([mockCategories[0]])
    })

    it('should emit updateEditingCategoryName when category input value changes', async () => {
      await wrapper.setProps({ editingCategoryId: 1, editingCategoryName: 'Work' })

      const categoryInput = wrapper.find('.category-input')
      await categoryInput.setValue('Updated Work')
      await categoryInput.trigger('input')

      expect(wrapper.emitted('updateEditingCategoryName')).toBeTruthy()
      expect(wrapper.emitted('updateEditingCategoryName')![0]).toEqual(['Updated Work'])
    })

    it('should emit startEditCategory when category item is double-clicked', async () => {
      const categoryItem = wrapper.find('.category-item')
      await categoryItem.trigger('dblclick')

      expect(wrapper.emitted('startEditCategory')).toBeTruthy()
      expect(wrapper.emitted('startEditCategory')![0]).toEqual([mockCategories[0]])
    })

    it('should render default category button as active when category is default', async () => {
      const defaultBtn = wrapper.find('.default-category-btn')
      expect(defaultBtn.classes()).toContain('active')
    })

    it('should emit setDefaultCategory when default button is clicked', async () => {
      const defaultBtn = wrapper.findAll('.default-category-btn')[1] // Second category (not default)
      await defaultBtn.trigger('click')

      expect(wrapper.emitted('setDefaultCategory')).toBeTruthy()
      expect(wrapper.emitted('setDefaultCategory')![0]).toEqual([mockCategories[1]])
    })

    it('should emit deleteCategory when delete button is clicked', async () => {
      const deleteBtn = wrapper.find('.delete-category-btn')
      await deleteBtn.trigger('click')

      expect(wrapper.emitted('deleteCategory')).toBeTruthy()
      expect(wrapper.emitted('deleteCategory')![0]).toEqual([mockCategories[0]])
    })
  })

  describe('Add Category Functionality', () => {
    it('should show add category form when isAddingCategory is true', async () => {
      await wrapper.setProps({ isAddingCategory: true, newCategoryName: 'New Category' })

      const addForm = wrapper.find('.add-category-form')
      const addInput = wrapper.find('.add-category-form .category-input')

      expect(addForm.exists()).toBe(true)
      expect(addInput.element.value).toBe('New Category')
    })

    it('should emit addCategory when Enter key is pressed on new category input', async () => {
      await wrapper.setProps({ isAddingCategory: true, newCategoryName: 'New Category' })

      const addInput = wrapper.find('.add-category-form .category-input')
      await addInput.trigger('keyup.enter')

      expect(wrapper.emitted('addCategory')).toBeTruthy()
    })

    it('should emit cancelAddingCategory when Escape key is pressed on new category input', async () => {
      await wrapper.setProps({ isAddingCategory: true, newCategoryName: 'New Category' })

      const addInput = wrapper.find('.add-category-form .category-input')
      await addInput.trigger('keyup.escape')

      expect(wrapper.emitted('cancelAddingCategory')).toBeTruthy()
    })

    it('should emit updateNewCategoryName when new category input value changes', async () => {
      await wrapper.setProps({ isAddingCategory: true, newCategoryName: '' })

      const addInput = wrapper.find('.add-category-form .category-input')
      await addInput.setValue('New Category')
      await addInput.trigger('input')

      expect(wrapper.emitted('updateNewCategoryName')).toBeTruthy()
      expect(wrapper.emitted('updateNewCategoryName')![0]).toEqual(['New Category'])
    })

    it('should emit addCategory when Add button is clicked', async () => {
      await wrapper.setProps({ isAddingCategory: true, newCategoryName: 'New Category' })

      const addBtn = wrapper.find('.add-confirm-btn')
      await addBtn.trigger('click')

      expect(wrapper.emitted('addCategory')).toBeTruthy()
    })

    it('should emit cancelAddingCategory when Cancel button is clicked', async () => {
      await wrapper.setProps({ isAddingCategory: true, newCategoryName: 'New Category' })

      const cancelBtn = wrapper.find('.add-cancel-btn')
      await cancelBtn.trigger('click')

      expect(wrapper.emitted('cancelAddingCategory')).toBeTruthy()
    })

    it('should emit startAddingCategory when + Add Category button is clicked', async () => {
      const addCategoryBtn = wrapper.find('.add-category-btn')
      await addCategoryBtn.trigger('click')

      expect(wrapper.emitted('startAddingCategory')).toBeTruthy()
    })

    it('should hide + Add Category button when isAddingCategory is true', async () => {
      await wrapper.setProps({ isAddingCategory: true })

      const addCategoryBtn = wrapper.find('.add-category-btn')
      expect(addCategoryBtn.exists()).toBe(false)
    })
  })

  describe('Modal Overlay Interactions', () => {
    it('should emit close when modal overlay is clicked and canClose is true', async () => {
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal overlay is clicked and canClose is false', async () => {
      await wrapper.setProps({ isAddingCategory: true }) // Makes canClose false

      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not emit close when clicking inside modal content', async () => {
      const modal = wrapper.find('.modal')
      await modal.trigger('click')

      // Click.stop should prevent event from bubbling to overlay
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Button Disable States', () => {
    it('should disable Save and Cancel buttons when busy', async () => {
      await wrapper.setProps({ isAddingCategory: true })

      const saveBtn = wrapper.find('.save-btn')
      const cancelBtn = wrapper.find('.cancel-btn')

      expect(saveBtn.element.disabled).toBe(true)
      expect(cancelBtn.element.disabled).toBe(true)
    })

    it('should disable close button when busy', async () => {
      await wrapper.setProps({ isDeletingCategory: true })

      const closeBtn = wrapper.find('.close-btn')
      expect(closeBtn.element.disabled).toBe(true)
    })

    it('should disable category action buttons when editing', async () => {
      await wrapper.setProps({ editingCategoryId: 1 })

      const defaultBtn = wrapper.find('.default-category-btn')
      const deleteBtn = wrapper.find('.delete-category-btn')

      expect(defaultBtn.element.disabled).toBe(true)
      expect(deleteBtn.element.disabled).toBe(true)
    })

    it('should disable category action buttons when adding category', async () => {
      await wrapper.setProps({ isAddingCategory: true })

      const defaultBtn = wrapper.find('.default-category-btn')
      const deleteBtn = wrapper.find('.delete-category-btn')

      expect(defaultBtn.element.disabled).toBe(true)
      expect(deleteBtn.element.disabled).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle categories without ID properly', async () => {
      const categoriesWithoutId = [{ name: 'Test Category', is_default: false, created_at: '2023-01-01' }]
      await wrapper.setProps({ categories: categoriesWithoutId })

      const categoryItems = wrapper.findAll('.category-item')
      expect(categoryItems).toHaveLength(1)
    })

    it('should show loading indicator when isLoadingCategories is true', async () => {
      await wrapper.setProps({ isLoadingCategories: true })

      const loadingIndicator = wrapper.find('.loading-indicator')
      const categoriesList = wrapper.find('.categories-list')

      expect(loadingIndicator.exists()).toBe(true)
      expect(categoriesList.exists()).toBe(false)
    })

    it('should handle handleEscapeCancel properly setting and resetting flag', async () => {
      await wrapper.setProps({ editingCategoryId: 1, editingCategoryName: 'Test' })

      const vm = wrapper.vm as any
      expect(vm.isCancellingEdit).toBe(false)

      // Trigger escape
      const categoryInput = wrapper.find('.category-input')
      await categoryInput.trigger('keyup.escape')

      expect(wrapper.emitted('cancelEditCategory')).toBeTruthy()

      // Wait for nextTick to reset the flag
      await wrapper.vm.$nextTick()
      expect(vm.isCancellingEdit).toBe(false)
    })

    it('should not emit saveEditCategory on blur when cancelling edit', async () => {
      await wrapper.setProps({ editingCategoryId: 1, editingCategoryName: 'Test' })

      const vm = wrapper.vm as any
      const categoryInput = wrapper.find('.category-input')

      // Set cancelling flag by triggering escape first
      vm.isCancellingEdit = true

      // Now trigger blur - should not save
      await categoryInput.trigger('blur')

      expect(wrapper.emitted('saveEditCategory')).toBeFalsy()
    })
  })

  describe('HTTP Server Settings', () => {
    it('should render HTTP server checkbox', () => {
      const checkbox = wrapper.find('.http-server-checkbox')
      expect(checkbox.exists()).toBe(true)
      expect(checkbox.element.checked).toBe(false)
    })

    it('should emit updateTempHttpServerEnabled when checkbox is toggled', async () => {
      const checkbox = wrapper.find('.http-server-checkbox')
      await checkbox.setChecked(true)

      expect(wrapper.emitted('updateTempHttpServerEnabled')).toBeTruthy()
      expect(wrapper.emitted('updateTempHttpServerEnabled')![0]).toEqual([true])
    })

    it('should render HTTP server port input', () => {
      const portInput = wrapper.find('#http-server-port')
      expect(portInput.exists()).toBe(true)
      expect(portInput.element.value).toBe('14474')
    })

    it('should test onHttpServerPortInput function with valid input', async () => {
      // Enable HTTP server first to make port input functional
      await wrapper.setProps({ tempHttpServerEnabled: true })

      const portInput = wrapper.find('#http-server-port')
      portInput.element.value = '8080'
      await portInput.trigger('input')

      expect(wrapper.emitted('updateTempHttpServerPort')).toBeTruthy()
      expect(wrapper.emitted('updateTempHttpServerPort')![0]).toEqual([8080])
    })

    it('should test onHttpServerPortInput function with invalid input', async () => {
      // Enable HTTP server first to make port input functional
      await wrapper.setProps({ tempHttpServerEnabled: true })

      const portInput = wrapper.find('#http-server-port')
      portInput.element.value = 'invalid'
      await portInput.trigger('input')

      expect(wrapper.emitted('updateTempHttpServerPort')).toBeTruthy()
      // Should fallback to default 14474 for invalid input
      expect(wrapper.emitted('updateTempHttpServerPort')![0]).toEqual([14474])
    })

    it('should test onHttpServerPortBlur function with boundary values', async () => {
      // Enable HTTP server first to make port input functional
      await wrapper.setProps({ tempHttpServerEnabled: true })

      const portInput = wrapper.find('#http-server-port')

      // Test below minimum
      portInput.element.value = '500'
      await portInput.trigger('input')
      await portInput.trigger('blur')

      expect(wrapper.emitted('updateTempHttpServerPort')).toBeTruthy()
      // Should clamp to minimum 1024
      const emissions = wrapper.emitted('updateTempHttpServerPort') as any[]
      expect(emissions[emissions.length - 1]).toEqual([1024])
    })

    it('should test onHttpServerPortBlur function with above maximum', async () => {
      // Enable HTTP server first to make port input functional
      await wrapper.setProps({ tempHttpServerEnabled: true })

      const portInput = wrapper.find('#http-server-port')

      // Test above maximum
      portInput.element.value = '70000'
      await portInput.trigger('input')
      await portInput.trigger('blur')

      expect(wrapper.emitted('updateTempHttpServerPort')).toBeTruthy()
      // Should clamp to maximum 65535
      const emissions = wrapper.emitted('updateTempHttpServerPort') as any[]
      expect(emissions[emissions.length - 1]).toEqual([65535])
    })

    it('should show invalid styling for invalid port', async () => {
      await wrapper.setProps({
        tempHttpServerPort: 500,
        isValidHttpPort: () => false
      })

      const portInput = wrapper.find('#http-server-port')
      expect(portInput.classes()).toContain('invalid-input')
    })

    it('should disable port input when HTTP server is disabled', async () => {
      await wrapper.setProps({ tempHttpServerEnabled: false })

      const portInput = wrapper.find('#http-server-port')
      expect(portInput.element.disabled).toBe(true)
    })

    it('should enable port input when HTTP server is enabled', async () => {
      await wrapper.setProps({ tempHttpServerEnabled: true })

      const portInput = wrapper.find('#http-server-port')
      expect(portInput.element.disabled).toBe(false)
    })

    it('should apply disabled styling to port setting when HTTP server is disabled', async () => {
      await wrapper.setProps({ tempHttpServerEnabled: false })

      const portSetting = wrapper.find('.http-server-port-setting')
      expect(portSetting.classes()).toContain('disabled')
    })

    it('should display correct port number in help text', async () => {
      await wrapper.setProps({ tempHttpServerPort: 9000 })

      const helpText = wrapper.find('.http-server-help code')
      expect(helpText.text()).toContain('localhost:9000')
    })
  })

  describe('Eviction Settings', () => {
    it('should render eviction enabled checkbox', () => {
      const checkbox = wrapper.find('.eviction-checkbox')
      expect(checkbox.exists()).toBe(true)
      expect(checkbox.element.checked).toBe(true)
    })

    it('should emit updateTempEvictionEnabled when checkbox is toggled', async () => {
      const checkbox = wrapper.find('.eviction-checkbox')
      await checkbox.setChecked(false)

      expect(wrapper.emitted('updateTempEvictionEnabled')).toBeTruthy()
      expect(wrapper.emitted('updateTempEvictionEnabled')![0]).toEqual([false])
    })

    it('should render eviction days input', () => {
      const daysInput = wrapper.find('#eviction-days')
      expect(daysInput.exists()).toBe(true)
      expect(daysInput.element.value).toBe('180')
    })

    it('should test onEvictionDaysInput function with valid input', async () => {
      const daysInput = wrapper.find('#eviction-days')
      await daysInput.setValue('365')

      expect(wrapper.emitted('updateTempEvictionDaysToKeep')).toBeTruthy()
      expect(wrapper.emitted('updateTempEvictionDaysToKeep')![0]).toEqual([365])
    })

    it('should test onEvictionDaysInput function with below minimum', async () => {
      const daysInput = wrapper.find('#eviction-days')
      await daysInput.setValue('10')

      expect(wrapper.emitted('updateTempEvictionDaysToKeep')).toBeTruthy()
      // Should clamp to minimum 30
      expect(wrapper.emitted('updateTempEvictionDaysToKeep')![0]).toEqual([30])
    })

    it('should test onEvictionDaysInput function with above maximum', async () => {
      const daysInput = wrapper.find('#eviction-days')
      await daysInput.setValue('5000')

      expect(wrapper.emitted('updateTempEvictionDaysToKeep')).toBeTruthy()
      // Should clamp to maximum 3650
      expect(wrapper.emitted('updateTempEvictionDaysToKeep')![0]).toEqual([3650])
    })

    it('should show invalid styling for invalid days', async () => {
      await wrapper.setProps({
        tempEvictionDaysToKeep: 10,
        isValidEvictionDaysToKeep: () => false
      })

      const daysInput = wrapper.find('#eviction-days')
      expect(daysInput.classes()).toContain('invalid-input')
    })

    it('should disable days input when eviction is disabled', async () => {
      await wrapper.setProps({ tempEvictionEnabled: false })

      const daysInput = wrapper.find('#eviction-days')
      expect(daysInput.element.disabled).toBe(true)
    })

    it('should apply disabled styling to days setting when eviction is disabled', async () => {
      await wrapper.setProps({ tempEvictionEnabled: false })

      const daysSetting = wrapper.find('.eviction-days-setting')
      expect(daysSetting.classes()).toContain('disabled')
    })
  })

  describe('Modal Interactions', () => {
    it('should close modal when overlay is clicked and modal can close', async () => {
      // Modal can close by default
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close modal when overlay is clicked and modal cannot close', async () => {
      // Set modal to busy state
      await wrapper.setProps({ isAddingCategory: true })

      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not close modal when clicking inside modal content', async () => {
      const modal = wrapper.find('.modal')
      await modal.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should handle escape key to close modal when possible', async () => {
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not handle escape key when modal cannot close', async () => {
      await wrapper.setProps({ isAddingCategory: true })

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should emit updateTempTheme for all theme buttons', async () => {
      const themeButtons = wrapper.findAll('.theme-btn')

      // Test Light theme
      await themeButtons[0].trigger('click')
      expect(wrapper.emitted('updateTempTheme')).toBeTruthy()
      let emissions = wrapper.emitted('updateTempTheme') as any[]
      expect(emissions[emissions.length - 1]).toEqual(['light'])

      // Test Dark theme
      await themeButtons[1].trigger('click')
      emissions = wrapper.emitted('updateTempTheme') as any[]
      expect(emissions[emissions.length - 1]).toEqual(['dark'])

      // Test Auto theme
      await themeButtons[2].trigger('click')
      emissions = wrapper.emitted('updateTempTheme') as any[]
      expect(emissions[emissions.length - 1]).toEqual(['auto'])
    })

    it('should show active class on selected theme button', async () => {
      await wrapper.setProps({ tempTheme: 'dark' })

      const themeButtons = wrapper.findAll('.theme-btn')
      expect(themeButtons[0].classes()).not.toContain('active') // Light
      expect(themeButtons[1].classes()).toContain('active') // Dark
      expect(themeButtons[2].classes()).not.toContain('active') // Auto
    })
  })
})
