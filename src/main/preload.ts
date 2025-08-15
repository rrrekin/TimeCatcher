import { contextBridge, ipcRenderer } from 'electron'
import type { TaskRecordInsert, TaskRecordUpdate } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
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
  debugAll: () => ipcRenderer.invoke('db:debug-all')
})