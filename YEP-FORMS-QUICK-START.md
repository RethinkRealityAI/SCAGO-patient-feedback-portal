# YEP Forms Management - Quick Start Guide

## 🎯 How to Access YEP Forms

1. Navigate to **http://localhost:9002/youth-empowerment**
2. Click the **"Forms"** tab (6th tab in the navigation)
3. You'll see the YEP Forms Management interface with 4 secondary tabs

## 📋 The 4 Tabs Explained

### 1. **Forms List** Tab
- View all your YEP form templates
- Search forms by name or description
- Filter by category (Mentor, Participant, Workshop, Meeting, etc.)
- Actions available:
  - **Edit** - Opens the form editor inline
  - **Duplicate** - Creates a copy of the form
  - **Use** - Fill out and submit the form
  - **Delete** - Soft delete the form

### 2. **Templates** Tab
- Quick access to 6 pre-built form templates
- Create new forms instantly from templates:
  - Mentor Registration Form
  - Participant Registration Form
  - Workshop Management Form
  - Meeting Record Form
  - Bulk Attendance Entry
  - Bulk Meeting Entry

### 3. **Submissions** Tab
- View all form submissions
- Track processing status (pending/completed/failed)
- See which entities were created from each submission

### 4. **Settings** Tab
- Form management configuration options

## 🚀 Common Workflows

### Create a New Form from Template

1. Go to Forms tab → Templates
2. Click "Create Form" button
3. Select a template from the dropdown
4. Form is created instantly
5. Optionally edit it by clicking the edit icon

### Edit an Existing Form

1. Go to Forms tab → Forms List
2. Find your form (use search if needed)
3. Click the **Edit** button (pencil icon)
4. Editor opens inline with 3 tabs:
   - **Details:** Edit name, description, category
   - **Sections:** Add/edit/reorder sections and fields
   - **Settings:** Form-level configuration
5. Drag and drop sections to reorder
6. Click **Save Form** when done

### Fill Out & Submit a Form

1. Go to Forms tab → Forms List
2. Find the form you want to use
3. Click the **Use** button (play icon)
4. Fill out all required fields
5. Click **Submit Form**
6. System processes submission automatically
7. Success confirmation shown

### Duplicate a Form

1. Go to Forms tab → Forms List
2. Click the **Duplicate** button (copy icon)
3. Enter a new name for the copy
4. Click "Duplicate"
5. New form created and ready to edit

## 🔧 Form Editor Features

### Add a Section

1. In editor Sections tab, click "+ Add Section"
2. Enter section title and description
3. Section appears at the bottom
4. Drag to reorder if needed

### Add a Field to Section

1. Click "+ Add Field" button in the section
2. Select field type from dropdown (40+ types available)
3. Configure field:
   - Label
   - Placeholder
   - Required checkbox
   - Validation rules
   - YEP-specific options (for YEP field types)
4. Field added to section

### Available Field Types

**Standard Fields:**
- Text, Textarea, Email, Phone, URL
- Date, Time, Number
- Select, Radio, Checkbox
- File Upload

**YEP-Specific Fields:**
- **yepParticipantLookup** - Search and select participants
- **yepMentorLookup** - Search and select mentors
- **yepSIN** - Secure SIN input
- **yepMentorAssignment** - Assign mentors to students
- **yepParticipantAssignment** - Assign students to mentors
- **yepWorkshopSelector** - Select workshops with context
- **yepMeetingTopics** - Pre-defined meeting topics
- **yepAttendanceBulk** - Bulk attendance entry
- **yepFileSecure** - Secure file uploads

### Reorder Sections

1. Click and drag the grip icon (⋮⋮) on any section
2. Drop it in the desired position
3. Sections reorder automatically
4. Save form to persist changes

### Preview Your Form

1. Click the **"Preview"** button in the top right
2. See exactly how users will see the form
3. Click **"Edit Mode"** to return to editing

## 💾 Data Flow

### Form Submission → Entity Creation

When a user submits a form:

1. **Validation** - Client-side validation ensures all required fields filled
2. **Submission** - Data sent to `submitYEPFormSubmission` action
3. **Storage** - Submission stored in `yep-form-submissions` collection
4. **Processing** - `processYEPFormSubmission` maps form data to entities
5. **Entity Creation** - Appropriate YEP entities created:
   - Participants → `yep_participants` collection
   - Mentors → `yep_mentors` collection
   - Workshops → `yep_workshops` collection
   - Meetings → `yep_advisor_meetings` collection
   - Attendance → `yep_workshop_attendance` collection
6. **Status Update** - Submission marked as completed/failed
7. **Confirmation** - User sees success/error message

## 🔒 Security Features

### Access Control

- **Form Templates:** Admin and YEP Manager roles only
- **Form Submissions:** Authenticated users can submit
- **Entity Data:** Role-based access per collection

### Data Protection

- **SIN Encryption:** Automatic bcrypt hashing (12 rounds)
- **File Security:** Stored in Firebase Storage with secure URLs
- **Audit Trails:** All operations logged with timestamps
- **Soft Deletes:** Data never permanently deleted from templates

## 🐛 Troubleshooting

### Forms Not Loading

**Issue:** Forms list is empty  
**Solution:** Check Firestore connection and ensure `yep-form-templates` collection exists

### Cannot Create Form

**Issue:** "Create Form" button doesn't work  
**Solution:** Verify user has admin or yep-manager role in Firestore users collection

### Submission Fails

**Issue:** Form submission shows error  
**Solution:** 
- Check browser console for specific error
- Verify all required fields are filled
- Ensure Firebase connection is active

### TypeScript Errors

**Issue:** TypeScript errors in development  
**Solution:** 
```bash
npm run build
# or
npx tsc --noEmit
```
All errors should be resolved (Exit Code 0)

## 📊 Monitoring & Maintenance

### Check Submission Status

1. Go to Forms tab → Submissions
2. View list of all submissions
3. Check processing status:
   - **Pending:** Waiting to be processed
   - **Processing:** Currently being processed
   - **Completed:** Successfully created entities
   - **Failed:** Error during processing

### View Created Entities

- After submission processing, check the relevant tabs:
  - **Participants tab** for new participants
  - **Mentors tab** for new mentors
  - **Workshops tab** for new workshops
  - **Meetings tab** for new meetings

### Run Pending Submissions

If submissions get stuck in "pending":

```typescript
import { processPendingSubmissions } from '@/lib/yep-forms-processor';

// Call from browser console or create admin action
await processPendingSubmissions();
```

## 🎨 Customization

### Modify Pre-built Templates

Edit `src/lib/yep-form-templates.ts`:

```typescript
export const yepFormTemplates: YEPFormTemplate[] = [
  {
    id: 'mentor-template',
    name: 'Mentor Registration Form',
    description: 'Your custom description',
    category: YEPFormCategory.MENTOR,
    targetEntity: 'mentor',
    isTemplate: true,
    isActive: true,
    sections: [
      {
        id: 'mentor-info',
        title: 'Mentor Information',
        description: 'Basic information about the mentor',
        fields: [
          // Add or modify fields here
        ]
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  // ... more templates
];
```

### Add New Field Type

1. Add to `YEPFieldType` enum in `src/lib/yep-forms-types.ts`
2. Add renderer in `src/components/yep-forms/yep-field-renderers.tsx`
3. Add configuration in `getYEPFieldTypeConfig` function
4. Create component file if complex field type

### Add New Form Category

1. Add to `YEPFormCategory` enum in `src/lib/yep-forms-types.ts`
2. Add processing logic in `processYEPFormSubmission` switch statement
3. Create processor function (e.g., `processNewCategoryForm`)
4. Update Firestore rules if new collection needed

## 📞 Support & Resources

### Documentation

- **Full Audit Report:** `YEP-FORMS-AUDIT-COMPLETE.md`
- **Implementation Plan:** `yep-forms-system.plan.md`
- **Firestore Rules:** `docs/firestore.rules`

### Key Files to Know

**Core Logic:**
- `src/lib/yep-forms-processor.ts` - Submission processing
- `src/app/yep-forms/actions.ts` - CRUD operations
- `src/lib/yep-forms-types.ts` - Type definitions

**UI Components:**
- `src/components/yep-forms/yep-forms-management.tsx` - Main UI
- `src/components/yep-forms/yep-form-editor.tsx` - Form builder
- `src/components/yep-forms/yep-field-renderers.tsx` - Field displays

**Templates & Data:**
- `src/lib/yep-form-templates.ts` - Pre-built templates
- `src/app/youth-empowerment/actions.ts` - YEP entity CRUD

### Development Commands

```bash
# Start development server
npm run dev

# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Build for production
npm run build
```

---

## 🎉 You're All Set!

The YEP Forms Management System is ready to use. Start by:

1. Opening http://localhost:9002/youth-empowerment
2. Clicking the "Forms" tab
3. Exploring the 6 pre-built templates
4. Creating your first form!

**Happy Form Building! 📝**

