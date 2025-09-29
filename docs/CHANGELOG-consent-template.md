# Changelog: Digital Consent Survey Template & Template Selection UI

## Date: 2025-09-29

## Summary
Added a new SCAGO Digital Consent & Information Collection survey template and improved the survey creation UI with a dropdown menu for template selection.

## Changes Made

### 1. New Survey Template: Digital Consent & Information Collection

**File**: `src/lib/survey-template.ts`

**Added**: `consentSurvey` export

**Structure**:
- 6 comprehensive sections
- 30+ fields with smart conditional logic
- Professional appearance matching SCAGO branding

**Sections**:
1. **About SCAGO & Consent to Participate**
   - Age confirmation checkbox
   - Information about SCAGO services

2. **Basic Information**
   - Title selection (Mr, Mrs, Ms, Mx, Dr, Other)
   - Name, email, phone
   - Full address (street, city, province, postal code)
   - Uses grouped fields for better layout

3. **Your Connection to Sickle Cell Disease**
   - Multi-select checkbox for connection type
   - Optional fields for up to 3 household members with SCD
   - Name and date of birth for each individual

4. **Care Information**
   - Primary hospital selection (Ontario hospitals)
   - Uses searchable dropdown with "Other" option

5. **Stay Connected**
   - Communication consent and preferences
   - Mailing list signup
   - Support group participation
   - Advocacy consent
   - Smart conditional fields based on user choices

6. **Consent and Confirmation**
   - Digital signature field
   - Date field
   - Clear confirmation statement

**Features**:
- Save progress enabled (users can resume later)
- Share button disabled (appropriate for consent forms)
- Professional red theme (#C8262A)
- All required fields properly marked
- Validation built-in for email, phone, date fields

### 2. Server Actions

**File**: `src/app/editor/actions.ts`

**Added**:
- Import of `consentSurvey` template
- `createConsentSurvey()` action function

**Function Signature**:
```typescript
export async function createConsentSurvey() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    ...consentSurvey,
  } as any;

  await setDoc(newSurveyRef, newSurvey);
  revalidatePath('/editor');
  return { id: newSurveyRef.id };
}
```

### 3. Template Selection UI - Dropdown Menu

**File**: `src/app/editor/client.tsx`

**Added**:
- `CreateSurveyDropdown` component
- Imports for dropdown menu components
- Plus and ChevronDown icons

**Features**:
- Clean dropdown interface
- Three template options with descriptions:
  1. Patient Feedback Survey
  2. Patient Feedback Survey (V2)
  3. Digital Consent & Information Collection
- Loading state management
- Professional descriptions for each template
- Responsive design

**UI Improvements**:
- Templates are now organized in a dropdown instead of separate buttons
- Each template has a title and description
- Better use of space in the editor header
- More scalable for future template additions

### 4. Editor Page Update

**File**: `src/app/editor/page.tsx`

**Changed**:
- Replaced `CreateSurveyButton` and `CreateSurveyV2Button` with `CreateSurveyDropdown`
- Cleaner, more compact header layout
- Single button for all survey creation needs

**Before**:
```tsx
<CreateSurveyButton />
<CreateSurveyV2Button />
```

**After**:
```tsx
<CreateSurveyDropdown />
```

### 5. Documentation Updates

**Files Updated**:
- `docs/creating-surveys.md` - Updated to reflect new dropdown UI and consent template
- `docs/consent-survey-guide.md` - NEW: Comprehensive guide for the consent template
- `docs/CHANGELOG-consent-template.md` - NEW: This file

**Documentation Improvements**:
- Added section on creating digital consent forms
- Updated file reference map
- Clarified template selection process
- Added consent survey field IDs reference
- Included legal/compliance notes

## Technical Details

### Field Types Used
The consent template leverages these existing field types:
- `boolean-checkbox` - Age confirmation
- `radio` - Title, Yes/No questions
- `text` - Names, addresses, signature
- `email` - Email validation
- `phone` - Phone validation
- `city-on` - Ontario city selector
- `province-ca` - Province selector
- `hospital-on` - Hospital selector with search
- `date` - DOB and signature dates
- `checkbox` - Multi-select for SCD connection
- `group` - Horizontal field layouts

### Conditional Logic
Smart conditional fields:
- Title "Other" text field (shows when title = "other")
- Preferred contact method (shows when may contact = "yes")
- Support group contact method (shows when join groups = "yes")

**Note**: Removed conditional logic for checkbox array due to current implementation limitation. The "Other" description field is now always visible (users can leave blank if not applicable).

## Migration Notes

### For Existing Installations
No migration needed. This is a pure addition:
- Existing surveys continue to work
- No schema changes
- No database migrations required
- Backward compatible

### For Developers
If you have customized the editor page:
1. Import `CreateSurveyDropdown` instead of individual buttons
2. Replace button group with single dropdown component
3. Update any custom navigation logic if needed

## Testing Checklist

✅ New template creation via dropdown
✅ All field types render correctly
✅ Validation works for all required fields
✅ Conditional fields show/hide properly
✅ Group fields display side-by-side
✅ Form submission successful
✅ No linter errors
✅ Documentation complete

## Future Enhancements (Suggestions)

### Potential Improvements:
1. **Checkbox Conditional Logic**: Enhance `shouldShowField` to support array conditions
   - Would allow "Other" field to only show when checkbox includes "other"
   - Requires update to `src/components/feedback-form.tsx`

2. **Dynamic Repeater Fields**: Add ability to dynamically add more household members
   - Currently limited to 3 individuals
   - Would require new field type or component

3. **Digital Signature Canvas**: Replace text signature with drawn signature
   - More professional appearance
   - Would require new field type

4. **Multi-language Support**: Add French translations for consent form
   - Important for Ontario (bilingual province)
   - Leverage existing translation system

5. **PDF Export**: Generate PDF version of consent form with signature
   - For record-keeping
   - Email to user after submission

6. **Template Categories**: Organize templates into categories as library grows
   - "Feedback Forms"
   - "Consent Forms"
   - "Registration Forms"
   - etc.

## Files Changed

### New Files:
- `docs/consent-survey-guide.md`
- `docs/CHANGELOG-consent-template.md`

### Modified Files:
- `src/lib/survey-template.ts`
- `src/app/editor/actions.ts`
- `src/app/editor/client.tsx`
- `src/app/editor/page.tsx`
- `docs/creating-surveys.md`

## Impact Assessment

### User Impact:
- **Positive**: Easier template selection with dropdown
- **Positive**: New consent form template available
- **Positive**: Better organized UI
- **Neutral**: Existing workflows unchanged

### Developer Impact:
- **Positive**: Easy to add new templates to dropdown
- **Positive**: Better code organization
- **Positive**: Comprehensive documentation
- **Neutral**: No breaking changes

### Performance Impact:
- **Neutral**: No performance changes
- Template loading is still server-side
- Client-side dropdown is lightweight

## Support & Resources

### Documentation:
- Main Guide: `docs/creating-surveys.md`
- Consent Guide: `docs/consent-survey-guide.md`
- Blueprint: `docs/blueprint.md`

### Key Components:
- Survey Editor: `src/components/survey-editor.tsx`
- Feedback Form: `src/components/feedback-form.tsx`
- Templates: `src/lib/survey-template.ts`

### Getting Help:
1. Check documentation in `/docs` folder
2. Review existing templates for patterns
3. Test in editor before deploying
4. Ensure Firestore rules allow survey creation

## Version Info

- **Feature**: Digital Consent Template & Dropdown UI
- **Date**: 2025-09-29
- **Status**: ✅ Complete
- **Testing**: ✅ Passed
- **Documentation**: ✅ Complete

---

## Next Steps for Users

1. Navigate to `/editor` in your application
2. Click "New Survey" button
3. Select "Digital Consent & Information Collection" from dropdown
4. Review and customize the template as needed
5. Save and share the survey URL with participants

## Next Steps for Developers

1. Review the consent template structure in `src/lib/survey-template.ts`
2. Consider implementing suggested enhancements
3. Add translations if serving bilingual audiences
4. Configure Firestore security rules for production
5. Test the complete flow in your environment
