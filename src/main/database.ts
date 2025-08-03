import Database from 'better-sqlite3'
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

    // Add is_default column if it doesn't exist (for existing databases)
    try {
      this.db.exec(`ALTER TABLE categories ADD COLUMN is_default BOOLEAN DEFAULT FALSE`)
    } catch (error: any) {
      // Only ignore "duplicate column name" errors - SQLite error code SQLITE_ERROR (1)
      // with message containing "duplicate column name"
      if (error?.message?.includes('duplicate column name') || 
          error?.message?.includes('column already exists')) {
        // Column already exists, safe to ignore
        console.log('is_default column already exists, skipping migration')
      } else {
        // Re-throw any other database errors for proper debugging
        console.error('Failed to add is_default column:', error)
        throw error
      }
    }

    // Migration: Convert from category_id to category_name if needed
    try {
      // First, create the table with old schema if it doesn't exist (for new installations)
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

      // Check if the table has category_id column (old schema that needs migration)
      const columns = this.db.prepare("PRAGMA table_info(task_records)").all() as any[]
      const hasCategoryId = columns.some((col: any) => col.name === 'category_id')
      const hasCategoryName = columns.some((col: any) => col.name === 'category_name')


      if (hasCategoryId && !hasCategoryName) {
        console.log('Migrating task_records from category_id to category_name...')
        
        // Use transaction for atomic migration
        const migration = this.db.transaction(() => {
          // Add category_name column
          this.db.exec(`ALTER TABLE task_records ADD COLUMN category_name TEXT`)
          
          // Get the default category name to use for orphaned records
          const defaultCategory = this.db.prepare('SELECT name FROM categories WHERE is_default = 1 LIMIT 1').get() as { name: string } | undefined
          const fallbackCategoryName = defaultCategory?.name || 'Development'
          
          // Populate category_name from category_id for valid category references
          const updateValidRecords = this.db.prepare(`
            UPDATE task_records 
            SET category_name = (
              SELECT name FROM categories WHERE id = task_records.category_id
            ) 
            WHERE category_name IS NULL 
            AND category_id IN (SELECT id FROM categories)
          `)
          updateValidRecords.run()
          
          // Handle orphaned records (category_id doesn't exist in categories table)
          const updateOrphanedRecords = this.db.prepare(`
            UPDATE task_records 
            SET category_name = ?
            WHERE category_name IS NULL
          `)
          const orphanedCount = updateOrphanedRecords.run(fallbackCategoryName).changes
          
          if (orphanedCount > 0) {
            console.log(`Fixed ${orphanedCount} orphaned records with invalid category_id, assigned to: ${fallbackCategoryName}`)
          }
          
          // Create new table with correct schema
          this.db.exec(`
            CREATE TABLE task_records_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              category_name TEXT NOT NULL,
              task_name TEXT NOT NULL,
              start_time DATETIME NOT NULL,
              date TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `)
          
          // Copy all data to new table (all records should now have category_name)
          const copyResult = this.db.exec(`
            INSERT INTO task_records_new (id, category_name, task_name, start_time, date, created_at)
            SELECT id, category_name, task_name, start_time, date, created_at FROM task_records
            WHERE category_name IS NOT NULL
          `)
          
          // Verify no data was lost during migration
          const originalCount = this.db.prepare('SELECT COUNT(*) as count FROM task_records').get() as { count: number }
          const newCount = this.db.prepare('SELECT COUNT(*) as count FROM task_records_new').get() as { count: number }
          
          if (originalCount.count !== newCount.count) {
            throw new Error(`Migration data loss detected: original=${originalCount.count}, migrated=${newCount.count}`)
          }
          
          // Drop old table and rename new one
          this.db.exec(`DROP TABLE task_records`)
          this.db.exec(`ALTER TABLE task_records_new RENAME TO task_records`)
        })
        
        // Execute the migration transaction
        migration()
        
        console.log('Migration from category_id to category_name completed successfully with transaction safety')
      }
    } catch (error: any) {
      console.error('Migration error:', error)
      // If migration fails, continue with existing table structure
    }
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
      INSERT INTO task_records (category_name, task_name, start_time, date) 
      VALUES (?, ?, ?, ?)
    `)
    const result = insert.run(record.category_name, record.task_name, record.start_time, record.date)
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

  close() {
    this.db.close()
  }
}

export const dbService = new DatabaseService()