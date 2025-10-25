import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted state and inline mocks to avoid TDZ issues under Node 24
const h = vi.hoisted(() => {
  const electronState = {
    handlers: {} as Record<string, Function>,
    showOpenDialogMock: vi.fn(),
    showSaveDialogMock: vi.fn(),
    showErrorBoxMock: vi.fn()
  }
  const fsState = {
    readFileMock: vi.fn(),
    writeFileMock: vi.fn()
  }
  const dbState = {
    calls: {} as Record<string, any[][]>,
    selectCategories: [] as any[],
    selectTaskRecords: [] as any[]
  }
  return { electronState, fsState, dbState }
})

vi.mock('electron', () => {
  const { electronState } = h
  return {
    app: {
      whenReady: () => Promise.resolve(),
      isPackaged: false,
      on: () => {}
    },
    BrowserWindow: class {
      static getAllWindows() {
        return []
      }
      loadURL() {}
      loadFile() {}
      webContents = { openDevTools() {} }
      on() {} // Add missing event listener method
      constructor(_: any) {}
    },
    ipcMain: {
      handle: (channel: string, handler: Function) => {
        h.electronState.handlers[channel] = handler
      }
    },
    shell: { openExternal() {} },
    dialog: {
      showOpenDialog: (...args: any[]) => h.electronState.showOpenDialogMock(...args),
      showSaveDialog: (...args: any[]) => h.electronState.showSaveDialogMock(...args),
      showErrorBox: (...args: any[]) => h.electronState.showErrorBoxMock(...args)
    }
  }
})

vi.mock('fs', () => {
  const { fsState } = h
  const promises = {
    readFile: fsState.readFileMock,
    writeFile: fsState.writeFileMock
  }
  return { promises, default: { promises } }
})

vi.mock('./database', () => {
  const prepare = (sql: string) => {
    const obj: any = {
      run: (...args: any[]) => {
        if (!h.dbState.calls[sql]) h.dbState.calls[sql] = []
        h.dbState.calls[sql].push(args)
        return {}
      },
      all: () => [],
      get: () => undefined
    }
    if (/SELECT/i.test(sql) && /FROM\s+categories/i.test(sql)) {
      obj.all = () => h.dbState.selectCategories
    }
    if (/SELECT/i.test(sql) && /FROM\s+task_records/i.test(sql)) {
      obj.all = () => h.dbState.selectTaskRecords
    }
    return obj
  }
  const transaction = (fn: Function) => (arg: any) => fn(arg)
  const getDbCalls = () => h.dbState.calls
  return { dbService: { db: { prepare, transaction } }, getDbCalls }
})

// Load main to register handlers with the mocks - use dynamic import in test setup
let mainModule: any = null

// Avoid requiring the mocked modules directly to prevent CJS interop quirks

describe('Restore integration (normalized insertions)', () => {
  beforeEach(async () => {
    // Load main module to register handlers if not already loaded
    if (!mainModule) {
      mainModule = await import('./main')
    }

    // Reset mock state, but keep registered handlers
    h.electronState.showOpenDialogMock.mockReset()
    h.electronState.showSaveDialogMock.mockReset()
    h.electronState.showErrorBoxMock.mockReset()
    for (const k of Object.keys(h.dbState.calls)) delete h.dbState.calls[k]
    h.dbState.selectCategories = []
    h.dbState.selectTaskRecords = []
    h.fsState.readFileMock.mockReset()
    h.fsState.writeFileMock.mockReset()
  })

  it('inserts deduped categories with code field and skips duplicate END per day without errors', async () => {
    const backup = {
      version: 1,
      settings: {},
      database: {
        categories: [
          { name: 'Dev', code: 'DEV', is_default: true },
          { name: 'Dev', code: 'DEV' },
          { name: 'Personal', code: 'PER', is_default: true },
          { name: 'Meetings', code: '' }
        ],
        task_records: [
          { category_name: 'Dev', task_name: 'Start', start_time: '09:00', date: '2024-01-01', task_type: 'normal' },
          { category_name: 'Dev', task_name: 'End', start_time: '18:00', date: '2024-01-01', task_type: 'end' },
          {
            category_name: 'Dev',
            task_name: 'End duplicate',
            start_time: '19:00',
            date: '2024-01-01',
            task_type: 'end'
          },
          {
            category_name: 'Personal',
            task_name: 'End day2',
            start_time: '18:00',
            date: '2024-01-02',
            task_type: 'end'
          },
          {
            category_name: 'Meetings',
            task_name: 'Weird type',
            start_time: '11:00',
            date: '2024-01-03',
            task_type: 'unknown'
          }
        ]
      }
    }

    h.electronState.showOpenDialogMock.mockResolvedValue({ canceled: false, filePaths: ['dummy.json'] })
    h.fsState.readFileMock.mockResolvedValue(JSON.stringify(backup))

    const restoreHandler = h.electronState.handlers['app:restore']
    expect(typeof restoreHandler).toBe('function')
    const res = await restoreHandler()
    expect(res?.ok).toBe(true)

    const sqlCalls = h.dbState.calls
    expect(sqlCalls['DELETE FROM task_records']).toBeTruthy()
    expect(sqlCalls['DELETE FROM categories']).toBeTruthy()

    const catInserts = sqlCalls['INSERT INTO categories (name, code, is_default) VALUES (?, ?, ?)'] || []
    expect(catInserts.length).toBe(3)
    const defaultCount = catInserts.reduce((acc, args) => acc + (args[2] ? 1 : 0), 0)
    expect(defaultCount).toBe(1)
    // Verify code column is properly inserted
    const devCategory = catInserts.find(args => args[0] === 'Dev')
    expect(devCategory).toBeDefined()
    expect(devCategory?.[1]).toBe('DEV')
    const personalCategory = catInserts.find(args => args[0] === 'Personal')
    expect(personalCategory).toBeDefined()
    expect(personalCategory?.[1]).toBe('PER')
    const meetingsCategory = catInserts.find(args => args[0] === 'Meetings')
    expect(meetingsCategory).toBeDefined()
    expect(meetingsCategory?.[1]).toBe('')

    const recInsert =
      sqlCalls[
        'INSERT INTO task_records (category_name, task_name, start_time, date, task_type)\n         VALUES (?, ?, ?, ?, ?)'
      ] || []
    const recInsertWithCreated =
      sqlCalls[
        'INSERT INTO task_records (category_name, task_name, start_time, date, task_type, created_at)\n         VALUES (?, ?, ?, ?, ?, ?)'
      ] || []
    const allRecInserts = [...recInsert, ...recInsertWithCreated]
    expect(allRecInserts.length).toBe(4)
    const endDateCounts: Record<string, number> = {}
    for (const args of allRecInserts) {
      const date = args[3]
      const type = args[4]
      if (type === 'end') endDateCounts[date] = (endDateCounts[date] || 0) + 1
    }
    expect(endDateCounts['2024-01-01']).toBe(1)
    expect(endDateCounts['2024-01-02']).toBe(1)

    expect(h.electronState.showErrorBoxMock).not.toHaveBeenCalled()
  })

  it('restores old backup format without code field successfully (backward compatibility)', async () => {
    const oldBackup = {
      version: 1,
      settings: {},
      database: {
        categories: [
          { name: 'Dev', is_default: true }, // no code field
          { name: 'Personal', is_default: false },
          { name: 'Meetings' }
        ],
        task_records: [
          {
            category_name: 'Dev',
            task_name: 'Legacy task',
            start_time: '09:00',
            date: '2024-01-01',
            task_type: 'normal'
          }
        ]
      }
    }

    h.electronState.showOpenDialogMock.mockResolvedValue({ canceled: false, filePaths: ['old-backup.json'] })
    h.fsState.readFileMock.mockResolvedValue(JSON.stringify(oldBackup))

    const restoreHandler = h.electronState.handlers['app:restore']
    expect(typeof restoreHandler).toBe('function')
    const res = await restoreHandler()
    expect(res?.ok).toBe(true)

    const sqlCalls = h.dbState.calls
    const catInserts = sqlCalls['INSERT INTO categories (name, code, is_default) VALUES (?, ?, ?)'] || []
    expect(catInserts.length).toBe(3)

    // Verify that categories without code field get empty string default
    const devCategory = catInserts.find(args => args[0] === 'Dev')
    expect(devCategory).toBeDefined()
    expect(devCategory?.[1]).toBe('') // code defaults to empty string

    const personalCategory = catInserts.find(args => args[0] === 'Personal')
    expect(personalCategory).toBeDefined()
    expect(personalCategory?.[1]).toBe('') // code defaults to empty string

    const meetingsCategory = catInserts.find(args => args[0] === 'Meetings')
    expect(meetingsCategory).toBeDefined()
    expect(meetingsCategory?.[1]).toBe('') // code defaults to empty string

    expect(h.electronState.showErrorBoxMock).not.toHaveBeenCalled()
  })
})

describe('Backup integration', () => {
  beforeEach(async () => {
    // Load main module to register handlers if not already loaded
    if (!mainModule) {
      mainModule = await import('./main')
    }
  })

  it('returns { cancelled: true } when user cancels save dialog', async () => {
    h.electronState.showSaveDialogMock.mockReset()
    h.electronState.showSaveDialogMock.mockResolvedValue({ canceled: true, filePath: undefined })

    const backupHandler = h.electronState.handlers['app:backup']
    expect(typeof backupHandler).toBe('function')

    const res = await backupHandler({}, { theme: 'dark' })
    expect(res).toEqual({ cancelled: true })
    expect(h.fsState.writeFileMock.mock.calls.length).toBe(0)
  })

  it('creates backup JSON with expected shape including code column', async () => {
    h.electronState.showSaveDialogMock.mockReset()
    h.electronState.showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: 'backup.json' })

    h.dbState.selectCategories = [
      { id: 1, name: 'Dev', code: 'DEV', is_default: 1, created_at: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Personal', code: '', is_default: 0, created_at: '2024-01-01T00:00:00Z' }
    ]
    h.dbState.selectTaskRecords = [
      {
        id: 1,
        category_name: 'Dev',
        task_name: 'Start',
        start_time: '09:00',
        date: '2024-01-01',
        task_type: 'normal',
        created_at: '2024-01-01T09:00:00Z'
      }
    ]

    h.fsState.writeFileMock.mockReset()

    const backupHandler = h.electronState.handlers['app:backup']
    expect(typeof backupHandler).toBe('function')

    const res = await backupHandler(
      {},
      { theme: 'dark', targetWorkHours: 7, reportingAppButtonText: 'Tempo', reportingAppUrl: 'https://test' }
    )
    expect(res).toEqual({ ok: true })
    expect(h.fsState.writeFileMock).toHaveBeenCalledTimes(1)
    const args = h.fsState.writeFileMock.mock.calls[0]
    expect(args[0]).toBe('backup.json')
    const json = JSON.parse(args[1])
    expect(json.version).toBe(1)
    expect(json.settings).toMatchObject({
      theme: 'dark',
      targetWorkHours: 7,
      reportingAppButtonText: 'Tempo',
      reportingAppUrl: 'https://test'
    })
    expect(Array.isArray(json.database.categories)).toBe(true)
    expect(Array.isArray(json.database.task_records)).toBe(true)
    expect(json.database.categories.length).toBe(2)
    expect(json.database.task_records.length).toBe(1)
    // Verify code column is included in backup
    expect(json.database.categories[0]).toMatchObject({ name: 'Dev', code: 'DEV' })
    expect(json.database.categories[1]).toMatchObject({ name: 'Personal', code: '' })
  })
})
