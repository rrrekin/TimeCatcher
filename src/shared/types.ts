export type TaskType = 'normal' | 'pause' | 'end'

export const SPECIAL_TASK_CATEGORY = '__special__'

export interface Category {
  id?: number
  name: string
  is_default?: boolean
  created_at?: string
}

export interface TaskRecord {
  id?: number
  category_name: string
  task_name: string
  start_time: string
  date: string
  task_type?: TaskType
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
  addTaskRecord: (record: Omit<TaskRecord, 'id' | 'created_at'>) => Promise<TaskRecord>
  getTaskRecordsByDate: (date: string) => Promise<TaskRecord[]>
  updateTaskRecord: (id: number, record: Partial<Omit<TaskRecord, 'id' | 'created_at'>>) => Promise<void>
  deleteTaskRecord: (id: number) => Promise<void>
  debugAll?: () => Promise<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}