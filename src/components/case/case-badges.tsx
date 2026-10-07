'use client'

import { AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { caseStatusLabel, type CaseConfig, type SlaState } from '@/lib/case-management'

const dateFmt = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' })

/** Deadline chip for a case still awaiting first contact. Renders nothing once acted on. */
export function SlaBadge({ state, className }: { state: SlaState; className?: string }) {
  if (state.kind === 'none') return null

  const overdue = state.kind === 'overdue'
  const soon = state.kind === 'due-soon'
  const label = overdue
    ? `Overdue ${state.businessDaysOver} business day${state.businessDaysOver === 1 ? '' : 's'}`
    : state.businessDaysLeft === 0
      ? 'Due today'
      : `Due in ${state.businessDaysLeft} business day${state.businessDaysLeft === 1 ? '' : 's'}`

  return (
    <span
      title={`Response due ${dateFmt.format(state.dueDate)}`}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        overdue
          ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30'
          : soon
            ? 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30'
            : 'bg-muted text-muted-foreground ring-border',
        className
      )}
    >
      {overdue ? <AlertCircle className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  )
}

/** Case status pill. Initial = amber, closed = muted, anything in between = blue. */
export function CaseStatusPill({ status, config, className }: { status: string; config: CaseConfig; className?: string }) {
  const isInitial = status === config.initialStatus
  const isClosed = (config.closedStatuses || []).includes(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        isInitial
          ? 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30'
          : isClosed
            ? 'bg-muted text-muted-foreground ring-border'
            : 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', isInitial ? 'bg-amber-500' : isClosed ? 'bg-muted-foreground/50' : 'bg-blue-500')}
      />
      {caseStatusLabel(status, config)}
    </span>
  )
}
