import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCategories } from './useCategories'
import type { Category } from '../shared/types'

describe('useCategories', () => {
  let mockCategories: Category[]
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    // Stub console.error to reduce noise in test output
    originalConsoleError = console.error
    console.error = vi.fn()

    // Reset all mocks
    vi.resetAllMocks()
    mockCategories = [
      { id: 1, name: 'Work', code: 'WRK', is_default: true },
      { id: 2, name: 'Personal', code: '', is_default: false }
    ]
    ;(window as any).electronAPI = {
      getCategories: vi.fn().mockResolvedValue(mockCategories),
      addCategory: vi
        .fn()
        .mockImplementation((name: string, code?: string) =>
          Promise.resolve({ id: 3, name, code: code || '', is_default: false })
        ),
      updateCategory: vi.fn().mockResolvedValue(undefined),
      deleteCategory: vi.fn().mockResolvedValue(undefined),
      setDefaultCategory: vi.fn().mockResolvedValue(undefined),
      getDefaultCategory: vi.fn().mockResolvedValue(mockCategories[0]),
      categoryExists: vi.fn().mockResolvedValue(true)
    }
  })

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError

    // Restore all mocks
    vi.restoreAllMocks()
  })

  it('should load categories', async () => {
    const { loadCategories, categories, isLoadingCategories } = useCategories()
    await loadCategories()
    expect(categories.value).toEqual(mockCategories)
    expect(isLoadingCategories.value).toBe(false)
  })

  it('should handle loadCategories error', async () => {
    ;(window as any).electronAPI.getCategories.mockRejectedValue(new Error('fail'))
    const { loadCategories } = useCategories()
    await expect(loadCategories()).rejects.toThrow('fail')
  })

  it('should add category', async () => {
    const { addCategory, categories } = useCategories()
    const newCat = await addCategory('New')
    expect(newCat.name).toBe('New')
    expect(newCat.code).toBe('')
    expect(categories.value.find(c => c.name === 'New')).toBeTruthy()
  })

  it('should add category with code', async () => {
    const { addCategory, categories } = useCategories()
    const newCat = await addCategory('Meeting', 'MTG')
    expect(newCat.name).toBe('Meeting')
    expect(newCat.code).toBe('MTG')
    expect(categories.value.find(c => c.code === 'MTG')).toBeTruthy()
  })

  it('should trim code when adding category', async () => {
    const { addCategory } = useCategories()
    await addCategory('Test', '  CODE  ')
    expect((window as any).electronAPI.addCategory).toHaveBeenCalledWith('Test', 'CODE')
  })

  it('should reject code longer than 10 characters', async () => {
    const { addCategory } = useCategories()
    await expect(addCategory('Test', '12345678901')).rejects.toThrow('Category code cannot exceed 10 characters')
  })

  it('should not add empty category', async () => {
    const { addCategory } = useCategories()
    await expect(addCategory('   ')).rejects.toThrow('Category name cannot be empty')
  })

  it('should update category', async () => {
    const { updateCategory, categories } = useCategories()
    categories.value = [...mockCategories]
    await updateCategory(1, '  Updated  ')
    expect(categories.value[0].name).toBe('Updated')
    expect((window as any).electronAPI.updateCategory).toHaveBeenCalledWith(1, 'Updated', undefined)
  })

  it('should update category with code', async () => {
    const { updateCategory, categories } = useCategories()
    categories.value = [...mockCategories]
    await updateCategory(1, 'Updated', 'UPD')
    expect(categories.value[0].name).toBe('Updated')
    expect(categories.value[0].code).toBe('UPD')
    expect((window as any).electronAPI.updateCategory).toHaveBeenCalledWith(1, 'Updated', 'UPD')
  })

  it('should trim code when updating category', async () => {
    const { updateCategory, categories } = useCategories()
    categories.value = [...mockCategories]
    await updateCategory(1, 'Test', '  CODE  ')
    expect(categories.value[0].code).toBe('CODE')
    expect((window as any).electronAPI.updateCategory).toHaveBeenCalledWith(1, 'Test', 'CODE')
  })

  it('should reject code longer than 10 characters when updating', async () => {
    const { updateCategory } = useCategories()
    await expect(updateCategory(1, 'Test', '12345678901')).rejects.toThrow('Category code cannot exceed 10 characters')
  })

  it('should not update with empty name', async () => {
    const { updateCategory } = useCategories()
    await expect(updateCategory(1, '   ')).rejects.toThrow('Category name cannot be empty')
  })

  it('should delete category', async () => {
    const { deleteCategory, categories } = useCategories()
    categories.value = [...mockCategories]
    await deleteCategory(1)
    expect(categories.value.find(c => c.id === 1)).toBeFalsy()
  })

  it('should set default category', async () => {
    const { setDefaultCategory, categories } = useCategories()
    categories.value = [...mockCategories]
    await setDefaultCategory(2)
    expect(categories.value.find(c => c.id === 2)?.is_default).toBe(true)
    expect(categories.value.find(c => c.id === 1)?.is_default).toBe(false)
  })

  it('should get default category', async () => {
    const { getDefaultCategory } = useCategories()
    const def = await getDefaultCategory()
    expect(def?.id).toBe(1)
  })

  it('should return null if getDefaultCategory fails', async () => {
    ;(window as any).electronAPI.getDefaultCategory.mockRejectedValue(new Error('fail'))
    const { getDefaultCategory } = useCategories()
    const def = await getDefaultCategory()
    expect(def).toBeNull()
  })

  it('should check category existence', async () => {
    const { categoryExists } = useCategories()
    const exists = await categoryExists('  Work  ')
    expect(exists).toBe(true)
    expect((window as any).electronAPI.categoryExists).toHaveBeenCalledWith('Work')
  })

  it('should return false for empty name in categoryExists', async () => {
    const { categoryExists } = useCategories()
    const exists = await categoryExists('   ')
    expect(exists).toBe(false)
  })

  it('should return false if categoryExists throws', async () => {
    ;(window as any).electronAPI.categoryExists.mockRejectedValue(new Error('fail'))
    const { categoryExists } = useCategories()
    const exists = await categoryExists('Work')
    expect(exists).toBe(false)
  })

  it('should resolve undefined if electronAPI is missing in loadCategories', async () => {
    delete (window as any).electronAPI
    const { loadCategories } = useCategories()
    await expect(loadCategories()).resolves.toBeUndefined()
  })

  it('should throw if electronAPI is missing in addCategory', async () => {
    delete (window as any).electronAPI
    const { addCategory } = useCategories()
    await expect(addCategory('Test')).rejects.toThrow('Electron API not available')
  })

  it('should throw if electronAPI is missing in updateCategory', async () => {
    delete (window as any).electronAPI
    const { updateCategory } = useCategories()
    await expect(updateCategory(1, 'Test')).rejects.toThrow('Electron API not available')
  })

  it('should throw if electronAPI is missing in deleteCategory', async () => {
    delete (window as any).electronAPI
    const { deleteCategory } = useCategories()
    await expect(deleteCategory(1)).rejects.toThrow('Electron API not available')
  })

  it('should throw if electronAPI is missing in setDefaultCategory', async () => {
    delete (window as any).electronAPI
    const { setDefaultCategory } = useCategories()
    await expect(setDefaultCategory(1)).rejects.toThrow('Electron API not available')
  })

  it('should return null if electronAPI is missing in getDefaultCategory', async () => {
    delete (window as any).electronAPI
    const { getDefaultCategory } = useCategories()
    const def = await getDefaultCategory()
    expect(def).toBeNull()
  })

  it('should return false if electronAPI is missing in categoryExists', async () => {
    delete (window as any).electronAPI
    const { categoryExists } = useCategories()
    const exists = await categoryExists('Work')
    expect(exists).toBe(false)
  })

  // Additional edge case tests for coverage improvement
  it('should handle updateCategory with code undefined (not updating code)', async () => {
    const { updateCategory, categories } = useCategories()
    categories.value = [{ id: 1, name: 'Work', code: 'WRK', is_default: true }]

    // Update without providing code parameter
    await updateCategory(1, 'Updated Work', undefined)

    // Code should not be updated when undefined
    expect((window as any).electronAPI.updateCategory).toHaveBeenCalledWith(1, 'Updated Work', undefined)
    expect(categories.value[0].name).toBe('Updated Work')
    // Code remains unchanged locally when undefined passed
  })

  it('should handle updateCategory when category not found in local state', async () => {
    const { updateCategory, categories } = useCategories()
    categories.value = [{ id: 1, name: 'Work', code: 'WRK', is_default: true }]

    // Try to update category ID 99 which doesn't exist locally
    await updateCategory(99, 'NonExistent', 'NEX')

    // API should still be called
    expect((window as any).electronAPI.updateCategory).toHaveBeenCalledWith(99, 'NonExistent', 'NEX')
    // Local state unchanged since category not found (categoryIndex === -1)
    expect(categories.value.length).toBe(1)
    expect(categories.value[0].id).toBe(1)
  })

  it('should call console.error when deleteCategory fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(window as any).electronAPI.deleteCategory.mockRejectedValue(new Error('Delete failed'))

    const { deleteCategory } = useCategories()

    await expect(deleteCategory(1)).rejects.toThrow('Delete failed')
    expect(consoleSpy).toHaveBeenCalledWith('Failed to delete category:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('should call console.error when setDefaultCategory fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(window as any).electronAPI.setDefaultCategory.mockRejectedValue(new Error('Set default failed'))

    const { setDefaultCategory } = useCategories()

    await expect(setDefaultCategory(1)).rejects.toThrow('Set default failed')
    expect(consoleSpy).toHaveBeenCalledWith('Failed to set default category:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})
