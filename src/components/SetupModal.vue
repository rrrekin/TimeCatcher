<template>
  <div v-if="isOpen" class="modal-overlay" @click="canClose && $emit('close')">
    <div class="modal" @click.stop role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h3 id="modal-title">Settings</h3>
        <button
          class="close-btn"
          @click="canClose && $emit('close')"
          :disabled="!canClose"
          aria-label="Close settings modal"
        >
          ×
        </button>
      </div>

      <div class="modal-content">
        <div class="setting-group">
          <h4>Theme</h4>
          <div class="theme-buttons">
            <button
              class="theme-btn"
              :class="{ active: tempTheme === 'light' }"
              @click="$emit('updateTempTheme', 'light')"
            >
              Light
            </button>
            <button
              class="theme-btn"
              :class="{ active: tempTheme === 'dark' }"
              @click="$emit('updateTempTheme', 'dark')"
            >
              Dark
            </button>
            <button
              class="theme-btn"
              :class="{ active: tempTheme === 'auto' }"
              @click="$emit('updateTempTheme', 'auto')"
            >
              Auto
            </button>
          </div>
        </div>

        <div class="setting-group">
          <h4>Daily Work Target</h4>
          <div class="target-hours-setting">
            <label for="target-hours">Target work hours per day:</label>
            <input
              type="number"
              id="target-hours"
              :value="tempTargetWorkHours"
              @input="onTargetHoursInput($event)"
              min="1"
              max="24"
              step="0.5"
              class="target-hours-input"
            />
            <span class="hours-label">hours</span>
          </div>
        </div>

        <div class="setting-group">
          <h4>Time Reporting Application</h4>
          <div class="reporting-app-settings">
            <div class="reporting-app-field">
              <label for="reporting-button-text">Button text:</label>
              <input
                type="text"
                id="reporting-button-text"
                :value="tempReportingAppButtonText"
                @input="$emit('updateTempReportingAppButtonText', ($event.target as HTMLInputElement).value)"
                placeholder="Tempo"
                class="reporting-app-input"
              />
            </div>
            <div class="reporting-app-field">
              <label for="reporting-app-url">Application URL:</label>
              <input
                type="text"
                id="reporting-app-url"
                :value="tempReportingAppUrl"
                @input="$emit('updateTempReportingAppUrl', ($event.target as HTMLInputElement).value)"
                placeholder="https://example.com/timetracking"
                class="reporting-app-input"
                :class="{ 'invalid-url': tempReportingAppUrl && !isValidUrl(tempReportingAppUrl) }"
              />
              <div v-if="tempReportingAppUrl && !isValidUrl(tempReportingAppUrl)" class="url-error">
                Please enter a valid URL
              </div>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <h4>Task Categories</h4>
          <div class="categories-container">
            <div v-if="isLoadingCategories" class="loading-indicator">
              <span class="loading-spinner"></span>
              Loading categories...
            </div>
            <div class="categories-list" v-else>
              <div
                v-for="(category, index) in categories"
                :key="category.id ?? `name-${category.name}-${index}`"
                class="category-item"
                @dblclick="$emit('startEditCategory', category)"
                title="Double-click to edit"
                :class="{ 'category-updating': isUpdatingCategory && editingCategoryId === category.id }"
              >
                <div v-if="editingCategoryId === category.id" class="category-edit-form">
                  <input
                    :value="editingCategoryName"
                    @input="$emit('updateEditingCategoryName', ($event.target as HTMLInputElement).value)"
                    @keyup.enter="$emit('saveEditCategory', category)"
                    @keyup.escape="handleEscapeCancel"
                    @blur="handleBlurSave(category)"
                    class="category-input category-name-input"
                    placeholder="Category name"
                    autofocus
                  />
                  <input
                    :value="editingCategoryCode"
                    @input="$emit('updateEditingCategoryCode', ($event.target as HTMLInputElement).value)"
                    @keyup.enter="$emit('saveEditCategory', category)"
                    @keyup.escape="handleEscapeCancel"
                    @blur="handleBlurSave(category)"
                    class="category-input category-code-input"
                    placeholder="Code (max 10)"
                    maxlength="10"
                  />
                </div>
                <div v-else class="category-display">
                  <span class="category-name">{{ category.name }}</span>
                  <span v-if="category.code" class="category-code">{{ category.code }}</span>
                </div>
                <div class="category-actions">
                  <button
                    class="default-category-btn"
                    @click="$emit('setDefaultCategory', category)"
                    @dblclick.stop
                    :class="{ active: category.is_default }"
                    title="Set as default category"
                    :disabled="isAddingCategory || editingCategoryId === category.id || isSettingDefault"
                  >
                    ✓
                  </button>
                  <button
                    class="delete-category-btn"
                    @click="$emit('deleteCategory', category)"
                    @dblclick.stop
                    title="Delete category"
                    :disabled="isAddingCategory || editingCategoryId === category.id || isDeletingCategory"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div v-if="isAddingCategory" class="add-category-form">
                <div class="add-category-inputs">
                  <input
                    :value="newCategoryName"
                    @input="$emit('updateNewCategoryName', ($event.target as HTMLInputElement).value)"
                    @keyup.enter="$emit('addCategory')"
                    @keyup.escape="$emit('cancelAddingCategory')"
                    placeholder="Category name"
                    class="category-input category-name-input"
                    autofocus
                  />
                  <input
                    :value="newCategoryCode"
                    @input="$emit('updateNewCategoryCode', ($event.target as HTMLInputElement).value)"
                    @keyup.enter="$emit('addCategory')"
                    @keyup.escape="$emit('cancelAddingCategory')"
                    placeholder="Code (max 10)"
                    class="category-input category-code-input"
                    maxlength="10"
                  />
                </div>
                <div class="add-category-actions">
                  <button class="add-confirm-btn" @click="$emit('addCategory')">Add</button>
                  <button class="add-cancel-btn" @click="$emit('cancelAddingCategory')">Cancel</button>
                </div>
              </div>
            </div>

            <button v-if="!isAddingCategory" class="add-category-btn" @click="$emit('startAddingCategory')">
              + Add Category
            </button>
          </div>
        </div>

        <!-- Old Entries Cleanup -->
        <div class="setting-group">
          <h4>Old Entries Cleanup</h4>
          <div class="eviction-settings">
            <div class="eviction-enabled-setting">
              <label class="checkbox-container">
                <input
                  type="checkbox"
                  :checked="tempEvictionEnabled"
                  @change="$emit('updateTempEvictionEnabled', ($event.target as HTMLInputElement).checked)"
                  class="eviction-checkbox"
                />
                <span class="checkmark"></span>
                Enable old entries cleanup
              </label>
            </div>
            <div class="eviction-days-setting" :class="{ disabled: !tempEvictionEnabled }">
              <label for="eviction-days">Days of history to keep:</label>
              <input
                type="number"
                id="eviction-days"
                :value="tempEvictionDaysToKeep"
                @input="onEvictionDaysInput($event)"
                min="30"
                max="3650"
                step="1"
                class="eviction-days-input"
                :class="{ 'invalid-input': tempEvictionDaysToKeep < 30 || tempEvictionDaysToKeep > 3650 }"
                :disabled="!tempEvictionEnabled"
              />
              <span class="days-label">days</span>
            </div>
            <div class="eviction-help-text">
              Minimum 30 days to prevent accidental data loss. When enabled, old task entries are automatically removed
              after creating an "End" task.
            </div>
          </div>
        </div>

        <!-- HTTP Server -->
        <div class="setting-group">
          <h4>HTTP Server</h4>
          <div class="http-server-settings">
            <div class="http-server-enabled-setting">
              <label class="checkbox-container">
                <input
                  type="checkbox"
                  :checked="tempHttpServerEnabled"
                  @change="$emit('updateTempHttpServerEnabled', ($event.target as HTMLInputElement).checked)"
                  class="http-server-checkbox"
                />
                <span class="checkmark"></span>
                Enable HTTP server
              </label>
            </div>
            <div class="http-server-port-setting" :class="{ disabled: !tempHttpServerEnabled }">
              <label for="http-server-port">Port number:</label>
              <input
                type="number"
                id="http-server-port"
                :value="tempHttpServerPort"
                @input="onHttpServerPortInput($event)"
                @blur="onHttpServerPortBlur($event)"
                min="1024"
                max="65535"
                step="1"
                class="http-server-port-input"
                :class="{ 'invalid-input': !isValidHttpPort(tempHttpServerPort) }"
                :disabled="!tempHttpServerEnabled"
              />
            </div>
            <div class="http-server-help">
              <p class="setting-description">
                When enabled, allows creating task entries via HTTP GET requests to localhost. Use:
                <code
                  >http://localhost:{{ tempHttpServerPort }}/create-task?task=TaskName&amp;category=CategoryName</code
                >
              </p>
            </div>
          </div>
        </div>

        <!-- Backup & Restore -->
        <div class="setting-group">
          <h4>Backup & Restore</h4>
          <div class="backup-actions">
            <button
              class="backup-btn"
              data-testid="backup-button"
              aria-label="Backup workspace"
              title="Backup workspace"
              @click="$emit('backup')"
              :disabled="isBusy"
            >
              Backup…
            </button>
            <button
              class="restore-btn"
              data-testid="restore-button"
              aria-label="Restore workspace from backup"
              title="Restore workspace from backup"
              @click="$emit('restoreBackup')"
              :disabled="isBusy"
            >
              Restore backup…
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')" :disabled="isBusy">Cancel</button>
        <button class="save-btn" @click="$emit('save')" :disabled="isBusy">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType, ref, nextTick, computed, onMounted, onUnmounted } from 'vue'
import type { Category } from '@/shared/types'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  tempTheme: {
    type: String as PropType<'light' | 'dark' | 'auto'>,
    required: true
  },
  tempTargetWorkHours: {
    type: Number,
    required: true
  },
  categories: {
    type: Array as PropType<Category[]>,
    required: true
  },
  isLoadingCategories: {
    type: Boolean,
    required: true
  },
  isAddingCategory: {
    type: Boolean,
    required: true
  },
  isUpdatingCategory: {
    type: Boolean,
    required: true
  },
  isDeletingCategory: {
    type: Boolean,
    required: true
  },
  isSettingDefault: {
    type: Boolean,
    required: true
  },
  editingCategoryId: {
    type: Number as PropType<number | null>,
    required: true
  },
  editingCategoryName: {
    type: String,
    required: true
  },
  editingCategoryCode: {
    type: String,
    required: true
  },
  newCategoryName: {
    type: String,
    required: true
  },
  newCategoryCode: {
    type: String,
    required: true
  },
  tempReportingAppButtonText: {
    type: String,
    required: true
  },
  tempReportingAppUrl: {
    type: String,
    required: true
  },
  isValidUrl: {
    type: Function as PropType<(url: string) => boolean>,
    required: true
  },
  tempEvictionEnabled: {
    type: Boolean,
    required: true
  },
  tempEvictionDaysToKeep: {
    type: Number,
    required: true
  },
  isValidEvictionDaysToKeep: {
    type: Function as PropType<(value: unknown) => boolean>,
    required: true
  },
  tempHttpServerEnabled: {
    type: Boolean,
    required: true
  },
  tempHttpServerPort: {
    type: Number,
    required: true
  },
  isValidHttpPort: {
    type: Function as PropType<(value: unknown) => boolean>,
    required: true
  }
})

// Emits
const emit = defineEmits<{
  close: []
  save: []
  updateTempTheme: [theme: 'light' | 'dark' | 'auto']
  updateTempTargetWorkHours: [hours: number]
  startEditCategory: [category: Category]
  updateEditingCategoryName: [name: string]
  updateEditingCategoryCode: [code: string]
  saveEditCategory: [category: Category]
  cancelEditCategory: []
  setDefaultCategory: [category: Category]
  deleteCategory: [category: Category]
  updateNewCategoryName: [name: string]
  updateNewCategoryCode: [code: string]
  addCategory: []
  cancelAddingCategory: []
  startAddingCategory: []
  updateTempReportingAppButtonText: [text: string]
  updateTempReportingAppUrl: [url: string]
  updateTempEvictionEnabled: [enabled: boolean]
  updateTempEvictionDaysToKeep: [days: number]
  updateTempHttpServerEnabled: [enabled: boolean]
  updateTempHttpServerPort: [port: number]
  backup: []
  restoreBackup: []
}>()

// Flag to prevent blur save when cancelling
const isCancellingEdit = ref(false)

// Computed property to track if any operation is in progress
const isBusy = computed(
  () => props.isAddingCategory || props.isUpdatingCategory || props.isDeletingCategory || props.isSettingDefault
)

// Computed property to determine if modal can be closed
const canClose = computed(() => !isBusy.value)

function onTargetHoursInput(e: Event) {
  const raw = parseFloat((e.target as HTMLInputElement).value)
  const clamped = Number.isFinite(raw) ? Math.min(24, Math.max(1, raw)) : 1
  emit('updateTempTargetWorkHours', clamped)
}

function onEvictionDaysInput(e: Event) {
  const raw = parseInt((e.target as HTMLInputElement).value, 10)
  const clamped = Number.isFinite(raw) ? Math.min(3650, Math.max(30, raw)) : 30
  emit('updateTempEvictionDaysToKeep', clamped)
}

function onHttpServerPortInput(e: Event) {
  const raw = parseInt((e.target as HTMLInputElement).value, 10)
  // Allow free typing - only emit the raw value without clamping
  emit('updateTempHttpServerPort', Number.isFinite(raw) ? raw : 14474)
}

function onHttpServerPortBlur(e: Event) {
  const raw = parseInt((e.target as HTMLInputElement).value, 10)
  // Clamp to valid range when user finishes typing
  const clamped = Number.isFinite(raw) ? Math.min(65535, Math.max(1024, raw)) : 14474
  emit('updateTempHttpServerPort', clamped)
}

function handleEscapeCancel() {
  isCancellingEdit.value = true
  emit('cancelEditCategory')
  // Reset flag after current tick
  nextTick(() => {
    isCancellingEdit.value = false
  })
}

function handleBlurSave(category: Category) {
  if (!isCancellingEdit.value) {
    emit('saveEditCategory', category)
  }
}

// Setup modal keyboard handler
const handleSetupModalKeydown = (event: KeyboardEvent) => {
  if (!props.isOpen) return

  if (event.key === 'Escape' && canClose.value) {
    event.preventDefault()
    emit('close')
  }
  // Note: Enter key is intentionally not handled to keep modal open
}

// Lifecycle hooks for keyboard event listeners
onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleSetupModalKeydown)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleSetupModalKeydown)
  }
})
</script>

<style scoped>
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
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: var(--primary);
  color: white;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.close-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 32px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-group h4 {
  margin: 0 0 16px 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.theme-buttons {
  display: flex;
  gap: 8px;
}

.theme-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.theme-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.theme-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.target-hours-setting {
  display: flex;
  align-items: center;
  gap: 12px;
}

.target-hours-setting label {
  color: var(--text-primary);
  font-weight: 500;
}

.target-hours-input {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  width: 80px;
  text-align: center;
}

.target-hours-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.1);
}

.hours-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.reporting-app-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reporting-app-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reporting-app-field label {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 14px;
}

.reporting-app-input {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.reporting-app-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.1);
}

.reporting-app-input.invalid-url {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
}

.url-error {
  color: #e74c3c;
  font-size: 12px;
  font-weight: 500;
}

.categories-container {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--text-muted);
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-item:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.category-updating {
  opacity: 0.7;
  pointer-events: none;
}

.category-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-name {
  color: var(--text-primary);
  font-weight: 500;
}

.category-code {
  color: var(--text-secondary);
  font-size: 12px;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.category-edit-form {
  flex: 1;
  display: flex;
  gap: 8px;
  margin-right: 12px;
}

.category-input {
  background: var(--bg-secondary);
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--text-primary);
}

.category-name-input {
  flex: 2;
}

.category-code-input {
  flex: 1;
  min-width: 80px;
}

.category-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.1);
}

.category-actions {
  display: flex;
  gap: 4px;
}

.default-category-btn,
.delete-category-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 14px;
}

.default-category-btn {
  color: var(--mantis);
}

.default-category-btn:hover:not(:disabled) {
  background: var(--mantis);
  color: white;
  border-color: var(--mantis);
}

.default-category-btn.active {
  background: var(--mantis);
  color: white;
  border-color: var(--mantis);
}

.delete-category-btn {
  color: var(--mantis);
}

.delete-category-btn:hover:not(:disabled) {
  background: var(--mantis);
  color: white;
  border-color: var(--mantis);
}

.add-category-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--primary);
  border-radius: 6px;
}

.add-category-inputs {
  display: flex;
  gap: 8px;
}

.add-category-actions {
  display: flex;
  gap: 8px;
}

.add-confirm-btn,
.add-cancel-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.add-confirm-btn {
  background: var(--mantis);
  color: white;
}

.add-confirm-btn:hover {
  background: var(--emerald);
}

.add-cancel-btn {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.add-cancel-btn:hover {
  background: var(--border-color);
}

.add-category-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.add-category-btn:hover {
  background: var(--emerald);
  transform: translateY(-2px);
}

.modal-footer {
  background: var(--bg-secondary);
  padding: 20px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--border-color);
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.cancel-btn:hover:not(:disabled) {
  background: var(--border-color);
}

.save-btn {
  background: var(--primary);
  color: white;
  border: none;
}

.save-btn:hover:not(:disabled) {
  background: var(--emerald);
}

.cancel-btn:disabled,
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Backup & Restore */
.backup-actions {
  display: flex;
  gap: 12px;
}

.backup-btn,
.restore-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.backup-btn:not(:disabled):hover,
.restore-btn:not(:disabled):hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.backup-btn:disabled,
.restore-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-color: var(--border-color);
  pointer-events: none;
}

/* Eviction Settings */
.eviction-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eviction-enabled-setting {
  display: flex;
  align-items: center;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  color: var(--text-primary);
  font-weight: 500;
}

.eviction-checkbox {
  margin-right: 12px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkmark {
  display: none;
}

.eviction-days-setting {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: opacity 0.2s ease;
}

.eviction-days-setting.disabled {
  opacity: 0.5;
}

.eviction-days-setting label {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
}

.eviction-days-input {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  width: 80px;
  text-align: center;
  transition: all 0.2s ease;
}

.eviction-days-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.1);
}

.eviction-days-input:disabled {
  cursor: not-allowed;
  background: var(--border-color);
  color: var(--text-muted);
}

.eviction-days-input.invalid-input {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
}

.days-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.eviction-help-text {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border-left: 3px solid var(--primary);
}

/* HTTP Server */
.http-server-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.http-server-enabled-setting {
  display: flex;
  align-items: center;
}

.http-server-port-setting {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: opacity 0.2s ease;
}

.http-server-port-setting.disabled {
  opacity: 0.5;
}

.http-server-port-setting label {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
}

.http-server-port-input {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  width: 100px;
  text-align: center;
  transition: all 0.2s ease;
}

.http-server-port-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(87, 189, 175, 0.1);
}

.http-server-port-input:disabled {
  cursor: not-allowed;
  background: var(--border-color);
  color: var(--text-muted);
}

.http-server-port-input.invalid-input {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
}

.http-server-help {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border-left: 3px solid var(--primary);
}

.http-server-help code {
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
</style>
