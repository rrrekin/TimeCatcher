<template>
  <div class="add-task-form" ref="addTaskFormRef">
    <div class="add-task-fields">
      <div class="add-task-field category-field">
        <label for="add-task-category" class="sr-only">Category</label>
        <div class="custom-dropdown" :class="{ open: showFormCategoryDropdown }">
          <button
            type="button"
            class="dropdown-trigger"
            id="add-task-category"
            @click="$emit('toggleFormDropdown')"
            :aria-expanded="showFormCategoryDropdown"
            aria-controls="form-dropdown-menu"
            aria-haspopup="listbox"
          >
            <span class="dropdown-value">{{ getSelectedCategoryName() || 'Select category' }}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div
            v-if="showFormCategoryDropdown"
            ref="dropdownMenuRef"
            class="dropdown-menu"
            :class="`dropdown-position-${dropdownPosition}`"
            role="listbox"
            id="form-dropdown-menu"
            aria-labelledby="add-task-category"
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
      </div>

      <div class="add-task-field task-name-field">
        <label for="add-task-name" class="sr-only">Task name</label>
        <input
          type="text"
          id="add-task-name"
          :value="newTask.name"
          @input="$emit('updateNewTask', { ...newTask, name: ($event.target as HTMLInputElement).value })"
          @keydown.enter.prevent="onAddTaskEnter"
          class="add-task-input"
          placeholder="Enter task name..."
        />
      </div>

      <div class="add-task-field time-field">
        <label for="add-task-time" class="sr-only">Start time</label>
        <input
          type="time"
          id="add-task-time"
          step="60"
          :value="newTask.time"
          @input="$emit('updateNewTask', { ...newTask, time: ($event.target as HTMLInputElement).value })"
          @keydown.enter.prevent="onAddTaskEnter"
          :class="['add-task-input', 'time-input', { 'empty-time': !newTask.time.trim() }]"
        />
      </div>

      <div class="add-task-field actions-field">
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
      </div>
    </div>

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
import { type PropType, computed, ref, nextTick, watch } from 'vue'
import type { Category } from '@/shared/types'
import { useListboxNavigation } from '@/composables/useListboxNavigation'

interface NewTask {
  name: string
  categoryId: number | null
  time: string
}

// Props
const props = defineProps({
  newTask: {
    type: Object as PropType<NewTask>,
    required: true
  },
  categories: {
    type: Array as PropType<Category[]>,
    required: true
  },
  showFormCategoryDropdown: {
    type: Boolean,
    required: true
  },
  hasEndTaskForSelectedDate: {
    type: Boolean,
    required: true
  },
  getSelectedCategoryName: {
    type: Function as PropType<() => string>,
    required: true
  }
})

// Events
const emit = defineEmits<{
  toggleFormDropdown: []
  selectFormCategory: [category: Category]
  updateNewTask: [task: NewTask]
  addTask: []
  addPauseTask: []
  addEndTask: []
}>()

// Template refs
const addTaskFormRef = ref<HTMLElement>()
const dropdownMenuRef = ref<HTMLElement>()

// Dropdown positioning
const dropdownPosition = ref<'below' | 'above'>('below')

// Convert categories to ref for composable
const categoriesRef = computed(() => props.categories)

// Composables
const formListbox = useListboxNavigation({
  containerRef: addTaskFormRef,
  items: categoriesRef,
  onSelect: (category: Category) => {
    handleFormCategorySelection(category)
  },
  onClose: async () => {
    emit('toggleFormDropdown')
  },
  getOptionSelector: (contextId: string | number, optionIndex: number) =>
    `#form-dropdown-menu [data-option-index="${optionIndex}"]`
})

// Computed properties
const isAddTaskValid = computed(() => {
  return !!(props.newTask.name.trim() && props.newTask.categoryId)
})

// Methods
const handleFormDropdownKeydown = (event: KeyboardEvent) => {
  formListbox.handleKeydown(event, 'form')
}

const handleFormCategorySelection = (category: Category) => {
  emit('selectFormCategory', category)
}

const onAddTaskEnter = () => {
  if (isAddTaskValid.value) {
    handleAddTask()
  }
}

const handleAddTask = () => {
  if (isAddTaskValid.value) {
    emit('addTask')
  }
}

// Dynamic dropdown positioning
const calculateDropdownPosition = async () => {
  if (!addTaskFormRef.value) return

  await nextTick()

  const trigger = addTaskFormRef.value.querySelector('.dropdown-trigger') as HTMLElement
  if (!trigger) return

  const triggerRect = trigger.getBoundingClientRect()
  if (!triggerRect) return

  const viewportHeight = window.innerHeight
  const dropdownHeight = 200 // Max height from CSS
  const spaceBelow = viewportHeight - triggerRect.bottom
  const spaceAbove = triggerRect.top

  // Position above if there's not enough space below but enough space above
  dropdownPosition.value = spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight ? 'above' : 'below'
}

// Watch for dropdown visibility changes to recalculate position
watch(
  () => props.showFormCategoryDropdown,
  async isOpen => {
    if (isOpen) {
      await calculateDropdownPosition()
    }
  },
  { immediate: true }
)
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

.add-task-form {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 16px;
  flex-shrink: 0;
}

.add-task-fields {
  display: grid;
  grid-template-columns: 140px 1fr 100px auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.add-task-field {
  display: flex;
  align-items: center;
}

.add-task-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.add-task-input:focus {
  outline: none;
  border-color: var(--verdigris);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.2);
}

.add-task-input::placeholder {
  color: var(--text-muted);
}

.time-input.empty-time {
  color: var(--text-muted);
}

/* Dropdown styles */
.custom-dropdown {
  position: relative;
  width: 100%;
}

.dropdown-trigger {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.dropdown-trigger:hover {
  border-color: var(--verdigris);
}

.dropdown-trigger:focus {
  outline: none;
  border-color: var(--verdigris);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.2);
}

.dropdown-value {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-secondary);
  transition: transform 0.2s;
  pointer-events: none;
}

.custom-dropdown.open .dropdown-arrow {
  transform: translateY(-50%) rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--shadow-color);
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-position-below {
  top: 100%;
  margin-top: 2px;
}

.dropdown-position-above {
  bottom: 100%;
  margin-bottom: 2px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover,
.dropdown-item:focus {
  background: var(--bg-secondary);
  outline: none;
}

.dropdown-item.selected {
  background: rgba(87, 189, 175, 0.1);
  color: var(--verdigris);
}

/* Action button */
.action-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.add-btn {
  background: var(--verdigris);
  color: white;
  border-color: var(--verdigris);
}

.add-btn:hover:not(:disabled) {
  background: var(--emerald);
  border-color: var(--emerald);
  transform: translateY(-1px);
}

.add-btn:disabled {
  background: var(--border-color);
  color: var(--text-muted);
  border-color: var(--border-color);
  cursor: not-allowed;
  transform: none;
}

/* Special task buttons */
.special-task-buttons {
  /* Define hover colors for special buttons */
  --warning-hover: color-mix(in srgb, var(--warning) 80%, var(--text-primary) 20%);
  --success-hover: color-mix(in srgb, var(--success) 80%, var(--text-primary) 20%);

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
  max-width: 120px;
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
</style>
