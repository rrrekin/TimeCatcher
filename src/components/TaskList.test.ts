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

  describe('Task Highlighting', () => {
    it('should highlight newly added tasks', async () => {
      // Start with initial tasks
      const initialTasks = [mockTaskRecords[0]]
      await wrapper.setProps({ taskRecords: initialTasks })

      // Add a new task
      const newTask = {
        id: 3,
        category_name: 'Learning',
        task_name: 'New Task',
        start_time: '11:00',
        date: '2024-01-15',
        task_type: 'normal' as const
      }

      await wrapper.setProps({
        taskRecords: [...initialTasks, newTask]
      })

      // Wait for DOM update
      await wrapper.vm.$nextTick()

      // Check if the new task is highlighted
      const taskRows = wrapper.findAll('tbody tr')
      expect(taskRows).toHaveLength(2) // Should have 2 tasks now

      // Find the task row by checking the input value
      const newTaskRow = taskRows.find(row => {
        const taskInput = row.find('input[type="text"]')
        return taskInput.exists() && taskInput.element.value === 'New Task'
      })

      expect(newTaskRow).toBeTruthy()
      expect(newTaskRow?.classes()).toContain('highlighted-task')
    })

    it('should highlight modified tasks', async () => {
      // Start with initial tasks
      await wrapper.setProps({ taskRecords: mockTaskRecords })

      // Modify a task
      const modifiedTasks = [
        {
          ...mockTaskRecords[0],
          task_name: 'Modified Task Name'
        },
        mockTaskRecords[1]
      ]

      await wrapper.setProps({ taskRecords: modifiedTasks })

      // Wait for DOM update
      await wrapper.vm.$nextTick()

      // Check if the modified task is highlighted
      const taskRows = wrapper.findAll('tbody tr')

      // Find the task row by checking the input value
      const modifiedTaskRow = taskRows.find(row => {
        const taskInput = row.find('input[type="text"]')
        return taskInput.exists() && taskInput.element.value === 'Modified Task Name'
      })

      expect(modifiedTaskRow).toBeTruthy()
      expect(modifiedTaskRow?.classes()).toContain('highlighted-task')
    })

    it('should not highlight tasks on initial load', async () => {
      // Mount a fresh component with initial tasks
      const freshWrapper = mount(TaskList, {
        props: {
          taskRecords: mockTaskRecords,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15',
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:30'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      // No tasks should be highlighted on initial load
      const taskRows = freshWrapper.findAll('tbody tr')
      taskRows.forEach(row => {
        expect(row.classes()).not.toContain('highlighted-task')
        expect(row.classes()).not.toContain('fading')
      })

      freshWrapper.unmount()
    })

    it('should add fading class immediately after highlighting', async () => {
      // Start with initial tasks
      const initialTasks = [mockTaskRecords[0]]
      await wrapper.setProps({ taskRecords: initialTasks })

      // Add a new task
      const newTask = {
        id: 3,
        category_name: 'Learning',
        task_name: 'Fading Test Task',
        start_time: '11:00',
        date: '2024-01-15',
        task_type: 'normal' as const
      }
      await wrapper.setProps({
        taskRecords: [...initialTasks, newTask]
      })

      // Wait for DOM update and requestAnimationFrame
      await wrapper.vm.$nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      // Check if the new task has both highlighted-task and fading classes
      const taskRows = wrapper.findAll('tbody tr')
      const newTaskRow = taskRows.find(row => {
        const taskInput = row.find('input[type="text"]')
        return taskInput.exists() && taskInput.element.value === 'Fading Test Task'
      })

      expect(newTaskRow).toBeTruthy()
      expect(newTaskRow?.classes()).toContain('highlighted-task')
      expect(newTaskRow?.classes()).toContain('fading')
    })

    it('should handle re-highlighting of previously highlighted tasks', async () => {
      // Start with initial tasks
      const initialTasks = [mockTaskRecords[0]]
      await wrapper.setProps({ taskRecords: initialTasks })

      // Add a new task (first highlight)
      const newTask = {
        id: 3,
        category_name: 'Learning',
        task_name: 'Re-highlight Test',
        start_time: '11:00',
        date: '2024-01-15',
        task_type: 'normal' as const
      }
      await wrapper.setProps({
        taskRecords: [...initialTasks, newTask]
      })

      // Wait for first highlight
      await wrapper.vm.$nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      // Modify the same task (should re-highlight)
      const modifiedTask = {
        ...newTask,
        task_name: 'Re-highlight Test Modified'
      }
      await wrapper.setProps({
        taskRecords: [initialTasks[0], modifiedTask]
      })

      // Wait for re-highlight
      await wrapper.vm.$nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      // Check that the task is still highlighted with both classes
      const taskRows = wrapper.findAll('tbody tr')
      const modifiedTaskRow = taskRows.find(row => {
        const taskInput = row.find('input[type="text"]')
        return taskInput.exists() && taskInput.element.value === 'Re-highlight Test Modified'
      })

      expect(modifiedTaskRow).toBeTruthy()
      expect(modifiedTaskRow?.classes()).toContain('highlighted-task')
      expect(modifiedTaskRow?.classes()).toContain('fading')
    })

    it('should cleanup timers on component unmount', () => {
      // Add some tasks to trigger highlighting
      const testTasks = [
        {
          id: 4,
          category_name: 'Testing',
          task_name: 'Cleanup Test',
          start_time: '12:00',
          date: '2024-01-15',
          task_type: 'normal' as const
        }
      ]

      // Create a fresh wrapper to test unmount
      const testWrapper = mount(TaskList, {
        props: {
          taskRecords: testTasks,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15',
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:30'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      // Trigger highlighting by modifying tasks
      testWrapper.setProps({
        taskRecords: [
          {
            ...testTasks[0],
            task_name: 'Cleanup Test Modified'
          }
        ]
      })

      // Unmount should not throw errors (timers should be cleaned up)
      expect(() => {
        testWrapper.unmount()
      }).not.toThrow()
    })
  })

  describe('Keyboard Event Handling', () => {
    it('should handle Escape key in task name input to revert changes', async () => {
      const taskNameInput = wrapper.find('input[type="text"]')
      const originalValue = taskNameInput.element.value

      // Modify the input value
      await taskNameInput.setValue('Modified Task Name')
      expect(taskNameInput.element.value).toBe('Modified Task Name')

      // Press Escape key
      await taskNameInput.trigger('keydown', { key: 'Escape' })

      // Should revert to original value
      expect(taskNameInput.element.value).toBe(originalValue)
    })

    it('should handle Escape key in time input to revert changes', async () => {
      const timeInput = wrapper.find('input[type="time"]')
      const convertToTimeInput = vi.fn(time => time)

      // Update wrapper with mock function
      await wrapper.setProps({
        convertToTimeInput
      })

      // Press Escape key
      await timeInput.trigger('keydown', { key: 'Escape' })

      // Should call convertToTimeInput with original time
      expect(convertToTimeInput).toHaveBeenCalledWith(mockTaskRecords[0].start_time)
    })

    it('should ignore non-Escape keys in task name input', async () => {
      const taskNameInput = wrapper.find('input[type="text"]')
      const originalValue = taskNameInput.element.value

      // Modify the input value
      await taskNameInput.setValue('Modified Task Name')
      expect(taskNameInput.element.value).toBe('Modified Task Name')

      // Press a different key (not Escape)
      await taskNameInput.trigger('keydown', { key: 'Enter' })

      // Should not revert value
      expect(taskNameInput.element.value).toBe('Modified Task Name')
    })

    it('should ignore non-Escape keys in time input', async () => {
      const timeInput = wrapper.find('input[type="time"]')
      const convertToTimeInput = vi.fn(time => time)

      // Create fresh wrapper to avoid previous calls
      const freshWrapper = mount(TaskList, {
        props: {
          taskRecords: mockTaskRecords.slice(0, 1), // Just one task
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15',
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput,
          getCurrentTime: vi.fn(() => '10:30'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      // Clear any initialization calls
      convertToTimeInput.mockClear()

      const freshTimeInput = freshWrapper.find('input[type="time"]')

      // Press a different key (not Escape)
      await freshTimeInput.trigger('keydown', { key: 'Enter' })

      // Should not call convertToTimeInput for non-Escape keys
      expect(convertToTimeInput).not.toHaveBeenCalled()

      freshWrapper.unmount()
    })
  })

  describe('Focus Management', () => {
    it('should focus trigger button after category selection', async () => {
      // Set up inline dropdown for a task
      await wrapper.setProps({
        showInlineDropdown: { [mockTaskRecords[0].id]: true }
      })

      const dropdownItem = wrapper.find('.dropdown-item')
      await dropdownItem.trigger('click')

      expect(wrapper.emitted('selectInlineCategory')).toBeTruthy()
      // Parent component handles closing dropdown via selectInlineCategory handler
    })

    it('should handle keyboard navigation in inline dropdown', async () => {
      await wrapper.setProps({
        showInlineDropdown: { [mockTaskRecords[0].id]: true }
      })

      const dropdown = wrapper.find('.dropdown-menu')

      // Test arrow down navigation
      await dropdown.trigger('keydown', { key: 'ArrowDown' })

      // Test escape key
      await dropdown.trigger('keydown', { key: 'Escape' })

      expect(wrapper.emitted('toggleInlineDropdown')).toBeTruthy()
    })
  })

  describe('Component Methods', () => {
    it('should handle scrollToBottom when container is available', async () => {
      const scrollToBottom = wrapper.vm.scrollToBottom
      expect(typeof scrollToBottom).toBe('function')

      // Should not throw error
      expect(() => scrollToBottom()).not.toThrow()
    })

    it('should handle scrollToBottom with custom parent pane', async () => {
      const mockParentPane = {
        value: {
          scrollTo: vi.fn(),
          scrollHeight: 1000
        }
      }

      const scrollToBottom = wrapper.vm.scrollToBottom
      await scrollToBottom(mockParentPane)

      expect(mockParentPane.value.scrollTo).toHaveBeenCalledWith({
        top: 1000,
        behavior: 'auto'
      })
    })
  })
})
