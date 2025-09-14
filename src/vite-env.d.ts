/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Electron API types
import type { TaskRecordInsert, TaskRecordUpdate } from './shared/types'

declare global {
  interface Window {
    electronAPI: {
      // Application info
      getVersion(): Promise<string>
      openExternalUrl(url: string): Promise<boolean>

      // Database operations
      getCategories(): Promise<any[]>
      addCategory(name: string): Promise<any>
      deleteCategory(id: number): Promise<any>
      updateCategory(id: number, name: string): Promise<any>
      categoryExists(name: string): Promise<boolean>
      setDefaultCategory(id: number): Promise<any>
      getDefaultCategory(): Promise<any>
      addTaskRecord(record: TaskRecordInsert): Promise<any>
      getTaskRecordsByDate(date: string): Promise<any[]>
      updateTaskRecord(id: number, record: TaskRecordUpdate): Promise<any>
      deleteTaskRecord(id: number): Promise<any>
      debugAll(): Promise<any>
    }
  }
}
