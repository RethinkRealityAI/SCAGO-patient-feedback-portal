/**
 * Pure utility for computing the review state of a submission.
 *
 * Optimistic UI overrides (reviewOverrides) take precedence over the
 * persisted value stored on the submission document. This allows the UI
 * to feel instant while the Firestore write is in-flight, and to revert
 * gracefully if the write fails.
 *
 * @param submissionId  - Firestore doc ID of the submission
 * @param overrides     - Map of id → optimistic boolean (set by toggleReview)
 * @param persisted     - The `reviewed` field value from the Firestore document
 */
export function isReviewedFromState(
  submissionId: string,
  overrides: Record<string, boolean>,
  persisted: boolean | undefined
): boolean {
  if (submissionId in overrides) return overrides[submissionId];
  return persisted === true;
}
