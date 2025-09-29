## Creating and Integrating Surveys

This guide explains how to create a new survey, customize questions/sections, add new field types, and ensure everything is fully integrated with the platform (editor, public form, and dashboard).

### Concepts and Data Model

- **Survey**: A JSON configuration persisted in Firestore under the `surveys` collection.
- **Sections**: Each survey is composed of one or more sections. Section fields are rendered in order.
- **Fields**: Each question or control. Every field has an `id`, `label`, and `type`. Some types require `options`.
- **Conditional logic**: A field can be shown only when another field has a specific value using `conditionField` and `conditionValue`.
- **Required**:
  - At the section level you can enable `allRequired` to require every field in the section.
  - At the field level you can set `validation.required: true`.
  - The platform enforces “required” only when a field is visible (i.e., its condition is satisfied). Hidden fields never block submission.

Important:
- Field `id`s are the keys stored in submissions; choose stable, descriptive ids.
- For select-with-other style fields (`city-on`, `hospital-on`, `department-on`), the submission value is an object `{ selection: string, other?: string }`.

### Create a New Survey

You have two main paths:

1) Use the Editor UI (recommended)
- Navigate to `/editor`.
- Click "New Survey" and choose from the dropdown:
  - **Patient Feedback Survey**: Standard feedback form with contact info and hospital experience sections
  - **Patient Feedback Survey (V2)**: Adaptive form with visit-type specific questions (Outpatient, Emergency, Inpatient)
  - **Digital Consent & Information Collection**: SCAGO consent form for patient registration and information collection
- You'll be redirected to `/editor/{surveyId}` to customize sections, questions, and settings.

2) Programmatic (server actions)
- Default template action: `createSurvey()` in `src/app/editor/actions.ts`.
- V2 template action: `createSurveyV2()` in `src/app/editor/actions.ts`.
- Consent template action: `createConsentSurvey()` in `src/app/editor/actions.ts`.

### Edit Sections and Fields (Editor UI)

- Click a section to expand it and manage its fields.
- Use the “Add Question” button to add a new field.
- Choose the field type (text, email, phone, date, time, number, select, radio, checkbox, slider, rating, nps, group, boolean-checkbox, anonymous-toggle, province-ca, city-on, hospital-on, department-on, duration-hm, duration-dh, time-amount).
- For select/radio/checkbox types, add `options`.
- To arrange two questions side-by-side (e.g., `city-on` + `province-ca`), use a `group` field and add child fields inside the group. Each child has its own type and validation.
- Conditional logic: open “Conditional Logic”, pick a controlling field (`conditionField`) and value (`conditionValue`). The question will render only when the condition matches.

### Appearance and Behavior Settings

- Appearance tab controls theme color, shadows, label/title sizes, and gradient.
- Details tab controls title/description, submit label, and share button.
- Settings tab controls “Resume Later” behavior.

### Field Types and Conventions

- Simple text: `text`, `textarea`, `email`, `phone`, `url`, `number`, `date`, `time`.
- Scales and durations: `rating` (1–5), `nps` (1–10), `slider` (use `min`/`max`/`step`), `duration-hm` (hours/minutes), `duration-dh` (days/hours), `time-amount` (value + unit).
- Selects: `select`, `radio`, `checkbox` (multi).
- Geo/domain specific:
  - `province-ca` → select from Canadian provinces.
  - `city-on` → Ontario cities (with Other + free text).
  - `hospital-on` → Ontario hospitals list (searchable; Other + free text is first).
  - `department-on` → Common hospital departments (Other first).
- Privacy toggle: `anonymous-toggle` (hides contact fields when enabled).
- Layout: `group` to display child fields side-by-side.

### Conditional Required Behavior (Important)

The platform enforces “required” only when a field is visible:
- If a field has `conditionField/conditionValue`, it’s treated as required only when that condition is met.
- Hidden questions (e.g., alternate visit-type branches) never block submission.

### V2 Engagement Gating (Visit Type First)

In the V2 template, the “Hospital Engagement” section shows only the `visitType` first and reveals follow-up questions after a visit type is selected.

### Adding New Field Types

If you need a brand-new field type:
1) Update the public form renderer and validation
   - File: `src/components/feedback-form.tsx`
   - Add schema for your new type in `buildZodSchema`.
   - Add a corresponding case in `renderField` to render the UI.

2) Update the survey editor schema and type dropdown
   - File: `src/components/survey-editor.tsx`
   - Extend the Zod union of types.
   - Add a new `<SelectItem value="your-type">` in the “Type” select.

3) Add datasets if needed
   - E.g., `src/lib/hospital-departments.ts` for list-backed selects.

4) Dashboard compatibility (optional)
   - File: `src/app/dashboard/client.tsx`
   - If you expect aggregation by your new field id, add it to the metrics as needed.

### “Select with Other” Pattern

Use the built-in patterns for fields that need an “Other” option and free-text when selected:
- Types: `city-on`, `hospital-on`, `department-on`.
- Submission shape: `{ selection: string, other?: string }`.

### Sharing and Resume Later

- Sharing: enable `shareButtonEnabled`, and optionally set `shareTitle` and `shareText`.
- Resume Later: enable `saveProgressEnabled`. Drafts are saved locally per survey id and can be restored with a modal.

### Validation UX

- On submit with errors:
  - The form scrolls to the first invalid field.
  - A card under the submit button lists missing fields (click-to-scroll).
  - A toast summarizes how many fields need attention.

### Creating a V2 Survey (Contact + Engagement)

- From `/editor`: click "New Survey" → "Patient Feedback Survey (V2)".
- Configure Contact Information fields as needed.
- In "Hospital Engagement", pick your visit type to reveal relevant questions. Unselected branches won't block submit.

### Creating a Digital Consent Form

- From `/editor`: click "New Survey" → "Digital Consent & Information Collection".
- This template includes:
  - Age confirmation and consent notice
  - Basic contact information (title, name, email, phone, address)
  - Connection to Sickle Cell Disease (multi-checkbox with optional household member details)
  - Primary hospital for care
  - Communication preferences and consent options
  - Digital signature and date
- The template uses conditional logic to show/hide relevant fields based on user selections.

### Troubleshooting

- “Submit does nothing”: ensure there are no missing visible required fields. The error card will list them and auto-scroll to the first.
- Hidden branch blocking submit: verify your conditional logic; hidden fields should not be required by design.
- Editor won’t load: check Firestore rules allow reads of `surveys/{id}`. The app also provides an error alert with guidance.
- New field not rendering: confirm both `survey-editor` (type enum/dropdown) and `feedback-form` (schema+renderer) are updated.
- Dashboard missing a metric: add an aggregator in `src/app/dashboard/client.tsx` for that field id if necessary.

### File Reference Map

- `src/app/editor/actions.ts`: create/list/get/update/delete surveys; `createSurveyV2()` for V2 template; `createConsentSurvey()` for consent template.
- `src/app/editor/client.tsx`: client components for creating surveys, including `CreateSurveyDropdown` for template selection.
- `src/components/survey-editor.tsx`: survey editor UI (sections, questions, settings, conditional logic, group editing).
- `src/components/feedback-form.tsx`: public survey form (validation, rendering, submit, draft, UX for missing fields).
- `src/lib/survey-template.ts`: default, V2, and consent survey templates you can use or copy.
- `src/lib/hospital-names.ts`: Ontario hospitals list (Other first; searchable in the form).
- `src/lib/hospital-departments.ts`: common department list (Other first).
- `src/app/dashboard/client.tsx`: metrics, aggregation, and submission details UI.

### Best Practices

- Keep field ids stable and descriptive.
- Prefer `group` for two related fields you want side-by-side (e.g., `city-on` + `province-ca`).
- Use conditional logic to keep forms short and relevant.
- Put “Other” at the top of long lists to reveal free-text quickly.
- Don’t overuse required flags; ask only for what’s necessary.

### Example: Add a Department question

1) In the Editor, add a field and set type to `department-on` (Department (Ontario - popular)).
2) Optionally mark it required.
3) Save. The public form now renders a select with “Other” first and a free-text when selected.


