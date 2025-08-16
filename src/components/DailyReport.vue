<template>
  <div class="daily-report">
    <div class="report-header">
      <h2>Daily Report - Standard Tasks: {{ totalTimeTracked }}</h2>
      <div class="status-emojis">
        <span v-if="!hasEndTaskForSelectedDate" class="status-emoji">⚠️</span>
        <span v-if="totalMinutesTracked >= (targetWorkHours * 60)" class="status-emoji">😊</span>
      </div>
    </div>
    <p>
      {{ formattedDate.split(',')[0] }} - Overview of your time and productivity
      {{ hasEndTaskForSelectedDate ? '' : ' (Day not finalized)' }}
    </p>

    <!-- Category Breakdown -->
    <div class="report-section">
      <h3>Detailed Time by Category</h3>
      <div v-if="standardTaskCount === 0" class="empty-report">
        No standard tasks recorded for this day
      </div>
      <div v-else class="category-breakdown">
        <div
            v-for="categoryData in categoryBreakdown"
            :key="categoryData.name"
            class="category-section"
        >
          <div class="category-header">
            <div class="category-info">
              <span class="category-name">{{ categoryData.name }}</span>
              <span class="category-tasks">{{ categoryData.taskCount }} tasks</span>
            </div>
            <div class="category-time">{{ categoryData.totalTime }}</div>
            <div class="category-bar">
              <div
                  class="category-progress"
                  :style="{ width: categoryData.percentage + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Task summaries within category -->
          <div class="task-summaries">
            <div
                v-for="task in categoryData.taskSummaries"
                :key="task.name"
                class="task-summary"
            >
              <span class="task-name">{{ task.name }}</span>
              <span class="task-count">{{ task.count }}x</span>
              <span class="task-time">{{ task.totalTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import type { TaskRecord } from '@/shared/types'

// Props
const props = defineProps({
  taskRecords: {
    type: Array as PropType<TaskRecord[]>,
    required: true
  },
  formattedDate: {
    type: String,
    required: true
  },
  hasEndTaskForSelectedDate: {
    type: Boolean,
    required: true
  },
  targetWorkHours: {
    type: Number,
    required: true
  },
  totalTimeTracked: {
    type: String,
    required: true
  },
  totalMinutesTracked: {
    type: Number,
    required: true
  },
  categoryBreakdown: {
    type: Array as PropType<Array<{
      name: string
      taskCount: number
      totalTime: string
      percentage: number
      taskSummaries: Array<{
        name: string
        count: number
        totalTime: string
      }>
    }>>,
    required: true
  }
})

// Computed properties
const standardTaskCount = computed(() => {
  return props.taskRecords.filter(r => r.task_type === 'normal').length
})
</script>

<style scoped>
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
  grid-template-columns: 1fr auto auto;
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

.task-time {
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  min-width: 60px;
  text-align: right;
}
</style>