import { ref, type Ref } from 'vue'
import type { Category } from '@/shared/types'

/**
 * Provides reactive category state and CRUD operations synchronized with the Electron IPC API.
 *
 * Exposes local caching and helpers for loading, adding, updating, deleting, marking default,
 * and querying categories while keeping local state consistent with the backend.
 *
 * @returns An object containing:
 * - `categories`: a reactive `Ref<Category[]>` holding the current category list
 * - `isLoadingCategories`: a reactive `Ref<boolean>` that indicates if categories are being loaded
 * - `loadCategories`: loads categories from the Electron API and updates `categories`
 * - `addCategory`: creates a new category via the Electron API and appends it to `categories`
 * - `updateCategory`: updates an existing category via the Electron API and syncs the local entry
 * - `deleteCategory`: removes a category via the Electron API and from `categories`
 * - `setDefaultCategory`: marks a category as default via the Electron API and updates local flags
 * - `getDefaultCategory`: retrieves the default category (or `null` if unavailable)
 * - `categoryExists`: checks whether a category with the given name exists
 */
export function useCategories() {
  const categories: Ref<Category[]> = ref([])
  const isLoadingCategories = ref(false)

  const loadCategories = async (): Promise<void> => {
    if (!window.electronAPI) {
      console.error('Electron API not available')
      return
    }

    isLoadingCategories.value = true
    try {
      categories.value = await window.electronAPI.getCategories()
    } catch (error) {
      console.error('Failed to load categories:', error)
      throw error
    } finally {
      isLoadingCategories.value = false
    }
  }

  const addCategory = async (name: string, code?: string): Promise<Category> => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Category name cannot be empty')
    }

    const trimmedCode = (code || '').trim()
    if (trimmedCode.length > 10) {
      throw new Error('Category code cannot exceed 10 characters')
    }

    try {
      const newCategory = await window.electronAPI.addCategory(trimmedName, trimmedCode)
      categories.value.push(newCategory)
      return newCategory
    } catch (error) {
      console.error('Failed to add category:', error)
      throw error
    }
  }

  const updateCategory = async (id: number, name: string, code?: string): Promise<void> => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Category name cannot be empty')
    }

    const trimmedCode = code !== undefined ? code.trim() : undefined
    if (trimmedCode !== undefined && trimmedCode.length > 10) {
      throw new Error('Category code cannot exceed 10 characters')
    }

    try {
      await window.electronAPI.updateCategory(id, trimmedName, trimmedCode)
      const categoryIndex = categories.value.findIndex(cat => cat.id === id)
      if (categoryIndex !== -1) {
        categories.value[categoryIndex]!.name = trimmedName
        if (trimmedCode !== undefined) {
          categories.value[categoryIndex]!.code = trimmedCode
        }
      }
    } catch (error) {
      console.error('Failed to update category:', error)
      throw error
    }
  }

  const deleteCategory = async (id: number): Promise<void> => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    try {
      await window.electronAPI.deleteCategory(id)
      categories.value = categories.value.filter(cat => cat.id !== id)
    } catch (error) {
      console.error('Failed to delete category:', error)
      throw error
    }
  }

  const setDefaultCategory = async (id: number): Promise<void> => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    try {
      await window.electronAPI.setDefaultCategory(id)
      // Update local state to reflect new default
      categories.value.forEach(cat => {
        cat.is_default = cat.id === id
      })
    } catch (error) {
      console.error('Failed to set default category:', error)
      throw error
    }
  }

  const getDefaultCategory = async (): Promise<Category | null> => {
    if (!window.electronAPI) {
      console.error('Electron API not available')
      return null
    }

    try {
      return await window.electronAPI.getDefaultCategory()
    } catch (error) {
      console.error('Failed to get default category:', error)
      return null
    }
  }

  const categoryExists = async (name: string): Promise<boolean> => {
    const trimmedName = name.trim()

    // Short-circuit for empty names - no IPC needed
    if (!trimmedName) {
      return false
    }

    if (!window.electronAPI) {
      return false
    }

    try {
      return await window.electronAPI.categoryExists(trimmedName)
    } catch (error) {
      console.error('Failed to check category existence:', error)
      return false
    }
  }

  return {
    categories,
    isLoadingCategories,
    loadCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    setDefaultCategory,
    getDefaultCategory,
    categoryExists
  }
}