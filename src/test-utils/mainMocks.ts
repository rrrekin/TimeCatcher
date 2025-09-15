import { vi } from 'vitest'

// Electron mock state and factory
const electronState = {
  handlers: {} as Record<string, Function>,
  showOpenDialogMock: vi.fn(),
  showSaveDialogMock: vi.fn(),
  showErrorBoxMock: vi.fn()
}

export const electronMockFactory = () => ({
  app: {
    whenReady: () => Promise.resolve(),
    isPackaged: false,
    on: vi.fn()
  },
  BrowserWindow: class {
    loadURL = vi.fn()
    loadFile = vi.fn()
    webContents = { openDevTools: vi.fn() }
    constructor(_: any) {}
  },
  ipcMain: {
    handle: (channel: string, fn: Function) => {
      electronState.handlers[channel] = fn
    }
  },
  shell: { openExternal: vi.fn() },
  dialog: {
    showOpenDialog: (...args: any[]) => electronState.showOpenDialogMock(...args),
    showSaveDialog: (...args: any[]) => electronState.showSaveDialogMock(...args),
    showErrorBox: (...args: any[]) => electronState.showErrorBoxMock(...args)
  },
  __handlers: electronState.handlers
})

// FS mock state and factory
const fsState = {
  readFileMock: vi.fn(),
  writeFileMock: vi.fn()
}

export const fsMockFactory = () => ({
  promises: {
    readFile: (...args: any[]) => fsState.readFileMock(...args),
    writeFile: (...args: any[]) => fsState.writeFileMock(...args)
  }
})

// Database mock state and factory
const dbState = {
  calls: {} as Record<string, any[][]>,
  selectCategories: [] as any[],
  selectTaskRecords: [] as any[]
}

const prepare = (sql: string) => {
  const obj: any = {
    run: (...args: any[]) => {
      if (!dbState.calls[sql]) dbState.calls[sql] = []
      dbState.calls[sql].push(args)
      return {}
    },
    all: vi.fn(),
    get: vi.fn()
  }
  if (/SELECT/i.test(sql) && /FROM\s+categories/i.test(sql)) {
    obj.all = vi.fn(() => dbState.selectCategories)
  }
  if (/SELECT/i.test(sql) && /FROM\s+task_records/i.test(sql)) {
    obj.all = vi.fn(() => dbState.selectTaskRecords)
  }
  return obj
}

const transaction = (fn: Function) => (arg: any) => fn(arg)

export const databaseMockFactory = () => ({
  dbService: {
    db: { prepare, transaction }
  },
  getDbCalls: () => dbState.calls
})

export const resetMainMocks = () => {
  // Electron
  electronState.showOpenDialogMock.mockReset()
  electronState.showSaveDialogMock.mockReset()
  electronState.showErrorBoxMock.mockReset()
  for (const k of Object.keys(electronState.handlers)) delete electronState.handlers[k]
  // FS
  fsState.readFileMock.mockReset()
  fsState.writeFileMock.mockReset()
  // DB
  for (const k of Object.keys(dbState.calls)) delete dbState.calls[k]
  dbState.selectCategories = []
  dbState.selectTaskRecords = []
}

export const mainMockState = { electron: electronState, fs: fsState, db: dbState }
