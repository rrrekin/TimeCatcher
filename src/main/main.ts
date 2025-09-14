import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { dbService } from './database'
import { TASK_TYPE_END } from '../shared/types'
import type { TaskRecord, TaskRecordInsert, TaskRecordUpdate, DatabaseError } from '../shared/types'

const isDevelopment = process.env.NODE_ENV !== 'production' && !app.isPackaged

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

app.on('window-all-closed', async function () {
  try {
    dbService.close()
  } catch (error) {
    console.error('Failed to close database:', error)
  }

  app.quit()
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
    if (record.task_type === TASK_TYPE_END && isDuplicateEndConstraint(error)) {
      const dbError: DatabaseError = new Error(
        `Failed to add task record: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      dbError.code = 'END_DUPLICATE'
      ;(dbError as any).cause = error instanceof Error ? error : new Error(String(error))
      throw dbError
    }

    const genericError = new Error(
      `Failed to add task record: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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
      const dbError: DatabaseError = new Error(
        `Failed to update task record: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      dbError.code = 'END_DUPLICATE'
      ;(dbError as any).cause = error instanceof Error ? error : new Error(String(error))
      throw dbError
    }

    const genericError = new Error(
      `Failed to update task record: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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

// Application info handler
ipcMain.handle('app:get-version', async () => {
  return app.getVersion()
})

// External URL handler
ipcMain.handle('app:open-external-url', async (_, url: string) => {
  try {
    // Basic validation
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided')
    }

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      throw new Error('Empty URL provided')
    }

    // Parse and validate URL
    const parsedUrl = new URL(trimmedUrl)

    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS URLs are allowed')
    }

    // Normalize hostname once for consistent checks
    let hostname = (parsedUrl.hostname || '').toLowerCase()
    // Strip IPv6 square brackets if present
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1)
    }
    // Remove any trailing dots (e.g., 'localhost.' -> 'localhost')
    hostname = hostname.replace(/\.+$/, '')
    // Normalize IPv4-mapped IPv6 dotted-quad forms (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
    const v4Mapped = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
    if (v4Mapped) {
      hostname = v4Mapped[1] ?? hostname
    }

    // Security checks - prevent local/loopback/private network access
    const isRfc1918 =
      /^192\.168\./.test(hostname) || /^10\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)
    const isLoopbackV4 = /^127\./.test(hostname) // 127/8
    const isLinkLocalV4 = /^169\.254\./.test(hostname) // 169.254/16
    const isAnyV4 = hostname === '0.0.0.0'
    const isLocalhost = hostname === 'localhost'
    const isLoopbackV6 = hostname === '::1'
    // IPv6 link-local fe80::/10 covers fe80, fe90, fea0, feb0 prefixes
    const isLinkLocalV6 = /^fe(8|9|a|b)/i.test(hostname)
    // IPv4-mapped IPv6 (any), or mapped 127.0.0.1 suffix
    const isV4Mapped = /^::ffff:/i.test(hostname) || /127\.0\.0\.1$/.test(hostname)

    if (
      isLocalhost ||
      isLoopbackV4 ||
      isLinkLocalV4 ||
      isAnyV4 ||
      isRfc1918 ||
      isLoopbackV6 ||
      isLinkLocalV6 ||
      isV4Mapped
    ) {
      throw new Error('Local or private network URLs are not allowed')
    }

    // Ensure hostname looks valid: allow domains with dots, localhost, or IP addresses (IPv4/IPv6)
    const isIpAddress = (h: string): boolean => {
      const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/
      if (ipv4.test(h)) return true
      // Simple IPv6 heuristic: presence of ':' after normalization
      return h.includes(':')
    }
    const looksLikeDomain = hostname.includes('.')
    const isLocalHostName = hostname === 'localhost'
    if (!hostname || !(looksLikeDomain || isLocalHostName || isIpAddress(hostname))) {
      throw new Error('Invalid hostname')
    }

    await shell.openExternal(trimmedUrl)
    return true
  } catch (error) {
    console.error('Failed to open external URL:', error)
    throw new Error(`Failed to open URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
