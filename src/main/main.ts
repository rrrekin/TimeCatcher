import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { dbService } from './database'

const isDevelopment = process.env.NODE_ENV !== 'production'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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
ipcMain.handle('db:get-categories', () => {
  return dbService.getAllCategories()
})

ipcMain.handle('db:add-category', (_, name: string) => {
  return dbService.addCategory(name)
})

ipcMain.handle('db:delete-category', (_, id: number) => {
  return dbService.deleteCategory(id)
})

ipcMain.handle('db:category-exists', (_, name: string) => {
  return dbService.categoryExists(name)
})

ipcMain.handle('db:update-category', (_, id: number, name: string) => {
  return dbService.updateCategory(id, name)
})

ipcMain.handle('db:set-default-category', (_, id: number) => {
  return dbService.setDefaultCategory(id)
})

ipcMain.handle('db:get-default-category', () => {
  return dbService.getDefaultCategory()
})

// Debug handler to view all data
ipcMain.handle('db:debug-all', () => {
  return {
    categories: dbService.getAllCategories(),
    taskRecords: dbService.db.prepare('SELECT * FROM task_records').all()
  }
})