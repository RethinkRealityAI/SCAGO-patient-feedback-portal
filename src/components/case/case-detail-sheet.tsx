'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Loader, MessageSquarePlus, UserRound } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { formatAnswerValue } from '@/lib/question-mapping'
import { updateSubmissionCase } from '@/lib/client-actions'
import { caseStatusOf, slaState, type CaseConfig, type CaseNote } from '@/lib/case-management'
import { CaseStatusPill, SlaBadge } from '@/components/case/case-badges'

type AnyRecord = Record<string, any>

interface SectionDef {
  id?: string
  title?: string
  fields?: AnyRecord[]
}

const NON_ANSWER_TYPES = new Set(['text-block', 'logo', 'group'])
const timestampFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  dateStyle: 'medium',
  timeStyle: 'short',
})
const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium' })

/** Answers grouped by form section, in form order, skipping unanswered questions. */
function answeredSections(sections: SectionDef[], submission: AnyRecord) {
  return sections
    .map(section => {
      const flat: AnyRecord[] = []
      const visit = (field: AnyRecord) => {
        if (field.type === 'group' && Array.isArray(field.fields)) field.fields.forEach(visit)
        else if (!NON_ANSWER_TYPES.has(field.type)) flat.push(field)
      }
      ;(section.fields || []).forEach(visit)

      const answers = flat
        .map(field => {
          const raw = submission[field.id]
          if (raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0)) return null
          const formatted = formatAnswerValue(raw)
          const values = (Array.isArray(formatted) ? formatted : [formatted]).map(String)
          const other = submission[`${field.id}_otherValue`]
          return {
            id: field.id as string,
            label: (field.label as string) || field.id,
            values,
            other: typeof other === 'string' && other.trim() ? other.trim() : undefined,
          }
        })
        .filter(Boolean) as Array<{ id: string; label: string; values: string[]; other?: string }>

      return { title: section.title || '', answers }
    })
    .filter(section => section.answers.length > 0)
}

export function CaseDetailSheet({
  open,
  onOpenChange,
  submission,
  surveyId,
  sections,
  config,
  onUpdated,
  personRequests = [],
  onSelectRequest,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: AnyRecord | null
  surveyId: string
  sections: SectionDef[]
  config: CaseConfig
  onUpdated: (submissionId: string, patch: AnyRecord) => void
  /** Every request from the same person (this one included), newest first. */
  personRequests?: AnyRecord[]
  /** Switch the panel to another of their requests. */
  onSelectRequest?: (submissionId: string) => void
}) {
  const { toast } = useToast()
  const [assignedTo, setAssignedTo] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState<null | 'status' | 'assignee' | 'note'>(null)

  useEffect(() => {
    setAssignedTo(submission?.assignedTo || '')
    setNote('')
  }, [submission?.id, submission?.assignedTo])

  const sectionsWithAnswers = useMemo(
    () => (submission ? answeredSections(sections, submission) : []),
    [sections, submission]
  )

  if (!submission) return null

  const status = caseStatusOf(submission, config)
  const submittedAt = new Date(submission.submittedAt)
  const sla = slaState(submittedAt, status, config)
  const notes: CaseNote[] = [...(submission.caseNotes || [])].sort((a, b) => b.at.localeCompare(a.at))
  const name = [submission.firstName, submission.lastName].filter(Boolean).join(' ') || 'Submission'

  const save = async (kind: 'status' | 'assignee' | 'note', changes: Parameters<typeof updateSubmissionCase>[2]) => {
    setSaving(kind)
    const result = await updateSubmissionCase(submission.id, surveyId, changes, config.initialStatus)
    setSaving(null)
    if (result.error) {
      toast({ title: 'Could not save', description: result.error, variant: 'destructive' })
      return false
    }
    const patch: AnyRecord = {}
    if (changes.caseStatus !== undefined) {
      patch.caseStatus = changes.caseStatus
      patch.reviewed = changes.caseStatus !== config.initialStatus
    }
    if (changes.assignedTo !== undefined) patch.assignedTo = changes.assignedTo.trim() || undefined
    if (result.note) patch.caseNotes = [...(submission.caseNotes || []), result.note]
    onUpdated(submission.id, patch)
    return true
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-3 border-b px-6 py-5 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <CaseStatusPill status={status} config={config} />
            <SlaBadge state={sla} />
            {submission.submittedLanguage === 'fr' && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                Completed in French
              </span>
            )}
          </div>
          <SheetTitle className="text-xl">{name}</SheetTitle>
          <SheetDescription>Submitted {timestampFmt.format(submittedAt)} ET</SheetDescription>
        </SheetHeader>

        {/* key: start at the top when switching to another of their requests */}
        <div key={submission.id} className="flex-1 overflow-y-auto">
          {personRequests.length > 1 && (
            <nav aria-label="Requests from this person" className="border-b px-6 py-4">
              <h3 className="mb-2 text-sm font-semibold">
                {personRequests.length} requests from this person
              </h3>
              <ol className="divide-y rounded-lg border bg-background">
                {personRequests.map((r, i) => {
                  const current = r.id === submission.id
                  const rStatus = caseStatusOf(r, config)
                  const sought = Array.isArray(r.counsellingType) ? r.counsellingType.join(', ') : ''
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        disabled={current}
                        aria-current={current ? 'true' : undefined}
                        onClick={() => onSelectRequest?.(r.id)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${current ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2">
                            <span className="font-medium">{dateFmt.format(new Date(r.submittedAt))}</span>
                            {i === 0 && <span className="text-xs text-muted-foreground">Latest</span>}
                            {current && <span className="text-xs font-medium text-primary">Viewing</span>}
                          </span>
                          {sought && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{sought}</span>}
                        </span>
                        <CaseStatusPill status={rStatus} config={config} />
                        {!current && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>
          )}

          {/* Case controls */}
          <div className="grid gap-4 border-b bg-muted/30 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="case-status">Status</Label>
              <Select
                value={status}
                onValueChange={value => save('status', { caseStatus: value })}
                disabled={saving !== null}
              >
                <SelectTrigger id="case-status" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.statuses.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-assignee">Assigned to</Label>
              <div className="flex gap-2">
                <Input
                  id="case-assignee"
                  list="case-assignee-options"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  placeholder="Counsellor name"
                  className="bg-background"
                />
                {config.assignees && config.assignees.length > 0 && (
                  <datalist id="case-assignee-options">
                    {config.assignees.map(a => <option key={a} value={a} />)}
                  </datalist>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving !== null || assignedTo.trim() === (submission.assignedTo || '')}
                  onClick={() => save('assignee', { assignedTo })}
                >
                  {saving === 'assignee' ? <Loader className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3 border-b px-6 py-5">
            <h3 className="text-sm font-semibold">Case notes</h3>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note (e.g. called, left no voicemail; booked consultation for Tuesday)"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={saving !== null || !note.trim()}
                onClick={async () => {
                  if (await save('note', { note })) setNote('')
                }}
                className="gap-1.5"
              >
                {saving === 'note' ? <Loader className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                Add note
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <ol className="space-y-3">
                {notes.map((n, i) => (
                  <li key={`${n.at}-${i}`} className="rounded-lg border bg-background p-3">
                    <p className="whitespace-pre-wrap text-sm">{n.text}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UserRound className="h-3 w-3" aria-hidden="true" />
                      {n.author} · {timestampFmt.format(new Date(n.at))}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Full answers */}
          <div className="space-y-6 px-6 py-5">
            {sectionsWithAnswers.map(section => (
              <section key={section.title}>
                {section.title && (
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#C8262A]">{section.title}</h3>
                )}
                <dl className="space-y-3">
                  {section.answers.map(answer => (
                    <div key={answer.id}>
                      <dt className="text-xs text-muted-foreground">{answer.label}</dt>
                      <dd className="mt-0.5 text-sm font-medium">
                        {answer.values.length > 1 ? (
                          <ul className="list-inside list-disc space-y-0.5">
                            {answer.values.map(v => <li key={v}>{v}</li>)}
                          </ul>
                        ) : (
                          answer.values[0]
                        )}
                        {answer.other && (
                          <p className="mt-1 font-normal text-muted-foreground">Other: {answer.other}</p>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default CaseDetailSheet
