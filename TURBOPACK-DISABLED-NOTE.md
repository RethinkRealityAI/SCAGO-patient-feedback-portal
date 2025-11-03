# Turbopack Disabled - Server-Only Modules Issue

## Why Turbopack Was Disabled

Turbopack (Next.js 15's new bundler) doesn't properly exclude server-only Node.js modules from client bundles, even with:
- ✅ Dynamic imports
- ✅ `serverExternalPackages` configuration  
- ✅ `'use server'` directives
- ✅ Proper code separation

This causes errors like:
```
Module not found: Can't resolve 'fs'
Module not found: Can't resolve 'child_process'
Module not found: Can't resolve 'net'
```

## Current Solution

**Disabled Turbopack** and using **Webpack** (stable, proven solution):
- ✅ Properly handles server-only module exclusion
- ✅ Respects `serverExternalPackages` configuration
- ✅ Works with dynamic imports
- ✅ Full control over bundling

## Configuration

The `next.config.ts` is already configured with:
- ✅ `serverExternalPackages` - Lists all server-only packages
- ✅ Webpack externals - Externalizes server-only packages
- ✅ Webpack fallbacks - Excludes Node.js built-ins from client bundle
- ✅ Resolve aliases - Prevents client-side imports

## When to Re-enable Turbopack

Re-enable when:
1. Next.js/Turbopack properly handles server-only exclusions
2. All build errors are resolved
3. Performance benefits outweigh compatibility concerns

To re-enable:
```json
"dev": "next dev --turbopack -p 9002"
```

## Files Using Server-Only Code

These files use server-only modules and are properly isolated:
- ✅ `src/lib/firebase-admin.ts` - Firebase Admin SDK (server-only utilities)
- ✅ `src/lib/server-auth.ts` - Server authentication (uses firebase-admin)
- ✅ `src/lib/submission-utils.ts` - Server-side submission utilities
- ✅ `src/app/dashboard/actions.ts` - Server Actions (uses dynamic imports)

All use **dynamic imports** to prevent client bundling when called from Server Actions.

---

**Status**: Using Webpack (stable) until Turbopack matures

