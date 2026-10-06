'use client'

import type { SubmissionMetrics } from '@/lib/submission-metrics'

/**
 * Shared presentation for the 0-10 scores shown across the dashboards.
 *
 * `unrated` is a first-class state: a respondent who skipped the rating question
 * is not a zero-star review, and must never be coloured or averaged as one.
 */
export type RatingTone = 'excellent' | 'good' | 'poor' | 'unrated'

export function ratingTone(rating: unknown): RatingTone {
  if (rating === null || rating === undefined || rating === '') return 'unrated'
  const value = Number(rating)
  if (!Number.isFinite(value)) return 'unrated'
  if (value >= 8) return 'excellent'
  if (value >= 5) return 'good'
  return 'poor'
}

export const RATING_DOT_CLASS: Record<RatingTone, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-amber-500',
  poor: 'bg-rose-500',
  unrated: 'bg-muted-foreground/30',
}

export const RATING_BADGE_CLASS: Record<RatingTone, string> = {
  excellent:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30',
  good:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/30',
  poor:
    'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/30',
  unrated: 'bg-muted text-muted-foreground ring-border',
}

export const RATING_TONE_LABEL: Record<RatingTone, string> = {
  excellent: 'Excellent',
  good: 'Good',
  poor: 'Needs improvement',
  unrated: 'Not rated',
}

/** `"8.5"` for a rated submission, `null` when the rating question was skipped. */
export function formatRating(rating: unknown): string | null {
  if (ratingTone(rating) === 'unrated') return null
  const value = Number(rating)
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** Human-readable provenance for a derived score, for use in `title`. */
export function ratingSourceTitle(metrics?: SubmissionMetrics): string | undefined {
  const source = metrics?.rating
  if (!source) return 'This respondent did not answer a rating question'
  const scale = source.max === 10 ? `${source.raw}/10` : `${source.raw} of ${source.max}`
  return `${source.label} — answered ${scale}`
}

/**
 * The score chip used in submission tables and cards. Shows "Not rated" rather
 * than a red 0 when the respondent skipped the question, and explains on hover
 * which question produced the score.
 */
export function RatingBadge({
  rating,
  metrics,
  size = 'sm',
}: {
  rating: unknown
  metrics?: SubmissionMetrics
  size?: 'sm' | 'md'
}) {
  const tone = ratingTone(rating)
  const display = formatRating(rating)

  return (
    <span
      title={ratingSourceTitle(metrics)}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${RATING_BADGE_CLASS[tone]} ${
        size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${RATING_DOT_CLASS[tone]}`} />
      {display ? `${display}/10` : 'Not rated'}
    </span>
  )
}
