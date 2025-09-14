import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import AddTaskForm from './AddTaskForm.vue'
import type { Category } from '@/shared/types'

describe('AddTaskForm Component', () => {
  let wrapper: VueWrapper<any>
  let mockCategories: Category[]
  let mockNewTask: { name: string; categoryId: number | null; time: string }

  beforeEach(() => {
    mockCategories = [
      { id: 1, name: 'Work', is_default: true },
      { id: 2, name: 'Personal', is_default: false },
      { id: 3, name: 'Learning', is_default: false }
    ]

    mockNewTask = {
      name: '',
      categoryId: null,
      time: ''
    }

    wrapper = mount(AddTaskForm, {
      props: {
        newTask: mockNewTask,
        categories: mockCategories,
        showFormCategoryDropdown: false,
        hasEndTaskForSelectedDate: false,
        getSelectedCategoryName: vi.fn(() => 'Work')
      }
    })
  })

  afterEach(() => {
    // Ensure wrapper is properly cleaned up between tests to avoid DOM leakage
    if (wrapper) {
      wrapper.unmount()
      // Reset reference to help GC and prevent accidental reuse
      wrapper = null as unknown as VueWrapper<any>
    }
  })

  describe('Basic Rendering', () => {
    it('should render the add task form', () => {
      const form = wrapper.find('.add-task-form')
      expect(form.exists()).toBe(true)
    })

    it('should render form fields', () => {
      const fields = wrapper.find('.add-task-fields')
      expect(fields.exists()).toBe(true)

      // Check for category dropdown
      const categoryDropdown = wrapper.find('.dropdown-trigger')
      expect(categoryDropdown.exists()).toBe(true)

      // Check for task name input
      const taskNameInput = wrapper.find('input[placeholder="Enter task name..."]')
      expect(taskNameInput.exists()).toBe(true)

      // Check for time input
      const timeInput = wrapper.find('input[type="time"]')
      expect(timeInput.exists()).toBe(true)

      // Check for add button
      const addButton = wrapper.find('.primary-add-btn')
      expect(addButton.exists()).toBe(true)
      expect(addButton.text()).toContain('Add Task')
    })

    it('should render special task buttons', () => {
      const specialButtons = wrapper.find('.special-task-buttons')
      expect(specialButtons.exists()).toBe(true)

      const pauseBtn = wrapper.find('.pause-btn')
      const endBtn = wrapper.find('.end-btn')

      expect(pauseBtn.exists()).toBe(true)
      expect(endBtn.exists()).toBe(true)
      expect(pauseBtn.text()).toContain('Pause')
      expect(endBtn.text()).toContain('End')
    })
  })

  describe('Form Interactions', () => {
    it('should emit updateNewTask with correct payload when task name changes', async () => {
      const taskNameInput = wrapper.find('input[placeholder="Enter task name..."]')
      await taskNameInput.setValue('New Task')

      const emittedEvent = wrapper.emitted('updateNewTask')
      expect(emittedEvent).toBeTruthy()
      expect(emittedEvent?.[0]).toEqual([{ name: 'New Task', categoryId: null, time: '' }])
    })

    it('should emit updateNewTask with correct payload when time changes', async () => {
      const timeInput = wrapper.find('input[type="time"]')
      await timeInput.setValue('10:30')

      const emittedEvent = wrapper.emitted('updateNewTask')
      expect(emittedEvent).toBeTruthy()
      expect(emittedEvent?.[0]).toEqual([{ name: '', categoryId: null, time: '10:30' }])
    })

    it('should emit toggleFormDropdown when category dropdown is clicked', async () => {
      const categoryDropdown = wrapper.find('.dropdown-trigger')
      await categoryDropdown.trigger('click')

      expect(wrapper.emitted('toggleFormDropdown')).toBeTruthy()
    })

    it('should emit addTask when add button is clicked and form is valid', async () => {
      // Set up valid form state
      await wrapper.setProps({
        newTask: {
          categoryId: 1,
          name: 'Test Task',
          time: '10:00'
        }
      })

      const addBtn = wrapper.find('.primary-add-btn')
      await addBtn.trigger('click')

      expect(wrapper.emitted('addTask')).toBeTruthy()
    })

    it('should disable add button when form is invalid', async () => {
      // Invalid form state (missing required fields)
      await wrapper.setProps({
        newTask: {
          categoryId: null,
          name: '',
          time: ''
        }
      })

      const addBtn = wrapper.find('.primary-add-btn')
      expect(addBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('Special Task Buttons', () => {
    it('should emit addPauseTask when pause button is clicked', async () => {
      const pauseBtn = wrapper.find('.pause-btn')
      await pauseBtn.trigger('click')

      expect(wrapper.emitted('addPauseTask')).toBeTruthy()
    })

    it('should emit addEndTask when end button is clicked', async () => {
      const endBtn = wrapper.find('.end-btn')
      await endBtn.trigger('click')

      expect(wrapper.emitted('addEndTask')).toBeTruthy()
    })

    it('should disable end button when hasEndTaskForSelectedDate is true', async () => {
      await wrapper.setProps({ hasEndTaskForSelectedDate: true })

      const endBtn = wrapper.find('.end-btn')
      expect(endBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('Form Validation', () => {
    it('should enable add button when category and name are provided', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: 1,
          name: 'Valid Task',
          time: ''
        }
      })
      await wrapper.vm.$nextTick()
      const addButton = wrapper.find('.primary-add-btn')
      expect(addButton.attributes('disabled')).toBeUndefined()
    })

    it('should disable add button when category is missing', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: null,
          name: 'Valid Task',
          time: ''
        }
      })
      await wrapper.vm.$nextTick()
      const addButton = wrapper.find('.primary-add-btn')
      expect(addButton.attributes('disabled')).toBeDefined()
    })

    it('should disable add button when name is empty', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: 1,
          name: '',
          time: ''
        }
      })
      await wrapper.vm.$nextTick()
      const addButton = wrapper.find('.primary-add-btn')
      expect(addButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Event Handlers', () => {
    it('should emit selectFormCategory when category dropdown item is clicked', async () => {
      // First set the dropdown to be open
      await wrapper.setProps({
        showFormCategoryDropdown: true
      })

      // Click on a dropdown item
      const dropdownItem = wrapper.find('.dropdown-item')
      await dropdownItem.trigger('click')

      // Should emit category selection (parent handles closing dropdown)
      const selectEmitted = wrapper.emitted('selectFormCategory')

      expect(selectEmitted).toBeTruthy()
      expect(selectEmitted?.[0]).toEqual([mockCategories[0]])
    })

    it('should call handleAddTask when Enter key is pressed in task name field', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: 1,
          name: 'Test Task',
          time: '10:00'
        }
      })

      const taskNameInput = wrapper.find('input[type="text"]')
      await taskNameInput.trigger('keydown.enter')

      expect(wrapper.emitted('addTask')).toBeTruthy()
    })

    it('should not call handleAddTask when Enter key is pressed but form is invalid', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: 1,
          name: '', // Invalid - empty name
          time: '10:00'
        }
      })

      const taskNameInput = wrapper.find('input[type="text"]')
      await taskNameInput.trigger('keydown.enter')

      expect(wrapper.emitted('addTask')).toBeFalsy()
    })

    it('should emit addTask when add button is clicked and form is valid', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: 1,
          name: 'Test Task',
          time: '10:00'
        }
      })

      const addButton = wrapper.find('.primary-add-btn')
      await addButton.trigger('click')

      expect(wrapper.emitted('addTask')).toBeTruthy()
    })

    it('should not emit addTask when add button is clicked but form is invalid', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: null, // Invalid category (null/undefined only)
          name: 'Test Task',
          time: '10:00'
        }
      })

      const addButton = wrapper.find('.primary-add-btn')
      await addButton.trigger('click')

      expect(wrapper.emitted('addTask')).toBeFalsy()
    })

    it('should handle keyboard navigation in form dropdown', async () => {
      await wrapper.setProps({
        showFormCategoryDropdown: true
      })

      const dropdown = wrapper.find('.dropdown-menu')

      // Test arrow down navigation
      await dropdown.trigger('keydown', { key: 'ArrowDown' })

      // Test escape key
      await dropdown.trigger('keydown', { key: 'Escape' })

      expect(wrapper.emitted('toggleFormDropdown')).toBeTruthy()
    })

    it('should handle form dropdown close', async () => {
      const categoryDropdown = wrapper.find('.form-dropdown')
      if (categoryDropdown.exists()) {
        const trigger = categoryDropdown.find('.dropdown-trigger')
        if (trigger.exists()) {
          await trigger.trigger('click')
          expect(wrapper.emitted('toggleFormDropdown')).toBeTruthy()
        }
      }
    })
  })

  describe('Dropdown Positioning', () => {
    it('should position dropdown below by default', async () => {
      await wrapper.setProps({ showFormCategoryDropdown: true })

      // Check that dropdown has below positioning class (default)
      const dropdown = wrapper.find('.dropdown-menu')
      expect(dropdown.classes()).toContain('dropdown-position-below')
    })

    it('should have dropdown position reactive value', () => {
      // Verify the component has the reactive dropdownPosition property
      expect(wrapper.vm.dropdownPosition).toBeDefined()
      expect(typeof wrapper.vm.dropdownPosition).toBe('string')
    })

    it('should apply correct CSS classes based on dropdown position', async () => {
      await wrapper.setProps({ showFormCategoryDropdown: true })

      const dropdown = wrapper.find('.dropdown-menu')

      // Should have position class
      const hasPositionClass = dropdown.classes().some(cls => cls.startsWith('dropdown-position-'))
      expect(hasPositionClass).toBe(true)
    })

    it('should handle calculateDropdownPosition method existence', () => {
      // Verify the component has the positioning method
      expect(typeof wrapper.vm.calculateDropdownPosition).toBe('function')
    })
  })
})
