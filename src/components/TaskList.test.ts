import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import TaskList from './TaskList.vue'
import type { TaskRecord, Category } from '@/shared/types'
import { SPECIAL_TASK_TYPES } from '@/shared/types'

// Mock the composables
vi.mock('@/composables/useListboxNavigation', () => ({
  useListboxNavigation: vi.fn(() => {
    const mockActiveIndexValue: Record<string | number, number> = {}
    const mockActiveIndex = { value: mockActiveIndexValue }
    return {
      activeIndex: mockActiveIndex,
      getActiveIndex: vi.fn((contextId: string | number) => mockActiveIndexValue[contextId] ?? -1),
      handleKeydown: vi.fn(async (_event: KeyboardEvent, _contextId: string | number) => {}),
      focusOption: vi.fn((_contextId: string | number, _optionIndex: number) => {}),
      initializeActiveOption: vi.fn(async (contextId: string | number, selectedIndex: number = 0): Promise<void> => {
        mockActiveIndexValue[contextId] = selectedIndex
      }),
      focusTrigger: vi.fn((_triggerSelector: string) => {})
    }
  })
}))

// Mock the types import
vi.mock('@/shared/types', async () => {
  const actual = await vi.importActual('@/shared/types')
  return {
    ...actual,
    DURATION_VISIBLE_BY_TASK_TYPE: {
      normal: true,
      pause: true,
      end: false
    }
  }
})

describe('TaskList Component', () => {
  let wrapper: VueWrapper
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
        showFormCategoryDropdown: false,
        newTask: {
          categoryId: null,
          name: '',
          time: ''
        },
        // Function props
        calculateDuration: vi.fn(() => '1h 30m'),
        convertToTimeInput: vi.fn((time) => time),
        getCurrentTime: vi.fn(() => '10:30'),
        getSelectedCategoryName: vi.fn(() => 'Work'),
        isSpecial: vi.fn((taskType) => SPECIAL_TASK_TYPES.includes(taskType))
      }
    })
  })

  describe('Table Structure', () => {
    it('should render the task table with correct headers', () => {
      const headers = wrapper.findAll('th')
      const headerTexts = headers.map(h => h.text())
      
      expect(headerTexts).toEqual([
        'Category',
        'Task', 
        'Start time',
        'Duration',
        'Actions'
      ])
    })

    it('should display task records in the table', () => {
      const taskRows = wrapper.findAll('tbody tr').filter(row => 
        !row.classes().includes('add-task-row')
      )
      
      expect(taskRows).toHaveLength(2) // Two task records
    })

    it('should show loading state when isLoadingTasks is true', async () => {
      await wrapper.setProps({ isLoadingTasks: true })
      
      const loadingCell = wrapper.find('.loading-cell')
      expect(loadingCell.exists()).toBe(true)
      expect(loadingCell.text()).toContain('Loading tasks...')
    })

    it('should show empty state when no tasks exist', async () => {
      await wrapper.setProps({ 
        taskRecords: [],
        isLoadingTasks: false 
      })
      
      const emptyCell = wrapper.find('.empty-cell')
      expect(emptyCell.exists()).toBe(true)
      expect(emptyCell.text()).toContain('No tasks recorded for 2024-01-15')
    })

    it('should not show duration for end task type', async () => {
      const endTask = {
        id: 3,
        category_name: '__special__',
        task_name: 'End Task',
        start_time: '17:00',
        date: '2024-01-15',
        task_type: 'end' as const
      }

      await wrapper.setProps({
        taskRecords: [...mockTaskRecords, endTask]
      })

      const taskRows = wrapper.findAll('tbody tr').filter(row => 
        !row.classes().includes('add-task-row')
      )
      
      // Find the row containing the end task
      const endTaskRow = taskRows.find(row => 
        row.text().includes('End Task')
      )
      
      expect(endTaskRow?.exists()).toBe(true)
      
      // Get the duration cell using data-test attribute for stability
      const durationCell = endTaskRow?.find('[data-test="task-duration"]')
      expect(durationCell?.text().trim()).toBe('-')
    })
  })

  describe('Inline Category Dropdown', () => {
    it('should render dropdown trigger for normal tasks', () => {
      const dropdownTriggers = wrapper.findAll('.dropdown-trigger')
      expect(dropdownTriggers.length).toBeGreaterThan(0)
      
      // First trigger should show the category name
      expect(dropdownTriggers[0]?.text()).toContain('Work')
    })

    it('should emit toggleInlineDropdown when dropdown trigger is clicked', async () => {
      const firstTaskRow = wrapper.findAll('tbody tr').filter(row => 
        !row.classes().includes('add-task-row')
      )[0]
      const dropdownTrigger = firstTaskRow.find('.dropdown-trigger')
      await dropdownTrigger.trigger('click')
      
      expect(wrapper.emitted('toggleInlineDropdown')).toBeTruthy()
      expect(wrapper.emitted('toggleInlineDropdown')?.[0]).toEqual([1]) // First task's ID
    })

    it('should show dropdown menu when showInlineDropdown is true for the task', async () => {
      await wrapper.setProps({ 
        showInlineDropdown: { 1: true }
      })
      
      const firstTaskRow = wrapper.findAll('tbody tr').filter(row => 
        !row.classes().includes('add-task-row')
      )[0]
      const dropdownMenu = firstTaskRow.find('[role="listbox"]')
      expect(dropdownMenu.exists()).toBe(true)
      
      const dropdownItems = dropdownMenu.findAll('[role="option"]')
      expect(dropdownItems).toHaveLength(3) // Three categories
    })

    it('should render category options correctly in dropdown', async () => {
      await wrapper.setProps({ 
        showInlineDropdown: { 1: true }
      })
      
      const dropdownMenu = wrapper.find('[role="listbox"]')
      const options = dropdownMenu.findAll('[role="option"]')
      
      expect(options[0]?.text()).toBe('Work')
      expect(options[1]?.text()).toBe('Personal') 
      expect(options[2]?.text()).toBe('Learning')
    })

    it('should mark current category as selected in dropdown', async () => {
      await wrapper.setProps({ 
        showInlineDropdown: { 1: true }
      })
      
      const dropdownMenu = wrapper.find('[role="listbox"]')
      const selectedOption = dropdownMenu.find('.selected')
      
      expect(selectedOption.exists()).toBe(true)
      expect(selectedOption.text()).toBe('Work') // First task's category
    })

    it('should emit selectInlineCategory when category option is clicked', async () => {
      await wrapper.setProps({ 
        showInlineDropdown: { 1: true }
      })
      
      const dropdownMenu = wrapper.find('[role="listbox"]')
      const personalOption = dropdownMenu.findAll('[role="option"]')[1]
      expect(personalOption?.exists()).toBe(true)
      await personalOption.trigger('click')
      
      expect(wrapper.emitted('selectInlineCategory')).toBeTruthy()
      expect(wrapper.emitted('selectInlineCategory')?.[0]).toEqual([1, 'Personal'])
    })

    it('should have proper ARIA attributes on dropdown elements', async () => {
      await wrapper.setProps({ 
        showInlineDropdown: { 1: true }
      })
      
      const trigger = wrapper.find('.dropdown-trigger')
      const menu = wrapper.find('[role="listbox"]')
      
      expect(trigger.attributes('aria-expanded')).toBe('true')
      expect(trigger.attributes('aria-haspopup')).toBe('listbox')
      expect(trigger.attributes('aria-controls')).toBeTruthy()
      
      expect(menu.attributes('role')).toBe('listbox')
      expect(menu.attributes('aria-labelledby')).toBeTruthy()

      const selected = menu.find('[role="option"].selected')
      expect(selected.attributes('aria-selected')).toBe('true')
      const unselected = menu.findAll('[role="option"]:not(.selected)')
      expect(unselected[0]?.attributes('aria-selected')).toBe('false')
    })
  })

  describe('Form Category Dropdown', () => {
    it('should render form dropdown in add task row', () => {
      const addTaskRow = wrapper.find('.add-task-row')
      const formDropdown = addTaskRow.find('.add-task-dropdown')
      
      expect(formDropdown.exists()).toBe(true)
    })

    it('should emit toggleFormDropdown when form dropdown trigger is clicked', async () => {
      const addTaskRow = wrapper.find('.add-task-row')
      const formTrigger = addTaskRow.find('.dropdown-trigger')
      
      await formTrigger.trigger('click')
      
      expect(wrapper.emitted('toggleFormDropdown')).toBeTruthy()
    })

    it('should show form dropdown menu when showFormCategoryDropdown is true', async () => {
      await wrapper.setProps({ showFormCategoryDropdown: true })
      
      const addTaskRow = wrapper.find('.add-task-row')
      const dropdownMenu = addTaskRow.find('[role="listbox"]')
      
      expect(dropdownMenu.exists()).toBe(true)
      
      const options = dropdownMenu.findAll('[role="option"]')
      expect(options).toHaveLength(3)
    })

    it('should emit selectFormCategory when form category option is clicked', async () => {
      await wrapper.setProps({ showFormCategoryDropdown: true })
      
      const addTaskRow = wrapper.find('.add-task-row')
      const dropdownMenu = addTaskRow.find('[role="listbox"]')
      const personalOption = dropdownMenu.findAll('[role="option"]')[1]
      
      if (!personalOption) {
        throw new Error('Personal option not found in dropdown menu')
      }
      
      await personalOption.trigger('click')
      
      expect(wrapper.emitted('selectFormCategory')).toBeTruthy()
      expect(wrapper.emitted('selectFormCategory')?.[0]).toMatchObject([
        expect.objectContaining({ id: 2, name: 'Personal', is_default: false })
      ])
    })
  })

  describe('Task Input Fields', () => {
    it('should emit handleBlur when task name input loses focus', async () => {
      const taskNameInput = wrapper.find('input[placeholder="Task name"]')
      expect(taskNameInput.exists()).toBe(true)
      await taskNameInput.trigger('blur')
      
      expect(wrapper.emitted('handleBlur')).toBeTruthy()
      expect(wrapper.emitted('handleBlur')?.[0]?.[1]).toBe('task_name')
    })

    it('should emit handleEnter when Enter key is pressed in task name input', async () => {
      const taskNameInput = wrapper.find('input[placeholder="Task name"]')
      expect(taskNameInput.exists()).toBe(true)
      await taskNameInput.trigger('keydown.enter')
      
      expect(wrapper.emitted('handleEnter')).toBeTruthy()
      expect(wrapper.emitted('handleEnter')?.[0]?.[1]).toBe('task_name')
    })

    it('should emit handleBlur when time input loses focus', async () => {
      const timeInput = wrapper.find('input[type="time"]')
      expect(timeInput.exists()).toBe(true)
      await timeInput.trigger('blur')
      
      expect(wrapper.emitted('handleBlur')).toBeTruthy()
      expect(wrapper.emitted('handleBlur')?.[0]?.[1]).toBe('start_time')
    })
  })

  describe('Special Task Buttons', () => {
    it('should render pause and end buttons', () => {
      const specialButtons = wrapper.find('.special-task-buttons')
      const pauseBtn = specialButtons.find('.pause-btn')
      const endBtn = specialButtons.find('.end-btn')
      
      expect(pauseBtn.exists()).toBe(true)
      expect(pauseBtn.text()).toContain('Pause')
      
      expect(endBtn.exists()).toBe(true)
      expect(endBtn.text()).toContain('End')
    })

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
      expect(endBtn.attributes('aria-disabled')).toBe('true')
    })

    it('should NOT emit addEndTask when end button is disabled', async () => {
        await wrapper.setProps({ hasEndTaskForSelectedDate: true })
        const endBtn = wrapper.find('.end-btn')
        await endBtn.trigger('click')
        expect(wrapper.emitted('addEndTask')).toBeFalsy()
    })
  })

  describe('Add Task Form', () => {
    it('should emit updateNewTask when task name input changes', async () => {
      const addTaskRow = wrapper.find('.add-task-row')
      const taskNameInput = addTaskRow.find('input[placeholder="Enter task name..."]')
      
      await taskNameInput.setValue('New Task')
      
      expect(wrapper.emitted('updateNewTask')).toBeTruthy()
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
      
      const addBtn = wrapper.find('.add-btn')
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
      
      const addBtn = wrapper.find('.add-btn')
      expect(addBtn.attributes('disabled')).toBeDefined()
      expect(addBtn.attributes('aria-disabled')).toBe('true')
    })
  })

  describe('Action Buttons', () => {
    it('should emit replayTask when replay button is clicked', async () => {
      const firstTaskRow = wrapper.findAll('tbody tr').filter(row =>
          !row.classes().includes('add-task-row')
      )[0]
      const replayBtn = firstTaskRow.find('.replay-btn')
      await replayBtn.trigger('click')
      
      expect(wrapper.emitted('replayTask')).toBeTruthy()
      expect(wrapper.emitted('replayTask')?.[0]?.[0]).toEqual(mockTaskRecords[0])
    })

    it('should emit confirmDeleteTask when delete button is clicked', async () => {
      const firstTaskRow = wrapper.findAll('tbody tr').filter(row =>
          !row.classes().includes('add-task-row')
      )[0]
      const deleteBtn = firstTaskRow.find('.delete-btn')
      await deleteBtn.trigger('click')
      
      expect(wrapper.emitted('confirmDeleteTask')).toBeTruthy()
      expect(wrapper.emitted('confirmDeleteTask')?.[0]?.[0]).toEqual(mockTaskRecords[0])
    })

    it('should not show replay button for special tasks', async () => {
      // Add a pause task
      await wrapper.setProps({
        taskRecords: [
          ...mockTaskRecords,
          {
            id: 3,
            category_name: '__special__',
            task_name: 'Pause Task',
            start_time: '11:00',
            date: '2024-01-15',
            task_type: 'pause'
          }
        ]
      })
      
      const taskRows = wrapper.findAll('tbody tr').filter(row => 
        !row.classes().includes('add-task-row')
      )

      // Control: normal task should have replay button (search by category name)
      const normalTaskRow = taskRows.find(row => 
        row.text().includes('Work') // First task's category from mockTaskRecords
      )
      
      const normalTaskReplay = normalTaskRow?.find('.replay-btn')
      expect(normalTaskReplay?.exists()).toBe(true)
      
      // Find pause task row by task name
      const pauseTaskRow = taskRows.find(row => 
        row.text().includes('Pause Task')
      )
      const replayBtn = pauseTaskRow?.find('.replay-btn')
      
      expect(replayBtn?.exists()).toBe(false)
    })
  })
})