/**
 * Turn stored option values back into the labels respondents actually saw.
 *
 * Form fields of type `hospital-on`, `city-on`, `department-on` and
 * `province-ca` persist a slug (`woodstock-hospital`, `richmond-hill`, `ON`).
 * The dashboards were printing those slugs verbatim, so a hospital read as
 * `childrens-hospital-of-eastern-ontario-ottawa-childrens-treatment-centre`.
 */
import { ontarioHospitals } from '@/lib/hospital-names'
import { ontarioCities, provinces } from '@/lib/location-data'
import { hospitalDepartments } from '@/lib/hospital-departments'

type Option = { label: string; value: string }

function toLookup(options: Option[]): Map<string, string> {
  return new Map(options.map(o => [o.value, o.label]))
}

const HOSPITAL_LABELS = toLookup(ontarioHospitals)
const CITY_LABELS = toLookup(ontarioCities)
const DEPARTMENT_LABELS = toLookup(hospitalDepartments)
const PROVINCE_LABELS = toLookup(provinces)

/** Every known option value, so a plain string can be resolved without knowing its field type. */
const ALL_LABELS = new Map<string, string>([
  ...PROVINCE_LABELS,
  ...DEPARTMENT_LABELS,
  ...CITY_LABELS,
  // Hospitals last: their slugs are the most specific, so they win on collision.
  ...HOSPITAL_LABELS,
])

/**
 * Title-case a slug we have no entry for — respondents can type free-text under
 * "Other", and surveys may reference hospitals outside the Ontario list.
 */
function humanizeSlug(value: string): string {
  if (!value.includes('-') && value !== value.toLowerCase()) return value
  return value
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function lookup(value: string, table?: Map<string, string>): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return table?.get(trimmed) ?? ALL_LABELS.get(trimmed) ?? humanizeSlug(trimmed)
}

export function hospitalLabel(value: string): string {
  return lookup(value, HOSPITAL_LABELS)
}

export function cityLabel(value: string): string {
  return lookup(value, CITY_LABELS)
}

export function departmentLabel(value: string): string {
  return lookup(value, DEPARTMENT_LABELS)
}

/** Resolve any stored option value when the field type is not known. */
export function optionLabel(value: string): string {
  return lookup(value)
}

/**
 * The official label for a value, or `null` when it is not one of the known
 * option slugs — so callers can fall back to their own formatting instead of
 * getting a guessed title-case string back.
 */
export function knownOptionLabel(value: string): string | null {
  return ALL_LABELS.get(value.trim()) ?? null
}
