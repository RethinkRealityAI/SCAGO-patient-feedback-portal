/**
 * Search, filter and sort for case-managed form dashboards (e.g. the
 * Counselling Intake Form). Pure functions so they can be tested without
 * rendering the dashboard.
 */
import { cityLabel } from '@/lib/option-labels'

type AnyRecord = Record<string, any>

/** A question the dashboard offers as a filter; set per form in `dashboardFilters`. */
export interface DashboardFilterDef {
  fieldId: string
  label: string
}

export type ReceivedRange = 'all' | '7d' | '30d' | '90d' | '365d'
export type CaseSort = 'newest' | 'oldest' | 'deadline'
export type SourceFilter = 'all' | 'portal' | 'imported'

export interface CaseFilterState {
  search: string
  status: string
  assignee: string
  received: ReceivedRange
  source: SourceFilter
  /** fieldId -> selected option value; absent or 'all' means no filter. */
  fields: Record<string, string>
  sort: CaseSort
}

export const ALL = 'all'
export const UNASSIGNED = '__unassigned'

export const DEFAULT_CASE_FILTERS: CaseFilterState = {
  search: '',
  status: ALL,
  assignee: ALL,
  received: ALL,
  source: ALL,
  fields: {},
  sort: 'newest',
}

export const RECEIVED_RANGE_LABELS: Record<ReceivedRange, string> = {
  all: 'Any time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '365d': 'Last 12 months',
}

/** How many filters (not search or sort) are narrowing the list. */
export function activeFilterCount(f: CaseFilterState): number {
  return (
    [f.status, f.assignee, f.received, f.source].filter(v => v !== ALL).length +
    Object.values(f.fields).filter(v => v && v !== ALL).length
  )
}

export function isFiltering(f: CaseFilterState): boolean {
  return f.search.trim() !== '' || activeFilterCount(f) > 0
}

// ─── Field definitions ───────────────────────────────────────────────────────

/** Every answerable field in form order, with groups flattened. */
export function flattenFields(sections: Array<{ fields?: AnyRecord[] }> | undefined): AnyRecord[] {
  const out: AnyRecord[] = []
  const visit = (field: AnyRecord) => {
    if (field.type === 'group' && Array.isArray(field.fields)) field.fields.forEach(visit)
    else out.push(field)
  }
  ;(sections || []).forEach(s => (s.fields || []).forEach(visit))
  return out
}

export interface FilterOption {
  value: string
  label: string
  count: number
}

/**
 * Options for one filter: the field's own choices in form order, then any
 * other values found in the data (free-text "Other" answers, imported
 * history). Each carries how many submissions match it.
 */
export function filterOptionsFor(field: AnyRecord | undefined, submissions: AnyRecord[], fieldId: string): FilterOption[] {
  const counts = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const s of submissions) {
    for (const { value, label } of answerValues(s[fieldId], field?.type)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
      if (!labels.has(value)) labels.set(value, label)
    }
  }

  const options: FilterOption[] = []
  const seen = new Set<string>()
  for (const o of (field?.options as AnyRecord[] | undefined) || []) {
    const value = String(o.value ?? o.label)
    seen.add(value)
    options.push({ value, label: String(o.label ?? value), count: counts.get(value) ?? 0 })
  }
  const extras = [...counts.keys()].filter(v => !seen.has(v)).sort((a, b) => (labels.get(a) || a).localeCompare(labels.get(b) || b))
  for (const value of extras) options.push({ value, label: labels.get(value) || value, count: counts.get(value) ?? 0 })
  return options
}

/** The individual values an answer holds, for filtering and counting. */
function answerValues(raw: unknown, fieldType?: string): Array<{ value: string; label: string }> {
  if (raw === null || raw === undefined || raw === '') return []
  if (Array.isArray(raw)) return raw.flatMap(v => answerValues(v, fieldType))
  if (typeof raw === 'object') {
    const o = raw as AnyRecord
    if (o.selection === 'other' && typeof o.other === 'string' && o.other.trim()) {
      const other = o.other.trim()
      return [{ value: `other:${other.toLowerCase()}`, label: other }]
    }
    if (typeof o.selection === 'string' && o.selection) {
      return [{ value: o.selection, label: fieldType === 'city-on' ? cityLabel(o.selection) : o.selection }]
    }
    return []
  }
  if (typeof raw === 'boolean') return [{ value: String(raw), label: raw ? 'Yes' : 'No' }]
  const text = String(raw).trim()
  return text ? [{ value: text, label: text }] : []
}

function answerMatches(raw: unknown, selected: string): boolean {
  return answerValues(raw).some(v => v.value === selected)
}

// ─── Search ──────────────────────────────────────────────────────────────────

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Everything about a case a person might type to find it. */
function searchableText(s: AnyRecord): string {
  const parts: string[] = []
  const add = (v: unknown) => {
    if (v === null || v === undefined) return
    if (Array.isArray(v)) return v.forEach(add)
    if (typeof v === 'object') {
      const o = v as AnyRecord
      if (typeof o.selection === 'string') parts.push(o.selection === 'other' ? '' : cityLabel(o.selection), o.selection)
      if (typeof o.other === 'string') parts.push(o.other)
      if (typeof o.text === 'string') parts.push(o.text)
      return
    }
    if (typeof v === 'string' || typeof v === 'number') parts.push(String(v))
  }
  for (const [key, value] of Object.entries(s)) {
    if (key === 'submittedAt' || key === 'sessionId' || key === 'surveyId') continue
    add(value)
  }
  return fold(parts.join(' \u0001 '))
}

/**
 * Every word in the query must appear somewhere in the case. Number-only words
 * (three or more digits) are compared against digits alone, so "416 555" finds
 * "+1 (416) 555-0100".
 */
export function matchesSearch(s: AnyRecord, query: string): boolean {
  const tokens = fold(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const text = searchableText(s)
  let digits: string | null = null
  return tokens.every(token => {
    const tokenDigits = token.replace(/\D/g, '')
    if (tokenDigits.length >= 3 && tokenDigits.length === token.replace(/[\s()+\-.]/g, '').length) {
      digits ??= text.replace(/\D/g, '')
      return digits.includes(tokenDigits)
    }
    return text.includes(token)
  })
}

// ─── Filter + sort ───────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000
const RANGE_DAYS: Record<Exclude<ReceivedRange, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }

export function submittedTime(s: AnyRecord): number {
  const raw = s.submittedAt
  const t = raw && typeof raw.toDate === 'function' ? raw.toDate().getTime() : new Date(raw).getTime()
  return Number.isNaN(t) ? 0 : t
}

export interface CaseFilterContext {
  /** The case's current status value. */
  statusOf: (s: AnyRecord) => string
  /** Milliseconds of the response deadline for open cases; Infinity when not on the clock. */
  deadlineOf: (s: AnyRecord) => number
  now?: Date
}

export function applyCaseFilters<T extends AnyRecord>(submissions: T[], f: CaseFilterState, ctx: CaseFilterContext): T[] {
  const now = (ctx.now ?? new Date()).getTime()
  const since = f.received === ALL ? null : now - RANGE_DAYS[f.received] * DAY_MS
  const fieldFilters = Object.entries(f.fields).filter(([, v]) => v && v !== ALL)

  const result = submissions.filter(s => {
    if (f.status !== ALL && ctx.statusOf(s) !== f.status) return false
    if (f.assignee !== ALL) {
      const who = typeof s.assignedTo === 'string' ? s.assignedTo.trim() : ''
      if (f.assignee === UNASSIGNED ? who !== '' : who.toLowerCase() !== f.assignee.toLowerCase()) return false
    }
    if (since !== null && submittedTime(s) < since) return false
    if (f.source === 'imported' && !s.importedFrom) return false
    if (f.source === 'portal' && s.importedFrom) return false
    for (const [fieldId, selected] of fieldFilters) {
      if (!answerMatches(s[fieldId], selected)) return false
    }
    return matchesSearch(s, f.search)
  })

  const byNewest = (a: T, b: T) => submittedTime(b) - submittedTime(a)
  if (f.sort === 'oldest') return result.sort((a, b) => -byNewest(a, b))
  if (f.sort === 'deadline') {
    return result.sort((a, b) => {
      const d = ctx.deadlineOf(a) - ctx.deadlineOf(b)
      return Number.isNaN(d) || d === 0 ? byNewest(a, b) : d
    })
  }
  return result.sort(byNewest)
}

/** Names cases are assigned to, for the assignee filter. */
export function assigneesOf(submissions: AnyRecord[], configured: string[] = []): string[] {
  const byKey = new Map<string, string>()
  for (const name of [...configured, ...submissions.map(s => s.assignedTo)]) {
    if (typeof name !== 'string' || !name.trim()) continue
    const key = name.trim().toLowerCase()
    if (!byKey.has(key)) byKey.set(key, name.trim())
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}

/** Contact details that identify a person: email, and the last 10 digits of their phone. */
function contactKeys(s: AnyRecord): string[] {
  const keys: string[] = []
  if (typeof s.email === 'string' && s.email.includes('@')) keys.push(`e:${s.email.trim().toLowerCase()}`)
  const phone = typeof s.primaryPhone === 'string' ? s.primaryPhone.replace(/\D/g, '').slice(-10) : ''
  if (phone.length === 10) keys.push(`p:${phone}`)
  return keys
}

/**
 * Which person each submission belongs to. Requests sharing an email or a
 * phone number are the same person, transitively: a request with a new email
 * but the old phone number still joins the group. Returns submission id ->
 * person key (the id of one submission in the group).
 */
export function personKeys(submissions: AnyRecord[]): Map<string, string> {
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    let root = id
    while (parent.get(root) !== root) root = parent.get(root)!
    for (let n = id; n !== root; ) { const next = parent.get(n)!; parent.set(n, root); n = next }
    return root
  }
  const firstWithKey = new Map<string, string>()
  for (const s of submissions) {
    parent.set(s.id, s.id)
    for (const key of contactKeys(s)) {
      const other = firstWithKey.get(key)
      if (other === undefined) firstWithKey.set(key, s.id)
      else parent.set(find(s.id), find(other))
    }
  }
  return new Map(submissions.map(s => [s.id, find(s.id)]))
}

/** For each submission, how many other requests the same person made, so repeat requests stand out. */
export function repeatRequestCounts(submissions: AnyRecord[]): Map<string, number> {
  const person = personKeys(submissions)
  const sizes = new Map<string, number>()
  for (const key of person.values()) sizes.set(key, (sizes.get(key) ?? 0) + 1)
  const counts = new Map<string, number>()
  for (const [id, key] of person) if (sizes.get(key)! > 1) counts.set(id, sizes.get(key)! - 1)
  return counts
}

export interface PersonGroup<T> {
  key: string
  /** The person's most recent request in the list; it heads their row. */
  latest: T
  /** Their other requests in the list, newest first. */
  earlier: T[]
}

/**
 * Collapse a list into one entry per person. Groups keep the list's order (a
 * person sits where their first request in the list did), so sorting and
 * filtering still apply; within a group the newest request leads.
 */
export function groupByPerson<T extends AnyRecord>(list: T[], person: Map<string, string>): PersonGroup<T>[] {
  const groups = new Map<string, T[]>()
  for (const s of list) {
    const key = person.get(s.id) ?? s.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }
  return [...groups].map(([key, members]) => {
    const byNewest = [...members].sort((a, b) => submittedTime(b) - submittedTime(a))
    return { key, latest: byNewest[0], earlier: byNewest.slice(1) }
  })
}

// ─── Export ──────────────────────────────────────────────────────────────────

/** RFC 4180 CSV with a BOM so Excel opens accented names correctly. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? '' : String(v)
    // Stop spreadsheet apps treating a typed answer as a formula.
    if (/^[=+\-@]/.test(s) && !/^[+-]?\d[\d\s()-]*$/.test(s)) s = `'${s}`
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')
}
