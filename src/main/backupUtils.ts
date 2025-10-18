import { TASK_TYPES, TASK_TYPE_END } from '../shared/types'

export interface RawCategory {
  name?: unknown
  code?: unknown
  is_default?: unknown
}

export interface NormalizedCategory {
  name: string
  code: string
  is_default: boolean
}

export interface RawTaskRecord {
  category_name?: unknown
  task_name?: unknown
  start_time?: unknown
  date?: unknown
  task_type?: unknown
  created_at?: unknown
}

export interface NormalizedTaskRecord {
  category_name: string
  task_name: string
  start_time: string
  date: string
  task_type: string
  created_at?: string
}

export function normalizeCategories(categories: any[]): NormalizedCategory[] {
  const seen = new Set<string>()
  const deduped: NormalizedCategory[] = []
  for (const c of categories as RawCategory[]) {
    const name = String((c?.name as any) ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const code = String((c?.code as any) ?? '')
      .trim()
      .substring(0, 10) // Max 10 characters
    const isDefault = Boolean(c?.is_default)
    deduped.push({ name, code, is_default: isDefault })
  }

  // Ensure a single default: prefer first marked default, otherwise first item if available
  let defaultName: string | null = null
  for (const c of deduped) {
    if (c.is_default) {
      defaultName = c.name
      break
    }
  }
  if (!defaultName && deduped.length > 0) {
    defaultName = deduped[0].name
  }
  return deduped.map(c => ({ name: c.name, code: c.code, is_default: defaultName === c.name }))
}

export function normalizeTaskRecords(records: any[]): NormalizedTaskRecord[] {
  const allowedTypes = new Set<string>((TASK_TYPES as unknown as string[]) || [])
  const endDates = new Set<string>()
  const out: NormalizedTaskRecord[] = []
  for (const r of records as RawTaskRecord[]) {
    const category_name = String((r?.category_name as any) ?? '').trim()
    const task_name = String((r?.task_name as any) ?? '').trim()
    const start_time = String((r?.start_time as any) ?? '').trim()
    const date = String((r?.date as any) ?? '').trim()
    let task_type = String((r?.task_type as any) ?? 'normal').toLowerCase()
    if (!allowedTypes.has(task_type)) task_type = 'normal'
    if (!category_name || !task_name || !start_time || !date) continue
    if (task_type === TASK_TYPE_END) {
      if (endDates.has(date)) continue
      endDates.add(date)
    }
    const created_atVal = r?.created_at
    const created_at = created_atVal == null ? undefined : String(created_atVal)
    out.push({ category_name, task_name, start_time, date, task_type, created_at })
  }
  return out
}
