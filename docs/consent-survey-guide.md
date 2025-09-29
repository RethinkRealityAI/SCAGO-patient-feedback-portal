# SCAGO Digital Consent & Information Collection Survey

## Overview

The Digital Consent & Information Collection survey is a comprehensive form designed specifically for SCAGO (Sickle Cell Awareness Group of Ontario) to collect patient and family information, consent, and communication preferences.

## Purpose

This survey template serves multiple purposes:
1. **Patient Registration**: Collect basic contact and demographic information
2. **Consent Documentation**: Obtain explicit consent for services and advocacy
3. **Connection Assessment**: Understand the respondent's relationship to sickle cell disease
4. **Communication Preferences**: Gather preferences for future contact and support group participation

## Survey Structure

### 1. About SCAGO & Consent to Participate

**Purpose**: Inform users about SCAGO and confirm age eligibility.

**Fields**:
- Age confirmation checkbox (required)
  - Confirms user is 18+ or parent/guardian completing on behalf of minor

**Key Information Displayed**:
- Brief description of SCAGO's mission and services
- Notice that services are non-medical only
- Emergency contact guidance (call 911 if urgent)
- Age requirement notification

### 2. Basic Information

**Purpose**: Collect essential contact and demographic details.

**Fields**:
- Title (radio buttons): Mr, Mrs, Ms, Mx, Dr, Other
  - If "Other" selected, conditional text field appears
- First Name (text, required)
- Last Name (text, required)
- Email Address (email validation, required)
- Phone Number (Cell) (phone validation, required)
- Street Address (text, required)
- City (Ontario city selector with "Other" option, required)
- Province (Canadian province selector, required)
- Postal Code (text, required)

**Field Layout**:
- First and Last Name are grouped side-by-side
- Email and Phone are grouped side-by-side
- City and Province are grouped side-by-side

### 3. Your Connection to Sickle Cell Disease

**Purpose**: Understand the respondent's relationship to SCD and identify household members with the condition.

**Fields**:
- SCD Connection (multi-checkbox, required):
  - "I have sickle cell disease"
  - "My child has sickle cell disease"
  - "I am a caregiver or family member"
  - "I am a healthcare provider"
  - "Other" (with conditional text field for description)
- Up to 3 individuals with SCD in household (optional):
  - Individual 1: Name + Date of Birth (grouped)
  - Individual 2: Name + Date of Birth (grouped)
  - Individual 3: Name + Date of Birth (grouped)

**Design Notes**:
- The household member fields are optional to allow flexibility
- Name and DOB are grouped horizontally for better UX
- Users can leave these blank if not applicable

### 4. Care Information

**Purpose**: Identify primary care locations for SCD treatment.

**Fields**:
- Primary Hospital (searchable Ontario hospital selector, required)
  - Includes "Other" option with free-text input
  - Searchable dropdown for better UX

### 5. Stay Connected

**Purpose**: Gather consent for future communication and determine preferred contact methods.

**Fields**:
- May we contact you about SCAGO services? (radio: Yes/No, required)
- Preferred contact method (conditional on "Yes" above, radio, required):
  - Email
  - Phone (Text/Phone call)
  - Either
- Join mailing list for updates? (radio: Yes/No, required)
- Join WhatsApp or face-to-face support groups? (radio: Yes/No, required)
- Support group contact method (conditional on "Yes" above, radio, required):
  - Email
  - Phone
  - Either
- Consent to advocacy by SCAGO staff? (radio: Yes/No, required)

**Conditional Logic**:
- Contact method fields only appear when user consents to contact
- Support group contact method only appears when user wants to join groups

### 6. Consent and Confirmation

**Purpose**: Obtain digital signature confirming understanding and voluntary consent.

**Fields**:
- Full Name (Digital Signature) (text, required)
- Date (date picker, required)

**Confirmation Statement**:
By providing their signature, users confirm:
1. They are 18 years or older
2. They have read and understood the information provided
3. They voluntarily consent to SCAGO's collection and use of information

## Technical Implementation

### Template Location
- File: `src/lib/survey-template.ts`
- Export: `consentSurvey`

### Creation Action
- File: `src/app/editor/actions.ts`
- Function: `createConsentSurvey()`

### Appearance Settings
```javascript
{
  themeColor: '#C8262A',        // SCAGO red
  cardShadow: 'sm',
  cardTitleSize: 'lg',
  sectionTitleSize: 'lg',
  labelSize: 'sm',
  gradient: true,
  showTitle: true,
}
```

### Form Settings
- Submit Button Label: "Submit Consent Form"
- Save Progress: Enabled (users can resume later)
- Share Button: Disabled (consent forms typically shouldn't be shared)

## Field Types Used

- `boolean-checkbox`: Age confirmation
- `radio`: Title, consent questions, communication preferences
- `text`: Name fields, address, signature
- `email`: Email validation
- `phone`: Phone number validation
- `city-on`: Ontario city selector with "Other"
- `province-ca`: Canadian province selector
- `hospital-on`: Ontario hospital selector with search
- `date`: Date of birth and signature date
- `checkbox`: Multi-select for SCD connection
- `group`: Layout multiple fields horizontally

## Validation Rules

### Required Fields
All fields marked as required in the template will prevent submission if left empty:
- Age confirmation
- Title (with conditional "Other" text)
- First Name, Last Name
- Email, Phone
- Street Address, City, Province, Postal Code
- SCD Connection
- Primary Hospital
- All "Stay Connected" questions
- Digital Signature and Date

### Conditional Requirements
Fields that are conditionally shown become required only when visible:
- "Title Other" (when Title = "other")
- "SCD Connection Other" (when connection includes "other")
- "Preferred Contact Method" (when May Contact = "yes")
- "Support Group Contact Method" (when Join Support Groups = "yes")

## Best Practices

### For Administrators
1. **Review Submissions Promptly**: Consent forms often indicate a user wants to engage with services
2. **Respect Communication Preferences**: Honor the contact preferences users select
3. **Secure Storage**: Ensure consent form data is stored securely (Firestore with proper security rules)
4. **Export Capabilities**: Use dashboard analytics to review and export consent data

### For Customization
1. **Don't Remove Required Fields**: The consent and age confirmation are legally important
2. **Test Conditional Logic**: Ensure conditional fields appear/disappear correctly
3. **Maintain Data Privacy**: Be transparent about data usage in the description
4. **Consider Multi-language**: Add French translations if serving bilingual audiences

## Creating a New Consent Survey

### Via Editor UI
1. Navigate to `/editor`
2. Click "New Survey" button
3. Select "Digital Consent & Information Collection" from dropdown
4. The survey is created with all fields pre-configured
5. Customize if needed (change colors, labels, etc.)
6. Click "Save Changes"
7. Share the survey URL with participants

### Programmatically
```typescript
import { createConsentSurvey } from '@/app/editor/actions';

const survey = await createConsentSurvey();
// Returns: { id: 'survey-id' }
// Navigate to: /editor/${survey.id} to customize
// Public form: /survey/${survey.id}
```

## Accessing Survey Data

### Dashboard
- Navigate to `/dashboard/{surveyId}`
- View submission count, completion rate
- Export data as CSV
- View individual responses with all consent details

### Firestore
Submissions are stored in:
```
surveys/{surveyId}/submissions/{submissionId}
```

### Field IDs in Submissions
Important field IDs you'll find in submission data:
- `ageConfirmation`: boolean
- `title`, `titleOther`: string
- `firstName`, `lastName`: string
- `email`, `phone`: string
- `streetAddress`, `city`, `province`, `postalCode`: string or object (for city)
- `scdConnection`: array of strings
- `scdConnectionOther`: string
- `individual1Name`, `individual1DOB`, etc.: string
- `primaryHospital`: object `{selection, other?}`
- `mayContact`, `preferredContactMethod`: string
- `joinMailingList`, `joinSupportGroups`: string
- `supportGroupContactMethod`: string
- `consentToAdvocacy`: string
- `digitalSignature`: string
- `signatureDate`: string (YYYY-MM-DD)

## Legal & Compliance Notes

⚠️ **Important**: This template is provided as a starting point. Organizations should:
1. Consult with legal counsel to ensure compliance with local privacy laws
2. Update the consent language to match their specific practices
3. Ensure proper data storage and security measures are in place
4. Maintain records according to legal requirements
5. Provide users with access to their data and ability to withdraw consent

## Support

For issues or questions about the consent survey template:
1. Check the main documentation: `docs/creating-surveys.md`
2. Review field types: See list of supported types in survey editor
3. Test the form: Always test the complete flow before sharing with users
4. Security: Ensure Firestore rules are properly configured for production use
