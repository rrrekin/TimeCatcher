<template>
  <div class="daily-report">
    <div class="report-header">
      <div class="header-line-1">
        <h2 data-testid="report-header-title">Daily Report</h2>
        <div class="status-emojis" aria-live="polite" aria-atomic="true">
          <span
            v-if="!hasEndTaskForSelectedDate"
            class="status-emoji"
            role="img"
            aria-label="Missing end task"
            title="Missing end task"
            >⚠️</span
          >
          <span
            v-if="totalMinutesTracked >= targetWorkHours * 60"
            class="status-emoji"
            role="img"
            aria-label="Target reached"
            title="Target reached"
            >😊</span
          >
          <!-- Screen reader accessible status text -->
          <span class="sr-only">
            {{ getStatusText() }}
          </span>
        </div>
      </div>
      <div class="header-line-2" data-testid="total-time-display">
        {{ totalTimeTrackedCombined }}
      </div>
    </div>
    <p data-testid="report-date">
      {{ dateTitle }}
      {{ hasEndTaskForSelectedDate ? '' : ' (Day not finalized)' }}
    </p>

    <!-- Category Breakdown -->
    <div class="report-section">
      <h3>Summary per Category & Task</h3>
      <div v-if="standardTaskCount === 0" class="empty-report">No standard tasks recorded for this day</div>
      <div v-else class="category-breakdown" data-testid="category-breakdown">
        <div
          v-for="(categoryData, index) in categoryBreakdown"
          :key="`${categoryData.name}-${index}`"
          class="category-section"
          data-testid="category-section"
        >
          <div class="category-header">
            <div class="category-info">
              <span class="category-name" :id="`category-name-${index}`">{{ categoryData.name }}</span>
              <span class="category-tasks"
                >{{ categoryData.taskCount }} {{ categoryData.taskCount === 1 ? 'task' : 'tasks' }}</span
              >
            </div>
            <div class="category-time">{{ categoryData.totalTimeCombined }}</div>
          </div>

          <!-- Task summaries within category -->
          <ul class="task-summaries">
            <li
              v-for="(task, index) in categoryData.taskSummaries"
              :key="task.name ? `${task.name}-${index}` : index"
              class="task-summary"
              :class="{ 'task-summary-copied': copiedTaskName === task.name }"
              tabindex="0"
              role="button"
              :aria-label="`Copy task name: ${task.name}`"
              :aria-describedby="getTooltipId(task.name, categoryData.name, index)"
              aria-keyshortcuts="Enter Space"
              @mouseenter="showTooltip(task, $event, categoryData.name, index)"
              @mouseleave="hideTooltip"
              @click="copyTaskNameToClipboard(task.name)"
              @keydown="handleTaskKeydown($event, task.name)"
            >
              <span class="task-name">{{ task.name }}</span>
              <span class="task-count">{{ task.count }}x</span>
              <span
                class="task-time-combined"
                :title="`Actual time (Rounded to nearest 5m)`"
                :aria-label="`Time: ${task.totalTimeCombined}`"
              >
                {{ task.totalTimeCombined }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Tooltip for task appearances -->
    <div
      v-if="tooltipVisible && tooltipContent"
      :id="currentTooltipId"
      class="task-tooltip"
      role="tooltip"
      :style="{
        position: 'fixed',
        left: tooltipPosition.x + 'px',
        top: tooltipPosition.y + 'px'
      }"
    >
      <div class="tooltip-header">{{ tooltipTaskName }}</div>
      <div class="tooltip-content">
        <div v-for="(appearance, index) in tooltipContent" :key="index" class="appearance-item">
          <div class="appearance-time">{{ appearance.startTime }} - {{ appearance.endTime }}</div>
          <div class="appearance-duration">{{ appearance.durationFormatted }}</div>
        </div>
      </div>
    </div>

    <!-- Copy confirmation toast -->
    <div v-if="showCopyToast" class="copy-toast" role="status" aria-live="polite">
      {{ copyToastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import type { TaskRecord } from '@/shared/types'
import { TASK_TYPE_NORMAL } from '@/shared/types'

interface DailyReportProps {
  taskRecords: TaskRecord[]
  dateTitle: string
  hasEndTaskForSelectedDate: boolean
  targetWorkHours: number
  totalTimeTracked: string
  totalTimeTrackedRounded: string
  totalTimeTrackedCombined: string
  totalMinutesTracked: number
  categoryBreakdown: Array<{
    name: string
    taskCount: number
    totalTime: string
    totalTimeRounded: string
    totalTimeCombined: string
    taskSummaries: Array<{
      name: string
      count: number
      totalTime: string
      totalTimeRounded: string
      totalTimeCombined: string
      appearances?: Array<{
        startTime: string
        endTime: string
        duration: number
        durationFormatted: string
        date: string
      }>
    }>
  }>
}

// Props
const props = defineProps<DailyReportProps>()

// Tooltip state
const tooltipVisible = ref(false)
const tooltipContent = ref<any>(null)
const tooltipTaskName = ref('')
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipTaskCategory = ref('')
const tooltipTaskIndex = ref(0)

// Copy state - track which task was last copied
const copiedTaskName = ref('')

// Copy confirmation toast state
const showCopyToast = ref(false)
const copyToastMessage = ref('')

// Timer cleanup
let activeTimer: number | null = null

// Component cleanup
onUnmounted(() => {
  if (activeTimer) {
    clearTimeout(activeTimer)
    activeTimer = null
  }
})

// Tooltip methods
const showTooltip = (task: any, event: MouseEvent, categoryName: string, taskIndex: number) => {
  if (task.appearances && task.appearances.length > 0) {
    tooltipContent.value = task.appearances
    tooltipTaskName.value = task.name || 'Task'
    tooltipTaskCategory.value = categoryName
    tooltipTaskIndex.value = taskIndex

    // Calculate tooltip dimensions (approximate)
    const tooltipWidth = 390 // max-width from CSS
    const tooltipHeight = Math.min(200 + 50, task.appearances.length * 30 + 50) // estimated height

    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate initial position
    let x = event.clientX + 10
    let y = event.clientY - 10

    // Adjust horizontal position if tooltip would go off-screen
    if (x + tooltipWidth > viewportWidth) {
      x = event.clientX - tooltipWidth - 10 // Position to the left of cursor
    }

    // Adjust vertical position if tooltip would go off-screen
    if (y + tooltipHeight > viewportHeight) {
      y = event.clientY - tooltipHeight - 10 // Position above cursor
    }

    // Ensure tooltip doesn't go off the left edge
    if (x < 10) {
      x = 10
    }

    // Ensure tooltip doesn't go off the top edge
    if (y < 10) {
      y = 10
    }

    tooltipPosition.value = { x, y }
    tooltipVisible.value = true
  }
}

const hideTooltip = () => {
  tooltipVisible.value = false
  tooltipContent.value = null
  tooltipTaskName.value = ''
}

// Copy task name to clipboard
const copyTaskNameToClipboard = async (taskName: string) => {
  try {
    await navigator.clipboard.writeText(taskName)
    copiedTaskName.value = taskName
    showCopyConfirmationToast(taskName)
  } catch (error) {
    console.error('Failed to copy task name to clipboard:', error)
    // Fallback for older browsers or when clipboard API is not available
    try {
      const textArea = document.createElement('textarea')
      textArea.value = taskName
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      copiedTaskName.value = taskName
      showCopyConfirmationToast(taskName)
    } catch (fallbackError) {
      console.error('Clipboard fallback also failed:', fallbackError)
    }
  }
}

// Show copy confirmation toast
const showCopyConfirmationToast = (taskName: string) => {
  // Clear any existing timer
  if (activeTimer) {
    clearTimeout(activeTimer)
    activeTimer = null
  }

  // Set toast message and show it
  copyToastMessage.value = `Copied "${taskName}"`
  showCopyToast.value = true

  // Set timer to hide toast after 2 seconds
  activeTimer = window.setTimeout(() => {
    showCopyToast.value = false
    activeTimer = null
  }, 2000)
}

// Handle keyboard events for accessibility
const handleTaskKeydown = (event: KeyboardEvent, taskName: string) => {
  // Trigger copy action on Enter or Space key
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault() // Prevent default scrolling for Space key
    copyTaskNameToClipboard(taskName)
  }
}

// Generate stable tooltip ID for each task
const getTooltipId = (taskName: string, categoryName: string, index: number) => {
  // Sanitize input string to create valid HTML ID
  const sanitizeForId = (input: string): string => {
    if (!input || typeof input !== 'string') {
      return 'unknown'
    }

    // Normalize Unicode (NFKD - Normalization Form Canonical Decomposition)
    // Remove diacritics and convert to lowercase
    const normalized = input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
      .toLowerCase()

    // Keep only alphanumeric characters, dashes, and underscores
    // Replace everything else with dashes
    const alphanumeric = normalized.replace(/[^a-z0-9_-]/g, '-')

    // Collapse multiple consecutive dashes into single dash
    const collapsed = alphanumeric.replace(/-+/g, '-')

    // Remove leading/trailing dashes
    const trimmed = collapsed.replace(/^-+|-+$/g, '')

    // Return sanitized string or fallback if empty
    return trimmed || 'unknown'
  }

  // Create a stable ID that's unique per task
  const sanitizedTaskName = sanitizeForId(taskName)
  const sanitizedCategoryName = sanitizeForId(categoryName)
  return `tooltip-${sanitizedCategoryName}-${sanitizedTaskName}-${index}`
}

// Computed properties
const currentTooltipId = computed(() => {
  if (tooltipVisible.value && tooltipTaskName.value) {
    return getTooltipId(tooltipTaskName.value, tooltipTaskCategory.value, tooltipTaskIndex.value)
  }
  return ''
})
const standardTaskCount = computed(() => {
  return props.taskRecords.filter(r => r.task_type === TASK_TYPE_NORMAL).length
})

const getStatusText = () => {
  const statusMessages = []

  if (!props.hasEndTaskForSelectedDate) {
    statusMessages.push('Day not finalized - missing end task')
  }

  if (props.totalMinutesTracked >= props.targetWorkHours * 60) {
    statusMessages.push('Daily target work hours reached')
  }

  return statusMessages.length > 0 ? statusMessages.join(', ') : 'No status alerts'
}
</script>

<style scoped>
/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.daily-report {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px var(--shadow-color);
  position: relative;
}

.daily-report h2 {
  background: linear-gradient(135deg, var(--verdigris), var(--emerald));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.report-header {
  margin-bottom: 8px;
}

.header-line-1 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.header-line-2 {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-left: 4px;
}

.status-emojis {
  display: flex;
  gap: 8px;
}

.status-emoji {
  font-size: 20px;
  line-height: 1;
}

.daily-report p {
  color: var(--text-secondary);
  margin: 0 0 24px 0;
  font-size: 16px;
}

.report-section {
  margin-bottom: 24px;
}

.report-section h3 {
  background: linear-gradient(135deg, var(--asparagus), var(--mantis));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.empty-report {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border-radius: 8px;
  font-style: italic;
}

.category-breakdown {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.category-header {
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  background: linear-gradient(90deg, var(--bg-secondary), var(--bg-primary));
}

.category-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 16px;
}

.category-tasks {
  font-size: 13px;
  color: var(--text-muted);
}

.category-time {
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 14px;
}

.task-summaries {
  padding: 0 16px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-summary {
  display: grid;
  grid-template-columns: 1fr minmax(50px, auto) minmax(100px, auto);
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.task-name {
  color: var(--text-primary);
  font-size: 14px;
}

.task-count {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 3px;
  min-width: 30px;
  text-align: center;
}

.task-time-combined {
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  min-width: 100px;
  text-align: right;
}

/* Tooltip styles */
.task-tooltip {
  z-index: 1000;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px var(--shadow-color);
  padding: 0;
  min-width: 260px;
  max-width: 390px;
  pointer-events: none;
}

.tooltip-header {
  background: linear-gradient(135deg, var(--asparagus), var(--mantis));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px 4px 12px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tooltip-content {
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.appearance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  margin-bottom: 2px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 11px;
}

.appearance-time {
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 500;
}

.appearance-duration {
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 400;
  min-width: 40px;
  text-align: right;
}

/* Add hover cursor to indicate interactivity */
.task-summary {
  cursor: pointer;
}

.task-summary:hover {
  background: var(--bg-secondary);
}

/* Copied task highlighting */
.task-summary-copied {
  background: linear-gradient(90deg, rgba(87, 189, 175, 0.15), rgba(86, 179, 114, 0.15)) !important;
  border-color: var(--verdigris) !important;
  box-shadow: 0 0 0 1px rgba(87, 189, 175, 0.3);
}

/* Copy confirmation toast */
.copy-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--verdigris);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: copyToastSlideIn 0.3s ease-out;
}

@keyframes copyToastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
