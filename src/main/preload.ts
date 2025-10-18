import { contextBridge, ipcRenderer } from 'electron'
import type {
  TaskRecordInsert,
  TaskRecordUpdate,
  SettingsSnapshot,
  BackupResult,
  RestoreResult,
  HttpServerStartResult,
  HttpServerStatus,
  UpdateCheckResult
} from '../shared/types'

// Keep track of wrapped listeners so we can remove the exact same function reference later
type HttpTaskCreatedCallback = (data: any) => void
// event type is loosely typed here to avoid importing Electron types into renderer exposure
type HttpTaskCreatedWrapped = (event: unknown, data: any) => void
const httpTaskCreatedWrapperMap = new WeakMap<HttpTaskCreatedCallback, HttpTaskCreatedWrapped>()

contextBridge.exposeInMainWorld('electronAPI', {
  // Application info
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  openExternalUrl: (url: string): Promise<boolean> => ipcRenderer.invoke('app:open-external-url', url),
  checkForUpdates: (): Promise<UpdateCheckResult> => ipcRenderer.invoke('app:check-for-updates'),

  // HTTP Server
  startHttpServer: (port: number): Promise<HttpServerStartResult> => ipcRenderer.invoke('http-server:start', port),
  stopHttpServer: (): Promise<void> => ipcRenderer.invoke('http-server:stop'),
  getHttpServerStatus: (): Promise<HttpServerStatus> => ipcRenderer.invoke('http-server:status'),
  onHttpServerTaskCreated: (callback: (data: any) => void) => {
    // If this callback was already registered, avoid adding a duplicate listener
    const existing = httpTaskCreatedWrapperMap.get(callback)
    if (existing) return

    const wrapper: HttpTaskCreatedWrapped = (_event, data) => callback(data)
    httpTaskCreatedWrapperMap.set(callback, wrapper)
    ipcRenderer.on('http-server:task-created', wrapper as any)
  },
  removeHttpServerTaskCreatedListener: (callback: (data: any) => void) => {
    const wrapper = httpTaskCreatedWrapperMap.get(callback)
    if (wrapper) {
      ipcRenderer.removeListener('http-server:task-created', wrapper as any)
      httpTaskCreatedWrapperMap.delete(callback)
    }
  },

  // Database operations
  getCategories: () => ipcRenderer.invoke('db:get-categories'),
  addCategory: (name: string, code?: string) => ipcRenderer.invoke('db:add-category', name, code),
  deleteCategory: (id: number) => ipcRenderer.invoke('db:delete-category', id),
  updateCategory: (id: number, name: string, code?: string) => ipcRenderer.invoke('db:update-category', id, name, code),
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
