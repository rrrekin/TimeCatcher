import { describe, it, expect } from 'vitest'
import { normalizeCategories, normalizeTaskRecords } from './backupUtils'

describe('backupUtils - normalizeCategories', () => {
  it('dedupes categories by trimmed name and keeps a single default', () => {
    const input = [
      { name: 'Dev', is_default: true },
      { name: 'Dev ' },
      { name: 'Personal', is_default: true },
      { name: 'Meetings' },
      { name: '  ' },
      { name: null }
    ]

    const out = normalizeCategories(input as any)
    // Should keep Dev, Personal, Meetings (unique names)
    expect(out.map(c => c.name)).toEqual(['Dev', 'Personal', 'Meetings'])
    // First default wins: Dev should be default, others false
    expect(out).toEqual([
      { name: 'Dev', is_default: true },
      { name: 'Personal', is_default: false },
      { name: 'Meetings', is_default: false }
    ])
  })

  it('assigns first as default when none provided', () => {
    const input = [{ name: 'A' }, { name: 'B' }]
    const out = normalizeCategories(input as any)
    expect(out).toEqual([
      { name: 'A', is_default: true },
      { name: 'B', is_default: false }
    ])
  })
})

describe('backupUtils - normalizeTaskRecords', () => {
  it('validates task_type and defaults to normal when invalid', () => {
    const input = [
      { category_name: 'Dev', task_name: 'T', start_time: '10:00', date: '2024-01-01', task_type: 'weird' }
    ]
    const out = normalizeTaskRecords(input as any)
    expect(out[0].task_type).toBe('normal')
  })

  it('skips invalid/missing required fields', () => {
    const input = [
      { category_name: '', task_name: 'T', start_time: '10:00', date: '2024-01-01', task_type: 'normal' },
      { category_name: 'Dev', task_name: '', start_time: '10:00', date: '2024-01-01', task_type: 'normal' },
      { category_name: 'Dev', task_name: 'T', start_time: '', date: '2024-01-01', task_type: 'normal' },
      { category_name: 'Dev', task_name: 'T', start_time: '10:00', date: '', task_type: 'normal' },
      { category_name: 'Dev', task_name: 'T', start_time: '10:00', date: '2024-01-01', task_type: 'normal' }
    ]
    const out = normalizeTaskRecords(input as any)
    expect(out).toHaveLength(1)
    expect(out[0].category_name).toBe('Dev')
  })

  it('keeps only the first END record per date', () => {
    const input = [
      { category_name: 'Dev', task_name: 'End', start_time: '18:00', date: '2024-01-01', task_type: 'end' },
      { category_name: 'Dev', task_name: 'End 2', start_time: '19:00', date: '2024-01-01', task_type: 'end' },
      { category_name: 'Dev', task_name: 'End2 day2', start_time: '19:00', date: '2024-01-02', task_type: 'end' }
    ]
    const out = normalizeTaskRecords(input as any)
    const ends = out.filter(r => r.task_type === 'end')
    expect(ends).toHaveLength(2)
    // Preserve first end per day
    expect(ends[0]).toMatchObject({ date: '2024-01-01', task_name: 'End' })
    expect(ends[1]).toMatchObject({ date: '2024-01-02', task_name: 'End2 day2' })
  })

  it('preserves created_at if provided', () => {
    const input = [
      {
        category_name: 'Dev',
        task_name: 'T',
        start_time: '10:00',
        date: '2024-01-01',
        task_type: 'normal',
        created_at: '2024-01-01T10:00:00Z'
      }
    ]
    const out = normalizeTaskRecords(input as any)
    expect(out[0].created_at).toBe('2024-01-01T10:00:00Z')
  })
})
