'use client'

import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'notice' | 'urgent'

/**
 * Read-only text inside a form. `notice` and `urgent` render as callouts so
 * safety information (e.g. crisis lines) is impossible to miss; `urgent` is
 * announced to screen readers as an alert.
 */
export function TextBlock({
  text,
  tone = 'default',
  className,
}: {
  text: string
  tone?: Tone
  className?: string
}) {
  if (tone === 'default') {
    return <div className={cn('text-sm text-muted-foreground whitespace-pre-wrap', className)}>{text}</div>
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
