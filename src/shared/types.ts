export const TASK_TYPES = ['normal', 'pause', 'end'] as const
export type TaskType = (typeof TASK_TYPES)[number]

// Individual task type constants for better readability
export const [TASK_TYPE_NORMAL, TASK_TYPE_PAUSE, TASK_TYPE_END] = TASK_TYPES

export type SpecialTaskType = Exclude<TaskType, 'normal'>
export const SPECIAL_TASK_TYPES = ['pause', 'end'] as const satisfies readonly SpecialTaskType[]

export const SPECIAL_TASK_CATEGORY = '__special__' as const

export const DURATION_VISIBLE_BY_TASK_TYPE: Record<TaskType, boolean> = {
  normal: true,
  pause: true,
  end: false
} as const

// Context for task record updates to control highlighting behavior
export type UpdateContext =
  | 'initial-load' // First app load
  | 'date-change' // User navigated to different date
  | 'edit' // User edited task data
  | 'auto-refresh' // Background refresh (today only)
  | 'error-recovery' // Restoring state after error

export interface DatabaseError extends Error {
  code?: 'END_DUPLICATE' | 'SQLITE_CONSTRAINT' | 'SQLITE_CONSTRAINT_UNIQUE' | string
}

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
  task_type: TaskType
  created_at?: string
}

// TaskRecord with required id for records loaded from DB/UI lists
export type TaskRecordWithId = TaskRecord & { id: number }

export type TaskRecordInsert = Omit<TaskRecord, 'id' | 'created_at'>
export type TaskRecordUpdate = Partial<Omit<TaskRecord, 'id' | 'created_at' | 'task_type'>>

// Snapshot of user-configurable settings used for backup/restore
export interface SettingsSnapshot {
  theme: 'light' | 'dark' | 'auto'
  targetWorkHours: number
  reportingAppButtonText: string
  reportingAppUrl: string
}

// IPC result types for backup/restore flows
export interface BackupResult {
  ok?: boolean
  cancelled?: boolean
  error?: string
}

export interface RestoreResult {
  ok?: boolean
  cancelled?: boolean
  error?: string
  settings?: Partial<SettingsSnapshot>
}

export interface ElectronAPI {
  // Application info
  getVersion: () => Promise<string>
  openExternalUrl: (url: string) => Promise<boolean>
  // Backup & Restore
  backupApp?: (settings: SettingsSnapshot) => Promise<BackupResult>
  restoreApp?: () => Promise<RestoreResult>
  // Database operations
  getCategories: () => Promise<Category[]>
  addCategory: (name: string) => Promise<Category>
  deleteCategory: (id: number) => Promise<void>
  updateCategory: (id: number, name: string) => Promise<void>
  categoryExists: (name: string) => Promise<boolean>
  setDefaultCategory: (id: number) => Promise<void>
  getDefaultCategory: () => Promise<Category | null>
  addTaskRecord: (record: TaskRecordInsert) => Promise<TaskRecord>
  getTaskRecordsByDate: (date: string) => Promise<TaskRecordWithId[]>
  updateTaskRecord: (id: number, record: TaskRecordUpdate) => Promise<void>
  deleteTaskRecord: (id: number) => Promise<void>
  debugAll?: () => Promise<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
