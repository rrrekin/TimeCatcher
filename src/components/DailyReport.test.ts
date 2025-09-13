// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
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
      task_type: 'normal'
    },
    {
      category_name: 'Work',
      task_name: 'Meeting',
      start_time: '10:30',
      date: '2024-01-15',
      task_type: 'normal'
    },
    {
      category_name: 'Personal',
      task_name: 'Exercise',
      start_time: '14:00',
      date: '2024-01-15',
      task_type: 'normal'
    },
    {
      category_name: '__special__',
      task_name: '⏸ Pause',
      start_time: '12:00',
      date: '2024-01-15',
      task_type: 'pause'
    }
  ]

  const mockCategoryBreakdown = [
    {
      name: 'Work',
      taskCount: 2,
      totalTime: '3h 30m',
      totalTimeRounded: '3h 30m',
      totalTimeCombined: '3h 30m (3h 30m)',
      percentage: 70,
      taskSummaries: [
        {
          name: 'Development',
          count: 1,
          totalTime: '2h 15m',
          totalTimeRounded: '2h 15m',
          totalTimeCombined: '2h 15m (2h 15m)',
          appearances: [
            {
              startTime: '09:00',
              endTime: '11:15',
              duration: 135,
              durationFormatted: '2h 15m',
              date: '2024-01-15'
            }
          ]
        },
        {
          name: 'Meeting',
          count: 1,
          totalTime: '1h 15m',
          totalTimeRounded: '1h 15m',
          totalTimeCombined: '1h 15m (1h 15m)',
          appearances: [
            {
              startTime: '14:00',
              endTime: '15:15',
              duration: 75,
              durationFormatted: '1h 15m',
              date: '2024-01-15'
            }
          ]
        }
      ]
    },
    {
      name: 'Personal',
      taskCount: 1,
      totalTime: '1h 30m',
      totalTimeRounded: '1h 30m',
      totalTimeCombined: '1h 30m (1h 30m)',
      percentage: 30,
      taskSummaries: [
        {
          name: 'Exercise',
          count: 1,
          totalTime: '1h 30m',
          totalTimeRounded: '1h 30m',
          totalTimeCombined: '1h 30m (1h 30m)',
          appearances: [
            {
              startTime: '18:00',
              endTime: '19:30',
              duration: 90,
              durationFormatted: '1h 30m',
              date: '2024-01-15'
            }
          ]
        }
      ]
    }
  ]

  beforeEach(() => {
    wrapper = mount(DailyReport, {
      props: {
        taskRecords: mockTaskRecords,
        dateTitle: 'Monday, January 15',
        hasEndTaskForSelectedDate: true,
        targetWorkHours: 8,
        totalTimeTracked: '5h 0m',
        totalTimeTrackedRounded: '5h 0m',
        totalTimeTrackedCombined: '5h 0m (5h 0m)',
        totalMinutesTracked: 300,
        categoryBreakdown: mockCategoryBreakdown
      }
    })
  })

  describe('Component Rendering', () => {
    it('should render the report header with total time', () => {
      const header = wrapper.find('[data-testid="report-header-title"]')
      expect(header.text()).toContain('Daily Report')

      const totalTime = wrapper.find('[data-testid="total-time-display"]')
      expect(totalTime.text()).toContain('5h 0m (5h 0m)')
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
        categoryBreakdown: []
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
        targetWorkHours: 8
      })

      const successEmoji = wrapper.find('.status-emoji[title="Target reached"]')
      expect(successEmoji.exists()).toBe(true)
      expect(successEmoji.text()).toBe('😊')
    })

    it('should show warning emoji when end task is missing', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: false
      })

      const warningEmoji = wrapper.find('.status-emoji[title="Missing end task"]')
      expect(warningEmoji.exists()).toBe(true)
      expect(warningEmoji.text()).toBe('⚠️')
    })

    it('should show day not finalized message when end task missing', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: false
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
      expect(categoryTime.text()).toBe('3h 30m (3h 30m)')
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

    it('should display combined time for each task', () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      const combinedTime = firstTask.find('.task-time-combined')

      expect(combinedTime.exists()).toBe(true)
      expect(combinedTime.text()).toBe('2h 15m (2h 15m)') // Combined time from props
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

  describe('Clipboard Functionality', () => {
    beforeEach(() => {
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve())
        }
      })
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    it('should copy task name to clipboard when task is clicked', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      await firstTask.trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Development')

      // Check that task is highlighted as copied
      expect(firstTask.classes()).toContain('task-summary-copied')
    })

    it('should handle clipboard copy errors gracefully', async () => {
      // Mock clipboard to throw an error
      const mockWriteText = vi.fn(() => Promise.reject(new Error('Clipboard not available')))
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      })

      // Mock document.execCommand for fallback
      document.execCommand = vi.fn(() => true)

      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      await firstTask.trigger('click')

      expect(mockWriteText).toHaveBeenCalledWith('Development')
      // Should fallback to document.execCommand
      expect(document.execCommand).toHaveBeenCalledWith('copy')

      // Check that task is highlighted as copied even with fallback
      expect(firstTask.classes()).toContain('task-summary-copied')
    })

    it('should only highlight one task at a time', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]
      const secondTask = workCategory.findAll('.task-summary')[1]

      // Click first task
      await firstTask.trigger('click')
      expect(firstTask.classes()).toContain('task-summary-copied')
      expect(secondTask.classes()).not.toContain('task-summary-copied')

      // Click second task
      await secondTask.trigger('click')
      expect(firstTask.classes()).not.toContain('task-summary-copied')
      expect(secondTask.classes()).toContain('task-summary-copied')
    })

    it('should handle both clipboard API and fallback failing', async () => {
      // Mock clipboard to throw an error
      const mockWriteText = vi.fn(() => Promise.reject(new Error('Clipboard not available')))
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      })

      // Mock document.execCommand to also fail
      document.execCommand = vi.fn(() => {
        throw new Error('execCommand also failed')
      })

      // Spy on console.error to verify error logging
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      await firstTask.trigger('click')

      expect(mockWriteText).toHaveBeenCalledWith('Development')
      expect(document.execCommand).toHaveBeenCalledWith('copy')

      // Should log both errors
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy task name to clipboard:', expect.any(Error))
      expect(consoleSpy).toHaveBeenCalledWith('Clipboard fallback also failed:', expect.any(Error))

      // Task should not be highlighted since copy failed
      expect(firstTask.classes()).not.toContain('task-summary-copied')

      consoleSpy.mockRestore()
    })

    it('should handle keyboard accessibility with Enter key', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      // Verify accessibility attributes
      expect(firstTask.attributes('tabindex')).toBe('0')
      expect(firstTask.attributes('role')).toBe('button')
      expect(firstTask.attributes('aria-label')).toBe('Copy task name: Development')
      expect(firstTask.attributes('aria-describedby')).toContain('tooltip-work-development-0')

      // Trigger Enter key
      await firstTask.trigger('keydown', { key: 'Enter' })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Development')
      expect(firstTask.classes()).toContain('task-summary-copied')
    })

    it('should handle keyboard accessibility with Space key', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      // Mock preventDefault function
      const mockPreventDefault = vi.fn()

      // Trigger Space key with preventDefault mock
      await firstTask.trigger('keydown', {
        key: ' ',
        preventDefault: mockPreventDefault
      })

      expect(mockPreventDefault).toHaveBeenCalled() // Should prevent default scrolling
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Development')
      expect(firstTask.classes()).toContain('task-summary-copied')
    })

    it('should not trigger copy on other keys', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      // Clear previous calls
      vi.clearAllMocks()

      // Trigger other keys
      await firstTask.trigger('keydown', { key: 'Tab' })
      await firstTask.trigger('keydown', { key: 'Escape' })
      await firstTask.trigger('keydown', { key: 'ArrowDown' })

      expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
      expect(firstTask.classes()).not.toContain('task-summary-copied')
    })

    it('should show copy toast when task is copied', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      // Initially no toast should be visible
      expect(wrapper.find('.copy-toast').exists()).toBe(false)

      // Click to copy task
      await firstTask.trigger('click')

      // Toast should be visible with correct message
      const toast = wrapper.find('.copy-toast')
      expect(toast.exists()).toBe(true)
      expect(toast.text()).toBe('Copied "Development"')
      expect(toast.attributes('role')).toBe('status')
      expect(toast.attributes('aria-live')).toBe('polite')

      // Should use fake timers to test timeout behavior
      vi.advanceTimersByTime(2000)
      await wrapper.vm.$nextTick()

      // Toast should be hidden after timeout
      expect(wrapper.find('.copy-toast').exists()).toBe(false)
    })

    it('should clear existing timer when copying multiple times', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]
      const secondTask = workCategory.findAll('.task-summary')[1]

      // Mock clearTimeout to spy on timer clearing
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      // Click first task
      await firstTask.trigger('click')
      expect(wrapper.find('.copy-toast').text()).toBe('Copied "Development"')

      // Click second task quickly (before first timer expires)
      await secondTask.trigger('click')

      // Should have cleared the previous timer
      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(wrapper.find('.copy-toast').text()).toBe('Copied "Meeting"')

      clearTimeoutSpy.mockRestore()
    })
  })

  describe('Tooltip Functionality', () => {
    it('should show tooltip on mouseenter and hide on mouseleave', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      // Initially tooltip should be hidden
      expect(wrapper.find('.task-tooltip').exists()).toBe(false)

      // Trigger mouseenter to show tooltip
      await firstTask.trigger('mouseenter', {
        clientX: 100,
        clientY: 100
      })

      // Tooltip should be visible
      expect(wrapper.find('.task-tooltip').exists()).toBe(true)
      expect(wrapper.find('.tooltip-header').text()).toBe('Development')

      // Trigger mouseleave to hide tooltip
      await firstTask.trigger('mouseleave')

      // Tooltip should be hidden again
      expect(wrapper.find('.task-tooltip').exists()).toBe(false)
    })

    it('should not show tooltip for tasks without appearances', async () => {
      // Create props with task that has no appearances
      await wrapper.setProps({
        ...wrapper.props(),
        categoryBreakdown: [
          {
            name: 'Work',
            taskCount: 1,
            totalTime: '2h 15m',
            totalTimeRounded: '2h 15m',
            totalTimeCombined: '2h 15m (2h 15m)',
            percentage: 70,
            taskSummaries: [
              {
                name: 'TaskWithoutAppearances',
                count: 1,
                totalTime: '2h 15m',
                totalTimeRounded: '2h 15m',
                totalTimeCombined: '2h 15m (2h 15m)'
                // Note: no appearances property
              }
            ]
          }
        ]
      })

      const workCategory = wrapper.findAll('.category-section')[0]
      const taskWithoutAppearances = workCategory.findAll('.task-summary')[0]

      // Trigger mouseenter
      await taskWithoutAppearances.trigger('mouseenter', {
        clientX: 100,
        clientY: 100
      })

      // Tooltip should not be visible
      expect(wrapper.find('.task-tooltip').exists()).toBe(false)
    })

    it('should have proper ARIA relationship between task and tooltip', async () => {
      const workCategory = wrapper.findAll('.category-section')[0]
      const firstTask = workCategory.findAll('.task-summary')[0]

      // Trigger mouseenter to show tooltip
      await firstTask.trigger('mouseenter', {
        clientX: 100,
        clientY: 100
      })

      // Tooltip should be visible with correct ID
      const tooltip = wrapper.find('.task-tooltip')
      expect(tooltip.exists()).toBe(true)
      expect(tooltip.attributes('role')).toBe('tooltip')

      // Tooltip ID should match aria-describedby
      const tooltipId = tooltip.attributes('id')
      const ariaDescribedby = firstTask.attributes('aria-describedby')
      expect(tooltipId).toBe(ariaDescribedby)
      expect(tooltipId).toBe('tooltip-work-development-0')
    })

    it('should position tooltip correctly when near screen edges', async () => {
      // Save original window dimensions
      const originalWidth = window.innerWidth
      const originalHeight = window.innerHeight

      try {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', { value: 800, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 600, writable: true })

        const workCategory = wrapper.findAll('.category-section')[0]
        const firstTask = workCategory.findAll('.task-summary')[0]

        // Helper function to extract pixel values from style attribute
        const leftRegex = /left: (\d+)px/
        const topRegex = /top: (\d+)px/
        const getPixelValue = (style: string | undefined, property: 'left' | 'top'): number => {
          const regex = property === 'left' ? leftRegex : topRegex
          const match = style?.match(regex)
          return match ? parseInt(match[1]) : 0
        }

        // Test tooltip positioning near left edge (should clamp to minimum position)
        await firstTask.trigger('mouseenter', {
          clientX: -100, // Far left, would cause negative positioning
          clientY: 100
        })

        // Should clamp to minimum left position (>= 10px)
        const tooltip = wrapper.find('.task-tooltip')
        expect(tooltip.exists()).toBe(true)
        const leftValue = getPixelValue(tooltip.attributes('style'), 'left')
        expect(leftValue).toBeGreaterThanOrEqual(10)

        await firstTask.trigger('mouseleave')

        // Test tooltip positioning near top edge (should clamp to minimum position)
        await firstTask.trigger('mouseenter', {
          clientX: 100,
          clientY: -100 // Far up, would cause negative positioning
        })

        // Should clamp to minimum top position (>= 10px)
        const tooltipAfter = wrapper.find('.task-tooltip')
        expect(tooltipAfter.exists()).toBe(true)
        const topValue = getPixelValue(tooltipAfter.attributes('style'), 'top')
        expect(topValue).toBeGreaterThanOrEqual(10)
      } finally {
        // Restore original window dimensions
        Object.defineProperty(window, 'innerWidth', { value: originalWidth, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: originalHeight, writable: true })
      }
    })

    it('should reposition tooltip when it would go off right or bottom edge', async () => {
      // Save original window dimensions
      const originalWidth = window.innerWidth
      const originalHeight = window.innerHeight

      try {
        // Mock window dimensions
        const windowWidth = 500
        const windowHeight = 400
        Object.defineProperty(window, 'innerWidth', { value: windowWidth, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: windowHeight, writable: true })

        const workCategory = wrapper.findAll('.category-section')[0]
        const firstTask = workCategory.findAll('.task-summary')[0]

        // Helper function to extract pixel values from style attribute
        const leftRegex = /left: (\d+)px/
        const topRegex = /top: (\d+)px/
        const getPixelValue = (style: string | undefined, property: 'left' | 'top'): number => {
          const regex = property === 'left' ? leftRegex : topRegex
          const match = style?.match(regex)
          return match ? parseInt(match[1]) : 0
        }

        // Helper function to get tooltip dimensions
        const getTooltipDimensions = (tooltipElement: any) => {
          // Mock getBoundingClientRect for testing since the tooltip isn't actually rendered in DOM
          const tooltipEl = tooltipElement.element
          if (tooltipEl) {
            // Simulate realistic tooltip dimensions based on implementation
            tooltipEl.getBoundingClientRect = vi.fn(() => ({
              width: 390, // Typical tooltip width from implementation
              height: 100, // Typical tooltip height
              left: 0,
              top: 0,
              right: 390,
              bottom: 100,
              x: 0,
              y: 0,
              toJSON: () => ({})
            }))
            return { width: 390, height: 100 }
          }
          return { width: 390, height: 100 } // Fallback dimensions
        }

        // Test tooltip repositioning when near right edge
        const rightEdgeClientX = windowWidth - 50 // Position that would cause overflow
        await firstTask.trigger('mouseenter', {
          clientX: rightEdgeClientX,
          clientY: 200
        })

        // Measure tooltip and calculate expected positioning
        let tooltip = wrapper.find('.task-tooltip')
        expect(tooltip.exists()).toBe(true)
        const { width: tooltipWidth } = getTooltipDimensions(tooltip)

        // Calculate if tooltip would overflow right edge
        const wouldOverflowRight = rightEdgeClientX + 10 + tooltipWidth > windowWidth
        expect(wouldOverflowRight).toBe(true) // Verify our test setup causes overflow

        const leftValue = getPixelValue(tooltip.attributes('style'), 'left')
        if (wouldOverflowRight) {
          // Should be repositioned to the left of cursor
          expect(leftValue).toBeLessThan(rightEdgeClientX)
          expect(leftValue).toBeGreaterThanOrEqual(10) // Respect minimum margin
        }

        await firstTask.trigger('mouseleave')

        // Test tooltip repositioning when near bottom edge
        const bottomEdgeClientY = windowHeight - 50 // Position that would cause overflow
        await firstTask.trigger('mouseenter', {
          clientX: 200,
          clientY: bottomEdgeClientY
        })

        // Measure tooltip and calculate expected positioning
        tooltip = wrapper.find('.task-tooltip')
        expect(tooltip.exists()).toBe(true)
        const { height: tooltipHeight } = getTooltipDimensions(tooltip)

        // Calculate if tooltip would overflow bottom edge
        const wouldOverflowBottom = bottomEdgeClientY + tooltipHeight > windowHeight
        expect(wouldOverflowBottom).toBe(true) // Verify our test setup causes overflow

        const topValue = getPixelValue(tooltip.attributes('style'), 'top')
        if (wouldOverflowBottom) {
          // Should be repositioned above cursor
          expect(topValue).toBeLessThan(bottomEdgeClientY)
          expect(topValue).toBeGreaterThanOrEqual(10) // Respect minimum margin
        }
      } finally {
        // Restore original window dimensions
        Object.defineProperty(window, 'innerWidth', { value: originalWidth, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: originalHeight, writable: true })
      }
    })
  })

  describe('getStatusText Function', () => {
    it('should return correct status text when day is finalized and target reached', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: true,
        totalMinutesTracked: 480, // 8 hours
        targetWorkHours: 8
      })

      const vm = wrapper.vm as any
      const statusText = vm.getStatusText()

      expect(statusText).toBe('Daily target work hours reached')
    })

    it('should return correct status text when day is not finalized', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: false,
        totalMinutesTracked: 300, // 5 hours
        targetWorkHours: 8
      })

      const vm = wrapper.vm as any
      const statusText = vm.getStatusText()

      expect(statusText).toBe('Day not finalized - missing end task')
    })

    it('should return combined status text when both conditions apply', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: false,
        totalMinutesTracked: 480, // 8 hours
        targetWorkHours: 8
      })

      const vm = wrapper.vm as any
      const statusText = vm.getStatusText()

      expect(statusText).toBe('Day not finalized - missing end task, Daily target work hours reached')
    })

    it('should return no alerts when everything is normal', async () => {
      await wrapper.setProps({
        hasEndTaskForSelectedDate: true,
        totalMinutesTracked: 300, // 5 hours
        targetWorkHours: 8
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
