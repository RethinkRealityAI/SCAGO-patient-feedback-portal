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
