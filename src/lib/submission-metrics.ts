/**
 * Survey-schema-aware derivation of headline metrics from a submission.
 *
 * WHY THIS EXISTS
 * ---------------
 * Dashboards used to read `submission.rating` and `submission.hospitalInteraction`
 * directly. Those field IDs only ever existed in the original (V1) hospital survey
 * template. Every survey built in the survey editor since then names its fields
 * whatever the editor generated — the live "Hospital Experience Reporting Portal"
 * stores its overall score under a nanoid field id (`nzZ0TKWTf2oO3fEFhVyQc`) and
 * splits the narrative across `anythingElseED` / `anythingElseInpatient` /
 * `anythingElseOutpatient` / `additionalFeedback`.
 *
 * The result was "N/A" in every Rating and Experience cell and averages of 0.
 *
 * So instead of guessing at field names, we read the survey's own field
 * definitions and derive the metrics from the field *types*:
 *   - `nps`    → an overall 1-10 score  (the headline rating)
 *   - `rating` → a 1-5 star score       (normalised to /10 when no NPS answer)
 *   - `textarea` → narrative answers    (ranked by how "experience-like" they are)
 *
 * Legacy submissions that really do carry `rating` / `hospitalInteraction` keep
 * working through the explicit fallbacks below.
 */

/** Native answer range for each supported score field type. */
const RATING_SCALE_MAX: Record<string, number> = {
  nps: 10,
  rating: 5,
  'pain-scale': 10,
  slider: 10,
  range: 10,
}

/** Field types whose answers are free-text narrative. */
const NARRATIVE_FIELD_TYPES = new Set(['textarea', 'multi-text'])

/** Score field types, most authoritative first. */
const OVERALL_SCORE_TYPES = ['nps'] as const
const SECONDARY_SCORE_TYPES = ['rating'] as const

/** Legacy field ids that predate the survey editor. */
const LEGACY_RATING_FIELD = 'rating'
const LEGACY_EXPERIENCE_FIELD = 'hospitalInteraction'

/**
 * Label fragments that mark a narrative answer as the respondent's account of
 * their experience. Earlier entries win.
 */
const EXPERIENCE_LABEL_HINTS = [
  'your experience',
  'anything else',
  'in your own words',
  'like us to know',
  'tell us about',
  'describe',
  'what happened',
  'elaborate',
  'additional',
  'comment',
]

/** Field id fragments used when a survey has no labels to go on. */
const EXPERIENCE_ID_HINTS = [
  'hospitalinteraction',
  'anythingelse',
  'additionalfeedback',
  'experience',
  'feedback',
  'comments',
]

export interface SurveySchema {
  /** field id → field type (e.g. `nps`, `rating`, `textarea`) */
  fieldTypes: Record<string, string>
  /** field id → human-readable question text */
  fieldLabels: Record<string, string>
  /** field ids in the order they appear on the form */
  fieldOrder: string[]
}

export interface DerivedRating {
  /** Score normalised to a 0-10 scale so every survey can be compared. */
  value: number
  /** The answer exactly as the respondent gave it. */
  raw: number
  /** Native maximum of the question that produced this score (5 or 10). */
  max: number
  fieldId: string
  label: string
  /** True when this came from an overall/NPS question rather than a sub-score. */
  isOverall: boolean
}

export interface DerivedNarrative {
  text: string
  fieldId: string
  label: string
}

const EMPTY_SCHEMA: SurveySchema = { fieldTypes: {}, fieldLabels: {}, fieldOrder: [] }

/**
 * Flatten a survey document's `sections` into a lookup of field id → type/label,
 * preserving form order. Handles `group` fields, which nest one level deep.
 */
export function buildSurveySchema(survey: any): SurveySchema {
  const fieldTypes: Record<string, string> = {}
  const fieldLabels: Record<string, string> = {}
  const fieldOrder: string[] = []

  if (!survey) return EMPTY_SCHEMA

  // Already-flattened shape (what `getSurveys()` hands the dashboard).
  if (!survey.sections && (survey.fieldTypes || survey.fieldLabels || survey.fieldOrder)) {
    return {
      fieldTypes: survey.fieldTypes || {},
      fieldLabels: survey.fieldLabels || {},
      fieldOrder: survey.fieldOrder || Object.keys(survey.fieldTypes || {}),
    }
  }

  const visit = (field: any) => {
    if (!field?.id) return
    fieldOrder.push(field.id)
    if (field.type) fieldTypes[field.id] = field.type
    if (field.label) fieldLabels[field.id] = field.label
    if (Array.isArray(field.fields)) field.fields.forEach(visit)
  }

  for (const section of survey.sections || []) {
    for (const field of section.fields || []) visit(field)
  }

  return { fieldTypes, fieldLabels, fieldOrder }
}

/** Merge a map of surveyId → survey doc/summary into surveyId → schema. */
export function buildSurveySchemaMap(surveys: any[]): Map<string, SurveySchema> {
  const map = new Map<string, SurveySchema>()
  for (const survey of surveys || []) {
    if (survey?.id) map.set(survey.id, buildSurveySchema(survey))
  }
  return map
}

/** Coerce whatever the form stored into a finite number, or null. */
function toScore(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    // `{ selection: '7' }` from select-style score questions
    const inner = value.selection ?? value.value
    return inner === undefined ? null : toScore(inner)
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** List the score-bearing field ids in a schema, ordered by form position. */
function scoreFieldsOfTypes(schema: SurveySchema, types: readonly string[]): string[] {
  const wanted = new Set<string>(types)
  const ordered = schema.fieldOrder.filter(id => wanted.has(schema.fieldTypes[id]))
  if (ordered.length > 0) return ordered
  // fieldOrder may be missing on older survey docs — fall back to the type map.
  return Object.keys(schema.fieldTypes).filter(id => wanted.has(schema.fieldTypes[id]))
}

function normaliseToTen(raw: number, max: number): number {
  if (max <= 0) return raw
  if (max === 10) return raw
  // Round to one decimal so a 4/5 reads as 8.0 rather than 8.000000001.
  return Math.round((raw / max) * 10 * 10) / 10
}

/**
 * Derive the headline rating for a submission.
 *
 * Priority: legacy `rating` → the survey's NPS question → the survey's star
 * ratings (normalised to /10). Returns null when the respondent genuinely never
 * answered a score question — callers should show "—" rather than inventing a 0.
 */
export function deriveRating(
  submission: Record<string, any> | null | undefined,
  schema: SurveySchema = EMPTY_SCHEMA
): DerivedRating | null {
  if (!submission) return null

  // 1. Legacy hospital survey field.
  const legacy = toScore(submission[LEGACY_RATING_FIELD])
  if (legacy !== null && legacy > 0) {
    return {
      value: legacy,
      raw: legacy,
      max: 10,
      fieldId: LEGACY_RATING_FIELD,
      label: schema.fieldLabels[LEGACY_RATING_FIELD] || 'Overall Care Rating',
      isOverall: true,
    }
  }

  // 2. The survey's own overall-score question(s), then sub-scores.
  for (const [types, isOverall] of [
    [OVERALL_SCORE_TYPES, true],
    [SECONDARY_SCORE_TYPES, false],
  ] as const) {
    for (const fieldId of scoreFieldsOfTypes(schema, types)) {
      const raw = toScore(submission[fieldId])
      if (raw === null || raw <= 0) continue
      const max = RATING_SCALE_MAX[schema.fieldTypes[fieldId]] ?? 10
      return {
        value: normaliseToTen(raw, max),
        raw,
        max,
        fieldId,
        label: schema.fieldLabels[fieldId] || 'Rating',
        isOverall,
      }
    }
  }

  return null
}

/** Convenience: the 0-10 score, or null when unrated. */
export function getRatingValue(
  submission: Record<string, any> | null | undefined,
  schema?: SurveySchema
): number | null {
  return deriveRating(submission, schema)?.value ?? null
}

/** Score every narrative field so the most experience-like answer wins. */
function narrativeRank(fieldId: string, label: string): number {
  const lowerLabel = (label || '').toLowerCase()
  const hintIndex = EXPERIENCE_LABEL_HINTS.findIndex(hint => lowerLabel.includes(hint))
  if (hintIndex !== -1) return hintIndex

  const lowerId = fieldId.toLowerCase()
  const idIndex = EXPERIENCE_ID_HINTS.findIndex(hint => lowerId.includes(hint))
  if (idIndex !== -1) return EXPERIENCE_LABEL_HINTS.length + idIndex

  return Number.MAX_SAFE_INTEGER
}

function narrativeText(value: any): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value.filter(v => typeof v === 'string' && v.trim()).join(' • ').trim()
  }
  return ''
}

/**
 * Every narrative answer in a submission, best-first.
 * Useful for the detail drawer, where showing all of them is the point.
 */
export function deriveNarratives(
  submission: Record<string, any> | null | undefined,
  schema: SurveySchema = EMPTY_SCHEMA
): DerivedNarrative[] {
  if (!submission) return []

  const results: Array<DerivedNarrative & { rank: number; order: number }> = []

  const legacyText = narrativeText(submission[LEGACY_EXPERIENCE_FIELD])
  if (legacyText) {
    results.push({
      text: legacyText,
      fieldId: LEGACY_EXPERIENCE_FIELD,
      label: schema.fieldLabels[LEGACY_EXPERIENCE_FIELD] || 'Your Experience',
      rank: -1,
      order: -1,
    })
  }

  const candidateIds = schema.fieldOrder.length > 0
    ? schema.fieldOrder
    : Object.keys(schema.fieldTypes)

  candidateIds.forEach((fieldId, order) => {
    if (fieldId === LEGACY_EXPERIENCE_FIELD) return
    if (!NARRATIVE_FIELD_TYPES.has(schema.fieldTypes[fieldId])) return
    const text = narrativeText(submission[fieldId])
    if (!text) return
    const label = schema.fieldLabels[fieldId] || fieldId
    results.push({ text, fieldId, label, rank: narrativeRank(fieldId, label), order })
  })

  return results
    .sort((a, b) => (a.rank - b.rank) || (a.order - b.order))
    .map(({ text, fieldId, label }) => ({ text, fieldId, label }))
}

/**
 * The single narrative answer that best represents "what happened", for use in
 * the Experience column. Returns null when the respondent wrote nothing.
 */
export function deriveExperience(
  submission: Record<string, any> | null | undefined,
  schema: SurveySchema = EMPTY_SCHEMA
): DerivedNarrative | null {
  return deriveNarratives(submission, schema)[0] ?? null
}

/** Convenience: the experience text, or an empty string. */
export function getExperienceText(
  submission: Record<string, any> | null | undefined,
  schema?: SurveySchema
): string {
  return deriveExperience(submission, schema)?.text ?? ''
}

/** True when a survey asks any score question at all. */
export function schemaHasRatingField(schema: SurveySchema = EMPTY_SCHEMA): boolean {
  return scoreFieldsOfTypes(schema, [...OVERALL_SCORE_TYPES, ...SECONDARY_SCORE_TYPES]).length > 0
}

/** True when a survey asks for any free-text narrative. */
export function schemaHasNarrativeField(schema: SurveySchema = EMPTY_SCHEMA): boolean {
  const ids = schema.fieldOrder.length > 0 ? schema.fieldOrder : Object.keys(schema.fieldTypes)
  return ids.some(id => NARRATIVE_FIELD_TYPES.has(schema.fieldTypes[id]))
}

export interface SubmissionMetrics {
  rating: DerivedRating | null
  experience: DerivedNarrative | null
  narratives: DerivedNarrative[]
}

/**
 * Populate the canonical `rating` / `hospitalInteraction` fields on each
 * submission from the survey's own field definitions.
 *
 * `FeedbackSubmission` has always declared these two as the normalised shape the
 * dashboard reads; nothing populated them for surveys built in the editor, which
 * is why every Rating and Experience cell rendered "N/A". Enriching once at load
 * keeps every downstream consumer — tables, charts, filters, exports, AI prompts
 * — working off the same derived values.
 *
 * Returns the enriched submissions plus a by-id map of the richer detail
 * (which question produced the score, its native scale, all narrative answers)
 * for UI that wants to show provenance.
 */
export function enrichSubmissions<T extends Record<string, any>>(
  submissions: T[],
  schemaFor: (submission: T) => SurveySchema
): { submissions: T[]; metricsById: Map<string, SubmissionMetrics> } {
  const metricsById = new Map<string, SubmissionMetrics>()

  const enriched = (submissions || []).map(submission => {
    const schema = schemaFor(submission)
    const rating = deriveRating(submission, schema)
    const narratives = deriveNarratives(submission, schema)
    const experience = narratives[0] ?? null

    if (submission?.id) {
      metricsById.set(submission.id, { rating, experience, narratives })
    }

    return {
      ...submission,
      ...(rating ? { rating: rating.value } : {}),
      ...(experience ? { hospitalInteraction: experience.text } : {}),
    }
  })

  return { submissions: enriched, metricsById }
}

export interface RatingSummary {
  /** Submissions that actually carry a score. */
  rated: number
  /** All submissions considered, rated or not. */
  total: number
  /** Mean of `rated` submissions on the 0-10 scale — null when none are rated. */
  average: number | null
  excellent: number
  good: number
  needsImprovement: number
  promoters: number
  passives: number
  detractors: number
  /** Standard NPS, or null when nobody answered a score question. */
  nps: number | null
}

/**
 * Aggregate ratings across submissions.
 *
 * Unrated submissions are excluded from the mean rather than counted as 0 —
 * counting them dragged every average toward zero and made the stat cards lie.
 */
export function summariseRatings(
  submissions: Array<Record<string, any>>,
  schemaFor: (submission: Record<string, any>) => SurveySchema
): RatingSummary {
  let sum = 0
  let rated = 0
  let excellent = 0
  let good = 0
  let needsImprovement = 0
  let promoters = 0
  let passives = 0
  let detractors = 0

  for (const submission of submissions) {
    const value = getRatingValue(submission, schemaFor(submission))
    if (value === null) continue

    rated++
    sum += value

    if (value >= 8) excellent++
    else if (value >= 5) good++
    else needsImprovement++

    if (value >= 9) promoters++
    else if (value >= 7) passives++
    else detractors++
  }

  return {
    rated,
    total: submissions.length,
    average: rated > 0 ? Math.round((sum / rated) * 10) / 10 : null,
    excellent,
    good,
    needsImprovement,
    promoters,
    passives,
    detractors,
    nps: rated > 0 ? Math.round(((promoters - detractors) / rated) * 100) : null,
  }
}
