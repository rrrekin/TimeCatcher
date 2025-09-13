import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    it('should emit updateNewTask when task name changes', async () => {
      const taskNameInput = wrapper.find('input[placeholder="Enter task name..."]')
      await taskNameInput.setValue('New Task')

      expect(wrapper.emitted('updateNewTask')).toBeTruthy()
    })

    it('should emit updateNewTask when time changes', async () => {
      const timeInput = wrapper.find('input[type="time"]')
      await timeInput.setValue('10:30')

      expect(wrapper.emitted('updateNewTask')).toBeTruthy()
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
    it('should be valid when category and name are provided', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: 1,
          name: 'Valid Task',
          time: ''
        }
      })

      const vm = wrapper.vm as any
      expect(vm.isAddTaskValid).toBe(true)
    })

    it('should be invalid when category is missing', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: null,
          name: 'Valid Task',
          time: ''
        }
      })

      const vm = wrapper.vm as any
      expect(vm.isAddTaskValid).toBe(false)
    })

    it('should be invalid when name is empty', async () => {
      await wrapper.setProps({
        newTask: {
          categoryId: 1,
          name: '',
          time: ''
        }
      })

      const vm = wrapper.vm as any
      expect(vm.isAddTaskValid).toBe(false)
    })
  })
})
