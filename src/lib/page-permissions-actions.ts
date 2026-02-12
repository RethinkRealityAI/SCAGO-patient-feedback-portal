'use client';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface PagePermissions {
  routesByEmail: Record<string, string[]>;
  formsByEmail: Record<string, string[]>;
  regionsByEmail: Record<string, string[]>;
}

export async function getPagePermissions(): Promise<PagePermissions> {
  const ref = doc(db, 'config', 'page_permissions');
  const snap = await getDoc(ref);
  if (!snap.exists()) return { routesByEmail: {}, formsByEmail: {}, regionsByEmail: {} };
  const data = snap.data() as any;
  return {
    routesByEmail: data.routesByEmail || {},
    formsByEmail: data.formsByEmail || {},
    regionsByEmail: data.regionsByEmail || {}
  };
}

export async function setUserPermissions(email: string, routes: string[]): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes('@')) return { success: false, error: 'Invalid email' };
  const ref = doc(db, 'config', 'page_permissions');
  const snap = await getDoc(ref);
  const current = snap.exists() ? ((snap.data() as any).routesByEmail || {}) : {};
  const updated = { ...current, [email]: routes };
  if (snap.exists()) {
    await updateDoc(ref, { routesByEmail: updated });
  } else {
    await setDoc(ref, { routesByEmail: updated });
  }
  return { success: true };
}



