<template>
  <div class="task-table">
    <table>
      <thead>
      <tr>
        <th>Category</th>
        <th>Task</th>
        <th>Start time</th>
        <th>Duration</th>
        <th>Actions</th>
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
        <td colspan="5" class="empty-cell">
          No tasks recorded for {{ displayDate }}
        </td>
      </tr>
      <tr v-else v-for="(record, index) in taskRecords" :key="record.id ?? `${record.task_type}-${record.created_at || record.task_name}-${index}`" 
          :class="{ 
            'special-task-row': isSpecial(record.task_type),
            'pause-task-row': record.task_type === 'pause',
            'end-task-row': record.task_type === 'end'
          }">
        <!-- Special task layout: merged category + task columns -->
        <td v-if="isSpecial(record.task_type)" colspan="2" class="special-task-cell">
          {{ record.task_name }}
        </td>
        <!-- Normal task layout: separate category and task columns -->
        <template v-else>
          <td>
            <div class="custom-dropdown table-dropdown"
                 :class="{ open: record.id != null && showInlineDropdown[record.id] }">
              <button 
                type="button"
                class="dropdown-trigger" 
                @click="record.id != null && ($emit('toggleInlineDropdown', record.id), initializeActiveOption(record.id, record.category_name))"
                :aria-expanded="record.id != null && showInlineDropdown[record.id]"
                :aria-controls="record.id != null ? `dropdown-menu-${record.id}` : undefined"
                aria-haspopup="listbox"
              >
                <span class="dropdown-value">{{ record.category_name }}</span>
                <span class="dropdown-arrow">▼</span>
              </button>
              <div 
                v-if="record.id != null && showInlineDropdown[record.id]" 
                class="dropdown-menu"
                role="listbox"
                :id="`dropdown-menu-${record.id}`"
                @keydown="handleDropdownKeydown($event, record.id!)"
                tabindex="-1"
              >
                <div
                    v-for="(category, index) in categories"
                    :key="category.id ?? `inline-cat-${category.name}-${index}`"
                    class="dropdown-item"
                    role="option"
                    :class="{ selected: record.category_name === category.name }"
                    :aria-selected="record.category_name === category.name"
                    :tabindex="(activeOptionIndex[record.id!] ?? 0) === index ? '0' : '-1'"
                    :data-record-id="record.id!"
                    :data-index="index"
                    @click="handleCategorySelection(record.id!, category.name)"
                    @keydown="handleDropdownItemKeydown($event, record.id!, category.name)"
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
                @blur="$emit('handleBlur', record.id!, 'task_name', $event)"
                @keydown.enter="$emit('handleEnter', record.id!, 'task_name', $event)"
                class="editable-cell editable-input"
                placeholder="Task name"
            />
          </td>
        </template>
        <td>
          <input
              type="time"
              step="60"
              :value="convertToTimeInput(record.start_time)"
              @blur="$emit('handleBlur', record.id!, 'start_time', $event)"
              @keydown.enter="$emit('handleEnter', record.id!, 'start_time', $event)"
              class="editable-cell time-input"
          />
        </td>
        <!-- Duration column (visibility based on task type) -->
        <td v-if="DURATION_VISIBLE_BY_TASK_TYPE[record.task_type]" class="duration-cell">
          {{ calculateDuration(record) }}
        </td>
        <td v-else class="duration-cell">-</td>
        <td class="actions-cell">
          <button 
            v-if="record.task_type !== 'pause' && record.task_type !== 'end'" 
            class="action-btn replay-btn" 
            @click="$emit('replayTask', record)" 
            title="Replay this task for today" 
            aria-label="Replay this task"
          >
            ▶▶︎
          </button>
          <button class="action-btn delete-btn" @click="$emit('confirmDeleteTask', record)" title="Delete this task" aria-label="Delete this task">
            🗑
          </button>
        </td>
      </tr>
      
      <!-- Add task form row (always visible at bottom) -->
      <tr class="add-task-row">
        <td>
          <div class="custom-dropdown table-dropdown add-task-dropdown"
               :class="{ open: showFormCategoryDropdown }">
            <button 
              type="button"
              class="dropdown-trigger" 
              @click="$emit('toggleFormDropdown')"
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
            >
              <div
                  v-for="(category, index) in categories"
                  :key="category.id ?? `form-cat-${category.name}-${index}`"
                  class="dropdown-item"
                  role="option"
                  :class="{ selected: newTask.categoryId === category.id }"
                  :aria-selected="newTask.categoryId === category.id"
                  @click="$emit('selectFormCategory', category)"
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
              @keydown.enter="$emit('addTask')"
              class="editable-cell add-task-input"
              placeholder="Enter task name..."
          />
        </td>
        <td>
          <div class="time-input-container">
            <input
                type="time"
                step="60"
                :value="newTask.time"
                @input="$emit('updateNewTask', { ...newTask, time: ($event.target as HTMLInputElement).value })"
                @keydown.enter="$emit('addTask')"
                class="editable-cell time-input"
            />
            <span v-if="!newTask.time" class="current-time-hint">{{ getCurrentTime() }}</span>
          </div>
        </td>
        <td class="duration-cell">-</td>
        <td class="actions-cell">
          <button class="action-btn add-btn" @click="$emit('addTask')" title="Add new task" aria-label="Add task">
            ✓
          </button>
        </td>
      </tr>
      </tbody>
    </table>

    <!-- Special task buttons -->
    <div class="special-task-buttons">
      <button class="special-task-btn pause-btn" @click="$emit('addPauseTask')">
        ⏸ Pause
      </button>
      <button 
        class="special-task-btn end-btn" 
        @click="$emit('addEndTask')"
        :disabled="hasEndTaskForSelectedDate"
        :title="hasEndTaskForSelectedDate ? 'End task already exists for this day' : 'Add end task for this day'"
      >
        ⏹ End
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType, ref, nextTick } from 'vue'
import type { TaskRecord, Category, TaskType } from '@/shared/types'
import { DURATION_VISIBLE_BY_TASK_TYPE } from '@/shared/types'

// Generate unique component instance ID for ARIA references
const componentId = `tasklist-${Date.now()}-${Math.floor(Math.random() * 10000)}`
const formDropdownMenuId = `form-dropdown-menu-${componentId}`

// Props
const props = defineProps({
  taskRecords: {
    type: Array as PropType<TaskRecord[]>,
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
    type: Function as PropType<(record: TaskRecord) => string>,
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
    type: Function as PropType<(taskType: TaskType | undefined) => boolean>,
    required: true
  }
})

// Emits
const emit = defineEmits<{
  toggleInlineDropdown: [recordId: number]
  selectInlineCategory: [recordId: number, categoryName: string]
  handleBlur: [recordId: number, field: string, event: Event]
  handleEnter: [recordId: number, field: string, event: Event]
  replayTask: [record: TaskRecord]
  confirmDeleteTask: [record: TaskRecord]
  toggleFormDropdown: []
  selectFormCategory: [category: Category]
  updateNewTask: [newTask: { categoryId: number | null; name: string; time: string }]
  addTask: []
  addPauseTask: []
  addEndTask: []
}>()

// Reactive state for dropdown keyboard navigation
const activeOptionIndex = ref<Record<number, number>>({}) // recordId -> option index

// Keyboard handling for dropdown navigation
const handleDropdownKeydown = async (event: KeyboardEvent, recordId: number) => {
  if (!props.categories.length) return
  
  const currentIndex = activeOptionIndex.value[recordId] ?? 0
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      const nextIndex = Math.min(currentIndex + 1, props.categories.length - 1)
      activeOptionIndex.value[recordId] = nextIndex
      await nextTick()
      focusOption(recordId, nextIndex)
      break
      
    case 'ArrowUp':
      event.preventDefault()
      const prevIndex = Math.max(currentIndex - 1, 0)
      activeOptionIndex.value[recordId] = prevIndex
      await nextTick()
      focusOption(recordId, prevIndex)
      break
      
    case 'Enter':
    case ' ':
      event.preventDefault()
      const selectedCategory = props.categories[currentIndex]
      if (selectedCategory) {
        handleCategorySelection(recordId, selectedCategory.name)
      }
      break
      
    case 'Escape':
      event.preventDefault()
      emit('toggleInlineDropdown', recordId)
      await nextTick()
      focusTriggerButton(recordId)
      break
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

// Dropdown item keydown handler
const handleDropdownItemKeydown = (event: KeyboardEvent, recordId: number, categoryName: string) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleCategorySelection(recordId, categoryName)
  }
}

// Focus management helpers
const focusOption = (recordId: number, optionIndex: number) => {
  const option = document.querySelector(`#dropdown-menu-${recordId} [data-record-id="${recordId}"][data-index="${optionIndex}"]`) as HTMLElement
  option?.focus()
}

const focusTriggerButton = (recordId: number) => {
  const button = document.querySelector(`[aria-controls="dropdown-menu-${recordId}"]`) as HTMLElement
  button?.focus()
}

// Initialize active option when dropdown opens
const initializeActiveOption = async (recordId: number, selectedCategoryName: string) => {
  const selectedIndex = props.categories.findIndex(cat => cat.name === selectedCategoryName)
  const resolvedIndex = Math.max(0, selectedIndex)
  activeOptionIndex.value[recordId] = resolvedIndex
  
  // Wait for DOM update to ensure dropdown menu is rendered
  await nextTick()
  
  // Focus the active option in the dropdown
  try {
    const activeOption = document.querySelector(`#dropdown-menu-${recordId} [role="option"]:nth-child(${resolvedIndex + 1})`) as HTMLElement
    activeOption?.focus()
  } catch (error) {
    // Silently handle cases where the element is not found or focus fails
    console.debug('Could not focus dropdown option:', error)
  }
}
</script>

<style scoped>
/* Task table styles */
.task-table {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 20px var(--shadow-color);
  overflow: hidden;
  margin-bottom: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  background: var(--primary);
  color: white;
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

td {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

/* Loading and empty states */
.loading-cell, .empty-cell {
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
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Special task row styles */
.special-task-row {
  background: var(--bg-secondary);
  font-weight: 500;
}

.pause-task-row {
  background: rgba(255, 193, 7, 0.1);
}

.end-task-row {
  background: rgba(40, 167, 69, 0.1);
}

.special-task-cell {
  font-weight: 600;
  color: var(--text-primary);
}

/* Input styles */
.editable-cell {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  padding: 8px;
  border-radius: 6px;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.editable-cell:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--bg-primary);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.1);
}

.time-input {
  max-width: 120px;
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
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s ease;
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
  padding: 10px 12px;
  cursor: pointer;
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
  text-align: center;
  white-space: nowrap;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  margin: 0 2px;
  border-radius: 4px;
  transition: all 0.2s ease;
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
}

.special-task-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  color: white;
}

.pause-btn {
  background: var(--aero);
}

.pause-btn:hover {
  background: #1a9bd1;
  transform: translateY(-2px);
}

.end-btn {
  background: var(--emerald);
}

.end-btn:hover:not(:disabled) {
  background: #4a9960;
  transform: translateY(-2px);
}

.end-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Duration cell specific styles */
.duration-cell {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
  min-width: 80px;
}
</style>