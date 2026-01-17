# 🏗️ SCAGO Patient Feedback Response Portal - Architecture & Development Guide

> **The Central Brain** — This document serves as the single source of truth for architecture decisions, development patterns, security requirements, and operational guidelines for the SCAGO Patient Feedback Response Portal.

**Last Updated:** January 16, 2026  
**Version:** 1.0.0  
**Maintainers:** RethinkReality Development Team

---

## 📑 Table of Contents

1. [How to Use This Document](#-how-to-use-this-document)
2. [How to Update This Document](#-how-to-update-this-document)
3. [Application Overview](#-application-overview)
4. [Technology Stack](#️-technology-stack)
5. [Architecture Principles](#-architecture-principles)
6. [Project Structure](#-project-structure)
7. [Authentication & Authorization](#-authentication--authorization)
8. [Database Architecture](#️-database-architecture)
9. [Security Guidelines](#-security-guidelines)
10. [API Patterns](#-api-patterns)
11. [Component Patterns](#-component-patterns)
12. [State Management](#-state-management)
13. [Error Handling](#-error-handling)
14. [Performance Guidelines](#-performance-guidelines)
15. [Testing Strategy](#-testing-strategy)
16. [Deployment & CI/CD](#-deployment--cicd)
17. [Feature Modules](#-feature-modules)
18. [Common Pitfalls & Solutions](#-common-pitfalls--solutions)
19. [Code Review Checklist](#-code-review-checklist)
20. [Changelog](#-changelog)

---

## 📖 How to Use This Document

### For New Developers
1. Read sections 3-6 to understand the application and its structure
2. Study sections 7-9 for security and authorization patterns (CRITICAL)
3. Review sections 10-12 for coding patterns before writing code
4. Consult section 17 when working on specific features

### For Feature Development
1. Check section 17 (Feature Modules) for module-specific guidelines
2. Follow patterns in sections 10-12
3. Use section 19 (Code Review Checklist) before submitting PRs

### For Debugging
1. Check section 18 (Common Pitfalls) for known issues
2. Review section 13 (Error Handling) for proper error patterns

### Quick Reference
- **Adding a new page?** See [Adding New Routes](#adding-new-routes)
- **Working with Firebase?** See [Database Architecture](#️-database-architecture)
- **Need permission checks?** See [Permission System](#permission-system)
- **Building a form?** See [Survey Editor Module](#survey-editor-module)

---

## 📝 How to Update This Document

### When to Update
- ✅ New architectural decisions are made
- ✅ New patterns are established
- ✅ Security requirements change
- ✅ New features are added to section 17
- ✅ Common bugs are discovered (add to section 18)
- ✅ Dependencies are upgraded

### Update Process
1. **Create a branch** for documentation updates
2. **Update the relevant section** with clear, concise information
3. **Update the changelog** at the bottom with date and summary
4. **Update "Last Updated" date** at the top
5. **Submit for review** — documentation changes require approval

### Writing Guidelines
- Use clear, imperative language ("Do X" not "You should do X")
- Include code examples for patterns
- Mark critical security items with ⚠️ WARNING
- Use ✅ and ❌ for do/don't lists

---

## 🎯 Application Overview

### Purpose
The SCAGO Patient Feedback Response Portal is a comprehensive healthcare data collection and management platform designed for:

1. **Patient Feedback Collection** — Gather hospital experience surveys and consent forms
2. **Youth Empowerment Program (YEP)** — Manage participants, mentors, workshops, and meetings
3. **Patient Case Management** — Track patient interactions, documents, and needs
4. **Analytics & Reporting** — AI-powered insights and program-wide reporting

### Key User Roles
| Role | Description | Access Level |
|------|-------------|--------------|
| `super-admin` | Full system access, cannot be restricted | All features |
| `admin` | Administrative access with granular permissions | Permission-based |
| `yep-manager` | Youth Empowerment Program coordinator | YEP features only |
| `participant` | YEP program participant | Own profile only |
| `mentor` | YEP program mentor | Own profile + mentees |
| `public` | Anonymous users | Survey submission only |

### Core Modules
1. **Survey System** — Dynamic form builder with multi-language support
2. **Dashboard** — Analytics, AI insights, and data visualization
3. **Admin Panel** — User management, system health, permissions
4. **YEP Portal** — Participant/mentor management, workshops, meetings
5. **Patient Management** — Case tracking and interaction logging
6. **Program Reports** — Funder-ready analytics and exports

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | React framework with App Router |
| React | 18.x | UI library |
| TypeScript | 5.9.x | Type safety |
| Tailwind CSS | 3.4.x | Styling |
| Radix UI | Various | Accessible component primitives |
| Recharts | 2.x | Data visualization |
| React Hook Form | 7.x | Form management |
| Zod | 3.x | Schema validation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js Server Actions | 15.x | Server-side mutations |
| Firebase Admin SDK | 13.x | Server-side Firebase operations |
| Genkit AI | 1.x | AI-powered analysis |
| Nodemailer | 7.x | Email notifications |

### Database & Auth
| Technology | Purpose |
|------------|---------|
| Firebase Firestore | NoSQL document database |
| Firebase Auth | Authentication with custom claims |
| Firebase Storage | File uploads |

### AI & Analytics
| Technology | Purpose |
|------------|---------|
| Google AI (Gemini) | Feedback analysis, chat interface |
| pdf-lib | PDF report generation |

---

## 🏛️ Architecture Principles

### 1. Server-First with Strategic Client Interactivity
```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                    │
├─────────────────────────────────────────────────────────┤
│  Server Components (Default)                             │
│  ├── Data fetching                                       │
│  ├── Auth checks                                         │
│  └── Static rendering                                    │
├─────────────────────────────────────────────────────────┤
│  Client Components ('use client')                        │
│  ├── Interactive forms                                   │
│  ├── Real-time updates                                   │
│  └── User input handling                                 │
├─────────────────────────────────────────────────────────┤
│  Server Actions ('use server')                           │
│  ├── Database mutations                                  │
│  ├── Secure operations                                   │
│  └── Admin SDK access                                    │
└─────────────────────────────────────────────────────────┘
```

### 2. Admin SDK for Server Operations
⚠️ **CRITICAL RULE**: Server Actions MUST use Firebase Admin SDK, NOT client SDK.

```typescript
// ✅ CORRECT - Server Action
'use server'
async function getSubmissionUtils() {
  return await import('@/lib/submission-utils');
}

// ❌ WRONG - Never do this in Server Actions
import { db } from '@/lib/firebase'; // Client SDK
```

### 3. Permission-Based Architecture
All routes enforce permissions at the layout level:

```typescript
// src/app/patients/layout.tsx
import { enforcePagePermission } from '@/lib/server-auth';

export default async function Layout({ children }) {
  await enforcePagePermission('patient-management');
  return <>{children}</>;
}
```

### 4. Separation of Concerns
```
src/
├── app/           # Routes, layouts, pages (UI layer)
├── components/    # Reusable UI components
├── lib/           # Business logic, utilities, services
├── hooks/         # Custom React hooks
├── ai/            # AI flows and configurations
└── types/         # TypeScript type definitions
```

---

## 📁 Project Structure

```
patient-feedback-response-portal/
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # THIS FILE - Central brain
│   ├── firestore.rules            # Database security rules
│   └── *.md                       # Feature-specific docs
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── admin/                 # Admin panel
│   │   │   ├── layout.tsx         # Admin auth guard
│   │   │   ├── page.tsx           # Admin dashboard
│   │   │   └── reports/           # Program reports
│   │   ├── api/                   # API routes
│   │   │   ├── auth/              # Auth endpoints
│   │   │   └── email/             # Email endpoints
│   │   ├── dashboard/             # Survey analytics
│   │   │   ├── client.tsx         # Dashboard UI
│   │   │   ├── actions.ts         # Server actions
│   │   │   └── types.ts           # Type definitions
│   │   ├── editor/                # Survey builder
│   │   ├── patients/              # Patient management
│   │   ├── survey/[id]/           # Public survey form
│   │   ├── yep-forms/             # YEP form management
│   │   └── youth-empowerment/     # YEP portal
│   ├── components/
│   │   ├── admin/                 # Admin-specific components
│   │   ├── auth/                  # Auth provider, guards
│   │   ├── patients/              # Patient management UI
│   │   ├── profile/               # User profile components
│   │   ├── ui/                    # Base UI components
│   │   ├── yep-forms/             # YEP form components
│   │   └── youth-empowerment/     # YEP portal components
│   ├── hooks/
│   │   ├── use-auth.tsx           # Auth hook
│   │   ├── use-notifications.ts   # Notification hook
│   │   └── use-user-navigation.tsx # Dynamic nav
│   ├── lib/
│   │   ├── firebase.ts            # Client SDK init
│   │   ├── firebase-admin.ts      # Admin SDK init
│   │   ├── firebase-auth.ts       # Auth utilities
│   │   ├── server-auth.ts         # Server-side auth
│   │   ├── permissions.ts         # Permission definitions
│   │   ├── submission-utils.ts    # Survey data utilities
│   │   └── ...                    # Other utilities
│   └── ai/
│       ├── genkit.ts              # AI configuration
│       └── flows/                 # AI workflow definitions
├── .env.local                     # Environment variables
├── firebase.json                  # Firebase config
└── next.config.ts                 # Next.js config
```

---

## 🔐 Authentication & Authorization

### Authentication Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Firebase   │────▶│   Custom     │────▶│   Session    │
│   Auth       │     │   Claims     │     │   Cookie     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Firestore  │
                    │   Permissions│
                    └──────────────┘
```

### Role Hierarchy
```typescript
// Higher numbers = more access
const ROLE_HIERARCHY = {
  'super-admin': 100,  // Full access, cannot be restricted
  'admin': 80,         // Admin with granular permissions
  'yep-manager': 60,   // YEP-specific access
  'mentor': 40,        // Mentor profile + mentees
  'participant': 20,   // Own profile only
  'public': 0          // No authenticated access
};
```

### Permission System
Permissions are defined in `src/lib/permissions.ts`:

| Permission Key | Route | Description |
|----------------|-------|-------------|
| `user-management` | `/admin` | User CRUD operations |
| `forms-dashboard` | `/dashboard` | View survey analytics |
| `forms-editor` | `/editor` | Create/edit surveys |
| `yep-portal` | `/youth-empowerment` | YEP main portal |
| `yep-dashboard` | `/youth-empowerment/dashboard` | YEP analytics |
| `yep-forms` | `/yep-forms` | YEP form management |
| `patient-management` | `/patients` | Patient records |
| `program-reports` | `/admin/reports` | Generate reports |

### Adding New Routes

1. **Define the permission** in `src/lib/permissions.ts`:
```typescript
export const PAGE_PERMISSIONS: PagePermission[] = [
  // ... existing permissions
  {
    key: 'new-feature',
    label: 'New Feature',
    description: 'Access the new feature module',
    route: '/new-feature',
  },
];
```

2. **Add route mapping**:
```typescript
export const ROUTE_PERMISSION_MAP: Record<string, PagePermissionKey> = {
  // ... existing routes
  '/new-feature': 'new-feature',
};
```

3. **Create layout with permission check**:
```typescript
// src/app/new-feature/layout.tsx
import { enforcePagePermission } from '@/lib/server-auth';

export default async function NewFeatureLayout({ children }) {
  await enforcePagePermission('new-feature');
  return <>{children}</>;
}
```

---

## 🗄️ Database Architecture

### Firestore Collections

| Collection | Purpose | Access |
|------------|---------|--------|
| `surveys` | Survey form definitions | Public read, Admin write |
| `surveys/{id}/submissions` | Survey responses | Public create, Admin read |
| `feedback` | Legacy survey responses | Admin only |
| `users` | User profiles & tracking | Admin read, Auth write |
| `config` | System configuration | Auth read, Admin write |
| `yep_participants` | YEP participant data | Admin/YEP/Owner |
| `yep_mentors` | YEP mentor data | Admin/YEP/Owner |
| `yep_workshops` | Workshop records | Admin/YEP |
| `yep_meetings` | Meeting records | Admin/YEP |
| `patients` | Patient records | Admin only |
| `patient_interactions` | Interaction logs | Admin only |
| `program_reports` | Generated reports | Admin only |
| `page_permissions` | User permissions | Admin only |

### Data Access Patterns

#### Client-Side (Firestore Client SDK)
Use for: Real-time listeners, public data reads

```typescript
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// Real-time listener
const unsubscribe = onSnapshot(
  collection(db, 'surveys'),
  (snapshot) => { /* handle updates */ }
);
```

#### Server-Side (Firebase Admin SDK)
Use for: Server Actions, protected data, bypassing security rules

```typescript
'use server'

async function getAdminFirestore() {
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  return getAdminFirestore();
}

export async function fetchPatients() {
  const db = await getAdminFirestore();
  const snapshot = await db.collection('patients').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### Firestore Security Rules
Located at `docs/firestore.rules`. Key patterns:

```javascript
// Helper functions
function isAdmin() {
  return request.auth.token.role == 'admin' || 
         request.auth.token.role == 'super-admin';
}

// Survey submissions - public create, admin read
match /surveys/{surveyId}/submissions/{submissionId} {
  allow create: if true;
  allow read, update, delete: if isAdmin();
}
```

⚠️ **WARNING**: Always update Firestore rules when adding new collections!

---

## 🛡️ Security Guidelines

### Critical Security Rules

#### 1. Never Trust Client Input
```typescript
// ✅ CORRECT - Validate on server
'use server'
export async function createPatient(data: unknown) {
  const validated = PatientSchema.parse(data);
  // ... proceed with validated data
}

// ❌ WRONG - Using client data directly
export async function createPatient(data: PatientData) {
  await db.collection('patients').add(data); // Unvalidated!
}
```

#### 2. Always Verify Permissions in Server Actions
```typescript
'use server'
export async function deletePatient(id: string) {
  // ✅ ALWAYS check permissions first
  const { enforceAdminInServerAction } = await import('@/lib/server-auth');
  await enforceAdminInServerAction();
  
  // Now proceed with delete
}
```

#### 3. Sanitize AI Responses
```typescript
// AI responses may contain instructions - never execute them
const response = await aiAnalysis(input);
// Display as text only, never as executable code
```

#### 4. Rate Limiting for Public Endpoints
```typescript
import { RateLimiter } from '@/lib/rate-limiter';

const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!limiter.check(ip)) {
    return new Response('Too many requests', { status: 429 });
  }
  // ... handle request
}
```

### Environment Variables
Required in `.env.local`:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server-only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# AI
GOOGLE_GENAI_API_KEY=

# Email
EMAIL_HOST=
EMAIL_USER=
EMAIL_PASS=
```

⚠️ **Never commit `.env.local` to version control!**

---

## 🔌 API Patterns

### Server Actions (Preferred)
Use for all mutations and protected data fetching:

```typescript
// src/app/feature/actions.ts
'use server'

import { z } from 'zod';

const InputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function createRecord(input: unknown) {
  // 1. Validate input
  const validated = InputSchema.parse(input);
  
  // 2. Check permissions
  const { enforcePagePermission } = await import('@/lib/server-auth');
  await enforcePagePermission('required-permission');
  
  // 3. Dynamic import Admin SDK
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const db = await getAdminFirestore();
  
  // 4. Perform operation
  const docRef = await db.collection('records').add({
    ...validated,
    createdAt: new Date(),
  });
  
  // 5. Return result
  return { success: true, id: docRef.id };
}
```

### API Routes
Use for webhooks, external integrations, or complex streaming:

```typescript
// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... handle webhook
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🧩 Component Patterns

### Directory Structure
```
components/
├── ui/                    # Base primitives (Button, Input, Card)
├── auth/                  # Auth provider, login forms
├── admin/                 # Admin panel components
├── feature-name/          # Feature-specific components
└── shared-component.tsx   # Cross-feature shared components
```

### Component Template
```typescript
// components/feature/FeatureComponent.tsx
'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface FeatureComponentProps {
  title: string;
  onAction: (data: string) => Promise<void>;
}

export function FeatureComponent({ title, onAction }: FeatureComponentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    try {
      setLoading(true);
      setError(null);
      await onAction('data');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>{title}</h2>
      {error && <p className="text-red-500">{error}</p>}
      <Button onClick={handleAction} disabled={loading}>
        {loading ? 'Processing...' : 'Take Action'}
      </Button>
    </div>
  );
}
```

### UI Components (Radix-based)
Located in `src/components/ui/`. Created via shadcn/ui patterns.

```typescript
// Usage
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
```

---

## 📊 State Management

### Hierarchy of State Solutions

1. **React State** — Component-local state
2. **React Context** — Shared state across component tree
3. **URL State** — Shareable, bookmarkable state
4. **Server State** — Data from database (use Server Components)

### Auth State (Context)
```typescript
import { useAuth } from '@/hooks/use-auth';

function Component() {
  const { user, loading, isAdmin, isSuperAdmin, permissions } = useAuth();
  
  if (loading) return <Skeleton />;
  if (!user) return <Redirect to="/login" />;
  
  return <AuthenticatedContent />;
}
```

### Form State (React Hook Form + Zod)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = async (data) => {
    await serverAction(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

---

## ⚠️ Error Handling

### Pattern: Try-Catch with User Feedback
```typescript
export async function serverAction(input: unknown) {
  try {
    // Validation
    const validated = Schema.parse(input);
    
    // Operation
    const result = await performOperation(validated);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Operation failed:', error);
    
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    
    if (error instanceof FirebaseError) {
      if (error.code === 'permission-denied') {
        return { success: false, error: 'Permission denied' };
      }
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

### Client-Side Error Display
```typescript
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  const result = await serverAction(data);
  if (!result.success) {
    setError(result.error);
    return;
  }
  // Success handling
};

{error && (
  <Alert variant="destructive">
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

---

## ⚡ Performance Guidelines

### 1. Optimize Imports
```typescript
// ✅ Dynamic import for large modules
const { analyzeData } = await import('@/lib/heavy-analysis');

// ❌ Static import bloats bundle
import { analyzeData } from '@/lib/heavy-analysis';
```

### 2. Limit Data Fetching
```typescript
// ✅ Paginate large datasets
const submissions = await fetchSubmissions({ limit: 50, offset: page * 50 });

// ❌ Fetch everything
const submissions = await fetchAllSubmissions(); // Could be 10,000+ records
```

### 3. Memoize Expensive Computations
```typescript
const expensiveMetrics = useMemo(() => {
  return calculateMetrics(submissions);
}, [submissions]);
```

### 4. Use Skeleton Loading
```typescript
if (loading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
```

---

## 🧪 Testing Strategy

### Manual Testing Checklist
Before deploying, test:

- [ ] Login/logout flow
- [ ] Permission-based navigation (admin vs regular user)
- [ ] Survey creation and submission
- [ ] Dashboard analytics rendering
- [ ] YEP participant/mentor profile access
- [ ] Patient management CRUD
- [ ] PDF report generation
- [ ] Mobile responsiveness

### TypeScript Validation
```bash
npm run typecheck
```
Must pass with zero errors before deployment.

---

## 🚀 Deployment & CI/CD

### Netlify Deployment
- **Platform:** Netlify
- **Build Command:** `npm run build`
- **Publish Directory:** `.next`

### Environment Setup
1. Add all env vars in Netlify dashboard
2. Ensure `FIREBASE_ADMIN_PRIVATE_KEY` uses double quotes and `\n` for newlines

### Pre-Deployment Checklist
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds locally
- [ ] All env vars configured in Netlify
- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)

---

## 📦 Feature Modules

### Survey Editor Module
**Location:** `src/app/editor/`, `src/components/survey-editor.tsx`

**Key Files:**
- `survey-editor.tsx` — Main editor component (75K+ lines)
- `lib/question-bank.ts` — Pre-built questions
- `lib/survey-template.ts` — Survey templates
- `lib/block-templates.ts` — Reusable form blocks

**Patterns:**
- Drag-and-drop via @dnd-kit
- Multi-language with `lib/translations.ts`
- Field types support complex objects with`.selection` pattern

### Dashboard Module
**Location:** `src/app/dashboard/`

**Key Files:**
- `client.tsx` — Main dashboard UI
- `actions.ts` — Server actions for data/AI
- `types.ts` — Submission type definitions

**Key Components:**
- Metrics cards with trend indicators
- Interactive charts (Recharts)
- AI-powered analysis
- PDF report generation

### YEP Portal Module
**Location:** `src/app/youth-empowerment/`, `src/components/youth-empowerment/`

**Key Files:**
- `client.tsx` — Portal dashboard
- `messaging-actions.ts` — Email notifications
- `import-actions.ts` — CSV import
- `lib/youth-empowerment.ts` — Core utilities

**Sub-features:**
- Participant management
- Mentor management
- Workshop scheduling
- Meeting records
- Attendance tracking

### Patient Management Module
**Location:** `src/app/patients/`, `src/components/patients/`

**Key Files:**
- `actions.ts` — Patient CRUD (Admin SDK)
- `PatientTimeline.tsx` — Interaction history
- `PatientDocuments.tsx` — Document uploads
- `NeedsSelector.tsx` — Needs assessment

---

## 🚨 Common Pitfalls & Solutions

### 1. "Permission Denied" in Server Actions
**Problem:** Client SDK used instead of Admin SDK
**Solution:**
```typescript
// Use dynamic import of Admin SDK
const { getAdminFirestore } = await import('@/lib/firebase-admin');
```

### 2. "Cannot use import statement" Error
**Problem:** Server module imported in client component
**Solution:** Use dynamic imports or move to Server Action

### 3. Trend/Analytics Showing Wrong Data
**Problem:** Field extraction not handling `.selection` objects
**Solution:**
```typescript
const getSelectionValue = (val: any) => {
  if (typeof val === 'object' && 'selection' in val) return val.selection;
  return val;
};
```

### 4. Permissions Not Working for New Admin
**Problem:** Missing page_permissions document in Firestore
**Solution:** Assign permissions via Admin Panel > User Management

### 5. AI Analysis Failing with Large Datasets
**Problem:** Token limits exceeded
**Solution:** Truncate data before sending to AI:
```typescript
const feedbackText = feedbackList.slice(0, 100).map(...).join('\n');
```

### 6. Rating Schema Error in AI
**Problem:** AI expects 1-5 rating, app uses 0-10
**Solution:** Scale ratings:
```typescript
const scaleRating = (val: number) => Math.max(1, Math.min(5, Math.ceil(val / 2)));
```

---

## ✅ Code Review Checklist

### Security
- [ ] Server Actions check permissions
- [ ] Input is validated with Zod
- [ ] No secrets in client code
- [ ] Rate limiting on public endpoints

### Architecture
- [ ] Admin SDK used for server operations
- [ ] Dynamic imports for large modules
- [ ] Proper error handling with user feedback
- [ ] Loading states implemented

### Code Quality
- [ ] TypeScript types defined (no `any` without justification)
- [ ] Components follow established patterns
- [ ] No console.log in production code
- [ ] Descriptive variable/function names

### Performance
- [ ] Data fetching is paginated
- [ ] Heavy computations are memoized
- [ ] No unnecessary re-renders

---

## 📋 Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-16 | 1.0.0 | Initial comprehensive architecture document |

---

## 🔗 Related Documentation

- [Firebase Setup Guide](./QUICK-FIREBASE-SETUP.md)
- [Admin Panel Guide](./ADMIN-PANEL-GUIDE.md)
- [YEP Forms Quick Start](./YEP-FORMS-QUICK-START.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
- [Firestore Security Rules](./firestore.rules)

---

> **Note:** This document is the single source of truth. When in doubt, consult this document first. If something is missing or unclear, update it for future developers.
