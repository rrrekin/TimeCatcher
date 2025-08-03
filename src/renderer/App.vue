<template>
  <div id="app">
    <nav class="time-navigation">
      <div class="nav-controls">
        <button class="nav-btn" @click="goToPreviousDay" title="Previous Day">
          <span class="nav-arrow">‹</span>
        </button>
        
        <button class="today-btn" @click="goToToday">
          Today
        </button>
        
        <button class="nav-btn" @click="goToNextDay" title="Next Day">
          <span class="nav-arrow">›</span>
        </button>
        
        <div class="date-display">
          <label class="date-label">{{ formattedDate }}</label>
          <input 
            type="date" 
            v-model="dateInputValue" 
            class="date-picker"
          />
        </div>
      </div>
      
      <button class="setup-btn" @click="openSetup" title="Open Settings">
        <span class="setup-icon">⚙️</span>
        Setup
      </button>
    </nav>
    
    <div class="layout">
      <div class="task-table-pane">
        <div class="task-table-header">
          <h3>Tasks</h3>
          <button class="add-task-btn" @click="showAddTaskForm = !showAddTaskForm">+ Add Task</button>
        </div>
        
        <!-- Add Task Form -->
        <div v-if="showAddTaskForm" class="add-task-form">
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select v-model="newTask.categoryId" class="form-select">
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Task</label>
              <input v-model="newTask.name" class="form-input" placeholder="Enter task name" />
            </div>
          </div>
          <div class="form-actions">
            <button class="form-btn form-btn-primary" @click="addTask">Add Task</button>
            <button class="form-btn form-btn-secondary" @click="cancelAddTask">Cancel</button>
          </div>
        </div>
        
        <div class="task-table">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Task</th>
                <th>Start time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoadingTasks">
                <td colspan="4" class="loading-cell">
                  <div class="loading-indicator">
                    <span class="loading-spinner"></span>
                    Loading tasks...
                  </div>
                </td>
              </tr>
              <tr v-else-if="taskRecords.length === 0">
                <td colspan="4" class="empty-cell">
                  No tasks recorded for {{ formattedDate.split(',')[0] }}
                </td>
              </tr>
              <tr v-else v-for="record in taskRecords" :key="record.id">
                <td>
                  <select 
                    :value="record.category_name" 
                    @change="handleCategoryChange(record.id, $event)"
                    class="editable-cell editable-select"
                  >
                    <option v-for="category in categories" :key="category.name" :value="category.name">
                      {{ category.name }}
                    </option>
                  </select>
                </td>
                <td>
                  <input 
                    type="text" 
                    :value="record.task_name"
                    @blur="handleBlur(record.id, 'task_name', $event)"
                    @keydown.enter="handleEnter(record.id, 'task_name', $event)"
                    class="editable-cell editable-input"
                    placeholder="Task name"
                  />
                </td>
                <td class="time-cell">
                  <input
                    type="time" 
                    step="1"
                    :value="convertToTimeInput(record.start_time)"
                    @blur="handleBlur(record.id, 'start_time', $event)"
                    @keydown.enter="handleEnter(record.id, 'start_time', $event)"
                    class="editable-cell editable-input time-input"
                  />
                </td>
                <td>
                  <button class="action-btn replay-btn" title="Replay task" @click="replayTask(record)">▶︎</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <main class="main-content">
        <div v-if="activeSection === 'dashboard'" class="section">
          <h2>Dashboard</h2>
          <p>Overview of your productivity metrics and recent activity.</p>
          <div class="placeholder-content">
            <div class="card">Today's Progress</div>
            <div class="card">Recent Tasks</div>
            <div class="card">Time Summary</div>
          </div>
        </div>
        
        <div v-if="activeSection === 'tracking'" class="section">
          <h2>Time Tracking</h2>
          <p>Start and stop time tracking for your tasks.</p>
          <div class="placeholder-content">
            <div class="card">Active Timer</div>
            <div class="card">Quick Start Tasks</div>
            <div class="card">Today's Sessions</div>
          </div>
        </div>
        
        <div v-if="activeSection === 'projects'" class="section">
          <h2>Projects</h2>
          <p>Manage your projects and associated tasks.</p>
          <div class="placeholder-content">
            <div class="card">Active Projects</div>
            <div class="card">Project Statistics</div>
            <div class="card">Create New Project</div>
          </div>
        </div>
        
        <div v-if="activeSection === 'reports'" class="section">
          <h2>Reports</h2>
          <p>View detailed reports and analytics of your time usage.</p>
          <div class="placeholder-content">
            <div class="card">Weekly Report</div>
            <div class="card">Project Breakdown</div>
            <div class="card">Export Data</div>
          </div>
        </div>
        
        <div v-if="activeSection === 'settings'" class="section">
          <h2>Settings</h2>
          <p>Configure your TimeCatcher preferences.</p>
          <div class="placeholder-content">
            <div class="card">General Settings</div>
            <div class="card">Notifications</div>
            <div class="card">Data Export</div>
          </div>
        </div>
      </main>
    </div>

    <!-- Setup Modal -->
    <div v-if="isSetupModalOpen" class="modal-overlay" @click="closeSetupModal">
      <div class="modal" @click.stop role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h3 id="modal-title">Settings</h3>
          <button class="close-btn" @click="closeSetupModal" :disabled="isAddingCategory" aria-label="Close settings modal">×</button>
        </div>
        
        <div class="modal-content">
          <div class="setting-group">
            <h4>Theme</h4>
            <div class="theme-buttons">
              <button 
                class="theme-btn" 
                :class="{ active: tempTheme === 'light' }"
                @click="tempTheme = 'light'"
              >
                Light
              </button>
              <button 
                class="theme-btn" 
                :class="{ active: tempTheme === 'dark' }"
                @click="tempTheme = 'dark'"
              >
                Dark
              </button>
              <button 
                class="theme-btn" 
                :class="{ active: tempTheme === 'auto' }"
                @click="tempTheme = 'auto'"
              >
                Auto
              </button>
            </div>
          </div>

          <div class="setting-group">
            <h4>Task Categories</h4>
            <div class="categories-container">
              <div v-if="isLoadingCategories" class="loading-indicator">
                <span class="loading-spinner"></span>
                Loading categories...
              </div>
              <div class="categories-list" v-else ref="categoriesListRef">
                <div 
                  v-for="category in categories" 
                  :key="category.id"
                  class="category-item"
                  @dblclick="startEditCategory(category)"
                  title="Double-click to edit"
                  :class="{ 'category-updating': isUpdatingCategory && editingCategoryId === category.id }"
                >
                  <input 
                    v-if="editingCategoryId === category.id"
                    v-model="editingCategoryName"
                    @keyup.enter="saveEditCategory(category)"
                    @keyup.escape="cancelEditCategory"
                    @blur="saveEditCategory(category)"
                    class="category-input"
                    autofocus
                  />
                  <span 
                    v-else
                    class="category-name"
                  >
                    {{ category.name }}
                  </span>
                  <div class="category-actions">
                    <button 
                      class="default-category-btn" 
                      @click="setDefaultCategory(category)"
                      @dblclick.stop
                      :class="{ active: category.is_default }"
                      title="Set as default category"
                      :disabled="isAddingCategory || editingCategoryId === category.id || isSettingDefault"
                    >
                      ✓
                    </button>
                    <button 
                      class="delete-category-btn" 
                      @click="deleteCategory(category)"
                      @dblclick.stop
                      title="Delete category"
                      :disabled="isAddingCategory || editingCategoryId === category.id || isDeletingCategory"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div v-if="isAddingCategory" class="add-category-form">
                  <input 
                    v-model="newCategoryName"
                    @keyup.enter="addCategory"
                    @keyup.escape="cancelAddingCategory"
                    placeholder="Category name"
                    class="category-input"
                    autofocus
                  />
                  <div class="add-category-actions">
                    <button class="add-confirm-btn" @click="addCategory">Add</button>
                    <button class="add-cancel-btn" @click="cancelAddingCategory">Cancel</button>
                  </div>
                </div>
              </div>
              
              <button 
                v-if="!isAddingCategory"
                class="add-category-btn" 
                @click="startAddingCategory"
              >
                + Add Category
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeSetupModal" :disabled="isAddingCategory">
            Cancel
          </button>
          <button class="save-btn" @click="saveSettings" :disabled="isAddingCategory">
            Save
          </button>
        </div>
      </div>
    </div>
    
    <!-- Toast Notification -->
    <div v-if="showToast" class="toast-overlay">
      <div class="toast" :class="`toast-${toastType}`">
        <div class="toast-content">
          <span class="toast-icon">
            <span v-if="toastType === 'success'">✓</span>
            <span v-else-if="toastType === 'error'">✕</span>
            <span v-else>ℹ</span>
          </span>
          <span class="toast-message">{{ toastMessage }}</span>
        </div>
        <button class="toast-close" @click="hideToast">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import type { Category, TaskRecord } from '../shared/types'

const activeSection = ref('dashboard')
const selectedDate = ref(new Date())
const isSetupModalOpen = ref(false)
const currentTheme = ref<'light' | 'dark' | 'auto'>('auto')
const tempTheme = ref<'light' | 'dark' | 'auto'>('auto')

// Category management
const categories = ref<Category[]>([])
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
const newTask = ref({
  categoryId: null as number | null,
  name: ''
})
const taskRecords = ref<TaskRecord[]>([])
const isLoadingTasks = ref(false)

// Loading states
const isLoadingCategories = ref(false)
const isDeletingCategory = ref(false)
const isUpdatingCategory = ref(false)
const isSettingDefault = ref(false)

// Template refs
const categoriesListRef = ref<HTMLElement | null>(null)

const formattedDate = computed(() => {
  return selectedDate.value.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const dateInputValue = computed({
  get: () => selectedDate.value.toISOString().split('T')[0],
  set: (value: string) => {
    // Parse as UTC to avoid timezone issues
    const [year, month, day] = value.split('-').map(Number)
    selectedDate.value = new Date(year, month - 1, day)
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

const openSetup = async () => {
  tempTheme.value = currentTheme.value
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
  currentTheme.value = tempTheme.value
  applyTheme(currentTheme.value)
  localStorage.setItem('theme', currentTheme.value)
  isSetupModalOpen.value = false
  newCategoryName.value = ''
  isAddingCategory.value = false
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

// Category management functions
const loadCategories = async () => {
  isLoadingCategories.value = true
  try {
    console.log('Loading categories from frontend...')
    if (!window.electronAPI) {
      console.error('electronAPI not available')
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }
    const loadedCategories = await window.electronAPI.getCategories()
    console.log('Categories loaded:', loadedCategories)
    categories.value = loadedCategories
  } catch (error) {
    console.error('Failed to load categories:', error)
    showToastMessage('Failed to load categories. Please try again.', 'error')
  } finally {
    isLoadingCategories.value = false
  }
}

const addCategory = async () => {
  const name = newCategoryName.value.trim()
  if (!name) return

  try {
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }
    
    const exists = await window.electronAPI.categoryExists(name)
    if (exists) {
      showToastMessage(`Category "${name}" already exists!`, 'error')
      return
    }

    await window.electronAPI.addCategory(name)
    await loadCategories()
    newCategoryName.value = ''
    isAddingCategory.value = false
    showToastMessage(`Category "${name}" added successfully!`, 'success')
  } catch (error) {
    console.error('Failed to add category:', error)
    showToastMessage('Failed to add category. Please try again.', 'error')
  }
}

const deleteCategory = async (category: Category) => {
  if (!category.id) return
  
  if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
    try {
      if (!window.electronAPI) {
        showToastMessage('API not available. Please restart the application.', 'error')
        return
      }
      
      isDeletingCategory.value = true
      await window.electronAPI.deleteCategory(category.id)
      await loadCategories()
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
  if (!category.id) return
  editingCategoryId.value = category.id
  editingCategoryName.value = category.name
}

const saveEditCategory = async (category: Category) => {
  if (!category.id || !editingCategoryName.value.trim()) {
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
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }
    
    isUpdatingCategory.value = true
    // Check if new name already exists
    const exists = await window.electronAPI.categoryExists(newName)
    if (exists) {
      showToastMessage(`Category "${newName}" already exists!`, 'error')
      return
    }

    // Update category using database service
    await window.electronAPI.updateCategory(category.id, newName)
    await loadCategories()
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
const setDefaultCategory = async (category: Category) => {
  if (!category.id) return
  
  try {
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }
    
    isSettingDefault.value = true
    await window.electronAPI.setDefaultCategory(category.id)
    await loadCategories()
    showToastMessage(`"${category.name}" set as default category!`, 'success')
  } catch (error) {
    console.error('Failed to set default category:', error)
    showToastMessage('Failed to set default category. Please try again.', 'error')
  } finally {
    isSettingDefault.value = false
  }
}

const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
  const root = document.documentElement
  
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme = prefersDark ? 'dark' : 'light'
  }
  
  if (theme === 'dark') {
    root.style.setProperty('--bg-primary', '#1a1f2e')
    root.style.setProperty('--bg-secondary', '#232937')
    root.style.setProperty('--text-primary', '#e8f0ed')
    root.style.setProperty('--text-secondary', '#b8c5bf')
    root.style.setProperty('--text-muted', '#8a9690')
    root.style.setProperty('--border-color', '#3a4249')
    root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)')
  } else {
    root.style.setProperty('--bg-primary', '#ffffff')
    root.style.setProperty('--bg-secondary', '#f8fffe')
    root.style.setProperty('--text-primary', '#2d4a3d')
    root.style.setProperty('--text-secondary', '#4a6b56')
    root.style.setProperty('--text-muted', '#7a9184')
    root.style.setProperty('--border-color', '#e0ede8')
    root.style.setProperty('--shadow-color', 'rgba(87, 189, 175, 0.1)')
  }
}

// Task record management functions
const loadTaskRecords = async () => {
  isLoadingTasks.value = true
  try {
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }
    const dateString = selectedDate.value.toISOString().split('T')[0]
    taskRecords.value = await window.electronAPI.getTaskRecordsByDate(dateString)
  } catch (error) {
    console.error('Failed to load task records:', error)
    showToastMessage('Failed to load task records. Please try again.', 'error')
  } finally {
    isLoadingTasks.value = false
  }
}

// Task management functions
const addTask = async () => {
  if (!newTask.value.name.trim() || !newTask.value.categoryId) {
    showToastMessage('Please fill in all fields', 'error')
    return
  }

  try {
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }

    const category = categories.value.find(cat => cat.id === newTask.value.categoryId)
    if (!category) {
      showToastMessage('Selected category not found', 'error')
      return
    }

    const dateString = selectedDate.value.toISOString().split('T')[0]
    const now = new Date()
    const timeString = now.toTimeString().split(' ')[0] // HH:MM:SS format

    const taskRecord = {
      category_name: category.name,
      task_name: newTask.value.name,
      start_time: timeString,
      date: dateString
    }

    await window.electronAPI.addTaskRecord(taskRecord)
    await loadTaskRecords()
    showToastMessage('Task added successfully!', 'success')

    // Reset form
    newTask.value = {
      categoryId: getDefaultCategoryId(),
      name: ''
    }
    showAddTaskForm.value = false
  } catch (error) {
    console.error('Failed to add task:', error)
    showToastMessage('Failed to add task. Please try again.', 'error')
  }
}

const cancelAddTask = () => {
  newTask.value = {
    categoryId: getDefaultCategoryId(),
    name: ''
  }
  showAddTaskForm.value = false
}

const getDefaultCategoryId = (): number | null => {
  const defaultCategory = categories.value.find(cat => cat.is_default)
  return defaultCategory?.id || null
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
}

const formatTime = (timeString: string): string => {
  // Input validation
  if (!timeString) {
    return '12:00:00 AM'
  }
  
  // Check if timeString has exactly two colons
  const colonCount = (timeString.match(/:/g) || []).length
  if (colonCount !== 2) {
    return '12:00:00 AM'
  }
  
  const [hours, minutes, seconds] = timeString.split(':')
  
  // Validate hours, minutes, and seconds are numbers within valid ranges
  const hour24 = parseInt(hours, 10)
  const minuteNum = parseInt(minutes, 10)
  const secondNum = parseInt(seconds, 10)
  
  if (isNaN(hour24) || isNaN(minuteNum) || isNaN(secondNum) ||
      hour24 < 0 || hour24 > 23 ||
      minuteNum < 0 || minuteNum > 59 ||
      secondNum < 0 || secondNum > 59) {
    return '12:00:00 AM'
  }
  
  // Format to 12-hour time
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  const period = hour24 >= 12 ? 'PM' : 'AM'
  
  // Ensure two-digit formatting for minutes and seconds
  const formattedMinutes = minutes.padStart(2, '0')
  const formattedSeconds = seconds.padStart(2, '0')
  
  return `${hour12}:${formattedMinutes}:${formattedSeconds} ${period}`
}

// Watch for date changes to reload task records
watch(selectedDate, () => {
  loadTaskRecords()
}, { immediate: false })

onMounted(async () => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null
  if (savedTheme) {
    currentTheme.value = savedTheme
  }
  applyTheme(currentTheme.value)
  
  // Listen for system theme changes when in auto mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme.value === 'auto') {
      applyTheme('auto')
    }
  })
  
  // Wait a moment for database initialization to complete, then load categories
  console.log('App mounted, waiting for database initialization...')
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  console.log('Loading categories and initializing task form...')
  await loadCategories()
  initializeNewTask()
  
  // Load task records for today
  console.log('Loading task records...')
  await loadTaskRecords()
  console.log('App initialization complete')
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
const replayTask = async (record: TaskRecord) => {
  try {
    if (!window.electronAPI) {
      showToastMessage('API not available. Please restart the application.', 'error')
      return
    }

    const dateString = selectedDate.value.toISOString().split('T')[0]
    const now = new Date()
    const timeString = now.toTimeString().split(' ')[0] // HH:MM:SS format

    const taskRecord = {
      category_name: record.category_name,
      task_name: record.task_name,
      start_time: timeString,
      date: dateString
    }

    await window.electronAPI.addTaskRecord(taskRecord)
    await loadTaskRecords()
    showToastMessage(`Task "${record.task_name}" replayed successfully!`, 'success')
  } catch (error) {
    console.error('Failed to replay task:', error)
    showToastMessage('Failed to replay task. Please try again.', 'error')
  }
}

// updateField function removed - unnecessary overhead since Vue handles input display
// and actual updates happen on blur/enter events via handleBlur

// Common task field update logic extracted from handleBlur and handleCategoryChange
const updateTaskField = async (recordId: number | undefined, updates: Record<string, any>, successMessage: string = 'Task updated successfully!') => {
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
      showToastMessage('Update function not available. Please restart the application to enable inline editing.', 'error')
      await loadTaskRecords()
      return
    }
    
    // Ensure recordId is a number
    const numericRecordId = Number(recordId)
    if (isNaN(numericRecordId)) {
      console.error('Invalid record ID:', recordId)
      showToastMessage('Invalid record ID. Please refresh the page.', 'error')
      await loadTaskRecords()
      return
    }
    
    // Get current record to compare values
    const currentRecord = taskRecords.value.find(r => r.id === numericRecordId)
    if (!currentRecord) {
      console.error('Record not found:', numericRecordId)
      await loadTaskRecords()
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
    
    await window.electronAPI.updateTaskRecord(numericRecordId, updates)
    await loadTaskRecords()
    showToastMessage(successMessage, 'success')
  } catch (error) {
    console.error('Failed to update task:', error)
    showToastMessage(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    await loadTaskRecords() // Restore previous values on error
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
    await loadTaskRecords()
    return
  }
  
  // Process the field value based on field type
  let processedValue = value
  if (field === 'start_time') {
    // Convert time input (HH:MM:SS) to proper format
    const [hours, minutes, seconds] = value.split(':')
    processedValue = `${hours}:${minutes}:${seconds || '00'}`
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
    await loadTaskRecords()
    return
  }
  
  await updateTaskField(recordId, { category_name: categoryName }, 'Category updated successfully!')
}

const convertToTimeInput = (timeString: string): string => {
  // Convert HH:MM:SS format to time input value
  if (!timeString) return '00:00:00'
  
  const parts = timeString.split(':')
  if (parts.length >= 3) {
    return timeString
  } else if (parts.length === 2) {
    return `${timeString}:00`
  }
  return '00:00:00'
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
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8fffe;
  --text-primary: #2d4a3d;
  --text-secondary: #4a6b56;
  --text-muted: #7a9184;
  --border-color: #e0ede8;
  --shadow-color: rgba(87, 189, 175, 0.1);
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

.time-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 2px var(--shadow-color);
  min-height: 50px;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.nav-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.nav-arrow {
  font-size: 1.2rem;
  font-weight: bold;
}

.today-btn {
  background: var(--success);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.today-btn:hover {
  background: var(--mantis);
}

.date-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.date-label {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
  min-width: 180px;
}

.date-picker {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.date-picker:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(87, 189, 175, 0.3);
}

.setup-btn {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.setup-btn:hover {
  background: var(--aero);
}

.setup-icon {
  font-size: 0.9rem;
}

.layout {
  display: flex;
  height: calc(100vh - 50px);
}

.task-table-pane {
  width: 60%;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  box-shadow: 1px 0 3px var(--shadow-color);
  display: flex;
  flex-direction: column;
}

.task-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.task-table-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 500;
}

.add-task-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.add-task-btn:hover {
  background: var(--secondary);
}

.task-table {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.task-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.task-table th {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0.5rem 0.4rem;
  text-align: left;
  border-bottom: 2px solid var(--border-color);
  font-weight: 500;
  position: sticky;
  top: 0;
  font-size: 0.85rem;
}

.task-table td {
  padding: 0.4rem 0.4rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.task-table tr:hover {
  background: var(--bg-secondary);
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-active {
  background: var(--success);
  color: white;
}

.status-completed {
  background: var(--neutral);
  color: white;
}

.status-pending {
  background: var(--text-muted);
  color: white;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.25rem;
  margin: 0 0.125rem;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.category-tag {
  background: var(--primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Add Task Form Styles */
.add-task-form {
  padding: 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input, .form-select {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(87, 189, 175, 0.3);
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}

.form-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.form-btn-primary {
  background: var(--primary);
  color: white;
}

.form-btn-primary:hover {
  background: var(--secondary);
}

.form-btn-secondary {
  background: var(--bg-primary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.form-btn-secondary:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.main-content {
  width: 40%;
  padding: 1rem;
  overflow-y: auto;
  background: var(--bg-secondary);
}

.section h2 {
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-size: 1.4rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section p {
  color: var(--text-muted);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.placeholder-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.card {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 6px var(--shadow-color);
  text-align: center;
  color: var(--text-secondary);
  font-weight: 500;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  font-size: 0.9rem;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
  border-color: var(--primary);
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
  transition: background 0.2s ease;
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

.setting-group {
  margin-bottom: 1.5rem;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-group h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
}

/* Theme Selection Styles */
.theme-buttons {
  display: flex;
  gap: 0.25rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.theme-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0;
}

.theme-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.theme-btn.active {
  background: var(--primary);
  color: white;
}

.theme-btn.active:hover {
  background: var(--secondary);
}

.radio-option input[type="radio"]:checked + .radio-custom {
  border-color: var(--primary);
  background: var(--primary);
}

.radio-option input[type="radio"]:checked + .radio-custom::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.cancel-btn, .save-btn {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
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

/* Category Management Styles */
.categories-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 270px;
  overflow-y: auto;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  transition: all 0.2s ease;
  min-height: 36px;
}

.category-item:hover {
  background: var(--bg-primary);
  border-color: var(--primary);
}

.category-name {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
  flex: 1;
}

.category-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.default-category-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.2;
}

.default-category-btn:hover:not(:disabled) {
  background: var(--primary);
  color: white;
}

.default-category-btn.active {
  color: var(--success);
  opacity: 1;
}

.default-category-btn.active:hover:not(:disabled) {
  background: var(--success);
  color: white;
}

.default-category-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-category-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-category-btn:hover:not(:disabled) {
  background: #ff4757;
  color: white;
}

.delete-category-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-category-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.add-category-btn:hover {
  background: var(--secondary);
}

.add-category-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.category-input {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-primary);
  transition: border-color 0.2s ease;
  flex: 1;
  margin-right: 0.5rem;
}

.category-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(87, 189, 175, 0.3);
}

.add-category-actions {
  display: flex;
  gap: 0.5rem;
}

.add-confirm-btn, .add-cancel-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
}

.add-confirm-btn {
  background: var(--success);
  color: white;
}

.add-confirm-btn:hover {
  background: var(--mantis);
}

.add-cancel-btn {
  background: var(--bg-primary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.add-cancel-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* Loading Indicator Styles */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  justify-content: center;
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

.category-updating {
  opacity: 0.6;
  pointer-events: none;
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
  transition: all 0.2s ease;
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
  border-left: 4px solid #ff4757;
}

.toast-error .toast-icon {
  background: #ff4757;
  color: white;
}

.toast-info {
  border-left: 4px solid var(--accent);
}

.toast-info .toast-icon {
  background: var(--accent);
  color: white;
}

/* Table loading and empty cell styles */
.loading-cell, .empty-cell {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-muted);
  font-style: italic;
}

.loading-cell .loading-indicator {
  padding: 0;
}

/* Editable cell styles */
.editable-cell {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.5rem;
  margin: -0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: inherit;
  transition: all 0.2s ease;
}

.editable-cell:focus {
  outline: none;
  background: var(--bg-secondary);
  border: 1px solid var(--primary);
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(87, 189, 175, 0.3);
}

.editable-input {
  cursor: text;
}

.editable-input:hover {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.editable-select {
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.editable-select:hover {
  background: var(--bg-secondary);
  border-radius: 4px;
}

/* Time cell specific styles */
.task-table td.time-cell {
  width: 6rem;
  padding: 0.25rem;
  vertical-align: middle;
}

.time-input {
  width: 100%;
  max-width: 100%;
  padding: 0.4rem 0.25rem;
  font-size: 0.85rem;
  text-align: center;
  box-sizing: border-box;
}

/* Hide the native time picker icon */
.time-input::-webkit-calendar-picker-indicator {
  display: none;
}

.time-input::-webkit-clear-button {
  display: none;
}

/* Replay button green styling */
.action-btn.replay-btn {
  background: var(--success);
  color: white;
}

.action-btn.replay-btn:hover:not(:disabled) {
  background: var(--mantis);
}
</style>