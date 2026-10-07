/**
 * Conditional-field visibility, shared by the renderer (what to show) and the
 * validator (what to require). Keeping one implementation means a question can
 * never be hidden on screen yet still demanded by validation, or vice versa.
 */

export interface ConditionalField {
  conditionField?: string;
  /** Show when the controlling answer equals this value. */
  conditionValue?: string;
  /**
   * Show when the controlling answer matches ANY of these values. Takes
   * precedence over `conditionValue`, which is kept as a single-value fallback
   * for older editors that only understand one value.
   */
  conditionValues?: string[];
}

const BOOLEAN_TYPES = new Set(['boolean-checkbox', 'anonymous-toggle', 'boolean-row']);

/**
 * Whether a conditional field should be visible.
 *
 * @param field          The field carrying the condition.
 * @param actualValue    Current answer to the controlling field.
 * @param controllingType Type of the controlling field, or undefined when it
 *                       no longer exists (in which case the field is shown,
 *                       so a deleted controller never hides a question forever).
 */
export function isConditionMet(
  field: ConditionalField,
  actualValue: unknown,
  controllingType: string | undefined
): boolean {
  if (!field.conditionField) return true;
  if (!controllingType) return true;

  const expected =
    field.conditionValues && field.conditionValues.length > 0
      ? field.conditionValues
      : field.conditionValue !== undefined
        ? [field.conditionValue]
        : [];
  if (expected.length === 0) return true;

  if (BOOLEAN_TYPES.has(controllingType)) {
    return expected.some(value => String(actualValue) === String(value));
  }

  // Multi-select answers are arrays: visible when any selected option matches.
  if (Array.isArray(actualValue)) {
    return actualValue.some(selected => expected.includes(String(selected)));
  }

  return expected.includes(actualValue as string);
}
