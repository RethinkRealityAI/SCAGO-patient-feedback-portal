'use client'

import { AlertTriangle, Info, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'notice' | 'urgent' | 'subtle'
type IconName = 'info' | 'phone'

/**
 * Read-only text inside a form. `notice` and `urgent` render as callouts so
 * safety information (e.g. crisis lines) is impossible to miss; `urgent` is
 * announced to screen readers as an alert. `subtle` is a quiet, neutral note
 * (soft grey panel, small icon in the form's accent colour) for guidance that
 * should be visible without dominating the form.
 */
export function TextBlock({
  text,
  tone = 'default',
  icon,
  className,
}: {
  text: string
  tone?: Tone
  icon?: IconName
  className?: string
}) {
  if (tone === 'default') {
    return <div className={cn('text-sm text-muted-foreground whitespace-pre-wrap', className)}>{text}</div>
  }

  if (tone === 'subtle') {
    const [heading, ...rest] = text.split('\n')
    const body = rest.join('\n').trim()
    const SubtleIcon = icon === 'phone' ? Phone : Info
    return (
      <div role="note" className={cn('flex items-start gap-3 rounded-xl bg-muted/60 px-4 py-3.5', className)}>
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-background text-[color:var(--form-accent,hsl(var(--primary)))] shadow-sm ring-1 ring-black/5"
        >
          <SubtleIcon className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{heading}</span>
          {body && <> {body}</>}
        </p>
      </div>
    )
  }

  const urgent = tone === 'urgent'
  const Icon = urgent ? AlertTriangle : Info
  // Split "Heading\nBody" so the first line reads as the callout's title.
  const [heading, ...rest] = text.split('\n')
  const body = rest.join('\n').trim()

  return (
    <div
      role={urgent ? 'alert' : 'note'}
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        urgent
          ? 'border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-50'
          : 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-50',
        className
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 h-5 w-5 flex-shrink-0', urgent ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300')}
      />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold">{heading}</p>
        {body && <p className="mt-1 whitespace-pre-wrap">{body}</p>}
      </div>
    </div>
  )
}

export default TextBlock
