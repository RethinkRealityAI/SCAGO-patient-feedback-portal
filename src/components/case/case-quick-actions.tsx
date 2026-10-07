'use client'

import { useState } from 'react'
import { Check, ChevronDown, Loader, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { updateSubmissionCase } from '@/lib/client-actions'
import { caseStatusLabel, caseStatusOf, nextCaseStep, type CaseConfig } from '@/lib/case-management'

type AnyRecord = Record<string, any>

/** Button text for moving a case to `target`. */
function actionLabel(target: string, config: CaseConfig): string {
  if ((config.closedStatuses || [])[0] === target) return 'Close case'
  return `Mark ${caseStatusLabel(target, config).toLowerCase()}`
}

export function CaseQuickActions({
  submission,
  config,
  surveyId,
  onUpdated,
}: {
  submission: AnyRecord
  config: CaseConfig
  surveyId: string
  onUpdated: (submissionId: string, patch: AnyRecord) => void
}) {
  const { toast } = useToast()
  const [target, setTarget] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const status = caseStatusOf(submission, config)
  const next = nextCaseStep(status, config)
  const name = [submission.firstName, submission.lastName].filter(Boolean).join(' ') || 'this request'
  const received = new Date(submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const isClosed = (config.closedStatuses || []).includes(status)

  const patchFor = (caseStatus: string, addedNote?: AnyRecord) => ({
    caseStatus,
    reviewed: caseStatus !== config.initialStatus,
    ...(addedNote ? { caseNotes: [...(submission.caseNotes || []), addedNote] } : {}),
  })

  const apply = async () => {
    if (!target) return
    const previous = status
    const to = target
    setSaving(true)
    const result = await updateSubmissionCase(submission.id, surveyId, { caseStatus: to, note: note.trim() || undefined }, config.initialStatus)
    setSaving(false)
    if (result.error) {
      toast({ title: 'Could not update the request', description: result.error, variant: 'destructive' })
      return
    }
    onUpdated(submission.id, patchFor(to, result.note))
    setTarget(null)
    setNote('')

    const undo = async () => {
      const back = await updateSubmissionCase(submission.id, surveyId, { caseStatus: previous }, config.initialStatus)
      if (back.error) {
        toast({ title: 'Could not undo', description: back.error, variant: 'destructive' })
        return
      }
      onUpdated(submission.id, { caseStatus: previous, reviewed: previous !== config.initialStatus })
      toast({
        title: `Back to ${caseStatusLabel(previous, config)}`,
        description: result.note ? `${name}. Your note was kept.` : name,
      })
    }

    toast({
      title: `${caseStatusLabel(to, config)}: ${name}`,
      description: `Moved from ${caseStatusLabel(previous, config)}.`,
      duration: 10000,
      action: (
        <ToastAction altText={`Undo: move ${name} back to ${caseStatusLabel(previous, config)}`} onClick={undo}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Undo
        </ToastAction>
      ),
    })
  }

  const others = config.statuses.filter(s => s.value !== status)

  return (
    // The row itself opens the case panel; keep clicks here from doing that too.
    <div
      className="flex items-center justify-end gap-1.5"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
    >
      {next && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={`h-8 gap-1.5 whitespace-nowrap px-2.5 text-xs ${
            status === config.initialStatus ? 'border-primary/40 text-primary hover:bg-primary/5 hover:text-primary' : ''
          }`}
          onClick={() => setTarget(next)}
          aria-label={`${actionLabel(next, config)} for ${name}`}
        >
          <Check className="h-3.5 w-3.5" />
          {actionLabel(next, config)}
        </Button>
      )}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 whitespace-nowrap px-2 text-xs"
            aria-label={`Change status for ${name}`}
          >
            {next ? <ChevronDown className="h-3.5 w-3.5" /> : <>{isClosed ? 'Reopen' : 'Status'}<ChevronDown className="h-3.5 w-3.5" /></>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Now: {caseStatusLabel(status, config)}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {others.map(s => (
            <DropdownMenuItem key={s.value} onSelect={() => setTarget(s.value)}>
              Move to {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={target !== null}
        onOpenChange={open => {
          if (!open && !saving) {
            setTarget(null)
            setNote('')
          }
        }}
      >
        <AlertDialogContent onClick={e => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target ? `${actionLabel(target, config).replace(/^Mark /, 'Mark as ')}?` : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {name}, received {received}. This moves the request from{' '}
              <span className="font-medium text-foreground">{caseStatusLabel(status, config)}</span> to{' '}
              <span className="font-medium text-foreground">{target ? caseStatusLabel(target, config) : ''}</span>. You can undo it
              afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`quick-note-${submission.id}`} className="text-sm">
              Add a note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={`quick-note-${submission.id}`}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Called, booked consultation for Tuesday"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            {/* A plain button: AlertDialogAction would close before the save finishes. */}
            <Button type="button" onClick={apply} disabled={saving} className="gap-1.5">
              {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CaseQuickActions
