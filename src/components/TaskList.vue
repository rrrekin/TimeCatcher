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
          <th scope="col">Start time</th>
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
          :class="{
            'special-task-row': isSpecial(record.task_type),
            'pause-task-row': record.task_type === TASK_TYPE_PAUSE,
            'end-task-row': record.task_type === TASK_TYPE_END
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
                  @click="handleInlineDropdownToggle(record.id, record.category_name)"
                  :aria-expanded="!!showInlineDropdown[record.id]"
                  :aria-controls="`${componentId}-dropdown-menu-${record.id}`"
                  aria-haspopup="listbox"
                >
                  <span class="dropdown-value">{{ record.category_name }}</span>
                  <span class="dropdown-arrow">▼</span>
                </button>
                <div
                  v-if="showInlineDropdown[record.id]"
                  class="dropdown-menu"
                  role="listbox"
                  :id="`${componentId}-dropdown-menu-${record.id}`"
                  :aria-labelledby="`${componentId}-dropdown-trigger-${record.id}`"
                  @keydown="handleDropdownKeydown($event, record.id)"
                  tabindex="-1"
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
              :pattern="!record.start_time.trim() ? '^([01]?\\\\d|2[0-3]):([0-5]?\\\\d)$' : ''"
              :maxlength="!record.start_time.trim() ? 5 : 0"
            />
          </td>
          <!-- Duration column (visibility based on task type) -->
          <td v-if="DURATION_VISIBLE_BY_TASK_TYPE[record.task_type]" class="duration-cell" data-test="task-duration">
            {{ calculateDuration(record) }}
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

        <!-- Add task form row (always visible at bottom) -->
        <tr class="add-task-row">
          <td>
            <div class="custom-dropdown table-dropdown add-task-dropdown" :class="{ open: showFormCategoryDropdown }">
              <button
                type="button"
                class="dropdown-trigger"
                :id="formDropdownTriggerId"
                @click="handleFormDropdownToggle"
                :aria-expanded="showFormCategoryDropdown"
                :aria-controls="formDropdownMenuId"
                aria-haspopup="listbox"
              >
                <span class="dropdown-value">{{ getSelectedCategoryName() || 'Select category' }}</span>
                <span class="dropdown-arrow">▼</span>
              </button>
              <div
                v-if="showFormCategoryDropdown"
                class="dropdown-menu"
                role="listbox"
                :id="formDropdownMenuId"
                :aria-labelledby="formDropdownTriggerId"
                @keydown="handleFormDropdownKeydown"
                tabindex="-1"
              >
                <div
                  v-for="(category, index) in categories"
                  :key="category.id ?? `form-cat-${category.name}-${index}`"
                  class="dropdown-item"
                  role="option"
                  :class="{ selected: newTask.categoryId === category.id }"
                  :aria-selected="newTask.categoryId === category.id"
                  :tabindex="formListbox.getActiveIndex('form') === index ? '0' : '-1'"
                  :data-option-index="index"
                  @click="handleFormCategorySelection(category)"
                >
                  {{ category.name }}
                </div>
              </div>
            </div>
          </td>
          <td>
            <input
              type="text"
              :value="newTask.name"
              @input="$emit('updateNewTask', { ...newTask, name: ($event.target as HTMLInputElement).value })"
              @keydown.enter.prevent="onAddTaskEnter"
              class="editable-cell add-task-input"
              placeholder="Enter task name..."
            />
          </td>
          <td>
            <input
              type="time"
              step="60"
              :value="newTask.time"
              @input="$emit('updateNewTask', { ...newTask, time: ($event.target as HTMLInputElement).value })"
              @keydown.enter.prevent="onAddTaskEnter"
              :class="['editable-cell', 'time-input', { 'empty-time': !newTask.time.trim() }]"
            />
          </td>
          <td class="duration-cell">-</td>
          <td class="actions-cell">
            <button
              class="action-btn add-btn primary-add-btn"
              @click="handleAddTask"
              :disabled="!isAddTaskValid"
              :aria-disabled="!isAddTaskValid"
              :title="isAddTaskValid ? 'Add new task' : 'Please fill in all required fields'"
              :aria-label="isAddTaskValid ? 'Add task' : 'Add task (disabled - missing required fields)'"
            >
              + Add Task
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Special task buttons -->
    <div class="special-task-buttons">
      <button type="button" class="special-task-btn pause-btn" @click="$emit('addPauseTask')">⏸ Pause</button>
      <button
        type="button"
        class="special-task-btn end-btn"
        @click="$emit('addEndTask')"
        :disabled="hasEndTaskForSelectedDate"
        :aria-disabled="hasEndTaskForSelectedDate"
        :title="hasEndTaskForSelectedDate ? 'End task already exists for this day' : 'Add end task for this day'"
      >
        ⏹ End
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType, ref, nextTick, computed } from 'vue'
import type { TaskRecord, Category, TaskType, TaskRecordWithId } from '@/shared/types'
import { DURATION_VISIBLE_BY_TASK_TYPE, TASK_TYPE_PAUSE, TASK_TYPE_END } from '@/shared/types'
import { useListboxNavigation } from '@/composables/useListboxNavigation'

// Generate unique component instance ID for ARIA references
const componentId =
  typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? `tasklist-${globalThis.crypto.randomUUID()}`
    : `tasklist-${Date.now()}-${Math.floor(Math.random() * 10000)}`
const formDropdownMenuId = `form-dropdown-menu-${componentId}`
const formDropdownTriggerId = `form-dropdown-trigger-${componentId}`

// Template ref for component root element
const taskTableRef = ref<HTMLElement>()

// Scroll to bottom method
const scrollToBottom = async (): Promise<void> => {
  await nextTick()
  const el = taskTableRef.value
  if (!el) return

  // Use immediate scrolling for fastest performance
  const behavior: ScrollBehavior = 'auto'

  const wrapper = el.closest('.task-table-pane') as HTMLElement | null
  const container = (wrapper ?? el) as HTMLElement

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
  hasEndTaskForSelectedDate: {
    type: Boolean,
    required: true
  },
  showInlineDropdown: {
    type: Object as PropType<{ [key: number]: boolean }>,
    required: true
  },
  showFormCategoryDropdown: {
    type: Boolean,
    required: true
  },
  newTask: {
    type: Object as PropType<{
      categoryId: number | null
      name: string
      time: string
    }>,
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
  getSelectedCategoryName: {
    type: Function as PropType<() => string>,
    required: true
  },
  isSpecial: {
    type: Function as PropType<(taskType: TaskType) => boolean>,
    required: true
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
  toggleFormDropdown: []
  selectFormCategory: [category: Category]
  updateNewTask: [newTask: { categoryId: number | null; name: string; time: string }]
  addTask: []
  addPauseTask: []
  addEndTask: []
}>()

// Expose scrollToBottom method to parent
defineExpose({
  scrollToBottom
})

// Convert props.categories to ref for composable
const categoriesRef = computed(() => props.categories)

// Validation for add task form
const isAddTaskValid = computed(() => {
  return (
    props.newTask.categoryId != null && // Category must be selected
    props.newTask.name.trim().length > 0 // Task name must not be empty/whitespace
    // Time is optional - if empty, current time will be used
  )
})

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

// Form dropdown navigation composable
const formListbox = useListboxNavigation({
  containerRef: taskTableRef,
  items: categoriesRef,
  onSelect: (category: Category, index: number) => {
    handleFormCategorySelection(category)
  },
  onClose: async () => {
    emit('toggleFormDropdown')
    await nextTick()
    focusFormTriggerButton()
  },
  getOptionSelector: (contextId: string | number, optionIndex: number) =>
    `#${formDropdownMenuId} [data-option-index="${optionIndex}"]`
})

// Keyboard handling for inline dropdown navigation
const handleDropdownKeydown = (event: KeyboardEvent, recordId: number) => {
  inlineListbox.handleKeydown(event, recordId)
}

// Handle inline dropdown toggle with proper timing
const handleInlineDropdownToggle = async (recordId: number, categoryName: string) => {
  // Capture pre-toggle state to determine if dropdown will open
  const willOpen = !props.showInlineDropdown[recordId]

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
  // 1. Emit the category selection
  emit('selectInlineCategory', recordId, categoryName)

  // 2. Close the dropdown
  emit('toggleInlineDropdown', recordId)

  // 3. Return focus to the trigger button
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

// Form dropdown keyboard handling
const handleFormDropdownKeydown = (event: KeyboardEvent) => {
  formListbox.handleKeydown(event, 'form')
}

// Form category selection handler
const handleFormCategorySelection = async (category: Category) => {
  // 1. Emit the category selection
  emit('selectFormCategory', category)

  // 2. Close the dropdown
  emit('toggleFormDropdown')

  // 3. Return focus to the trigger button
  await nextTick()
  focusFormTriggerButton()
}

// Form dropdown trigger focus helper
const focusFormTriggerButton = () => {
  const button = taskTableRef.value?.querySelector<HTMLButtonElement>(`[aria-controls="${formDropdownMenuId}"]`)
  button?.focus()
}

// Handle form dropdown toggle - only initialize when opening
const handleFormDropdownToggle = async () => {
  // Capture pre-toggle intent to avoid race condition
  const willOpen = !props.showFormCategoryDropdown

  // Emit the toggle
  emit('toggleFormDropdown')

  // Only initialize when opening and categories exist
  if (willOpen) {
    // Guard against empty/loading categories
    if (!props.categories || props.categories.length === 0) {
      return
    }

    await nextTick()
    initializeFormActiveOption()
  }
}

// Initialize form dropdown active option when opened
const initializeFormActiveOption = () => {
  const selectedIndex = props.categories.findIndex(cat => cat.id === props.newTask.categoryId)
  const clampedIndex = Math.max(0, selectedIndex)
  formListbox.initializeActiveOption('form', clampedIndex)
}

// Guarded add task handler
const handleAddTask = () => {
  // Only emit addTask if form is valid
  if (isAddTaskValid.value) {
    emit('addTask')
  }
}

// Guarded Enter key handler for add task form
const onAddTaskEnter = () => {
  // Only emit addTask if form is valid
  if (isAddTaskValid.value) {
    emit('addTask')
  }
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
  --warning-alpha: rgba(253, 203, 110, 0.1);
  --success-alpha: rgba(89, 201, 100, 0.1);
  --emerald-shadow: rgba(86, 179, 114, 0.3);
  --emerald-shadow-hover: rgba(86, 179, 114, 0.4);
  --transition-fast: 0.2s ease;
  --warning-hover: color-mix(in srgb, var(--warning) 80%, var(--text-primary) 20%);
  --success-hover: color-mix(in srgb, var(--success) 80%, var(--text-primary) 20%);
}

/* Task table styles */
.task-table {
  background: var(--bg-primary);
  box-shadow: 0 4px 20px var(--shadow-color);
  margin-bottom: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}

th {
  background: var(--primary);
  color: white;
  padding: 8px 6px;
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

td {
  padding: 6px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

/* Loading and empty states */
.loading-cell,
.empty-cell {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
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
  padding: 4px;
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
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
  font-size: 12px;
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
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  font-size: 13px;
  transition: all var(--transition-fast);
}

.dropdown-trigger:hover {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

.dropdown-arrow {
  font-size: 12px;
  color: var(--text-muted);
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
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--shadow-color);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-item {
  padding: 6px 8px;
  cursor: pointer;
  font-size: 13px;
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
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  margin: 0 1px;
  border-radius: 4px;
  transition: all var(--transition-fast);
  font-size: 14px;
}

.action-btn:hover {
  background: var(--bg-secondary);
  transform: scale(1.1);
}

.replay-btn {
  color: var(--aero);
}

.delete-btn {
  color: var(--mantis);
}

.add-btn {
  color: var(--emerald);
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

/* Add task row */
.add-task-row {
  background: var(--bg-secondary);
}

.add-task-input::placeholder {
  color: var(--text-muted);
}

/* Special task buttons */
.special-task-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  justify-content: center;
}

.special-task-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-fast);
  color: white;
}

.pause-btn {
  background: var(--warning);
}

.pause-btn:hover {
  background: var(--warning-hover);
  transform: translateY(-2px);
}

.end-btn {
  background: var(--success);
}

.end-btn:hover:not(:disabled) {
  background: var(--success-hover);
  transform: translateY(-2px);
}

.end-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Duration cell specific styles */
.duration-cell {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
