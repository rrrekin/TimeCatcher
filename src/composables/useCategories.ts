import { ref, type Ref } from 'vue'
import type { Category } from '@/shared/types'

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

  const addCategory = async (name: string): Promise<Category> => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Category name cannot be empty')
    }

    try {
      const newCategory = await window.electronAPI.addCategory(trimmedName)
      categories.value.push(newCategory)
      return newCategory
    } catch (error) {
      console.error('Failed to add category:', error)
      throw error
    }
  }

  const updateCategory = async (id: number, name: string): Promise<void> => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Category name cannot be empty')
    }

    try {
      await window.electronAPI.updateCategory(id, trimmedName)
      const categoryIndex = categories.value.findIndex(cat => cat.id === id)
      if (categoryIndex !== -1) {
        categories.value[categoryIndex].name = trimmedName
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
    if (!window.electronAPI) {
      return false
    }

    try {
      return await window.electronAPI.categoryExists(name.trim())
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