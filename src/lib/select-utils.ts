export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Returns a new array of options with any items that have empty values removed.
 * Also trims values to avoid accidental whitespace-only entries.
 */
export function sanitizeOptions(options: SelectOption[] | undefined | null): SelectOption[] {
  if (!Array.isArray(options)) return [];
  return options
    .filter((opt) => typeof opt?.value === 'string')
    .map((opt) => ({ ...opt, value: opt.value.trim() }))
    .filter((opt) => opt.value !== '');
}

/**
 * Coerces a Select value to undefined when it is an empty string so that
 * the Select shows its placeholder instead of selecting an invalid empty value.
 */
export function coerceSelectValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return value as any;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}



