import { contextBridge, ipcRenderer } from 'electron'
import type {
  TaskRecordInsert,
  TaskRecordUpdate,
  SettingsSnapshot,
  BackupResult,
  RestoreResult,
  HttpServerStartResult,
  HttpServerStatus
} from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  // Application info
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  openExternalUrl: (url: string): Promise<boolean> => ipcRenderer.invoke('app:open-external-url', url),

  // HTTP Server
  startHttpServer: (port: number): Promise<HttpServerStartResult> => ipcRenderer.invoke('http-server:start', port),
  stopHttpServer: (): Promise<void> => ipcRenderer.invoke('http-server:stop'),
  getHttpServerStatus: (): Promise<HttpServerStatus> => ipcRenderer.invoke('http-server:status'),
  onHttpServerTaskCreated: (callback: (data: any) => void) => {
    ipcRenderer.on('http-server:task-created', (_, data) => callback(data))
  },
  removeHttpServerTaskCreatedListener: (callback: (data: any) => void) => {
    ipcRenderer.removeListener('http-server:task-created', callback)
  },

  // Database operations
  getCategories: () => ipcRenderer.invoke('db:get-categories'),
  addCategory: (name: string) => ipcRenderer.invoke('db:add-category', name),
  deleteCategory: (id: number) => ipcRenderer.invoke('db:delete-category', id),
  updateCategory: (id: number, name: string) => ipcRenderer.invoke('db:update-category', id, name),
  categoryExists: (name: string) => ipcRenderer.invoke('db:category-exists', name),
  setDefaultCategory: (id: number) => ipcRenderer.invoke('db:set-default-category', id),
  getDefaultCategory: () => ipcRenderer.invoke('db:get-default-category'),
  addTaskRecord: (record: TaskRecordInsert) => ipcRenderer.invoke('db:add-task-record', record),
  getTaskRecordsByDate: (date: string) => ipcRenderer.invoke('db:get-task-records-by-date', date),
  updateTaskRecord: (id: number, record: TaskRecordUpdate) => ipcRenderer.invoke('db:update-task-record', id, record),
  deleteTaskRecord: (id: number) => ipcRenderer.invoke('db:delete-task-record', id),
  debugAll: () => ipcRenderer.invoke('db:debug-all'),
  // Backup & restore
  backupApp: (settings: SettingsSnapshot): Promise<BackupResult> => ipcRenderer.invoke('app:backup', settings),
  restoreApp: (): Promise<RestoreResult> => ipcRenderer.invoke('app:restore')
})
