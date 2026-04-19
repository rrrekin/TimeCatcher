<template>
  <div class="daily-report" :class="{ 'daily-report-collapsed': isCollapsed }">
    <button
      type="button"
      class="collapse-toggle"
      :class="{ 'collapse-toggle-collapsed': isCollapsed }"
      :aria-expanded="!isCollapsed"
      aria-controls="report-body"
      :aria-label="isCollapsed ? 'Expand report' : 'Collapse report'"
      :title="isCollapsed ? 'Expand report' : 'Collapse report'"
      data-testid="report-collapse-toggle"
      @click="toggleCollapsed"
    >
      <span class="collapse-toggle-icon" aria-hidden="true">{{ isCollapsed ? '◂' : '▸' }}</span>
    </button>
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
    <div id="report-body" v-if="!isCollapsed" data-testid="report-body">
      <p data-testid="report-date">
        {{ dateTitle }}
        {{ hasEndTaskForSelectedDate ? '' : ' (Day not finalized)' }}
      </p>

      <!-- Category Breakdown -->
      <div class="report-section">
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
                <span class="category-name" :id="`category-name-${index}`"
                  >{{ categoryData.taskCount }} × {{ categoryData.name }}</span
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
                <span class="task-name">{{ task.count }} × {{ task.name }}</span>
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

        <!-- Export Button (only for complete days) -->
        <div v-if="hasEndTaskForSelectedDate" class="export-section">
          <button
            class="export-button"
            @click="exportReportToClipboard"
            :disabled="standardTaskCount === 0 || isExporting"
            :aria-busy="isExporting ? 'true' : 'false'"
            :aria-label="standardTaskCount === 0 ? 'No data to export' : 'Export report data to clipboard as JSON'"
            data-testid="export-button"
          >
            Export to Clipboard
          </button>
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
import { computed, ref, watch, onUnmounted } from 'vue'
import type { TaskRecord, Category } from '@/shared/types'
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
  categories: Category[]
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

// Export state
const isExporting = ref(false)

// Collapse state with localStorage persistence
const COLLAPSE_STORAGE_KEY = 'timecatcher.reportCollapsed'
const loadCollapsed = (): boolean => {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}
const isCollapsed = ref<boolean>(loadCollapsed())
watch(isCollapsed, value => {
  try {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, value ? 'true' : 'false')
  } catch {
    // Ignore storage errors (e.g., private mode, disabled storage)
  }
})
const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
}

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

// Parse time string to seconds
const parseTimeToSeconds = (timeString: string): number => {
  // Extract hours and minutes from format like "1h 25m", "45m", "0m"
  // Tolerates odd spacing and case variations (e.g., " 2H", "3H 05M")
  const s = (timeString || '').trim()
  const hourMatch = s.match(/(\d+)\s*h/i)
  const minuteMatch = s.match(/(\d+)\s*m/i)

  const hours = hourMatch ? parseInt(hourMatch[1]!, 10) : 0
  const minutes = minuteMatch ? parseInt(minuteMatch[1]!, 10) : 0

  return hours * 3600 + minutes * 60
}

// Build export payload once
const buildExportData = (): Array<{ category: string; code: string; name: string; time: number }> => {
  const out: Array<{ category: string; code: string; name: string; time: number }> = []
  props.categoryBreakdown.forEach(categoryData => {
    const category = props.categories.find(cat => cat.name === categoryData.name)
    const categoryCode = category?.code || ''
    categoryData.taskSummaries.forEach(task => {
      out.push({
        category: categoryData.name,
        code: categoryCode,
        name: task.name,
        time: parseTimeToSeconds(task.totalTimeRounded)
      })
    })
  })
  return out
}

// Clipboard writer with fallback
const writeToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      return true
    } catch {
      return false
    }
  }
}

// Export report data to clipboard as JSON
const exportReportToClipboard = async () => {
  if (isExporting.value) return
  isExporting.value = true
  try {
    const jsonString = JSON.stringify(buildExportData(), null, 2)
    const ok = await writeToClipboard(jsonString)
    copyToastMessage.value = ok ? 'Report exported to clipboard' : 'Failed to export report'
    showCopyToast.value = true
    if (activeTimer) clearTimeout(activeTimer)
    activeTimer = window.setTimeout(
      () => {
        showCopyToast.value = false
        activeTimer = null
      },
      ok ? 2000 : 3000
    )
  } catch (error) {
    console.error('Failed to export report to clipboard:', error)
    copyToastMessage.value = 'Failed to export report'
    showCopyToast.value = true
    if (activeTimer) clearTimeout(activeTimer)
    activeTimer = window.setTimeout(() => {
      showCopyToast.value = false
      activeTimer = null
    }, 3000)
  } finally {
    isExporting.value = false
  }
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
  background: linear-gradient(180deg, #0f3d40 0%, #0a2c2e 100%);
  color: #e7f1df;
  border: 1px solid #041a1c;
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
}

.daily-report::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% -20%, rgba(195, 224, 78, 0.15), transparent 55%),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0 2px, transparent 2px 6px);
}

.daily-report > * {
  position: relative;
  z-index: 1;
}

.daily-report h2 {
  font-family: var(--font-display);
  letter-spacing: 0.22em;
  font-size: 15px;
  color: #e9d9b7;
  text-transform: lowercase;
  margin: 0;
  font-weight: 400;
  background: none;
  -webkit-text-fill-color: #e9d9b7;
}

.report-header {
  margin-bottom: var(--spacing-sm);
  padding-right: 36px;
}

.collapse-toggle {
  position: absolute;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 2;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: #e9d9b7;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1;
  padding: 0;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.collapse-toggle:hover {
  background: rgba(195, 224, 78, 0.18);
  border-color: rgba(195, 224, 78, 0.4);
  color: var(--uranium);
}

.collapse-toggle:focus-visible {
  outline: 2px solid var(--verdigris);
  outline-offset: 2px;
}

.collapse-toggle-icon {
  display: block;
  pointer-events: none;
}

.daily-report-collapsed {
  padding: var(--spacing-lg) var(--spacing-xs);
}

.daily-report-collapsed .collapse-toggle {
  top: var(--spacing-lg);
  right: 50%;
  transform: translateX(50%);
}

.daily-report-collapsed .report-header {
  margin-top: calc(28px + var(--spacing-sm) + var(--spacing-sm));
  margin-bottom: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.daily-report-collapsed .header-line-1 {
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 0;
}

.daily-report-collapsed .header-line-1 h2 {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 13px;
  letter-spacing: 0.28em;
  white-space: nowrap;
}

.daily-report-collapsed .status-emojis {
  flex-direction: column;
  gap: 6px;
}

.daily-report-collapsed .status-emoji {
  font-size: 16px;
}

.daily-report-collapsed .header-line-2 {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 18px;
  margin-left: 0;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.header-line-1 {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xs);
}

.header-line-2 {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
  color: var(--uranium);
  text-shadow: 0 0 18px rgba(195, 224, 78, 0.4);
  margin-left: var(--spacing-xs);
  letter-spacing: 0.08em;
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
  color: #8fb8a9;
  margin: 0 0 var(--spacing-lg) 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.report-section h3 {
  font-family: var(--font-display);
  letter-spacing: 0.22em;
  color: #f4ead0;
  text-transform: lowercase;
  margin: 0 0 var(--spacing-md) 0;
  font-size: 13px;
  font-weight: 400;
  background: none;
  -webkit-text-fill-color: #f4ead0;
}

.empty-report {
  text-align: center;
  padding: var(--spacing-xl);
  color: #8fb8a9;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
  font-family: var(--font-mono);
  font-style: italic;
  font-size: var(--font-md);
}

.category-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.category-section {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: box-shadow var(--transition-fast);
}

.category-section:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.category-header {
  padding: 7px 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--spacing-lg);
  align-items: center;
  background: linear-gradient(rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}

.category-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.category-name {
  font-family: var(--font-mono);
  font-weight: 700;
  color: #f4ead0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: none;
  -webkit-text-fill-color: #f4ead0;
}

.category-time {
  font-family: var(--font-display);
  color: var(--uranium);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-shadow: 0 0 10px rgba(195, 224, 78, 0.3);
}

.task-summaries {
  padding: 0 var(--spacing-sm) 0 var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin: var(--spacing-sm) 0 var(--spacing-sm) 0;
}

.task-summary {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: var(--spacing-sm);
  align-items: center;
  padding: 5px 10px;
  background: transparent;
  border-radius: 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  transition: all var(--transition-fast);
}

.task-summaries > .task-summary:first-child {
  border-top: none;
}

.task-name {
  color: #e7f1df;
  font-family: var(--font-mono);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-time-combined {
  color: var(--uranium);
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-align: right;
}

/* Tooltip styles */
.task-tooltip {
  z-index: 1000;
  background: #0f3d40;
  border: 1px solid #041a1c;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  padding: 0;
  min-width: 260px;
  max-width: 390px;
  pointer-events: none;
  color: #e7f1df;
}

.tooltip-header {
  font-family: var(--font-mono);
  color: #f4ead0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 8px 12px 4px 12px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  font-size: 11px;
}

.appearance-time {
  color: #e7f1df;
  font-family: var(--font-mono);
  font-weight: 500;
}

.appearance-duration {
  color: var(--uranium);
  font-family: var(--font-mono);
  font-weight: 400;
  min-width: 40px;
  text-align: right;
}

/* Add hover cursor to indicate interactivity */
.task-summary {
  cursor: pointer;
}

.task-summary:hover {
  background: rgba(32, 181, 154, 0.1);
}

/* Copied task highlighting */
.task-summary-copied {
  background: rgba(195, 224, 78, 0.15) !important;
  box-shadow: inset 0 0 0 1px rgba(195, 224, 78, 0.4);
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

/* Export section */
.export-section {
  padding-top: 16px;
  display: flex;
  justify-content: center;
}

.export-button {
  height: 40px;
  padding: 0 22px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #052b22;
  background: linear-gradient(#22a78b, #0d6a58);
  border: 1px solid #062b2d;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2),
    0 0 20px rgba(32, 181, 154, 0.25);
}

.export-button:hover:not(:disabled) {
  filter: brightness(1.08);
}

.export-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px var(--shadow-color);
}

.export-button:focus-visible {
  outline: 2px solid var(--verdigris);
  outline-offset: 2px;
}

.export-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, var(--text-muted), var(--text-muted));
}
</style>
