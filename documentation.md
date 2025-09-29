# Project Documentation & Best Practices

This document provides an overview of the platform architecture and outlines the best practices for developing and maintaining the survey application. Adhering to these guidelines is crucial for ensuring that the survey editor, templates, and data models remain in sync.

## 1. Platform Overview

The application is a Next.js-based survey platform that uses Firebase for its database and hosting. It is composed of three main parts:

*   **Survey Editor (`/editor/[surveyId]`):** A rich, client-side editor for creating and modifying surveys. It features drag-and-drop reordering, conditional logic, and a variety of question types.
*   **Survey Form (`/survey/[surveyId]`):** The public-facing page where users fill out and submit the survey. It dynamically renders the form based on the structure defined in the editor.
*   **Dashboard (`/dashboard`):** A view for administrators to see and analyze the submitted feedback. It is powered by AI flows that provide insights into the survey data.

## 2. Survey Editor Best Practices

The survey editor is a complex, client-side component. When making changes, it is important to adhere to the following best practices to avoid common pitfalls:

*   **Event Handling:** The editor uses `dnd-kit` for drag-and-drop functionality. This library can be aggressive in capturing events. To prevent conflicts with form inputs, always add `onPointerDown={stopPropagation}` to any interactive elements within a draggable component.
*   **Unique IDs:** All new sections, questions, and options should be created with a unique ID from the `nanoid` library. This is crucial for preventing React hydration errors and ensuring that the drag-and-drop functionality works correctly.
*   **Validation:** All form validation is handled by Zod schemas. When adding new fields or options, be sure to update the corresponding schema to ensure data integrity.

## 3. Updating Survey Templates

The default survey template is located at `src/lib/survey-template.ts`. This template is used to create new surveys, but it does **not** automatically update existing surveys.

### Data Integrity

It is absolutely critical that the `id` of each question in the survey template is a **camelCase** string that exactly matches the property name in the `FeedbackSubmission` interface (located at `src/app/dashboard/types.ts`).

*   **Correct:** `{ id: 'patientOrCaregiver', ... }`
*   **Incorrect:** `{ id: 'patient-or-caregiver', ... }`

If these do not match, the data will not be correctly saved to the database or displayed on the dashboard.

### Updating an Existing Survey

If you need to update an existing survey (like the main feedback survey) with the latest changes from the template, you must use a script to perform a one-time update.

1.  **Create a Script:** Create a temporary script (e.g., `update-survey.mjs`) in the root of the project.
2.  **Add the Logic:** The script should load the latest `defaultSurvey` from the template, connect to Firebase, and use `setDoc` to overwrite the data for the survey you want to update.
3.  **Run the Script:** Execute the script with `npx tsx update-survey.mjs`.
4.  **Delete the Script:** Once the update is complete, delete the script to keep the project clean.

This process ensures that your existing surveys are always in sync with the latest version of the template.

## 4. Internationalization & Translation System

The application features a comprehensive bilingual system supporting English and French languages. The translation system is modular and extensible.

### Translation Architecture

*   **Translation Library (`src/lib/translations.ts`):** Central translation system with 60+ translations covering UI elements, form fields, medical terms, and common phrases.
*   **Language Toggle Component (`src/components/language-toggle.tsx`):** Reusable component for switching between languages, available in multiple sizes.
*   **Form Field Renderer (`src/components/form-field-renderer.tsx`):** Modular component for rendering form fields with built-in translation support.

### Key Translation Features

*   **Dynamic Field Label Translation:** Automatically translates field labels using the `translateFieldLabel()` function
*   **Option Translation:** Translates dropdown options, radio buttons, and checkbox labels using `translateOption()`
*   **Section Title Translation:** Translates section headers using `translateSectionTitle()`
*   **Placeholder Translation:** Translates form placeholders and helper text
*   **Contextual Translation:** Handles gender-specific and context-aware translations in French

### Adding New Translations

1. **Update Translation Interface:** Add new translation keys to the `Translation` interface in `src/lib/translations.ts`
2. **Add Translations:** Add both English and French translations to the `translations` object
3. **Update Mapping Functions:** Add mappings to `translateFieldLabel()`, `translateOption()`, or `translateSectionTitle()` as appropriate
4. **Test Both Languages:** Verify translations work correctly in both English and French modes

### Translation Best Practices

*   **Consistent Terminology:** Use consistent medical and technical terminology across all translations
*   **Context Awareness:** Consider gender agreements and formal/informal language in French
*   **Fallback Handling:** Always provide fallback to original text if translation is not found
*   **Testing:** Test all form interactions in both languages to ensure proper functionality

## 5. Component Architecture & Modularity

The application follows a modular component architecture to improve maintainability and reusability.

### Core Components

*   **FeedbackForm (`src/components/feedback-form.tsx`):** Main survey form component with translation support
*   **SurveyList (`src/components/survey-list.tsx`):** Survey listing component with language toggle
*   **LanguageToggle (`src/components/language-toggle.tsx`):** Reusable language switcher
*   **FormFieldRenderer (`src/components/form-field-renderer.tsx`):** Modular field rendering with translations

### Mobile Optimization

*   **Responsive Design:** Components are optimized for mobile iframe embedding
*   **Touch-Friendly:** Hover states are applied as default on mobile devices
*   **Viewport Optimization:** Surveys take up most of the mobile landscape viewport
*   **Container Flexibility:** Removed restrictive card containers for better mobile experience

### Custom Field Components

*   **SelectWithOtherField:** Dropdown with "Other" option and translation support
*   **SearchableSelectWithOtherField:** Searchable dropdown for large option lists (hospitals, cities)
*   **OntarioCityField:** Ontario-specific city selector with translation
*   **OntarioHospitalField:** Ontario hospital selector with search and translation

### Component Best Practices

*   **Translation Props:** Pass `isFrench` parameter to all components that display text
*   **Consistent Interfaces:** Use consistent prop interfaces across similar components
*   **Error Handling:** Implement proper error boundaries and fallback states
*   **Performance:** Use React.memo and useMemo for expensive operations
*   **Accessibility:** Ensure all components meet WCAG accessibility standards