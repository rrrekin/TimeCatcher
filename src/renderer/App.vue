<template>
  <div id="app">
    <DateNavigation
      :formatted-date="formattedDate"
      :date-input-value="dateInputValue"
      @go-to-previous-day="goToPreviousDay"
      @go-to-today="goToToday"
      @go-to-next-day="goToNextDay"
      @update-date="updateDateFromInput"
      @open-setup="openSetup"
    />

    <div class="layout">
      <div class="task-table-pane">
        <TaskList
          ref="taskListRef"
          :task-records="taskRecords"
          :categories="categories"
          :is-loading-tasks="isLoadingTasks"
          :display-date="displayDate"
          :has-end-task-for-selected-date="hasEndTaskForSelectedDate"
          :show-inline-dropdown="showInlineDropdown"
          :show-form-category-dropdown="showFormCategoryDropdown"
          :new-task="newTask"
          :calculate-duration="calculateDuration"
          :convert-to-time-input="convertToTimeInput"
          :get-current-time="getCurrentTime"
          :get-selected-category-name="getSelectedCategoryName"
          :is-special="isSpecial"
          @toggle-inline-dropdown="toggleInlineDropdown"
          @select-inline-category="selectInlineCategory"
          @handle-blur="handleBlur"
          @handle-enter="handleEnter"
          @replay-task="replayTask"
          @confirm-delete-task="confirmDeleteTask"
          @toggle-form-dropdown="toggleFormDropdown"
          @select-form-category="selectFormCategory"
          @update-new-task="updateNewTask"
          @add-task="addTask"
          @add-pause-task="addPauseTask"
          @add-end-task="addEndTask"
        />
      </div>

      <div class="reports-pane">
        <DailyReport
          :task-records="taskRecords"
          :date-title="dateTitle"
          :has-end-task-for-selected-date="hasEndTaskForSelectedDate"
          :target-work-hours="targetWorkHours"
          :total-time-tracked="getTotalTimeTracked()"
          :total-minutes-tracked="getTotalMinutesTracked()"
          :category-breakdown="getEnhancedCategoryBreakdown"
        />

        <!-- Application version positioned near window border -->
        <div class="app-version" v-if="appVersion">v{{ appVersion }}</div>
      </div>
    </div>

    <!-- Setup Modal -->
    <SetupModal
      :is-open="isSetupModalOpen"
      :temp-theme="tempTheme"
      :temp-target-work-hours="tempTargetWorkHours"
      :categories="categories"
      :is-loading-categories="isLoadingCategories"
      :is-adding-category="isAddingCategory"
      :is-updating-category="isUpdatingCategory"
      :is-deleting-category="isDeletingCategory"
      :is-setting-default="isSettingDefault"
      :editing-category-id="editingCategoryId"
      :editing-category-name="editingCategoryName"
      :new-category-name="newCategoryName"
      @close="closeSetupModal"
      @save="saveSettings"
      @update-temp-theme="theme => (tempTheme = theme)"
      @update-temp-target-work-hours="hours => (tempTargetWorkHours = hours)"
      @start-edit-category="startEditCategory"
      @update-editing-category-name="name => (editingCategoryName = name)"
      @save-edit-category="saveEditCategory"
      @cancel-edit-category="cancelEditCategory"
      @set-default-category="setDefaultCategoryWrapper"
      @delete-category="deleteCategoryWrapper"
      @update-new-category-name="name => (newCategoryName = name)"
      @add-category="addCategoryWrapper"
      @cancel-adding-category="cancelAddingCategory"
      @start-adding-category="startAddingCategory"
    />

    <!-- Toast notification -->
    <div v-if="showToast" class="toast-overlay">
      <div class="toast" :class="`toast-${toastType}`">
        <div class="toast-content">
          <div class="toast-icon">
            <span v-if="toastType === 'success'">✓</span>
            <span v-else-if="toastType === 'error'">!</span>
            <span v-else>i</span>
          </div>
          <div class="toast-message">{{ toastMessage }}</div>
        </div>
        <button class="toast-close" @click="hideToast" aria-label="Close notification">&times;</button>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDeleteTask">
      <div class="modal delete-modal" @click.stop>
        <div class="modal-header delete-header">
          <h3>Confirm Delete</h3>
          <button class="close-btn" @click="cancelDeleteTask" :disabled="isDeletingTask">&times;</button>
        </div>
        <div class="modal-content">
          <div class="delete-message">
            <p>Are you sure you want to delete this task?</p>
            <p>
              <strong>"{{ taskToDelete?.task_name }}"</strong>
            </p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="cancelDeleteTask" :disabled="isDeletingTask">Cancel</button>
          <button class="delete-confirm-btn" @click="confirmDeleteTaskFinal" :disabled="isDeletingTask">
            {{ isDeletingTask ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, type ComponentPublicInstance } from 'vue'
import {
  SPECIAL_TASK_CATEGORY,
  SPECIAL_TASK_TYPES,
  DURATION_VISIBLE_BY_TASK_TYPE,
  TASK_TYPE_NORMAL,
  type Category,
  type TaskRecord,
  type TaskType,
  type SpecialTaskType,
  type TaskRecordWithId
} from '../shared/types'
import { useCategories } from '@/composables/useCategories'
import { useTaskRecords } from '@/composables/useTaskRecords'
import { useSettings } from '@/composables/useSettings'
import { useDurationCalculations } from '@/composables/useDurationCalculations'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { formatDateString, toYMDLocal as toYMDLocalUtil } from '@/utils/dateUtils'
import { formatDurationMinutes, parseTimeString, getLastTaskEndTime } from '@/utils/timeUtils'
import DateNavigation from '@/components/DateNavigation.vue'
import TaskList from '@/components/TaskList.vue'
import DailyReport from '@/components/DailyReport.vue'
import SetupModal from '@/components/SetupModal.vue'

interface NewTaskForm {
  categoryId: number | null
  name: string
  time: string
}

const activeSection = ref('dashboard')
const selectedDate = ref(new Date())
const isSetupModalOpen = ref(false)

// Composables
const {
  categories,
  isLoadingCategories,
  loadCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  setDefaultCategory,
  getDefaultCategory,
  categoryExists
} = useCategories()

const {
  taskRecords,
  isLoadingTasks,
  hasEndTaskForSelectedDate,
  isSpecial,
  getCurrentTime,
  parseTimeInput,
  loadTaskRecords,
  addTaskRecord,
  addSpecialTask,
  updateTaskRecord,
  deleteTaskRecord
} = useTaskRecords(selectedDate)

const {
  currentTheme,
  tempTheme,
  targetWorkHours,
  tempTargetWorkHours,
  applyTheme,
  saveSettings: saveSettingsComposable,
  initializeTempSettings
} = useSettings()

const { sortedTaskRecords, calculateDuration, getTotalMinutesTracked, getCategoryBreakdown } =
  useDurationCalculations(taskRecords)

const { startAutoRefresh, stopAutoRefresh, restartAutoRefresh } = useAutoRefresh(selectedDate, () => {
  taskRecords.value = [...taskRecords.value] // Trigger reactivity
})

// Media query references for cleanup
let mediaQueryList: MediaQueryList | null = null
let mediaQueryHandler: ((event: MediaQueryListEvent) => void) | null = null

// Category management UI state
const newCategoryName = ref('')
const isAddingCategory = ref(false)
const editingCategoryId = ref<number | null>(null)
const editingCategoryName = ref('')

// Toast notifications
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
const showToast = ref(false)

// Task management
const showAddTaskForm = ref(false)
const newTask = ref<NewTaskForm>({
  categoryId: null,
  name: '',
  time: ''
})
// Loading states
const isDeletingCategory = ref(false)
const isUpdatingCategory = ref(false)
const isSettingDefault = ref(false)

// Delete task modal
const showDeleteModal = ref(false)
const taskToDelete = ref<TaskRecordWithId | null>(null)
const isDeletingTask = ref(false)

// Custom dropdown state
const showFormCategoryDropdown = ref(false)
const showInlineDropdown = ref<{ [key: number]: boolean }>({})
const selectedCategoryForForm = ref('')

// Application version
const appVersion = ref<string>('')

// Template refs
const categoriesListRef = ref<HTMLElement | null>(null)
const taskListRef = ref<ComponentPublicInstance<{ scrollToBottom?: () => Promise<void> }> | null>(null)

// Safe scroller helper
const safeScrollToBottom = async () => {
  await nextTick()
  try {
    const inst = taskListRef.value as any
    const fn = inst && inst.scrollToBottom
    if (typeof fn === 'function') {
      await fn.call(inst)
    }
  } catch (error) {
    console.warn('Failed to scroll to bottom:', error)
  }
}

// Helper functions

const formattedDate = computed(() => {
  return formatDateString(toYMDLocalUtil(selectedDate.value))
})

const displayDate = computed(() => {
  return formattedDate.value.split(',')[0] || formattedDate.value
})

const dateTitle = computed(() => {
  // Handle invalid dates gracefully
  if (isNaN(selectedDate.value.getTime())) {
    return 'Invalid Date'
  }
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(selectedDate.value)
})

const dateInputValue = computed({
  get: () => toYMDLocalUtil(selectedDate.value),
  set: (value: string) => {
    // Parse as UTC to avoid timezone issues
    const [year, month, day] = value.split('-').map(Number)
    selectedDate.value = new Date(year!, (month ?? 1) - 1, day!)
  }
})

const goToPreviousDay = () => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() - 1)
  selectedDate.value = newDate
}

const goToNextDay = () => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() + 1)
  selectedDate.value = newDate
}

const goToToday = () => {
  selectedDate.value = new Date()
}

// Handle date input updates from DateNavigation component
const updateDateFromInput = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  selectedDate.value = new Date(year!, (month ?? 1) - 1, day!)
}

const openSetup = async () => {
  initializeTempSettings()
  await loadCategories()
  isSetupModalOpen.value = true
}

const closeSetupModal = () => {
  isSetupModalOpen.value = false
  newCategoryName.value = ''
  isAddingCategory.value = false
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

const saveSettings = () => {
  saveSettingsComposable()
  closeSetupModal()
}

// Category management functions - wrappers with UI state management
const loadCategoriesWrapper = async () => {
  try {
    await loadCategories()
  } catch (error) {
    showToastMessage('Failed to load categories. Please try again.', 'error')
  }
}

const addCategoryWrapper = async () => {
  const name = newCategoryName.value.trim()
  if (!name) return

  try {
    const exists = await categoryExists(name)
    if (exists) {
      showToastMessage(`Category "${name}" already exists!`, 'error')
      return
    }

    await addCategory(name)
    newCategoryName.value = ''
    isAddingCategory.value = false
    showToastMessage(`Category "${name}" added successfully!`, 'success')
  } catch (error) {
    console.error('Failed to add category:', error)
    showToastMessage('Failed to add category. Please try again.', 'error')
  }
}

const deleteCategoryWrapper = async (category: Category) => {
  if (category.id == null) return

  if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
    try {
      isDeletingCategory.value = true
      await deleteCategory(category.id)
      showToastMessage(`Category "${category.name}" deleted successfully!`, 'success')
    } catch (error: any) {
      console.error('Failed to delete category:', error)
      // Show specific error message for default category deletion
      if (error?.message?.includes('Cannot delete the default category')) {
        showToastMessage('Cannot delete the default category. Please set another category as default first.', 'error')
      } else {
        showToastMessage(`Failed to delete category "${category.name}". Please try again.`, 'error')
      }
    } finally {
      isDeletingCategory.value = false
    }
  }
}

const startAddingCategory = () => {
  isAddingCategory.value = true
  newCategoryName.value = ''
  // Scroll to bottom to show the add form
  nextTick(() => {
    if (categoriesListRef.value) {
      categoriesListRef.value.scrollTop = categoriesListRef.value.scrollHeight
    }
  })
}

const cancelAddingCategory = () => {
  isAddingCategory.value = false
  newCategoryName.value = ''
}

// Category editing functions
const startEditCategory = (category: Category) => {
  if (category.id == null) return
  editingCategoryId.value = category.id
  editingCategoryName.value = category.name
}

const saveEditCategory = async (category: Category) => {
  if (category.id == null || !editingCategoryName.value.trim()) {
    cancelEditCategory()
    return
  }

  const newName = editingCategoryName.value.trim()

  // If name hasn't changed, just cancel editing
  if (newName === category.name) {
    cancelEditCategory()
    return
  }

  try {
    isUpdatingCategory.value = true
    // Check if new name already exists
    const exists = await categoryExists(newName)
    if (exists) {
      showToastMessage(`Category "${newName}" already exists!`, 'error')
      return
    }

    // Update category using composable
    await updateCategory(category.id, newName)
    editingCategoryId.value = null
    editingCategoryName.value = ''
    showToastMessage(`Category renamed to "${newName}" successfully!`, 'success')
  } catch (error) {
    console.error('Failed to update category:', error)
    showToastMessage('Failed to update category. Please try again.', 'error')
  } finally {
    isUpdatingCategory.value = false
  }
}

const cancelEditCategory = () => {
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

// Default category functions
const setDefaultCategoryWrapper = async (category: Category) => {
  if (category.id == null) return

  try {
    isSettingDefault.value = true
    await setDefaultCategory(category.id)
    showToastMessage(`"${category.name}" set as default category!`, 'success')
  } catch (error) {
    console.error('Failed to set default category:', error)
    showToastMessage('Failed to set default category. Please try again.', 'error')
  } finally {
    isSettingDefault.value = false
  }
}

// Task record management functions - wrappers with UI state management
const loadTaskRecordsWrapper = async () => {
  try {
    await loadTaskRecords()
  } catch (error) {
    showToastMessage('Failed to load task records. Please try again.', 'error')
  }
}

// Task management functions
const addTask = async () => {
  if (!newTask.value.name.trim() || newTask.value.categoryId === null) {
    showToastMessage('Please fill in all fields', 'error')
    return
  }

  try {
    const category = categories.value.find(cat => cat.id === newTask.value.categoryId)
    if (!category) {
      showToastMessage('Selected category not found', 'error')
      return
    }

    const dateString = toYMDLocalUtil(selectedDate.value)
    let timeString: string

    // Use current time if no time is specified, otherwise parse the provided time
    if (!newTask.value.time.trim()) {
      timeString = getCurrentTime()
    } else {
      try {
        timeString = parseTimeInput(newTask.value.time)
      } catch (timeError) {
        showToastMessage((timeError as Error).message, 'error')
        return
      }
    }

    const taskRecord = {
      category_name: category.name,
      task_name: newTask.value.name,
      start_time: timeString,
      date: dateString,
      task_type: TASK_TYPE_NORMAL
    }

    await addTaskRecord(taskRecord)
    showToastMessage('Task added successfully!', 'success')

    // Scroll to bottom to show the new task
    await safeScrollToBottom()

    // Reset form
    initializeNewTask()
    showAddTaskForm.value = false
  } catch (error) {
    console.error('Failed to add task:', error)
    showToastMessage('Failed to add task. Please try again.', 'error')
  }
}

// Special task functions
const addSpecialTaskWrapper = async (taskType: SpecialTaskType, taskName: string, successMessage: string) => {
  try {
    await addSpecialTask(taskType, taskName)
    showToastMessage(successMessage, 'success')

    // Scroll to bottom to show the new special task
    await safeScrollToBottom()
  } catch (error) {
    console.error(`Failed to add ${taskType} task:`, error)
    showToastMessage((error as Error).message, 'error')
  }
}

const addPauseTask = async () => {
  await addSpecialTaskWrapper('pause', '⏸ Pause', 'Pause task added!')
}

const addEndTask = async () => {
  if (hasEndTaskForSelectedDate.value) {
    showToastMessage('End task already exists for this day.', 'error')
    return
  }
  await addSpecialTaskWrapper('end', '⏹ End', 'End task added!')
}

const cancelAddTask = () => {
  initializeNewTask()
  showAddTaskForm.value = false
}

const getDefaultCategoryId = (): number | null => {
  const defaultCategory = categories.value.find(cat => cat.is_default)
  return defaultCategory?.id ?? null
}

const getCategoryIdByName = (categoryName: string): number | null => {
  const category = categories.value.find(cat => cat.name === categoryName)
  return category?.id || null
}

const getCategoryNameById = (categoryId: number): string | null => {
  const category = categories.value.find(cat => cat.id === categoryId)
  return category?.name || null
}

const initializeNewTask = () => {
  newTask.value.categoryId = getDefaultCategoryId()
  newTask.value.name = ''
  newTask.value.time = ''
}

// Watch for date changes to reload task records and manage auto-refresh
watch(
  selectedDate,
  async () => {
    // Stop any existing auto-refresh first
    stopAutoRefresh()

    // Await loading the new task records
    await loadTaskRecordsWrapper()

    // Scroll to bottom after loading new tasks
    await safeScrollToBottom()

    // Start auto-refresh if we're viewing today
    const todayString = toYMDLocalUtil(new Date())
    const selectedDateString = toYMDLocalUtil(selectedDate.value)
    if (selectedDateString === todayString) {
      startAutoRefresh()
    }
  },
  { immediate: false }
)

onMounted(async () => {
  // Listen for system theme changes when in auto mode
  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQueryHandler = () => {
    if (currentTheme.value === 'auto') {
      applyTheme('auto')
    }
  }
  try {
    mediaQueryList.addEventListener('change', mediaQueryHandler)
  } catch {
    mediaQueryList.addListener?.(mediaQueryHandler as any)
  }

  // Wait a moment for database initialization to complete, then load categories
  if (import.meta.env.DEV) {
    console.log('App mounted, waiting for database initialization...')
  }
  await new Promise(resolve => setTimeout(resolve, 1000))

  if (import.meta.env.DEV) {
    console.log('Loading categories and initializing task form...')
  }
  await loadCategoriesWrapper()
  initializeNewTask()

  // Load task records for today
  if (import.meta.env.DEV) {
    console.log('Loading task records...')
  }
  await loadTaskRecordsWrapper()
  if (import.meta.env.DEV) {
    console.log('App initialization complete')
  }

  // Start auto-refresh for today's tasks
  const todayString = toYMDLocalUtil(new Date())
  const selectedDateString = toYMDLocalUtil(selectedDate.value)
  if (selectedDateString === todayString) {
    startAutoRefresh()
  }

  // Fetch app version
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getVersion) {
      appVersion.value = await (window as any).electronAPI.getVersion()
    }
  } catch (error) {
    console.warn('Failed to get app version:', error)
  }

  // Add click outside listener for custom dropdown
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  // Stop auto-refresh
  stopAutoRefresh()

  // Clean up click outside event listener
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }

  // Clean up media query listener with fallback for older browsers
  if (mediaQueryList && mediaQueryHandler) {
    try {
      mediaQueryList.removeEventListener('change', mediaQueryHandler)
    } catch {
      mediaQueryList.removeListener?.(mediaQueryHandler as any)
    }
  }
})

// Toast notification functions
const showToastMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true

  // Auto-hide after 5 seconds
  setTimeout(() => {
    showToast.value = false
  }, 5000)
}

const hideToast = () => {
  showToast.value = false
}

// Task action functions
const replayTask = async (record: TaskRecordWithId) => {
  try {
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }

    // Prevent replaying special tasks
    if (record.task_type !== TASK_TYPE_NORMAL || record.category_name === SPECIAL_TASK_CATEGORY) {
      showToastMessage('Special tasks cannot be replayed.', 'error')
      return
    }

    const now = new Date()
    const dateString = toYMDLocalUtil(now) // Use current date
    const timeString = getCurrentTime()

    const taskRecord = {
      category_name: record.category_name,
      task_name: record.task_name,
      start_time: timeString,
      date: dateString,
      task_type: TASK_TYPE_NORMAL
    }

    await addTaskRecord(taskRecord)

    // Check if the user is viewing today's date
    const todayString = toYMDLocalUtil(now)
    const selectedDateString = toYMDLocalUtil(selectedDate.value)

    if (selectedDateString !== todayString) {
      // Automatically switch to today to show the replayed task
      selectedDate.value = now
      showToastMessage(`Task "${record.task_name}" replayed for today. Switched to today's view.`, 'success')
    } else {
      // No need to reload since addTaskRecord automatically updates the list
      showToastMessage(`Task "${record.task_name}" replayed successfully!`, 'success')

      // Scroll to bottom to show the replayed task
      await safeScrollToBottom()
    }
  } catch (error) {
    console.error('Failed to replay task:', error)
    showToastMessage('Failed to replay task. Please try again.', 'error')
  }
}

// updateField function removed - unnecessary overhead since Vue handles input display
// and actual updates happen on blur/enter events via handleBlur

// Common task field update logic extracted from handleBlur and handleCategoryChange
const updateTaskField = async (
  recordId: number | undefined,
  updates: Record<string, any>,
  successMessage: string = 'Task updated successfully!'
) => {
  if (recordId === undefined) {
    console.error('Record ID is undefined')
    return
  }

  try {
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }

    if (!window.electronAPI.updateTaskRecord) {
      showToastMessage(
        'Update function not available. Please restart the application to enable inline editing.',
        'error'
      )
      await loadTaskRecordsWrapper()
      return
    }

    // Ensure recordId is a number
    const numericRecordId = Number(recordId)
    if (isNaN(numericRecordId)) {
      console.error('Invalid record ID:', recordId)
      showToastMessage('Invalid record ID. Please refresh the page.', 'error')
      await loadTaskRecordsWrapper()
      return
    }

    // Get current record to compare values
    const currentRecord = taskRecords.value.find(r => r.id === numericRecordId)
    if (!currentRecord) {
      console.error('Record not found:', numericRecordId)
      await loadTaskRecordsWrapper()
      return
    }

    // Check if any values have actually changed
    let hasChanges = false
    for (const [field, newValue] of Object.entries(updates)) {
      const currentValue = currentRecord[field as keyof TaskRecord]
      if (currentValue !== newValue) {
        hasChanges = true
        break
      }
    }

    // Skip update if no changes
    if (!hasChanges) {
      return
    }

    await updateTaskRecord(numericRecordId, updates)
    showToastMessage(successMessage, 'success')
  } catch (error) {
    console.error('Failed to update task:', error)
    showToastMessage(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    await loadTaskRecordsWrapper() // Restore previous values on error
  }
}

const handleBlur = async (recordId: number | undefined, field: string, event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    console.error('Event target is not an HTMLInputElement')
    return
  }

  const value = target.value
  if (!value.trim()) {
    // If field is empty, reload to restore previous value
    await loadTaskRecordsWrapper()
    return
  }

  // Process the field value based on field type
  let processedValue = value
  if (field === 'task_name') {
    // Trim whitespace from task name to avoid leading/trailing spaces
    processedValue = value.trim()
  } else if (field === 'start_time') {
    try {
      // HTML time input provides HH:MM format, validate and normalize
      if (!value || value.length === 0) {
        showToastMessage('Time cannot be empty', 'error')
        await loadTaskRecordsWrapper()
        return
      }

      // Use parseTimeInput for consistent validation and formatting
      processedValue = parseTimeInput(value)
    } catch (timeError) {
      showToastMessage((timeError as Error).message, 'error')
      await loadTaskRecordsWrapper() // Restore previous value on invalid time
      return
    }
  }

  const updates: Record<string, any> = {}
  updates[field] = processedValue

  await updateTaskField(recordId, updates)
}

const handleEnter = async (recordId: number | undefined, field: string, event: Event) => {
  await handleBlur(recordId, field, event)
}

const handleCategoryChange = async (recordId: number | undefined, event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    console.error('Event target is not an HTMLSelectElement')
    return
  }

  const categoryName = target.value
  if (!categoryName) {
    console.error('Invalid category name:', target.value)
    showToastMessage('Invalid category selected. Please refresh the page.', 'error')
    await loadTaskRecordsWrapper()
    return
  }

  await updateTaskField(recordId, { category_name: categoryName }, 'Category updated successfully!')
}

const convertToTimeInput = (timeString: string): string => {
  // Convert HH:MM or HH:MM:SS format to HTML time input value
  if (!timeString) return ''

  const parts = timeString.split(':')

  // Validate and normalize the parts
  if (parts.length >= 2) {
    const hours = parseInt(parts[0] || '0', 10)
    const minutes = parseInt(parts[1] || '0', 10)

    // Validate ranges
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      // Return HH:MM format for HTML time input (no seconds needed)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
  }

  return ''
}

// Delete task functions
const confirmDeleteTask = (record: TaskRecordWithId) => {
  taskToDelete.value = record
  showDeleteModal.value = true
}

const cancelDeleteTask = () => {
  taskToDelete.value = null
  showDeleteModal.value = false
  isDeletingTask.value = false
}

const confirmDeleteTaskFinal = async () => {
  if (taskToDelete.value?.id == null) {
    console.error('No task to delete')
    return
  }

  try {
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }

    if (!window.electronAPI.deleteTaskRecord) {
      showToastMessage('Delete function not available. Please restart the application.', 'error')
      return
    }

    isDeletingTask.value = true
    await deleteTaskRecord(taskToDelete.value.id)
    showToastMessage(`Task "${taskToDelete.value.task_name}" deleted successfully!`, 'success')
    cancelDeleteTask()
  } catch (error) {
    console.error('Failed to delete task:', error)
    showToastMessage('Failed to delete task. Please try again.', 'error')
  } finally {
    isDeletingTask.value = false
  }
}

// Custom dropdown functions
const toggleFormDropdown = () => {
  showFormCategoryDropdown.value = !showFormCategoryDropdown.value
}

const selectFormCategory = (category: Category) => {
  newTask.value.categoryId = category.id ?? null
  showFormCategoryDropdown.value = false
}

const updateNewTask = (updatedTask: NewTaskForm) => {
  newTask.value = updatedTask
}

const getSelectedCategoryName = (): string => {
  const category = categories.value.find(cat => cat.id === newTask.value.categoryId)
  return category?.name || ''
}

// Inline dropdown functions for task table
const toggleInlineDropdown = (recordId: number | undefined) => {
  if (recordId === undefined) return

  // Close all other dropdowns first
  Object.keys(showInlineDropdown.value).forEach(key => {
    const id = Number(key)
    if (id !== recordId) {
      showInlineDropdown.value[id] = false
    }
  })

  // Toggle the current dropdown
  showInlineDropdown.value[recordId] = !showInlineDropdown.value[recordId]
}

const selectInlineCategory = async (recordId: number | undefined, categoryName: string) => {
  if (recordId === undefined) return

  // Close the dropdown
  showInlineDropdown.value[recordId] = false

  // Update the category
  await updateTaskField(recordId, { category_name: categoryName }, 'Category updated successfully!')
}

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.custom-dropdown')) {
    showFormCategoryDropdown.value = false
    // Close all inline dropdowns
    Object.keys(showInlineDropdown.value).forEach(key => {
      showInlineDropdown.value[Number(key)] = false
    })
  }
}

// (auto-refresh handled by useAutoRefresh composable)

// Daily report functions
const getTotalTimeTracked = (): string => {
  return formatDurationMinutes(getTotalMinutesTracked())
}

// Helper function to parse duration strings back to minutes
const parseDurationToMinutes = (durationStr: string): number => {
  let totalMinutes = 0

  // Match hours (e.g., "1h", "2h")
  const hoursMatch = durationStr.match(/(\d+)h/)
  if (hoursMatch && hoursMatch[1]) {
    totalMinutes += parseInt(hoursMatch[1]) * 60
  }

  // Match minutes (e.g., "30m", "45m")
  const minutesMatch = durationStr.match(/(\d+)m/)
  if (minutesMatch && minutesMatch[1]) {
    totalMinutes += parseInt(minutesMatch[1])
  }

  return totalMinutes
}

const getEnhancedCategoryBreakdown = computed(() => {
  if (taskRecords.value.length === 0) return []

  const categoryMap = new Map()

  // Iterate over all task records to respect special-task boundaries
  for (let i = 0; i < taskRecords.value.length; i++) {
    const record = taskRecords.value[i]
    if (!record || record.task_type !== TASK_TYPE_NORMAL) continue

    if (!categoryMap.has(record.category_name)) {
      categoryMap.set(record.category_name, {
        tasks: new Map<string, any>()
      })
    }

    const category = categoryMap.get(record.category_name)

    // Track individual task occurrences
    if (!category.tasks.has(record.task_name)) {
      category.tasks.set(record.task_name, {
        name: record.task_name,
        count: 0,
        totalMinutes: 0,
        firstOccurrence: new Date(record.date + 'T' + record.start_time).getTime()
      })
    }

    const task = category.tasks.get(record.task_name)
    task.count++

    // Calculate duration using all records as boundaries
    const currentTime = parseTimeString(record.start_time)
    if (currentTime !== null) {
      const nextRecord = i < taskRecords.value.length - 1 ? taskRecords.value[i + 1] : null

      let durationMinutes = 0
      if (nextRecord) {
        const nextTime = parseTimeString(nextRecord.start_time)
        if (nextTime !== null && nextTime > currentTime) {
          durationMinutes = nextTime - currentTime
        }
      } else {
        const endTime = getLastTaskEndTime(record.date, currentTime)
        durationMinutes = Math.max(0, endTime - currentTime)
      }

      task.totalMinutes += Math.floor(durationMinutes)
    }
  }

  // Use the composable's category breakdown for category-level totals
  const baseCategoryBreakdown = getCategoryBreakdown()

  return baseCategoryBreakdown.map(category => {
    const categoryData = categoryMap.get(category.categoryName)
    return {
      ...category,
      name: category.categoryName,
      totalTime: formatDurationMinutes(category.minutes),
      taskCount: categoryData
        ? Array.from(categoryData.tasks.values()).reduce((sum: number, task: any) => sum + (task.count || 0), 0)
        : 0,
      taskSummaries: categoryData
        ? Array.from(categoryData.tasks.values())
            .sort((a: any, b: any) => a.firstOccurrence - b.firstOccurrence)
            .map((task: any) => ({
              ...task,
              totalTime: formatDurationMinutes(task.totalMinutes)
            }))
        : []
    }
  })
})

const getUniqueCategoriesCount = (): number => {
  const standardRecords = taskRecords.value.filter(record => record.task_type === TASK_TYPE_NORMAL)
  const uniqueCategories = new Set(standardRecords.map(record => record.category_name))
  return uniqueCategories.size
}

const getSortedTaskRecords = () => {
  return taskRecords.value
    .filter(record => record.start_time && record.start_time.trim() !== '')
    .sort((a, b) => {
      const timeA = parseTimeString(a.start_time) || 0
      const timeB = parseTimeString(b.start_time) || 0
      return timeA - timeB
    })
}

const formatTime12Hour = (timeString: string): string => {
  if (!timeString) return '12:00 AM'

  const parts = timeString.split(':')
  if (parts.length < 2) return '12:00 AM'

  const hours = parseInt(parts[0]!, 10)
  const minutes = parts[1]!.padStart(2, '0')

  if (isNaN(hours)) return '12:00 AM'

  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const period = hours >= 12 ? 'PM' : 'AM'

  return `${hour12}:${minutes} ${period}`
}
</script>

<style>
:root {
  --verdigris: #57bdaf;
  --mantis: #59c964;
  --asparagus: #69966f;
  --emerald: #56b372;
  --aero: #1fbff0;

  --primary: var(--verdigris);
  --secondary: var(--emerald);
  --accent: var(--aero);
  --success: var(--mantis);
  --neutral: var(--asparagus);
  --error: var(--asparagus);
  --warning: var(--aero);

  --bg-primary: #ffffff;
  --bg-secondary: #f8fffe;
  --text-primary: #2d4a3d;
  --text-secondary: #4a6b56;
  --text-muted: #7a9184;
  --border-color: #e0ede8;
  --shadow-color: rgba(87, 189, 175, 0.1);
  --focus-shadow: rgba(87, 189, 175, 0.2);
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-secondary);
}

#app {
  height: 100vh;
}
</style>

<style scoped>
* {
  box-sizing: border-box;
}

.layout {
  display: flex;
  height: calc(100vh - 44px);
}

.task-table-pane {
  width: 60%;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  box-shadow: 1px 0 3px var(--shadow-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

/* Auto-hide scrollbar styles for task table pane */
.task-table-pane::-webkit-scrollbar {
  width: 6px;
}

.task-table-pane::-webkit-scrollbar-track {
  background: transparent;
}

.task-table-pane::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}

.task-table-pane:hover::-webkit-scrollbar-thumb {
  background: var(--border-color);
}

.reports-pane {
  width: 40%;
  padding: 1rem;
  overflow-y: auto;
  background: var(--bg-secondary);
}

/* Toast Notification Styles */
.toast-overlay {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  pointer-events: none;
}

.toast {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-color);
  border: 1px solid var(--border-color);
  min-width: 300px;
  max-width: 450px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  pointer-events: all;
  animation: toast-slide-in 0.3s ease-out;
  transform: translateX(0);
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.toast-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-message {
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.toast-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.toast-success {
  border-left: 4px solid var(--success);
}

.toast-success .toast-icon {
  background: var(--success);
  color: white;
}

.toast-error {
  border-left: 4px solid var(--error);
}

.toast-error .toast-icon {
  background: var(--error);
  color: white;
}

.toast-info {
  border-left: 4px solid var(--accent);
}

.toast-info .toast-icon {
  background: var(--accent);
  color: white;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px var(--shadow-color);
  width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background var(--transition-fast);
}

.close-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-content {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.cancel-btn,
.save-btn {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
}

.cancel-btn {
  background: var(--bg-primary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.cancel-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn {
  background: var(--primary);
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: var(--secondary);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Delete Modal Styles */
.delete-modal {
  width: 350px;
  max-width: 90vw;
}

.delete-header {
  background: linear-gradient(135deg, var(--mantis) 0%, var(--emerald) 100%);
}

.delete-message {
  text-align: center;
  padding: 0.75rem 0;
}

.delete-message p {
  color: var(--text-primary);
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.delete-message p:first-child {
  margin-bottom: 1rem;
}

.warning-text {
  color: var(--mantis);
  font-size: 0.8rem;
  font-style: italic;
  margin-bottom: 0;
}

.delete-confirm-btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
  background: var(--mantis);
  color: white;
}

.delete-confirm-btn:hover:not(:disabled) {
  background: var(--emerald);
}

.delete-confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* App Version Styles */
.app-version {
  position: fixed;
  bottom: 16px;
  right: 16px;
  font-size: 10px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: var(--text-muted);
  opacity: 0.3;
  font-weight: 400;
  pointer-events: none;
  user-select: none;
  z-index: 1;
}
</style>
