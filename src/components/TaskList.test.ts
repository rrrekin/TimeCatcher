import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import TaskList from './TaskList.vue'
import type { TaskRecord, Category, TaskRecordWithId } from '@/shared/types'
import { SPECIAL_TASK_TYPES } from '@/shared/types'

describe('TaskList Component', () => {
  let wrapper: VueWrapper<any>
  let mockTaskRecords: Array<TaskRecord & { id: number }>
  let mockCategories: Category[]

  beforeEach(() => {
    mockTaskRecords = [
      {
        id: 1,
        category_name: 'Work',
        task_name: 'Task 1',
        start_time: '09:00',
        date: '2024-01-15',
        task_type: 'normal'
      },
      {
        id: 2,
        category_name: 'Personal',
        task_name: 'Task 2',
        start_time: '10:00',
        date: '2024-01-15',
        task_type: 'normal'
      }
    ]

    mockCategories = [
      { id: 1, name: 'Work', is_default: true },
      { id: 2, name: 'Personal', is_default: false },
      { id: 3, name: 'Learning', is_default: false }
    ]

    // Mount the component with required props
    wrapper = mount(TaskList, {
      props: {
        taskRecords: mockTaskRecords,
        categories: mockCategories,
        isLoadingTasks: false,
        displayDate: '2024-01-15',
        hasEndTaskForSelectedDate: false,
        showInlineDropdown: {},
        // Function props
        calculateDuration: vi.fn(() => '1h 30m'),
        convertToTimeInput: vi.fn(time => time),
        getCurrentTime: vi.fn(() => '10:30'),
        isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
      }
    })
  })

  describe('Basic Rendering', () => {
    it('should render the table with proper structure', () => {
      const table = wrapper.find('table')
      expect(table.exists()).toBe(true)

      const thead = wrapper.find('thead')
      expect(thead.exists()).toBe(true)

      const tbody = wrapper.find('tbody')
      expect(tbody.exists()).toBe(true)
    })

    it('should render table headers correctly', () => {
      const headers = wrapper.findAll('th')
      const headerTexts = headers.map(header => header.text())

      expect(headerTexts).toEqual(['Category', 'Task', 'Start time', 'Duration', 'Actions'])
    })

    it('should display task records in the table', () => {
      const taskRows = wrapper.findAll('tbody tr')

      expect(taskRows).toHaveLength(2) // Two task records
    })

    it('should show loading state when isLoadingTasks is true', async () => {
      await wrapper.setProps({ isLoadingTasks: true })

      const loadingCell = wrapper.find('.loading-cell')
      expect(loadingCell.exists()).toBe(true)
      expect(loadingCell.text()).toContain('Loading tasks...')
    })

    it('should show empty state when no tasks are present', async () => {
      await wrapper.setProps({ taskRecords: [] })

      const emptyCell = wrapper.find('.empty-cell')
      expect(emptyCell.exists()).toBe(true)
      expect(emptyCell.text()).toContain('No tasks recorded')
    })
  })

  describe('Task Display', () => {
    it('should render normal task records correctly', () => {
      const firstTaskRow = wrapper.findAll('tbody tr')[0]

      // Check category dropdown
      const categoryDropdown = firstTaskRow.find('.dropdown-trigger')
      expect(categoryDropdown.exists()).toBe(true)
      expect(categoryDropdown.text()).toContain('Work')

      // Check task name input
      const taskNameInput = firstTaskRow.find('input[type="text"]')
      expect(taskNameInput.exists()).toBe(true)
      expect(taskNameInput.element.value).toBe('Task 1')
    })

    it('should render special task records with merged columns', async () => {
      const endTask = {
        id: 3,
        category_name: 'End',
        task_name: 'End Task',
        start_time: '17:00',
        date: '2024-01-15',
        task_type: 'end' as const
      }

      await wrapper.setProps({
        taskRecords: [...mockTaskRecords, endTask]
      })

      const taskRows = wrapper.findAll('tbody tr')

      // Find the row containing the end task
      const endTaskRow = taskRows.find(row => row.text().includes('End Task'))

      expect(endTaskRow?.exists()).toBe(true)

      // Get the duration cell using data-test attribute for stability
      const durationCell = endTaskRow?.find('[data-test="task-duration"]')
      expect(durationCell?.text().trim()).toBe('-')
    })
  })

  describe('Inline Category Dropdown', () => {
    it('should show category name in dropdown trigger', () => {
      const dropdownTriggers = wrapper.findAll('.dropdown-trigger')

      // First trigger should show the category name
      expect(dropdownTriggers[0]?.text()).toContain('Work')
    })

    it('should emit toggleInlineDropdown when dropdown trigger is clicked', async () => {
      const firstTaskRow = wrapper.findAll('tbody tr')[0]
      const dropdownTrigger = firstTaskRow.find('.dropdown-trigger')
      await dropdownTrigger.trigger('click')

      expect(wrapper.emitted('toggleInlineDropdown')).toBeTruthy()
      expect(wrapper.emitted('toggleInlineDropdown')?.[0]).toEqual([1]) // First task's ID
    })

    it('should show dropdown menu when showInlineDropdown is true for the task', async () => {
      await wrapper.setProps({
        showInlineDropdown: { 1: true }
      })

      const firstTaskRow = wrapper.findAll('tbody tr')[0]
      const dropdownMenu = firstTaskRow.find('[role="listbox"]')
      expect(dropdownMenu.exists()).toBe(true)

      const dropdownItems = dropdownMenu.findAll('[role="option"]')
      expect(dropdownItems).toHaveLength(3) // Three categories
    })

    it('should render category options correctly in dropdown', async () => {
      await wrapper.setProps({
        showInlineDropdown: { 1: true }
      })

      const firstTaskRow = wrapper.findAll('tbody tr')[0]
      const dropdownMenu = firstTaskRow.find('[role="listbox"]')
      const dropdownItems = dropdownMenu.findAll('[role="option"]')

      const categoryNames = dropdownItems.map(item => item.text())
      expect(categoryNames).toEqual(['Work', 'Personal', 'Learning'])
    })
  })

  describe('Action Buttons', () => {
    it('should emit replayTask when replay button is clicked', async () => {
      const firstTaskRow = wrapper.findAll('tbody tr')[0]
      const replayBtn = firstTaskRow.find('.replay-btn')
      await replayBtn.trigger('click')

      expect(wrapper.emitted('replayTask')).toBeTruthy()
      expect(wrapper.emitted('replayTask')?.[0]?.[0]).toEqual(mockTaskRecords[0])
    })

    it('should emit confirmDeleteTask when delete button is clicked', async () => {
      const firstTaskRow = wrapper.findAll('tbody tr')[0]
      const deleteBtn = firstTaskRow.find('.delete-btn')
      await deleteBtn.trigger('click')

      expect(wrapper.emitted('confirmDeleteTask')).toBeTruthy()
      expect(wrapper.emitted('confirmDeleteTask')?.[0]?.[0]).toEqual(mockTaskRecords[0])
    })
  })

  describe('Editable Fields', () => {
    it('should emit handleBlur when task name field loses focus', async () => {
      const firstTaskRow = wrapper.findAll('tbody tr')[0]
      const taskNameInput = firstTaskRow.find('input[type="text"]')

      await taskNameInput.trigger('blur')

      expect(wrapper.emitted('handleBlur')).toBeTruthy()
      expect(wrapper.emitted('handleBlur')?.[0]?.[0]).toBe(1) // Task ID
      expect(wrapper.emitted('handleBlur')?.[0]?.[1]).toBe('task_name') // Field name
    })

    it('should emit handleEnter when Enter key is pressed in task name field', async () => {
      const firstTaskRow = wrapper.findAll('tbody tr')[0]
      const taskNameInput = firstTaskRow.find('input[type="text"]')

      await taskNameInput.trigger('keydown.enter')

      expect(wrapper.emitted('handleEnter')).toBeTruthy()
      expect(wrapper.emitted('handleEnter')?.[0]?.[0]).toBe(1) // Task ID
      expect(wrapper.emitted('handleEnter')?.[0]?.[1]).toBe('task_name') // Field name
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for table', () => {
      const table = wrapper.find('table')
      expect(table.attributes('aria-label')).toBe('Task records')
    })

    it('should have proper ARIA attributes for dropdown', async () => {
      await wrapper.setProps({
        showInlineDropdown: { 1: true }
      })

      const taskRows = wrapper.findAll('tbody tr')
      const targetRow = taskRows.find(row => row.find('[role="listbox"]').exists())

      expect(targetRow?.exists()).toBe(true)

      const trigger = targetRow.find('.dropdown-trigger')
      const menu = targetRow.find('[role="listbox"]')

      expect(trigger.attributes('aria-expanded')).toBe('true')
      expect(trigger.attributes('aria-haspopup')).toBe('listbox')
      expect(trigger.attributes('aria-controls')).toBeTruthy()

      expect(menu.attributes('role')).toBe('listbox')
      expect(menu.attributes('aria-labelledby')).toBeTruthy()
    })
  })

  describe('Scroll Functionality', () => {
    it('should expose scrollToBottom method', () => {
      const vm = wrapper.vm as any
      expect(typeof vm.scrollToBottom).toBe('function')
    })

    it('should handle scrollToBottom gracefully when taskTableRef is null', async () => {
      const vm = wrapper.vm as any

      // Call scrollToBottom - should not throw and should complete successfully
      await expect(vm.scrollToBottom()).resolves.toBeUndefined()
    })
  })
})
