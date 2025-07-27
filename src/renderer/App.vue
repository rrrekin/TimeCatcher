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
      <nav class="sidebar">
        <ul class="nav-menu">
          <li class="nav-item" :class="{ active: activeSection === 'dashboard' }" @click="activeSection = 'dashboard'">
            <span class="nav-icon">📊</span>
            Dashboard
          </li>
          <li class="nav-item" :class="{ active: activeSection === 'tracking' }" @click="activeSection = 'tracking'">
            <span class="nav-icon">⏱️</span>
            Time Tracking
          </li>
          <li class="nav-item" :class="{ active: activeSection === 'projects' }" @click="activeSection = 'projects'">
            <span class="nav-icon">📁</span>
            Projects
          </li>
          <li class="nav-item" :class="{ active: activeSection === 'reports' }" @click="activeSection = 'reports'">
            <span class="nav-icon">📈</span>
            Reports
          </li>
          <li class="nav-item" :class="{ active: activeSection === 'settings' }" @click="activeSection = 'settings'">
            <span class="nav-icon">⚙️</span>
            Settings
          </li>
        </ul>
      </nav>
      
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
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Settings</h3>
          <button class="close-btn" @click="closeSetupModal" :disabled="isAddingCategory">×</button>
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
              <div class="categories-list">
                <div 
                  v-for="category in categories" 
                  :key="category.id"
                  class="category-item"
                  @dblclick="startEditCategory(category)"
                  title="Double-click to edit"
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
                      :disabled="isAddingCategory || editingCategoryId === category.id"
                    >
                      ✓
                    </button>
                    <button 
                      class="delete-category-btn" 
                      @click="deleteCategory(category)"
                      @dblclick.stop
                      title="Delete category"
                      :disabled="isAddingCategory || editingCategoryId === category.id"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Category } from '../shared/types'

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
    selectedDate.value = new Date(value + 'T00:00:00')
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
  try {
    categories.value = await window.electronAPI.getCategories()
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

const addCategory = async () => {
  const name = newCategoryName.value.trim()
  if (!name) return

  try {
    const exists = await window.electronAPI.categoryExists(name)
    if (exists) {
      alert('Category already exists!')
      return
    }

    await window.electronAPI.addCategory(name)
    await loadCategories()
    newCategoryName.value = ''
    isAddingCategory.value = false
  } catch (error) {
    console.error('Failed to add category:', error)
    alert('Failed to add category')
  }
}

const deleteCategory = async (category: Category) => {
  if (!category.id) return
  
  if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
    try {
      await window.electronAPI.deleteCategory(category.id)
      await loadCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
      alert('Failed to delete category')
    }
  }
}

const startAddingCategory = () => {
  isAddingCategory.value = true
  newCategoryName.value = ''
  // Scroll to bottom to show the add form
  setTimeout(() => {
    const categoriesList = document.querySelector('.categories-list')
    if (categoriesList) {
      categoriesList.scrollTop = categoriesList.scrollHeight
    }
  }, 50)
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
    // Check if new name already exists
    const exists = await window.electronAPI.categoryExists(newName)
    if (exists) {
      alert('Category already exists!')
      return
    }

    // Update category using database service
    await window.electronAPI.updateCategory(category.id, newName)
    await loadCategories()
    editingCategoryId.value = null
    editingCategoryName.value = ''
  } catch (error) {
    console.error('Failed to update category:', error)
    alert('Failed to update category')
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
    await window.electronAPI.setDefaultCategory(category.id)
    await loadCategories()
  } catch (error) {
    console.error('Failed to set default category:', error)
    alert('Failed to set default category')
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

onMounted(() => {
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
})
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

.sidebar {
  width: 180px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  box-shadow: 1px 0 3px var(--shadow-color);
}

.nav-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
}

.nav-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.nav-item.active {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  box-shadow: inset 2px 0 0 var(--accent);
}

.nav-icon {
  font-size: 1rem;
}

.main-content {
  flex: 1;
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

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s ease;
  color: var(--text-secondary);
}

.radio-option:hover {
  background: var(--bg-secondary);
}

.radio-option input[type="radio"] {
  display: none;
}

.radio-custom {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
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
</style>