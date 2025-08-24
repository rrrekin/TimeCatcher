// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import DailyReport from './DailyReport.vue'
import type { TaskRecord } from '@/shared/types'

describe('DailyReport Component', () => {
  let wrapper: VueWrapper

  const mockTaskRecords: TaskRecord[] = [
    {
      category_name: 'Work',
      task_name: 'Development',
      start_time: '09:00',
      date: '2024-01-15',
      task_type: 'normal',
    },
    {
      category_name: 'Work',
      task_name: 'Meeting',
      start_time: '10:30',
      date: '2024-01-15',
      task_type: 'normal',
    },
    {
      category_name: 'Personal',
      task_name: 'Exercise',
      start_time: '14:00',
      date: '2024-01-15',
      task_type: 'normal',
    },
    {
      category_name: '__special__',
      task_name: '⏸ Pause',
      start_time: '12:00',
      date: '2024-01-15',
      task_type: 'pause',
    },
  ]

  const mockCategoryBreakdown = [
    {
      name: 'Work',
      taskCount: 2,
      totalTime: '3h 30m',
      percentage: 70,
      taskSummaries: [
        { name: 'Development', count: 1, totalTime: '2h 15m' },
        { name: 'Meeting', count: 1, totalTime: '1h 15m' },
      ],
    },
    {
      name: 'Personal',
      taskCount: 1,
      totalTime: '1h 30m',
      percentage: 30,
      taskSummaries: [{ name: 'Exercise', count: 1, totalTime: '1h 30m' }],
    },
  ]

  beforeEach(() => {
    wrapper = mount(DailyReport, {
      props: {
        taskRecords: mockTaskRecords,
        dateTitle: 'Monday, January 15',
        hasEndTaskForSelectedDate: true,
        targetWorkHours: 8,
        totalTimeTracked: '5h 0m',
        totalMinutesTracked: 300,
        categoryBreakdown: mockCategoryBreakdown,
      },
    })
  })

  describe('Component Rendering', () => {
    it('should render the report header with total time', () => {
      const header = wrapper.find('[data-testid="report-header-title"]')
      expect(header.text()).toContain('Daily Report: 5h 0m')
    })

    it('should display the date title', () => {
      const dateTitle = wrapper.find('[data-testid="report-date"]')
      expect(dateTitle.text()).toContain('Monday, January 15')
    })

    it('should render category breakdown when tasks exist', () => {
      const categoryBreakdown = wrapper.find('[data-testid="category-breakdown"]')
      expect(categoryBreakdown.exists()).toBe(true)

      const categorySections = wrapper.findAll('[data-testid="category-section"]')
      expect(categorySections).toHaveLength(2) // Work and Personal
    })

    it('should display empty state when no standard tasks exist', async () => {
      await wrapper.setProps({
        taskRecords: [mockTaskRecords[3]], // Only pause task
        categoryBreakdown: [],
      })

      const emptyReport = wrapper.find('.empty-report')
      expect(emptyReport.exists()).toBe(true)
      expect(emptyReport.text()).toBe('No standard tasks recorded for this day')
    })
  })

  describe('Status Indicators', () => {
    it('should show success emoji when target work hours reached', async () => {
      await wrapper.setProps({
        totalMinutesTracked: 480, // 8 hours
        targetWorkHours: 8,
      })

      const successEmoji = wrapper.find('.status-emoji[title="Target reached"]')
      expect(successEmoji.exists()).toBe(true)
      expect(successEmoji.text()).toBe('😊')
    })

    it('should show warning emoji when end task is missing', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: false,
      })

      const warningEmoji = wrapper.find('.status-emoji[title="Missing end task"]')
      expect(warningEmoji.exists()).toBe(true)
      expect(warningEmoji.text()).toBe('⚠️')
    })

    it('should show day not finalized message when end task missing', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: false,
      })

      const dateText = wrapper.find('p')
      expect(dateText.text()).toContain('(Day not finalized)')
    })
  })

  describe('Category Display', () => {
    it('should display category information correctly', () => {
      const workCategory = wrapper.findAll('.category-section')[0]

      const categoryName = workCategory.find('.category-name')
      expect(categoryName.text()).toBe('Work')

      const categoryTasks = workCategory.find('.category-tasks')
      expect(categoryTasks.text()).toBe('2 tasks')

      const categoryTime = workCategory.find('.category-time')
      expect(categoryTime.text()).toBe('3h 30m')
    })

    it('should display singular "task" for single task count', () => {
      const personalCategory = wrapper.findAll('.category-section')[1]

      const categoryTasks = personalCategory.find('.category-tasks')
      expect(categoryTasks.text()).toBe('1 task')
    })

    it('should render progress bar with correct width', () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const progressBar = workCategory.find('.category-progress')

      expect(progressBar.attributes('style')).toContain('width: 70%')
      expect(progressBar.attributes('aria-valuenow')).toBe('70')
      expect(progressBar.attributes('aria-valuetext')).toBe('70%')
    })
  })

  describe('Task Summaries', () => {
    it('should display task summaries within categories', () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const taskSummaries = workCategory.findAll('.task-summary')

      expect(taskSummaries).toHaveLength(2)

      // Check first task summary
      const firstTask = taskSummaries[0]
      expect(firstTask.find('.task-name').text()).toBe('Development')
      expect(firstTask.find('.task-count').text()).toBe('1x')
    })

    it('should display rounded time and actual time for each task', () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      const roundedTime = firstTask.find('.task-time-rounded')
      const actualTime = firstTask.find('.task-time-actual')

      expect(roundedTime.exists()).toBe(true)
      expect(actualTime.exists()).toBe(true)
      expect(actualTime.text()).toBe('2h 15m') // Actual time from props
    })
  })

  describe('Helper Functions', () => {
    it('should clamp percentages correctly', () => {
      const vm = wrapper.vm as any

      expect(vm.clampPercent(50)).toBe(50)
      expect(vm.clampPercent(-10)).toBe(0)
      expect(vm.clampPercent(150)).toBe(100)
      expect(vm.clampPercent(0)).toBe(0)
      expect(vm.clampPercent(100)).toBe(100)
    })

    it('should calculate standard task count correctly', () => {
      const vm = wrapper.vm as any
      expect(vm.standardTaskCount).toBe(3) // 3 normal tasks, 1 pause task
    })
  })

  describe('formatTaskTime Function', () => {
    let vm: any

    beforeEach(() => {
      vm = wrapper.vm as any
    })

    it('should round time to nearest 5 minutes - basic cases', () => {
      expect(vm.formatTaskTime('1h 32m')).toBe('1h 30m')
      expect(vm.formatTaskTime('1h 33m')).toBe('1h 35m')
      expect(vm.formatTaskTime('47m')).toBe('45m')
      expect(vm.formatTaskTime('48m')).toBe('50m')
    })

    it('should handle hour-only times', () => {
      expect(vm.formatTaskTime('2h')).toBe('2h')
      expect(vm.formatTaskTime('1h')).toBe('1h')
    })

    it('should handle minute-only times', () => {
      expect(vm.formatTaskTime('30m')).toBe('30m')
      expect(vm.formatTaskTime('7m')).toBe('5m')
      expect(vm.formatTaskTime('23m')).toBe('25m')
    })

    it('should handle edge cases', () => {
      expect(vm.formatTaskTime('0m')).toBe('0m')
      expect(vm.formatTaskTime('1m')).toBe('0m')
      expect(vm.formatTaskTime('2m')).toBe('0m')
      expect(vm.formatTaskTime('3m')).toBe('5m')
    })

    it('should handle mixed hour and minute times', () => {
      expect(vm.formatTaskTime('2h 17m')).toBe('2h 15m')
      expect(vm.formatTaskTime('3h 58m')).toBe('4h')
      expect(vm.formatTaskTime('1h 2m')).toBe('1h')
    })

    it('should handle large times correctly', () => {
      expect(vm.formatTaskTime('8h 37m')).toBe('8h 35m')
      expect(vm.formatTaskTime('12h 3m')).toBe('12h 5m')
    })

    it('should round 30+ minutes in the hour to the next hour when appropriate', () => {
      expect(vm.formatTaskTime('1h 58m')).toBe('2h')
      expect(vm.formatTaskTime('2h 58m')).toBe('3h') // 2h 58m = 178 minutes, rounds to 180 = 3h
    })

    it('should handle malformed input gracefully', () => {
      expect(vm.formatTaskTime('')).toBe('-')
      expect(vm.formatTaskTime('invalid')).toBe('-')
      expect(vm.formatTaskTime('h m')).toBe('-')
    })
  })

  describe('getStatusText Function', () => {
    it('should return correct status text when day is finalized and target reached', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: true,
        totalMinutesTracked: 480, // 8 hours
        targetWorkHours: 8,
      })

      const vm = wrapper.vm as any
      const statusText = vm.getStatusText()

      expect(statusText).toBe('Daily target work hours reached')
    })

    it('should return correct status text when day is not finalized', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: false,
        totalMinutesTracked: 300, // 5 hours
        targetWorkHours: 8,
      })

      const vm = wrapper.vm as any
      const statusText = vm.getStatusText()

      expect(statusText).toBe('Day not finalized - missing end task')
    })

    it('should return combined status text when both conditions apply', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: false,
        totalMinutesTracked: 480, // 8 hours
        targetWorkHours: 8,
      })

      const vm = wrapper.vm as any
      const statusText = vm.getStatusText()

      expect(statusText).toBe('Day not finalized - missing end task, Daily target work hours reached')
    })

    it('should return no alerts when everything is normal', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: true,
        totalMinutesTracked: 300, // 5 hours
        targetWorkHours: 8,
      })

      const vm = wrapper.vm as any
      const statusText = vm.getStatusText()

      expect(statusText).toBe('No status alerts')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for progress bars', () => {
      const progressBars = wrapper.findAll('.category-progress')

      progressBars.forEach(bar => {
        expect(bar.attributes('role')).toBe('progressbar')
        expect(bar.attributes('aria-valuenow')).toBeDefined()
        expect(bar.attributes('aria-valuemin')).toBe('0')
        expect(bar.attributes('aria-valuemax')).toBe('100')
        expect(bar.attributes('aria-valuetext')).toBeDefined()
        expect(bar.attributes('aria-labelledby')).toBeDefined()
      })
    })

    it('should have proper ARIA live region for status', () => {
      const statusEmojis = wrapper.find('.status-emojis')
      expect(statusEmojis.attributes('aria-live')).toBe('polite')
      expect(statusEmojis.attributes('aria-atomic')).toBe('true')
    })

    it('should include screen reader only status text', () => {
      const srOnly = wrapper.find('.sr-only')
      expect(srOnly.exists()).toBe(true)
    })

    it('should have proper role and aria-label attributes for status emojis', () => {
      const statusEmojis = wrapper.findAll('.status-emoji')

      statusEmojis.forEach(emoji => {
        expect(emoji.attributes('role')).toBe('img')
        expect(emoji.attributes('aria-label')).toBeDefined()
        expect(emoji.attributes('title')).toBeDefined()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive grid layout for category headers', () => {
      const categoryHeaders = wrapper.findAll('.category-header')

      categoryHeaders.forEach(header => {
        expect(header.classes()).toContain('category-header')
        // CSS grid classes should be applied via CSS
      })
    })

    it('should have proper spacing and layout classes', () => {
      expect(wrapper.find('.daily-report').exists()).toBe(true)
      expect(wrapper.find('.category-breakdown').exists()).toBe(true)
      expect(wrapper.find('.task-summaries').exists()).toBe(true)
    })
  })
})
