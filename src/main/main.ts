import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { dbService } from './database'
import type { TaskRecord, TaskRecordInsert, TaskRecordUpdate, DatabaseError } from '../shared/types'

const isDevelopment = process.env.NODE_ENV !== 'production'

function isDuplicateEndConstraint(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  
  const sqliteError = error as any
  const code = String(sqliteError.code || '')
  const message = String(sqliteError.message || '')
  
  const isConstraintError = code === 'SQLITE_CONSTRAINT' || code === 'SQLITE_CONSTRAINT_UNIQUE'
  const isEndIndexError = /(idx_end_per_day|task_records\.date)/i.test(message)
  
  return isConstraintError && isEndIndexError
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1050,
    minHeight: 750,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  })

  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    dbService.close()
    app.quit()
  }
})

// IPC handlers for database operations
ipcMain.handle('db:get-categories', async () => {
  try {
    return dbService.getAllCategories()
  } catch (error) {
    console.error('Failed to get categories:', error)
    throw new Error(`Failed to retrieve categories: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:add-category', async (_, name: string) => {
  try {
    return dbService.addCategory(name)
  } catch (error) {
    console.error('Failed to add category:', error)
    throw new Error(`Failed to add category: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:delete-category', async (_, id: number) => {
  try {
    return dbService.deleteCategory(id)
  } catch (error) {
    console.error('Failed to delete category:', error)
    throw new Error(`Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:category-exists', async (_, name: string) => {
  try {
    return dbService.categoryExists(name)
  } catch (error) {
    console.error('Failed to check if category exists:', error)
    throw new Error(`Failed to check category existence: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:update-category', async (_, id: number, name: string) => {
  try {
    return dbService.updateCategory(id, name)
  } catch (error) {
    console.error('Failed to update category:', error)
    throw new Error(`Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:set-default-category', async (_, id: number) => {
  try {
    return dbService.setDefaultCategory(id)
  } catch (error) {
    console.error('Failed to set default category:', error)
    throw new Error(`Failed to set default category: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:get-default-category', async () => {
  try {
    return dbService.getDefaultCategory()
  } catch (error) {
    console.error('Failed to get default category:', error)
    throw new Error(`Failed to retrieve default category: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:add-task-record', async (_, record: TaskRecordInsert) => {
  try {
    return dbService.addTaskRecord(record)
  } catch (error) {
    console.error('Failed to add task record:', error)
    
    // Check if this is a duplicate end task constraint violation
    // Only detect specific UNIQUE constraint violations on the idx_end_per_day index
    if (record.task_type === 'end' && isDuplicateEndConstraint(error)) {
      const dbError: DatabaseError = new Error(`Failed to add task record: ${error instanceof Error ? error.message : 'Unknown error'}`)
      dbError.code = 'END_DUPLICATE'
      ;(dbError as any).cause = error instanceof Error ? error : new Error(String(error))
      throw dbError
    }
    
    const genericError = new Error(`Failed to add task record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    ;(genericError as any).cause = error instanceof Error ? error : new Error(String(error))
    throw genericError
  }
})

ipcMain.handle('db:get-task-records-by-date', async (_, date: string) => {
  try {
    return dbService.getTaskRecordsByDate(date)
  } catch (error) {
    console.error('Failed to get task records by date:', error)
    throw new Error(`Failed to retrieve task records: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:update-task-record', async (_, id: number, record: TaskRecordUpdate) => {
  try {
    return dbService.updateTaskRecord(id, record)
  } catch (error) {
    console.error('Failed to update task record:', error)
    
    // Check if this is a duplicate end task constraint violation
    // This can happen when updating the date of an 'end' task to a date that already has an 'end' task
    if (isDuplicateEndConstraint(error)) {
      const dbError: DatabaseError = new Error(`Failed to update task record: ${error instanceof Error ? error.message : 'Unknown error'}`)
      dbError.code = 'END_DUPLICATE'
      ;(dbError as any).cause = error instanceof Error ? error : new Error(String(error))
      throw dbError
    }
    
    const genericError = new Error(`Failed to update task record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    ;(genericError as any).cause = error instanceof Error ? error : new Error(String(error))
    throw genericError
  }
})

ipcMain.handle('db:delete-task-record', async (_, id: number) => {
  try {
    return dbService.deleteTaskRecord(id)
  } catch (error) {
    console.error('Failed to delete task record:', error)
    throw new Error(`Failed to delete task record: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// Debug handler to view all data - only available in development
if (isDevelopment) {
  ipcMain.handle('db:debug-all', async () => {
    try {
      return {
        categories: dbService.getAllCategories(),
        taskRecords: dbService.db.prepare('SELECT * FROM task_records').all()
      }
    } catch (error) {
      console.error('Failed to debug database:', error)
      throw new Error(`Failed to retrieve debug data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
}