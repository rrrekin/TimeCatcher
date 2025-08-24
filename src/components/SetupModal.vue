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
          <h4>Task Categories</h4>
          <div class="categories-container">
            <div v-if="isLoadingCategories" class="loading-indicator">
              <span class="loading-spinner"></span>
              Loading categories...
            </div>
            <div class="categories-list" v-else>
              <div
                v-for="(category, index) in categories"
                :key="category.id ? category.id : `category-${index}`"
                class="category-item"
                @dblclick="$emit('startEditCategory', category)"
                title="Double-click to edit"
                :class="{ 'category-updating': isUpdatingCategory && editingCategoryId === category.id }"
              >
                <input
                  v-if="editingCategoryId === category.id"
                  :value="editingCategoryName"
                  @input="$emit('updateEditingCategoryName', ($event.target as HTMLInputElement).value)"
                  @keyup.enter="$emit('saveEditCategory', category)"
                  @keyup.escape="handleEscapeCancel"
                  @blur="handleBlurSave(category)"
                  class="category-input"
                  autofocus
                />
                <span v-else class="category-name">
                  {{ category.name }}
                </span>
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
                <input
                  :value="newCategoryName"
                  @input="$emit('updateNewCategoryName', ($event.target as HTMLInputElement).value)"
                  @keyup.enter="$emit('addCategory')"
                  @keyup.escape="$emit('cancelAddingCategory')"
                  placeholder="Category name"
                  class="category-input"
                  autofocus
                />
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
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')" :disabled="isBusy">Cancel</button>
        <button class="save-btn" @click="$emit('save')" :disabled="isBusy">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType, ref, nextTick, computed } from 'vue'
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
  newCategoryName: {
    type: String,
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
  saveEditCategory: [category: Category]
  cancelEditCategory: []
  setDefaultCategory: [category: Category]
  deleteCategory: [category: Category]
  updateNewCategoryName: [name: string]
  addCategory: []
  cancelAddingCategory: []
  startAddingCategory: []
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

.category-name {
  flex: 1;
  color: var(--text-primary);
  font-weight: 500;
}

.category-input {
  flex: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--text-primary);
  margin-right: 12px;
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
</style>
