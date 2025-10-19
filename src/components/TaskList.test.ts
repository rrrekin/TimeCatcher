import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import TaskList from './TaskList.vue'
import type { TaskRecord, Category, TaskRecordWithId, UpdateContext } from '@/shared/types'
import { SPECIAL_TASK_TYPES } from '@/shared/types'

describe('TaskList Component', () => {
  let wrapper: VueWrapper<any> | undefined
  let mockTaskRecords: TaskRecordWithId[]
  let mockCategories: Category[]

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = undefined
    }
  })

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
        updateContext: 'initial-load' as UpdateContext,
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
    it('should highlight newly added tasks with edit context', async () => {
      // Start with initial tasks
      const initialTasks = [mockTaskRecords[0]]
      await wrapper.setProps({
        taskRecords: initialTasks,
        updateContext: 'initial-load'
      })

      // Add a new task with edit context
      const newTask = {
        id: 3,
        category_name: 'Learning',
        task_name: 'New Task',
        start_time: '11:00',
        date: '2024-01-15',
        task_type: 'normal' as const
      }

      await wrapper.setProps({
        taskRecords: [...initialTasks, newTask],
        updateContext: 'edit'
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

    it('should highlight modified tasks with edit context', async () => {
      // Start with initial tasks to initialize the watcher's previousTasksMap
      const initialTasks = JSON.parse(JSON.stringify(mockTaskRecords))
      await wrapper.setProps({
        taskRecords: initialTasks,
        updateContext: 'initial-load'
      })

      // Modify a task with edit context
      const modifiedTasks = JSON.parse(JSON.stringify(mockTaskRecords))
      modifiedTasks[0].task_name = 'Modified Task Name'

      await wrapper.setProps({
        taskRecords: modifiedTasks,
        updateContext: 'edit'
      })

      // Wait for DOM update and ensure all watchers have run
      await wrapper.vm.$nextTick()
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
          updateContext: 'initial-load' as UpdateContext,
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
      await wrapper.setProps({
        taskRecords: initialTasks,
        updateContext: 'initial-load'
      })

      // Add a new task with edit context
      const newTask = {
        id: 3,
        category_name: 'Learning',
        task_name: 'Fading Test Task',
        start_time: '11:00',
        date: '2024-01-15',
        task_type: 'normal' as const
      }
      await wrapper.setProps({
        taskRecords: [...initialTasks, newTask],
        updateContext: 'edit'
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
      await wrapper.setProps({
        taskRecords: initialTasks,
        updateContext: 'initial-load'
      })

      // Add a new task (first highlight) with edit context
      const newTask = {
        id: 3,
        category_name: 'Learning',
        task_name: 'Re-highlight Test',
        start_time: '11:00',
        date: '2024-01-15',
        task_type: 'normal' as const
      }
      await wrapper.setProps({
        taskRecords: [...initialTasks, newTask],
        updateContext: 'edit'
      })

      // Wait for first highlight
      await wrapper.vm.$nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      // Modify the same task (should re-highlight) with edit context
      const modifiedTask = {
        ...newTask,
        task_name: 'Re-highlight Test Modified'
      }
      await wrapper.setProps({
        taskRecords: [initialTasks[0], modifiedTask],
        updateContext: 'edit'
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

    it('should remove highlight after timeout', async () => {
      vi.useFakeTimers()

      // Start with initial tasks
      const initialTasks = [mockTaskRecords[0]]
      await wrapper.setProps({
        taskRecords: initialTasks,
        updateContext: 'initial-load'
      })

      // Add a new task to trigger highlighting with edit context
      const newTask = {
        id: 3,
        category_name: 'Learning',
        task_name: 'Highlight Timeout Test',
        start_time: '11:00',
        date: '2024-01-15',
        task_type: 'normal' as const
      }
      await wrapper.setProps({
        taskRecords: [...initialTasks, newTask],
        updateContext: 'edit'
      })

      // Wait for DOM update
      await wrapper.vm.$nextTick()

      const taskRows = wrapper.findAll('tbody tr')
      const newTaskRow = taskRows.find(row => {
        const taskInput = row.find('input[type="text"]')
        return taskInput.exists() && taskInput.element.value === 'Highlight Timeout Test'
      })

      expect(newTaskRow?.classes()).toContain('highlighted-task')

      // Advance timers by 15 seconds
      await vi.advanceTimersByTimeAsync(15000)
      await wrapper.vm.$nextTick()

      // The classes should be removed
      expect(newTaskRow?.classes()).not.toContain('highlighted-task')
      expect(newTaskRow?.classes()).not.toContain('fading')

      vi.useRealTimers()
    })

    // Context-Aware Highlighting Tests
    it('should NOT highlight tasks with date-change context', async () => {
      // Start with initial tasks
      const initialTasks = [mockTaskRecords[0]]
      await wrapper.setProps({
        taskRecords: initialTasks,
        updateContext: 'initial-load'
      })

      // Change to different tasks with date-change context
      const differentTasks = [
        {
          id: 10,
          category_name: 'Work',
          task_name: 'Different Day Task',
          start_time: '09:30',
          date: '2024-01-16',
          task_type: 'normal' as const
        }
      ]

      await wrapper.setProps({
        taskRecords: differentTasks,
        updateContext: 'date-change'
      })

      await wrapper.vm.$nextTick()

      // No tasks should be highlighted with date-change context
      const taskRows = wrapper.findAll('tbody tr')
      taskRows.forEach(row => {
        expect(row.classes()).not.toContain('highlighted-task')
        expect(row.classes()).not.toContain('fading')
      })
    })

    it('should NOT highlight tasks with auto-refresh context', async () => {
      // Start with initial tasks
      await wrapper.setProps({
        taskRecords: [mockTaskRecords[0]],
        updateContext: 'initial-load'
      })

      // Trigger auto-refresh (same tasks, different context)
      await wrapper.setProps({
        taskRecords: [...mockTaskRecords], // Spread to create new array (auto-refresh behavior)
        updateContext: 'auto-refresh'
      })

      await wrapper.vm.$nextTick()

      // No tasks should be highlighted with auto-refresh context
      const taskRows = wrapper.findAll('tbody tr')
      taskRows.forEach(row => {
        expect(row.classes()).not.toContain('highlighted-task')
        expect(row.classes()).not.toContain('fading')
      })
    })

    it('should NOT highlight tasks with error-recovery context', async () => {
      // Start with initial tasks
      await wrapper.setProps({
        taskRecords: [mockTaskRecords[0]],
        updateContext: 'initial-load'
      })

      // Trigger error recovery (restoring previous state)
      await wrapper.setProps({
        taskRecords: mockTaskRecords,
        updateContext: 'error-recovery'
      })

      await wrapper.vm.$nextTick()

      // No tasks should be highlighted with error-recovery context
      const taskRows = wrapper.findAll('tbody tr')
      taskRows.forEach(row => {
        expect(row.classes()).not.toContain('highlighted-task')
        expect(row.classes()).not.toContain('fading')
      })
    })

    it('should clear existing highlights when using date-change context', async () => {
      // Start with initial tasks
      await wrapper.setProps({
        taskRecords: [mockTaskRecords[0]],
        updateContext: 'initial-load'
      })

      // Add a task with edit context (should highlight)
      const newTask = {
        id: 3,
        category_name: 'Learning',
        task_name: 'To Be Cleared',
        start_time: '11:00',
        date: '2024-01-15',
        task_type: 'normal' as const
      }

      await wrapper.setProps({
        taskRecords: [mockTaskRecords[0], newTask],
        updateContext: 'edit'
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      // Verify task is highlighted
      let taskRows = wrapper.findAll('tbody tr')
      const highlightedRow = taskRows.find(row => {
        const taskInput = row.find('input[type="text"]')
        return taskInput.exists() && taskInput.element.value === 'To Be Cleared'
      })
      expect(highlightedRow?.classes()).toContain('highlighted-task')

      // Change to different tasks with date-change context (should clear highlights)
      const differentTasks = [
        {
          id: 10,
          category_name: 'Work',
          task_name: 'Different Day Task',
          start_time: '09:30',
          date: '2024-01-16',
          task_type: 'normal' as const
        }
      ]

      await wrapper.setProps({
        taskRecords: differentTasks,
        updateContext: 'date-change'
      })

      await wrapper.vm.$nextTick()

      // All tasks should be unhighlighted
      taskRows = wrapper.findAll('tbody tr')
      taskRows.forEach(row => {
        expect(row.classes()).not.toContain('highlighted-task')
        expect(row.classes()).not.toContain('fading')
      })
    })

    it('should highlight all types of task edits (task_name, category_name, start_time)', async () => {
      // Start with initial tasks
      const initialTasks = [mockTaskRecords[0]]
      await wrapper.setProps({
        taskRecords: initialTasks,
        updateContext: 'initial-load'
      })

      // Wait for initial load
      await wrapper.vm.$nextTick()

      // Test 1: Edit task_name
      let modifiedTasks = JSON.parse(JSON.stringify(initialTasks))
      modifiedTasks[0].task_name = 'Edited Task Name'
      await wrapper.setProps({
        taskRecords: modifiedTasks,
        updateContext: 'edit'
      })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      let taskRows = wrapper.findAll('tbody tr')
      let editedRow = taskRows.find(row => {
        const taskInput = row.find('input[type="text"]')
        return taskInput.exists() && taskInput.element.value === 'Edited Task Name'
      })
      expect(editedRow?.classes()).toContain('highlighted-task')

      // Test 2: Edit category_name
      modifiedTasks = JSON.parse(JSON.stringify(modifiedTasks))
      modifiedTasks[0].category_name = 'Learning'
      await wrapper.setProps({
        taskRecords: modifiedTasks,
        updateContext: 'edit'
      })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      taskRows = wrapper.findAll('tbody tr')
      editedRow = taskRows.find(row => {
        const categoryButton = row.find('.dropdown-trigger .dropdown-value')
        return categoryButton.exists() && categoryButton.text() === 'Learning'
      })
      expect(editedRow?.classes()).toContain('highlighted-task')

      // Test 3: Edit start_time
      modifiedTasks = JSON.parse(JSON.stringify(modifiedTasks))
      modifiedTasks[0].start_time = '10:30'
      await wrapper.setProps({
        taskRecords: modifiedTasks,
        updateContext: 'edit'
      })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      taskRows = wrapper.findAll('tbody tr')
      editedRow = taskRows.find(row => {
        const timeInput = row.find('.time-input')
        return timeInput.exists() && timeInput.element.value === '10:30'
      })
      expect(editedRow?.classes()).toContain('highlighted-task')
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

  describe('scrollToTask Method', () => {
    it('should warn when task row is not found', async () => {
      vi.useFakeTimers()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      try {
        const scrollPromise = wrapper.vm.scrollToTask(42) // Non-existent task ID

        // Advance timers beyond max retries
        await vi.advanceTimersByTimeAsync(1100)

        await scrollPromise

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[TaskList] Could not find task row with ID 42 after 1000ms')
        )
      } finally {
        consoleWarnSpy.mockRestore()
        vi.useRealTimers()
      }
    })

    it('should scroll to task when found', async () => {
      const mockScrollIntoView = vi.fn()

      // Override querySelector to return a mock element
      const originalQuerySelector = HTMLElement.prototype.querySelector
      try {
        HTMLElement.prototype.querySelector = vi.fn(function (this: HTMLElement, selector: string) {
          if (selector === 'tr[data-task-id="1"]') {
            return {
              scrollIntoView: mockScrollIntoView
            } as any
          }
          return originalQuerySelector.call(this, selector)
        })

        const scrollToTask = wrapper.vm.scrollToTask
        await scrollToTask(1)

        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth', // Smooth when matchMedia not supported or prefers-reduced-motion is false
          block: 'nearest',
          inline: 'nearest'
        })
      } finally {
        // Restore original querySelector
        HTMLElement.prototype.querySelector = originalQuerySelector
      }
    })

    it('should respect prefers-reduced-motion preference', async () => {
      const mockScrollIntoView = vi.fn()
      const mockMatchMedia = vi.fn().mockReturnValue({ matches: true })
      const originalMatchMedia = window.matchMedia

      try {
        window.matchMedia = mockMatchMedia as any

        const originalQuerySelector = HTMLElement.prototype.querySelector
        HTMLElement.prototype.querySelector = vi.fn(function (this: HTMLElement, selector: string) {
          if (selector === 'tr[data-task-id="1"]') {
            return { scrollIntoView: mockScrollIntoView } as any
          }
          return originalQuerySelector.call(this, selector)
        })

        const scrollToTask = wrapper.vm.scrollToTask
        await scrollToTask(1)

        expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'auto', // Auto when reduced motion is preferred
          block: 'nearest',
          inline: 'nearest'
        })

        HTMLElement.prototype.querySelector = originalQuerySelector
      } finally {
        window.matchMedia = originalMatchMedia
      }
    })

    it('should retry finding element with polling', async () => {
      vi.useFakeTimers()
      const mockScrollIntoView = vi.fn()
      let callCount = 0

      const originalQuerySelector = HTMLElement.prototype.querySelector
      try {
        HTMLElement.prototype.querySelector = vi.fn(function (this: HTMLElement, selector: string) {
          callCount++
          // Return element on 3rd attempt
          if (selector === 'tr[data-task-id="1"]' && callCount >= 3) {
            return { scrollIntoView: mockScrollIntoView } as any
          }
          return null
        })

        const scrollPromise = wrapper.vm.scrollToTask(1)

        // Advance timers to trigger retries
        await vi.advanceTimersByTimeAsync(75) // 3 retries * 25ms

        await scrollPromise

        expect(callCount).toBeGreaterThanOrEqual(3)
        expect(mockScrollIntoView).toHaveBeenCalled()
      } finally {
        HTMLElement.prototype.querySelector = originalQuerySelector
        vi.useRealTimers()
      }
    })

    it('should timeout after max retries and warn', async () => {
      vi.useFakeTimers()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const originalQuerySelector = HTMLElement.prototype.querySelector
      try {
        // Always return null to force timeout
        HTMLElement.prototype.querySelector = vi.fn(() => null)

        const scrollPromise = wrapper.vm.scrollToTask(999)

        // Advance timers beyond max retries (40 * 25ms = 1000ms)
        await vi.advanceTimersByTimeAsync(1100)

        await scrollPromise

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[TaskList] Could not find task row with ID 999 after 1000ms')
        )
      } finally {
        HTMLElement.prototype.querySelector = originalQuerySelector
        consoleWarnSpy.mockRestore()
        vi.useRealTimers()
      }
    })
  })

  describe('Duration Timer Lifecycle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T10:30:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should not start duration timer if already running', async () => {
      // Create wrapper viewing today
      const todayWrapper = mount(TaskList, {
        props: {
          taskRecords: mockTaskRecords,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15', // Today
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          updateContext: 'initial-load' as UpdateContext,
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:30'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      await todayWrapper.vm.$nextTick()

      // Timer should already be running
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      // Try to start timer again (should be no-op)
      todayWrapper.vm.startDurationTimer()

      expect(setIntervalSpy).not.toHaveBeenCalled()

      setIntervalSpy.mockRestore()
      todayWrapper.unmount()
    })

    it('should handle stopDurationTimer when timer is null', () => {
      // Create wrapper viewing a past date (timer won't start)
      const pastWrapper = mount(TaskList, {
        props: {
          taskRecords: mockTaskRecords,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-10', // Past date
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          updateContext: 'initial-load' as UpdateContext,
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:30'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      // Should not throw when stopping non-existent timer
      expect(() => {
        pastWrapper.vm.stopDurationTimer()
      }).not.toThrow()

      pastWrapper.unmount()
    })

    it('should start duration timer when date changes to today', async () => {
      // Create wrapper with past date
      const dateChangeWrapper = mount(TaskList, {
        props: {
          taskRecords: mockTaskRecords,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-10', // Past date
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          updateContext: 'initial-load' as UpdateContext,
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:30'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      await dateChangeWrapper.vm.$nextTick()

      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      // Change to today's date
      await dateChangeWrapper.setProps({ displayDate: '2024-01-15' })
      await dateChangeWrapper.vm.$nextTick()

      // Timer should start
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000)

      setIntervalSpy.mockRestore()
      dateChangeWrapper.unmount()
    })

    it('should stop duration timer when date changes away from today', async () => {
      // Create wrapper viewing today
      const dateChangeWrapper = mount(TaskList, {
        props: {
          taskRecords: mockTaskRecords,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15', // Today
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          updateContext: 'initial-load' as UpdateContext,
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:30'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      await dateChangeWrapper.vm.$nextTick()

      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

      // Change to past date
      await dateChangeWrapper.setProps({ displayDate: '2024-01-10' })
      await dateChangeWrapper.vm.$nextTick()

      // Timer should stop
      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
      dateChangeWrapper.unmount()
    })
  })

  describe('Duration Calculation Reactivity', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T10:30:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should trigger reactive duration update for last task when viewing today', async () => {
      const calculateDurationMock = vi.fn(() => '1h 30m')

      // Create wrapper viewing today
      const todayWrapper = mount(TaskList, {
        props: {
          taskRecords: mockTaskRecords,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15', // Today
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          updateContext: 'initial-load' as UpdateContext,
          calculateDuration: calculateDurationMock,
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:30'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      await todayWrapper.vm.$nextTick()

      // Clear calls from initial render
      calculateDurationMock.mockClear()

      // Advance time by 15 seconds (timer interval) to update currentTimeMinutes
      await vi.advanceTimersByTimeAsync(15000)
      await todayWrapper.vm.$nextTick()

      // Force a re-render by checking the getTaskDuration function
      const lastTask = mockTaskRecords[mockTaskRecords.length - 1]
      todayWrapper.vm.getTaskDuration(lastTask)

      // Duration should be calculated at least once (reactivity triggered)
      expect(calculateDurationMock.mock.calls.length).toBeGreaterThanOrEqual(1)

      todayWrapper.unmount()
    })
  })

  describe('lastTaskId Computed Property', () => {
    it('should compute last task ID based on sorted start times', () => {
      const tasksWithDifferentTimes = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'First Task',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal' as const
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Last Task',
          start_time: '14:30',
          date: '2024-01-15',
          task_type: 'normal' as const
        },
        {
          id: 3,
          category_name: 'Work',
          task_name: 'Middle Task',
          start_time: '11:00',
          date: '2024-01-15',
          task_type: 'normal' as const
        }
      ]

      const testWrapper = mount(TaskList, {
        props: {
          taskRecords: tasksWithDifferentTimes,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15',
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          updateContext: 'initial-load' as UpdateContext,
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '15:00'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      // Last task should be the one with latest time (14:30 = task ID 2)
      expect(testWrapper.vm.lastTaskId).toBe(2)

      testWrapper.unmount()
    })

    it('should filter out tasks with empty start_time when computing lastTaskId', () => {
      const tasksWithEmptyTimes = [
        {
          id: 1,
          category_name: 'Work',
          task_name: 'Task With Time',
          start_time: '09:00',
          date: '2024-01-15',
          task_type: 'normal' as const
        },
        {
          id: 2,
          category_name: 'Work',
          task_name: 'Task Without Time',
          start_time: '  ',
          date: '2024-01-15',
          task_type: 'normal' as const
        }
      ]

      const testWrapper = mount(TaskList, {
        props: {
          taskRecords: tasksWithEmptyTimes,
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15',
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          updateContext: 'initial-load' as UpdateContext,
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:00'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      // Should return task 1 (empty times filtered out)
      expect(testWrapper.vm.lastTaskId).toBe(1)

      testWrapper.unmount()
    })

    it('should return null when taskRecords array is empty', () => {
      const emptyWrapper = mount(TaskList, {
        props: {
          taskRecords: [],
          categories: mockCategories,
          isLoadingTasks: false,
          displayDate: '2024-01-15',
          hasEndTaskForSelectedDate: false,
          showInlineDropdown: {},
          updateContext: 'initial-load' as UpdateContext,
          calculateDuration: vi.fn(() => '1h 30m'),
          convertToTimeInput: vi.fn(time => time),
          getCurrentTime: vi.fn(() => '10:00'),
          isSpecial: vi.fn(taskType => SPECIAL_TASK_TYPES.includes(taskType))
        }
      })

      expect(emptyWrapper.vm.lastTaskId).toBeNull()

      emptyWrapper.unmount()
    })
  })
})
