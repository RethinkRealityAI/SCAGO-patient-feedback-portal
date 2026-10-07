'use server';

/**
 * Clear the `mustChangePassword` flag once the signed-in user has set their own
 * password. The ID token identifies the caller, so a user can only ever clear
 * their own flag.
 */
export async function completeRequiredPasswordChange(idToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!idToken) return { success: false, error: 'Not signed in.' };
    const { getAdminAuth } = await import('@/lib/firebase-admin');
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);

    // This only clears the caller's own reminder; it grants nothing. A user who
    // called it without changing their password would merely skip their own
    // prompt, so verifying the token's owner is the check that matters.
    const user = await auth.getUser(decoded.uid);
    const { mustChangePassword, ...rest } = (user.customClaims || {}) as Record<string, unknown>;
    if (!mustChangePassword) return { success: true };

    await auth.setCustomUserClaims(decoded.uid, rest);
    return { success: true };
  } catch (error) {
    console.error('[completeRequiredPasswordChange] Failed:', error);
    return { success: false, error: 'Could not confirm the password change. Please try again.' };
  }
}
