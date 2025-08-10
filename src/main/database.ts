import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { Category, TaskRecord, TaskType, SPECIAL_TASK_CATEGORY } from '../shared/types'

class DatabaseService {
  public db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'timecatcher.db')
    this.db = new Database(dbPath)
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

    // Create task_records table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL,
        task_name TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        date TEXT NOT NULL,
        task_type TEXT DEFAULT 'normal' CHECK (task_type IN ('normal', 'pause', 'end')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create unique index to enforce one end task per day
    this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_end_per_day ON task_records(date) WHERE task_type = 'end'`)
  }

  private initializeDefaultCategories() {
    const defaultCategories = ['Development', 'Meeting', 'Maintenance']
    const existingCount = this.db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
    
    console.log('Initializing default categories, existing count:', existingCount.count)
    
    if (existingCount.count === 0) {
      console.log('No categories found, creating default categories...')
      const insert = this.db.prepare('INSERT INTO categories (name, is_default) VALUES (?, ?)')
      defaultCategories.forEach((category, index) => {
        try {
          // Set Development (first category) as default - use 1/0 for SQLite boolean
          const isDefault = index === 0 ? 1 : 0
          console.log(`Creating category: ${category}, is_default: ${isDefault}`)
          insert.run(category, isDefault)
        } catch (error) {
          // Category might already exist
          console.log(`Category ${category} already exists:`, error)
        }
      })
      console.log('Default categories creation completed')
    } else {
      console.log('Categories exist, checking for default category...')
      // Check if there's a default category set, if not set Development as default
      const defaultCount = this.db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_default = TRUE').get() as { count: number }
      console.log('Default categories count:', defaultCount.count)
      if (defaultCount.count === 0) {
        const devCategory = this.db.prepare('SELECT id FROM categories WHERE name = ?').get('Development') as { id: number } | undefined
        if (devCategory) {
          console.log('Setting Development as default category')
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
    // Check if this is the default category
    const defaultCategory = this.getDefaultCategory()
    if (defaultCategory && defaultCategory.id === id) {
      throw new Error('Cannot delete the default category. Please set another category as default first.')
    }
    
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
    // Use a transaction to ensure atomicity of both updates
    const transaction = this.db.transaction(() => {
      // First, remove default from all categories
      this.db.prepare('UPDATE categories SET is_default = FALSE').run()
      // Then set the specified category as default
      this.db.prepare('UPDATE categories SET is_default = TRUE WHERE id = ?').run(id)
    })
    
    // Execute the transaction
    transaction()
  }

  getDefaultCategory(): Category | null {
    return this.db.prepare('SELECT * FROM categories WHERE is_default = TRUE').get() as Category | null
  }

  // Task record operations
  addTaskRecord(record: Omit<TaskRecord, 'id' | 'created_at'>): TaskRecord {
    const insert = this.db.prepare(`
      INSERT INTO task_records (category_name, task_name, start_time, date, task_type) 
      VALUES (?, ?, ?, ?, ?)
    `)
    // Use sentinel value for special tasks (when category_name is empty)
    const categoryName = record.category_name === '' ? SPECIAL_TASK_CATEGORY : record.category_name
    const result = insert.run(categoryName, record.task_name, record.start_time, record.date, record.task_type || 'normal')
    return this.db.prepare('SELECT * FROM task_records WHERE id = ?').get(result.lastInsertRowid) as TaskRecord
  }

  getTaskRecordsByDate(date: string): TaskRecord[] {
    return this.db.prepare(`
      SELECT * FROM task_records 
      WHERE date = ? 
      ORDER BY start_time
    `).all(date) as TaskRecord[]
  }

  updateTaskRecord(id: number, record: Partial<Omit<TaskRecord, 'id' | 'created_at'>>): void {
    const fields: string[] = []
    const values: any[] = []
    
    if (record.category_name !== undefined) {
      fields.push('category_name = ?')
      values.push(record.category_name)
    }
    if (record.task_name !== undefined) {
      fields.push('task_name = ?')
      values.push(record.task_name)
    }
    if (record.start_time !== undefined) {
      fields.push('start_time = ?')
      values.push(record.start_time)
    }
    if (record.date !== undefined) {
      fields.push('date = ?')
      values.push(record.date)
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update')
    }
    
    values.push(id)
    const sql = `UPDATE task_records SET ${fields.join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...values)
  }

  deleteTaskRecord(id: number): void {
    this.db.prepare('DELETE FROM task_records WHERE id = ?').run(id)
  }

  close() {
    this.db.close()
  }
}

export const dbService = new DatabaseService()