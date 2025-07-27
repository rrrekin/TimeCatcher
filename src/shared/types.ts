export interface Category {
  id?: number
  name: string
  is_default?: boolean
  created_at?: string
}

export interface ElectronAPI {
  getCategories: () => Promise<Category[]>
  addCategory: (name: string) => Promise<Category>
  deleteCategory: (id: number) => Promise<void>
  updateCategory: (id: number, name: string) => Promise<void>
  categoryExists: (name: string) => Promise<boolean>
  setDefaultCategory: (id: number) => Promise<void>
  getDefaultCategory: () => Promise<Category | null>
  debugAll?: () => Promise<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}