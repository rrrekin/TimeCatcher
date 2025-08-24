<template>
  <div class="daily-report">
    <div class="report-header">
      <h2 data-testid="report-header-title">Daily Report: {{ totalTimeTracked }}</h2>
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
            <div class="category-time">{{ categoryData.totalTime }}</div>
            <div class="category-bar">
              <div
                class="category-progress"
                role="progressbar"
                :aria-valuenow="clampPercent(categoryData.percentage)"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuetext="`${clampPercent(categoryData.percentage).toFixed(0)}%`"
                :aria-labelledby="`category-name-${index}`"
                :style="{ width: clampPercent(categoryData.percentage) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Task summaries within category -->
          <ul class="task-summaries">
            <li
              v-for="(task, index) in categoryData.taskSummaries"
              :key="task.name ? `${task.name}-${index}` : index"
              class="task-summary"
            >
              <span class="task-name">{{ task.name }}</span>
              <span class="task-count">{{ task.count }}x</span>
              <span
                class="task-time-rounded"
                :title="`Rounded (nearest 5m)`"
                :aria-label="`Rounded (nearest 5m): ${formatTaskTime(task.totalTime)}`"
              >
                {{ formatTaskTime(task.totalTime) }}
              </span>
              <span class="task-time-actual" :title="`Actual`" :aria-label="`Actual: ${task.totalTime}`">
                {{ task.totalTime }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TaskRecord } from '@/shared/types'
import { TASK_TYPE_NORMAL } from '@/shared/types'

interface DailyReportProps {
  taskRecords: TaskRecord[]
  dateTitle: string
  hasEndTaskForSelectedDate: boolean
  targetWorkHours: number
  totalTimeTracked: string
  totalMinutesTracked: number
  categoryBreakdown: Array<{
    name: string
    taskCount: number
    totalTime: string
    percentage: number
    taskSummaries: Array<{
      name: string
      count: number
      totalTime: string
    }>
  }>
}

// Props
const props = defineProps<DailyReportProps>()

// Helper function
const clampPercent = (p: number): number => {
  return Math.max(0, Math.min(100, p))
}

// Computed properties
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

// Format task time to show rounded to nearest 5 minutes
const formatTaskTime = (timeString: string): string => {
  const raw = (timeString || '').trim()
  if (!raw || raw === '-') return '-' // preserve “no data”
  // Support: "1h 30m", "1h30m", "2h", "45m"
  const parts = [...raw.matchAll(/(\d+)\s*([hm])/gi)]
  if (parts.length === 0) return '-'
  let totalMinutes = 0
  for (const [, n, unit] of parts) {
    if (!n || !unit) continue
    const value = parseInt(n, 10)
    if (Number.isNaN(value)) continue
    totalMinutes += unit.toLowerCase() === 'h' ? value * 60 : value
  }
  const roundedMinutes = Math.round(totalMinutes / 5) * 5
  if (roundedMinutes === 0) return '0m'
  const hours = Math.floor(roundedMinutes / 60)
  const minutes = roundedMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
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
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
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
  grid-template-columns: 1fr auto 200px;
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

.category-bar {
  background: var(--border-color);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.category-progress {
  background: linear-gradient(90deg, var(--verdigris), var(--emerald));
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.task-summaries {
  padding: 0 16px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-summary {
  display: grid;
  grid-template-columns: 1fr minmax(50px, auto) minmax(50px, auto) minmax(50px, auto);
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

.task-time-rounded {
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  min-width: 50px;
  text-align: right;
}

.task-time-actual {
  color: var(--text-muted);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
  min-width: 50px;
  text-align: right;
}
</style>
