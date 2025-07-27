import * as Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

export interface Category {
  id?: number
  name: string
  is_default?: boolean
  created_at?: string
}

export interface TaskRecord {
  id?: number
  category_name: string
  task_name: string
  start_time: string
  date: string
  created_at?: string
}

class DatabaseService {
  public db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'timecatcher.db')
    this.db = new (Database as any)(dbPath)
    this.initializeTables()
    this.initializeDefaultCategories()
  }

  private initializeTables() {
    // Create categories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Add is_default column if it doesn't exist (for existing databases)
    try {
      this.db.exec(`ALTER TABLE categories ADD COLUMN is_default BOOLEAN DEFAULT FALSE`)
    } catch (error) {
      // Column already exists, ignore error
    }

    // Create task_records table (no end_time - calculated from next record)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL,
        task_name TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  private initializeDefaultCategories() {
    const defaultCategories = ['Development', 'Meeting', 'Maintenance']
    const existingCount = this.db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
    
    if (existingCount.count === 0) {
      const insert = this.db.prepare('INSERT INTO categories (name, is_default) VALUES (?, ?)')
      defaultCategories.forEach((category, index) => {
        try {
          // Set Development (first category) as default
          insert.run(category, index === 0)
        } catch (error) {
          // Category might already exist
          console.log(`Category ${category} already exists`)
        }
      })
    } else {
      // Check if there's a default category set, if not set Development as default
      const defaultCount = this.db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_default = TRUE').get() as { count: number }
      if (defaultCount.count === 0) {
        const devCategory = this.db.prepare('SELECT id FROM categories WHERE name = ?').get('Development') as { id: number } | undefined
        if (devCategory) {
          this.db.prepare('UPDATE categories SET is_default = TRUE WHERE id = ?').run(devCategory.id)
        }
      }
    }
  }

  // Category operations
  getAllCategories(): Category[] {
    return this.db.prepare('SELECT * FROM categories ORDER BY name').all() as Category[]
  }

  addCategory(name: string): Category {
    const insert = this.db.prepare('INSERT INTO categories (name) VALUES (?)')
    const result = insert.run(name)
    return this.db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category
  }

  deleteCategory(id: number): void {
    this.db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  }

  categoryExists(name: string): boolean {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM categories WHERE name = ?').get(name) as { count: number }
    return result.count > 0
  }

  updateCategory(id: number, name: string): void {
    this.db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id)
  }

  setDefaultCategory(id: number): void {
    // First, remove default from all categories
    this.db.prepare('UPDATE categories SET is_default = FALSE').run()
    // Then set the specified category as default
    this.db.prepare('UPDATE categories SET is_default = TRUE WHERE id = ?').run(id)
  }

  getDefaultCategory(): Category | null {
    return this.db.prepare('SELECT * FROM categories WHERE is_default = TRUE').get() as Category | null
  }

  // Task record operations (for future use)
  addTaskRecord(record: Omit<TaskRecord, 'id' | 'created_at'>): TaskRecord {
    const insert = this.db.prepare(`
      INSERT INTO task_records (category_name, task_name, start_time, date) 
      VALUES (?, ?, ?, ?)
    `)
    const result = insert.run(record.category_name, record.task_name, record.start_time, record.date)
    return this.db.prepare('SELECT * FROM task_records WHERE id = ?').get(result.lastInsertRowid) as TaskRecord
  }

  getTaskRecordsByDate(date: string): TaskRecord[] {
    return this.db.prepare('SELECT * FROM task_records WHERE date = ? ORDER BY start_time').all(date) as TaskRecord[]
  }

  close() {
    this.db.close()
  }
}

export const dbService = new DatabaseService()