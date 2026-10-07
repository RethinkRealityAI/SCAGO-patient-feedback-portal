'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, ListFilter, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  ALL,
  DEFAULT_CASE_FILTERS,
  RECEIVED_RANGE_LABELS,
  UNASSIGNED,
  activeFilterCount,
  isFiltering,
  type CaseFilterState,
  type CaseSort,
  type FilterOption,
  type ReceivedRange,
  type SourceFilter,
} from '@/lib/case-filters'

export interface FieldFilter {
  fieldId: string
  label: string
  options: FilterOption[]
}

interface CaseFilterBarProps {
  filters: CaseFilterState
  onChange: (next: CaseFilterState) => void
  statuses: Array<{ value: string; label: string }>
  assignees: string[]
  fieldFilters: FieldFilter[]
  /** Offer the Portal / Imported filter only when there is imported history. */
  showSource: boolean
  shown: number
  total: number
  onExport: () => void
}

const SORT_LABELS: Record<CaseSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  deadline: 'Deadline soonest',
}

const SOURCE_LABELS: Record<SourceFilter, string> = {
  all: 'All sources',
  portal: 'Submitted on the portal',
  imported: 'Imported history',
}

function FilterSelect({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
}) {
  const active = value !== ALL
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-label={label}
          className={cn('h-9 text-sm', active && 'border-primary/60 bg-primary/5 font-medium text-foreground')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

export function CaseFilterBar({
  filters,
  onChange,
  statuses,
  assignees,
  fieldFilters,
  showSource,
  shown,
  total,
  onExport,
}: CaseFilterBarProps) {
  const activeCount = activeFilterCount(filters)
  const [open, setOpen] = useState(activeCount > 0)
  const [searchDraft, setSearchDraft] = useState(filters.search)
  const searchRef = useRef<HTMLInputElement>(null)

  // Typing filters as you go, without re-filtering on every keystroke.
  const committedSearch = useRef(filters.search)
  useEffect(() => {
    if (searchDraft === filters.search) return
    const t = setTimeout(() => {
      committedSearch.current = searchDraft
      onChange({ ...filters, search: searchDraft })
    }, 150)
    return () => clearTimeout(t)
  }, [searchDraft, filters, onChange])

  // Follow a search cleared from outside (e.g. the empty-state "Clear" button).
  useEffect(() => {
    if (filters.search !== committedSearch.current) {
      committedSearch.current = filters.search
      setSearchDraft(filters.search)
    }
  }, [filters.search])

  // "/" jumps to search, as in most admin tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const set = (patch: Partial<CaseFilterState>) => onChange({ ...filters, ...patch })
  const setField = (fieldId: string, value: string) => set({ fields: { ...filters.fields, [fieldId]: value } })
  const clearAll = () => {
    setSearchDraft('')
    onChange({ ...DEFAULT_CASE_FILTERS, sort: filters.sort })
  }

  // Chips for what's applied, so a narrowed list is never a mystery.
  const chips: Array<{ key: string; label: string; clear: () => void }> = []
  if (filters.status !== ALL) {
    chips.push({ key: 'status', label: `Status: ${statuses.find(s => s.value === filters.status)?.label ?? filters.status}`, clear: () => set({ status: ALL }) })
  }
  if (filters.assignee !== ALL) {
    chips.push({ key: 'assignee', label: filters.assignee === UNASSIGNED ? 'Unassigned' : `Assigned: ${filters.assignee}`, clear: () => set({ assignee: ALL }) })
  }
  if (filters.received !== ALL) {
    chips.push({ key: 'received', label: RECEIVED_RANGE_LABELS[filters.received], clear: () => set({ received: ALL }) })
  }
  if (filters.source !== ALL) {
    chips.push({ key: 'source', label: SOURCE_LABELS[filters.source], clear: () => set({ source: ALL }) })
  }
  for (const f of fieldFilters) {
    const v = filters.fields[f.fieldId]
    if (v && v !== ALL) {
      chips.push({ key: f.fieldId, label: `${f.label}: ${f.options.find(o => o.value === v)?.label ?? v}`, clear: () => setField(f.fieldId, ALL) })
    }
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setSearchDraft('') }}
            placeholder="Search name, email, phone, city, notes…"
            aria-label="Search cases"
            className="h-10 pl-9 pr-9"
          />
          {searchDraft && (
            <button
              type="button"
              onClick={() => { setSearchDraft(''); searchRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={filters.sort} onValueChange={v => set({ sort: v as CaseSort })}>
            <SelectTrigger aria-label="Sort" className="h-10 w-full sm:w-[11.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as CaseSort[]).map(s => (
                <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={open || activeCount > 0 ? 'secondary' : 'outline'}
            className="h-10 shrink-0 gap-2"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls="case-filter-panel"
          >
            <ListFilter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
          <Button type="button" variant="outline" className="h-10 shrink-0 gap-2" onClick={onExport} disabled={shown === 0} title="Download the cases shown as a spreadsheet">
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Export</span>
          </Button>
        </div>
      </div>

      {open && (
        <div id="case-filter-panel" className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Status" value={filters.status} onValueChange={v => set({ status: v })}>
            <SelectItem value={ALL}>Any status</SelectItem>
            {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Assigned to" value={filters.assignee} onValueChange={v => set({ assignee: v })}>
            <SelectItem value={ALL}>Anyone</SelectItem>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Received" value={filters.received} onValueChange={v => set({ received: v as ReceivedRange })}>
            {(Object.keys(RECEIVED_RANGE_LABELS) as ReceivedRange[]).map(r => (
              <SelectItem key={r} value={r}>{RECEIVED_RANGE_LABELS[r]}</SelectItem>
            ))}
          </FilterSelect>
          {showSource && (
            <FilterSelect label="Source" value={filters.source} onValueChange={v => set({ source: v as SourceFilter })}>
              {(Object.keys(SOURCE_LABELS) as SourceFilter[]).map(s => (
                <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
              ))}
            </FilterSelect>
          )}
          {fieldFilters.map(f => (
            <FilterSelect key={f.fieldId} label={f.label} value={filters.fields[f.fieldId] ?? ALL} onValueChange={v => setField(f.fieldId, v)}>
              <SelectItem value={ALL}>Any</SelectItem>
              {f.options.map(o => (
                <SelectItem key={o.value} value={o.value} disabled={o.count === 0}>
                  {o.label} ({o.count})
                </SelectItem>
              ))}
            </FilterSelect>
          ))}
        </div>
      )}

      {(isFiltering(filters) || chips.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
          <span className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground tabular-nums">{shown}</span> of {total}
          </span>
          {chips.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium hover:bg-muted"
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

export default CaseFilterBar
