<template>
  <div class="task-table" ref="taskTableRef">
    <table aria-label="Task records">
      <colgroup>
        <col style="width: 120px" />
        <col />
        <col style="width: 80px" />
        <col style="width: 70px" />
        <col style="width: 99px" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col">Task</th>
          <th scope="col">Start</th>
          <th scope="col">Duration</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="isLoadingTasks">
          <td colspan="5" class="loading-cell">
            <div class="loading-indicator" role="status" aria-busy="true">
              <span class="loading-spinner" aria-hidden="true"></span>
              Loading tasks...
            </div>
          </td>
        </tr>
        <tr v-else-if="taskRecords.length === 0">
          <td colspan="5" class="empty-cell">No tasks recorded for {{ displayDate }}</td>
        </tr>
        <tr
          v-else
          v-for="record in taskRecords"
          :key="record.id"
          :data-task-id="record.id"
          :class="{
            'special-task-row': isSpecial(record.task_type),
            'pause-task-row': record.task_type === TASK_TYPE_PAUSE,
            'end-task-row': record.task_type === TASK_TYPE_END,
            'highlighted-task': highlightedTasks.has(record.id),
            fading: fadingTasks.has(record.id)
          }"
        >
          <!-- Special task layout: merged category + task columns -->
          <td v-if="isSpecial(record.task_type)" colspan="2" class="special-task-cell">
            {{ record.task_name }}
          </td>
          <!-- Normal task layout: separate category and task columns -->
          <template v-else>
            <td>
              <div class="custom-dropdown table-dropdown" :class="{ open: showInlineDropdown[record.id] }">
                <button
                  type="button"
                  class="dropdown-trigger"
                  :id="`${componentId}-dropdown-trigger-${record.id}`"
                  @click="handleInlineDropdownToggle(record.id, record.category_name, $event)"
                  :aria-expanded="!!showInlineDropdown[record.id]"
                  :aria-controls="`${componentId}-dropdown-menu-${record.id}`"
                  aria-haspopup="listbox"
                >
                  <span class="dropdown-value">{{ record.category_name }}</span>
                  <span class="dropdown-arrow">▼</span>
                </button>
                <Teleport to="body">
                  <div
                    v-if="showInlineDropdown[record.id]"
                    class="dropdown-menu dropdown-menu-floating custom-dropdown"
                    role="listbox"
                    :id="`${componentId}-dropdown-menu-${record.id}`"
                    :aria-labelledby="`${componentId}-dropdown-trigger-${record.id}`"
                    @keydown="handleDropdownKeydown($event, record.id)"
                    tabindex="-1"
                    :style="floatingDropdownStyle(record.id)"
                  >
                    <div
                      v-for="(category, index) in categories"
                      :key="category.id ?? `inline-cat-${category.name}-${index}`"
                      class="dropdown-item"
                      role="option"
                      :class="{ selected: record.category_name === category.name }"
                      :aria-selected="record.category_name === category.name"
                      :tabindex="inlineListbox.getActiveIndex(record.id) === index ? '0' : '-1'"
                      :data-record-id="record.id"
                      :data-index="index"
                      @click="handleCategorySelection(record.id, category.name)"
                    >
                      {{ category.name }}
                    </div>
                  </div>
                </Teleport>
              </div>
            </td>
            <td>
              <input
                type="text"
                :value="record.task_name"
                @blur="$emit('handleBlur', record.id, 'task_name', $event)"
                @keydown.enter="$emit('handleEnter', record.id, 'task_name', $event)"
                @keydown="handleEscapeCancel($event, record.task_name)"
                class="editable-cell editable-input"
                placeholder="Task name"
              />
            </td>
          </template>
          <td>
            <input
              :type="record.start_time.trim() ? 'time' : 'text'"
              step="60"
              :value="convertToTimeInput(record.start_time)"
              :placeholder="record.start_time.trim() ? '' : 'HH:MM'"
              @blur="$emit('handleBlur', record.id, 'start_time', $event)"
              @keydown.enter="$emit('handleEnter', record.id, 'start_time', $event)"
              @keydown.esc="handleTimeEscapeCancel($event, record)"
              :class="['editable-cell', 'time-input', { 'empty-time': !record.start_time.trim() }]"
              :pattern="!record.start_time.trim() ? '^([01]?\d|2[0-3]):([0-5]\d)$' : ''"
              :maxlength="!record.start_time.trim() ? 5 : undefined"
            />
          </td>
          <!-- Duration column (visibility based on task type) -->
          <td v-if="DURATION_VISIBLE_BY_TASK_TYPE[record.task_type]" class="duration-cell" data-test="task-duration">
            {{ getDurationReactive(record) }}
          </td>
          <td v-else class="duration-cell" data-test="task-duration">-</td>
          <td class="actions-cell">
            <button
              v-if="record.task_type !== TASK_TYPE_PAUSE && record.task_type !== TASK_TYPE_END"
              class="action-btn replay-btn"
              @click="$emit('replayTask', record)"
              title="Replay this task for today"
              aria-label="Replay this task"
            >
              ▶▶︎
            </button>
            <button
              class="action-btn delete-btn"
              @click="$emit('confirmDeleteTask', record)"
              title="Delete this task"
              aria-label="Delete this task"
            >
              🗑
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { type PropType, ref, nextTick, computed, type Ref, watch, onUnmounted, toRaw, reactive } from 'vue'
import type { TaskRecord, Category, TaskType, TaskRecordWithId, UpdateContext } from '@/shared/types'
import { DURATION_VISIBLE_BY_TASK_TYPE, TASK_TYPE_PAUSE, TASK_TYPE_END } from '@/shared/types'
import { useListboxNavigation } from '@/composables/useListboxNavigation'

// Helper for requestAnimationFrame with fallback for test environments
const safeRequestAnimationFrame = (callback: FrameRequestCallback): void => {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(callback)
  } else {
    setTimeout(callback, 0)
  }
}

// Generate unique component instance ID for ARIA references
const componentId =
  typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? `tasklist-${globalThis.crypto.randomUUID()}`
    : `tasklist-${Date.now()}-${Math.floor(Math.random() * 10000)}`

// Template ref for component root element
const taskTableRef = ref<HTMLElement>()

// Smart scroll to specific task by ID
const scrollToTask = async (taskId: number): Promise<void> => {
  await nextTick()

  const selector = `tr[data-task-id="${taskId}"]`

  // Check user's motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Wait for the row to render (retry with timeout)
  let taskRow: HTMLElement | null = null
  const maxRetries = 40 // 40 * 25ms = 1 second max wait
  for (let i = 0; i < maxRetries; i++) {
    taskRow = taskTableRef.value?.querySelector(selector) as HTMLElement | null
    if (taskRow) break
    await new Promise(resolve => setTimeout(resolve, 25))
  }

  if (!taskRow) {
    console.warn(`[TaskList] Could not find task row with ID ${taskId} after ${maxRetries * 25}ms`)
    return
  }

  // Scroll the row into view, respecting motion preferences
  taskRow.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'nearest', // Scrolls only if needed, keeps task visible
    inline: 'nearest'
  })
}

// Legacy scroll to bottom method (kept for backward compatibility)
const scrollToBottom = async (parentPaneRef?: Ref<HTMLElement | undefined>): Promise<void> => {
  await nextTick()

  // Use provided parent pane ref or fall back to finding closest pane or use component element
  const container =
    parentPaneRef?.value ||
    (taskTableRef.value?.closest('.task-table-pane') as HTMLElement | null) ||
    taskTableRef.value
  if (!container) return

  // Use immediate scrolling for fastest performance
  const behavior: ScrollBehavior = 'auto'

  if (typeof (container as any).scrollTo === 'function') {
    container.scrollTo({ top: container.scrollHeight, behavior })
  } else {
    ;(container as any).scrollTop = container.scrollHeight
  }
}

// Props
const props = defineProps({
  taskRecords: {
    type: Array as PropType<TaskRecordWithId[]>,
    required: true
  },
  categories: {
    type: Array as PropType<Category[]>,
    required: true
  },
  isLoadingTasks: {
    type: Boolean,
    required: true
  },
  displayDate: {
    type: String,
    required: true
  },
  currentTimeMinutes: {
    type: Number,
    required: true
  },
  hasEndTaskForSelectedDate: {
    type: Boolean,
    required: true
  },
  showInlineDropdown: {
    type: Object as PropType<{ [key: number]: boolean }>,
    required: true
  },
  // Function props
  calculateDuration: {
    type: Function as PropType<(record: TaskRecordWithId) => string>,
    required: true
  },
  convertToTimeInput: {
    type: Function as PropType<(timeString: string) => string>,
    required: true
  },
  getCurrentTime: {
    type: Function as PropType<() => string>,
    required: true
  },
  isSpecial: {
    type: Function as PropType<(taskType: TaskType) => boolean>,
    required: true
  },
  updateContext: {
    type: String as PropType<UpdateContext>,
    default: 'initial-load' as UpdateContext
  }
})

// Emits
const emit = defineEmits<{
  toggleInlineDropdown: [recordId: number]
  selectInlineCategory: [recordId: number, categoryName: string]
  handleBlur: [recordId: number, field: string, event: Event]
  handleEnter: [recordId: number, field: string, event: Event]
  replayTask: [record: TaskRecordWithId]
  confirmDeleteTask: [record: TaskRecordWithId]
}>()

// Check if we're viewing today
const isViewingToday = computed(() => {
  const today = new Date()
  const [year, month, day] = props.displayDate.split('-').map(Number)
  return year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate()
})

// Get ID of the last task (for duration optimization)
const lastTaskId = computed(() => {
  const sorted = [...props.taskRecords]
    .filter(r => r.start_time.trim().length > 0)
    .sort((a, b) => {
      const [ah = 0, am = 0] = a.start_time.split(':').map(Number)
      const [bh = 0, bm = 0] = b.start_time.split(':').map(Number)
      return ah * 60 + am - (bh * 60 + bm)
    })
  return sorted.length > 0 ? sorted[sorted.length - 1]!.id : null
})

// Computed property for the last task's duration
const lastTaskDuration = computed(() => {
  if (!isViewingToday.value || !lastTaskId.value) {
    return '-'
  }

  const lastTask = props.taskRecords.find(r => r.id === lastTaskId.value)
  if (!lastTask) {
    return '-'
  }

  const reactiveTimeMinutes = props.currentTimeMinutes

  // Parse the task start time
  const [hours = 0, minutes = 0] = lastTask.start_time.split(':').map(Number)
  const taskStartMinutes = hours * 60 + minutes

  // Calculate duration from start to current time
  const durationMinutes = reactiveTimeMinutes - taskStartMinutes

  // Return formatted duration or '0m' if negative
  if (durationMinutes > 0) {
    const hours = Math.floor(durationMinutes / 60)
    const mins = Math.floor(durationMinutes % 60)
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${mins}m`
  }
  return '0m'
})

// Returns a function for getting task duration with reactive tracking
const getDurationReactive = computed(() => {
  const currentLastTaskDuration = lastTaskDuration.value
  const currentLastTaskId = lastTaskId.value
  const currentIsViewingToday = isViewingToday.value

  return (record: TaskRecordWithId): string => {
    if (currentIsViewingToday && record.id === currentLastTaskId) {
      return currentLastTaskDuration
    }
    return props.calculateDuration(record)
  }
})

// Expose scroll methods to parent
defineExpose({
  scrollToBottom, // Legacy method
  scrollToTask // New smart scroll method
})

// Convert props.categories to ref for composable
const categoriesRef = computed(() => props.categories)

// Inline dropdown navigation composable
const inlineListbox = useListboxNavigation({
  containerRef: taskTableRef,
  items: categoriesRef,
  onSelect: (category: Category, index: number, contextId?: string | number) => {
    if (typeof contextId === 'number') {
      handleCategorySelection(contextId, category.name)
    }
  },
  onClose: async (contextId?: string | number) => {
    if (typeof contextId === 'number') {
      emit('toggleInlineDropdown', contextId)
      await nextTick()
      focusTriggerButton(contextId)
    }
  },
  getOptionSelector: (recordId: string | number, optionIndex: number) =>
    `#${componentId}-dropdown-menu-${recordId} [data-record-id="${recordId}"][data-index="${optionIndex}"]`
})

// Highlighting system for task changes (reactive Set/Map to track add/delete)
const highlightedTasks = reactive(new Set<number>())
const fadingTasks = reactive(new Set<number>())
const highlightTimers = reactive(new Map<number, ReturnType<typeof setTimeout>>())

// Method to highlight a task (for adds/modifications)
const highlightTask = (taskId: number) => {
  // Clear any existing timer for this task
  const existingTimer = highlightTimers.get(taskId)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  // Remove from fading set if it's there and add to highlighted
  fadingTasks.delete(taskId)
  highlightedTasks.add(taskId)

  // Start fade immediately using requestAnimationFrame to ensure DOM update
  safeRequestAnimationFrame(() => {
    fadingTasks.add(taskId)
  })

  // Set timer to remove highlight after 15 seconds
  const timer = setTimeout(() => {
    highlightedTasks.delete(taskId)
    fadingTasks.delete(taskId)
    highlightTimers.delete(taskId)
  }, 15000)

  highlightTimers.set(taskId, timer)
}

// Watch for task record changes to highlight new/modified tasks (source-aware)
const previousTasksMap = ref<Map<number, TaskRecordWithId>>(new Map())

watch(
  [() => props.taskRecords, () => props.updateContext],
  ([newRecords, updateContext]) => {
    const plainNewRecords = toRaw(newRecords)

    // Clear highlights for non-edit contexts that might interfere
    if (updateContext === 'date-change' || updateContext === 'initial-load') {
      highlightedTasks.clear()
      fadingTasks.clear()
      highlightTimers.forEach(timer => clearTimeout(timer))
      highlightTimers.clear()
    }

    // Only highlight for actual edits
    if (updateContext !== 'edit') {
      // Just update snapshot without highlighting
      previousTasksMap.value = new Map(plainNewRecords.map((task: TaskRecordWithId) => [task.id, toRaw(task)]))
      return
    }

    // Edit context: run highlighting logic
    const newRecordsMap = new Map(plainNewRecords.map((task: TaskRecordWithId) => [task.id, toRaw(task)]))
    const addedTaskIds = new Set<number>()
    const modifiedTaskIds = new Set<number>()

    // Find added and modified tasks
    for (const [id, newTask] of newRecordsMap.entries()) {
      const oldTask = previousTasksMap.value.get(id)
      if (!oldTask) {
        addedTaskIds.add(id)
      } else {
        // Compare plain objects to detect modifications
        if (
          oldTask.task_name !== newTask.task_name ||
          oldTask.category_name !== newTask.category_name ||
          oldTask.start_time !== newTask.start_time
        ) {
          modifiedTaskIds.add(id)
        }
      }
    }

    // Highlight added and modified tasks
    ;[...addedTaskIds, ...modifiedTaskIds].forEach(taskId => {
      highlightTask(taskId)
    })

    // Update previous tasks snapshot
    previousTasksMap.value = newRecordsMap
  },
  { deep: true }
)

// Cleanup timers on unmount
onUnmounted(() => {
  highlightTimers.forEach(timer => clearTimeout(timer))
})

// Keyboard handling for inline dropdown navigation
const handleDropdownKeydown = (event: KeyboardEvent, recordId: number) => {
  inlineListbox.handleKeydown(event, recordId)
}

// Track floating dropdown positions (keyed by record id) for teleported menus
const dropdownPositions = reactive<Record<number, { top: number; left: number; width: number }>>({})

const floatingDropdownStyle = (recordId: number): Record<string, string> => {
  const pos = dropdownPositions[recordId]
  if (!pos) return {}
  return {
    position: 'fixed',
    top: `${pos.top}px`,
    left: `${pos.left}px`,
    width: `${pos.width}px`,
    zIndex: '2000'
  }
}

// Handle inline dropdown toggle with proper timing
const handleInlineDropdownToggle = async (recordId: number, categoryName: string, event?: MouseEvent) => {
  // Capture pre-toggle state to determine if dropdown will open
  const willOpen = !props.showInlineDropdown[recordId]

  if (willOpen && event) {
    const btn = event.currentTarget as HTMLElement | null
    const rect = btn?.getBoundingClientRect()
    if (rect) {
      dropdownPositions[recordId] = {
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width
      }
    }
  }

  // Emit the toggle
  emit('toggleInlineDropdown', recordId)

  // If opening, wait for DOM update then initialize active option
  if (willOpen) {
    await nextTick()
    initializeActiveOption(recordId, categoryName)
  }
}

// Unified category selection handler
const handleCategorySelection = async (recordId: number, categoryName: string) => {
  // 1. Emit the category selection (parent handles closing dropdown)
  emit('selectInlineCategory', recordId, categoryName)

  // 2. Return focus to the trigger button
  await nextTick()
  focusTriggerButton(recordId)
}

// Focus management helpers for trigger buttons
const focusTriggerButton = (recordId: number) => {
  const button = taskTableRef.value?.querySelector<HTMLElement>(
    `[aria-controls="${componentId}-dropdown-menu-${recordId}"]`
  )
  button?.focus()
}

// Initialize active option when dropdown opens
const initializeActiveOption = (recordId: number, selectedCategoryName: string) => {
  const selectedIndex = props.categories.findIndex(cat => cat.name === selectedCategoryName)
  const index = selectedIndex === -1 ? 0 : selectedIndex
  inlineListbox.initializeActiveOption(recordId, index)
}

// Handle Escape key to cancel inline editing and revert changes
const handleEscapeCancel = (event: KeyboardEvent, originalValue: string) => {
  if (event.key === 'Escape') {
    const target = event.target as HTMLInputElement
    target.value = originalValue
    target.blur()
  }
}

// Handle Escape key to cancel time input editing and revert to original time
const handleTimeEscapeCancel = (event: KeyboardEvent, record: TaskRecordWithId) => {
  if (event.key === 'Escape') {
    const target = event.target as HTMLInputElement
    target.value = props.convertToTimeInput(record.start_time)
    target.blur()
  }
}
</script>

<style scoped>
/* Component-specific CSS custom properties */
.task-table {
  --primary-alpha: rgba(87, 189, 175, 0.2);
  --warning-alpha: rgba(253, 203, 110, 0.05);
  --success-alpha: rgba(89, 201, 100, 0.05);
  --emerald-shadow: rgba(86, 179, 114, 0.3);
  --emerald-shadow-hover: rgba(86, 179, 114, 0.4);
  --transition-fast: 0.2s ease;
  --warning-hover: color-mix(in srgb, var(--warning) 80%, var(--text-primary) 20%);
  --success-hover: color-mix(in srgb, var(--success) 80%, var(--text-primary) 20%);
}

/* Task table styles */
.task-table {
  background: var(--cream, var(--bg-primary));
  border: 1px solid var(--paper-edge, var(--border-color));
  border-radius: var(--radius-lg);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08),
    0 2px 0 rgba(0, 0, 0, 0.03);
  margin: var(--spacing-md);
  overflow: hidden;
}

:global(body[data-theme='dark']) .task-table {
  background: #121c1e;
  border-color: #2a3b3e;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}

th {
  background: linear-gradient(#18494b, #0d3133);
  color: #cfe8d9;
  height: 24px;
  padding: 0 var(--spacing-xs);
  text-align: left;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  border-bottom: 1px solid #06282a;
  position: sticky;
  top: 0;
  z-index: 10;
}

tbody tr {
  height: 28px;
}

td {
  padding: 0 var(--spacing-sm);
  height: 28px;
  border-bottom: 1px dashed rgba(22, 39, 42, 0.15);
  vertical-align: middle;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink, var(--text-primary));
}

tr:nth-child(even) td {
  background: rgba(201, 188, 154, 0.12);
}

tr:hover td {
  background: rgba(32, 181, 154, 0.1);
}

:global(body[data-theme='dark']) tr:nth-child(even) td {
  background: rgba(201, 188, 154, 0.04);
}

:global(body[data-theme='dark']) tr:hover td {
  background: rgba(32, 181, 154, 0.12);
}

:global(body[data-theme='dark']) td {
  border-bottom-color: rgba(201, 188, 154, 0.12);
}

tr:last-child td {
  border-bottom: none;
}

/* Loading and empty states */
.loading-cell,
.empty-cell {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-muted);
  font-size: var(--font-md);
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary);
  border-radius: 50%;
}

/* Animation only when motion is not reduced */
@media (prefers-reduced-motion: no-preference) {
  .loading-spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}

/* Static fallback for reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }
}

/* Special task row styles */
.special-task-row {
  background: var(--bg-secondary);
  font-weight: 500;
}

.pause-task-row {
  background: var(--warning-alpha);
}

.end-task-row {
  background: var(--success-alpha);
}

.special-task-cell {
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

/* Input styles */
.editable-cell {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--font-md);
  transition: all var(--transition-fast);
}

.editable-cell:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--bg-primary);
  box-shadow: 0 0 0 2px var(--primary-alpha);
}

.time-input {
  width: 70px;
  max-width: 70px;
  font-size: var(--font-sm);
  text-align: center;
}

/* Style placeholder text to appear lighter when empty */
.time-input::placeholder {
  color: var(--text-muted);
  opacity: 0.8;
}

/* Style empty time inputs to appear lighter */
.time-input.empty-time {
  color: var(--text-muted);
  opacity: 0.7;
  font-style: normal;
}

.time-input.empty-time::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

/* Override browser styling for empty time inputs */
.time-input.empty-time::-webkit-datetime-edit-text,
.time-input.empty-time::-webkit-datetime-edit-hour-field,
.time-input.empty-time::-webkit-datetime-edit-minute-field {
  color: var(--text-muted);
  opacity: 0.7;
  text-decoration: none !important;
  text-decoration-line: none !important;
}

.time-input.empty-time::-webkit-datetime-edit {
  color: var(--text-muted);
  opacity: 0.7;
  text-decoration: none !important;
}

.time-input-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.current-time-hint {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 14px;
  pointer-events: none;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

/* Custom dropdown styles */
.custom-dropdown {
  position: relative;
  width: 100%;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 7px 0 8px;
  height: 20px;
  border: 1px solid #06282a;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: #0f4a4e;
  color: #a9f0d8;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  transition: all var(--transition-fast);
  width: 100%;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
}

.dropdown-trigger:hover {
  filter: brightness(1.1);
}

:global(body[data-theme='dark']) .dropdown-trigger {
  background: #0a3538;
  color: #a9f0d8;
  border-color: #04181a;
}

.dropdown-arrow {
  font-size: 8px;
  opacity: 0.75;
  margin-left: 8px;
  color: currentColor;
  transition: transform 0.2s ease;
}

.custom-dropdown.open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--cream, var(--bg-primary));
  border: 1px solid var(--paper-edge, var(--border-color));
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  z-index: 1000;
  max-height: 240px;
  overflow-y: auto;
  margin-top: 2px;
}

.dropdown-menu-floating {
  top: auto;
  left: auto;
  right: auto;
}

.dropdown-item {
  padding: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-md);
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.dropdown-item.selected {
  background: var(--primary);
  color: white;
}

/* Action buttons */
.actions-cell {
  text-align: right;
  white-space: nowrap;
}

.action-btn {
  background: var(--btn-icon-bg);
  border: 1px solid var(--paper-edge, var(--border-color));
  cursor: pointer;
  width: 24px;
  height: 20px;
  padding: 0;
  margin: 0 2px;
  border-radius: 5px;
  transition: all var(--transition-fast);
  font-size: var(--font-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2, var(--text-secondary));
}

.action-btn:hover {
  background: var(--btn-icon-bg-hover);
}

.replay-btn {
  background: linear-gradient(#1a6d6f, #0b4244);
  color: #c4ecd8;
  border-color: #062b2d;
}

.replay-btn:hover {
  filter: brightness(1.1);
  background: linear-gradient(#1a6d6f, #0b4244);
}

.delete-btn:hover {
  background: #efd2cc;
  color: var(--rust);
  border-color: var(--rust);
}

.add-btn {
  color: var(--teal);
}

.primary-add-btn {
  background: linear-gradient(135deg, var(--emerald), var(--mantis));
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  min-width: 80px;
  border: 1px solid var(--emerald);
  box-shadow: 0 2px 4px var(--emerald-shadow);
  transition: all var(--transition-fast);
}

.primary-add-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--mantis), var(--emerald));
  transform: translateY(-1px);
  box-shadow: 0 4px 8px var(--emerald-shadow-hover);
}

.primary-add-btn:disabled {
  background: var(--bg-secondary);
  color: var(--text-muted);
  border-color: var(--border-color);
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

/* Duration cell specific styles */
.duration-cell {
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  color: var(--ink-2, var(--text-secondary));
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.04em;
}

/* Task highlighting styles */
.highlighted-task {
  background-color: rgba(195, 224, 78, 0.25);
  transition: background-color 15s ease-out;
}

.highlighted-task.fading {
  background-color: transparent;
}
</style>
