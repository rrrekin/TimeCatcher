import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { promises as fsp } from 'fs'
import { join } from 'path'
import { dbService } from './database'
import { normalizeCategories, normalizeTaskRecords } from './backupUtils'
import { TASK_TYPE_END, TASK_TYPES } from '../shared/types'
import type { TaskRecord, TaskRecordInsert, TaskRecordUpdate, DatabaseError, SettingsSnapshot } from '../shared/types'

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

ipcMain.handle('db:delete-old-task-records', async (_, cutoffDate: string) => {
  try {
    return dbService.deleteOldTaskRecords(cutoffDate)
  } catch (error) {
    console.error('Failed to delete old task records:', error)
    throw new Error(`Failed to delete old task records: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

// Backup handler
ipcMain.handle('app:backup', async (_evt, settings: SettingsSnapshot) => {
  try {
    const defaultPath = `timecatcher-backup-${new Date().toISOString().slice(0, 10)}.json`
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save TimeCatcher Backup',
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) {
      return { cancelled: true }
    }

    // Collect database snapshot
    const categories = dbService.db.prepare('SELECT id, name, is_default, created_at FROM categories ORDER BY id').all()
    const taskRecords = dbService.db
      .prepare(
        `SELECT id, category_name, task_name, start_time, date, task_type, created_at 
         FROM task_records ORDER BY id`
      )
      .all()

    const backup = {
      version: 1,
      settings: settings ?? {},
      database: {
        categories,
        task_records: taskRecords
      }
    }

    await fsp.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8')
    return { ok: true }
  } catch (error: any) {
    console.error('Backup failed:', error)
    dialog.showErrorBox('Backup failed', error?.message || 'Unknown error')
    return { ok: false, error: error?.message || 'Backup failed' }
  }
})

// Restore handler
ipcMain.handle('app:restore', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Restore TimeCatcher Backup',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePaths || filePaths.length === 0) {
      return { ok: false, cancelled: true }
    }
    const filePath = filePaths[0]
    const raw = await fsp.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)

    // Validate backup shape
    const validate = (data: any): { ok: boolean; error?: string } => {
      if (!data || typeof data !== 'object') return { ok: false, error: 'Invalid backup file' }
      if (data.version !== 1) return { ok: false, error: 'Unsupported backup version' }
      if (!data.database || typeof data.database !== 'object') return { ok: false, error: 'Missing database section' }
      const db = data.database
      if (!Array.isArray(db.categories) || !Array.isArray(db.task_records))
        return { ok: false, error: 'Invalid database content' }
      return { ok: true }
    }
    const result = validate(parsed)
    if (!result.ok) {
      dialog.showErrorBox('Restore failed', result.error || 'Invalid backup')
      return { ok: false, error: result.error || 'Invalid backup' }
    }

    // Import into database in a transaction
    const trx = dbService.db.transaction((backup: any) => {
      dbService.db.prepare('DELETE FROM task_records').run()
      dbService.db.prepare('DELETE FROM categories').run()

      // Restore categories using normalization helper
      const insertCat = dbService.db.prepare('INSERT INTO categories (name, is_default) VALUES (?, ?)')
      const normCats = normalizeCategories(backup.database.categories)
      for (const c of normCats) {
        insertCat.run(c.name, c.is_default ? 1 : 0)
      }

      // Restore task records
      // Prefer preserving created_at if present, otherwise use default
      const insertRecWithCreated = dbService.db.prepare(
        `INSERT INTO task_records (category_name, task_name, start_time, date, task_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      const insertRec = dbService.db.prepare(
        `INSERT INTO task_records (category_name, task_name, start_time, date, task_type)
         VALUES (?, ?, ?, ?, ?)`
      )
      const normRecs = normalizeTaskRecords(backup.database.task_records)
      for (const r of normRecs) {
        if (r.created_at) {
          insertRecWithCreated.run(r.category_name, r.task_name, r.start_time, r.date, r.task_type, r.created_at)
        } else {
          insertRec.run(r.category_name, r.task_name, r.start_time, r.date, r.task_type)
        }
      }
    })

    trx(parsed)

    return { ok: true, settings: parsed.settings ?? {} }
  } catch (error: any) {
    console.error('Restore failed:', error)
    dialog.showErrorBox('Restore failed', error?.message || 'Unknown error')
    return { ok: false, error: error?.message || 'Restore failed' }
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
