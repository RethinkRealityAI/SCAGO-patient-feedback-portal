# YEP Forms Management System

## Overview

The YEP Forms Management System provides a comprehensive solution for creating, managing, and processing forms specifically designed for the Youth Empowerment Program. This system mirrors the functionality of the existing survey editor but is tailored for YEP-specific workflows and data management.

## Features

### Core Functionality
- **Form Template Management**: Create, edit, duplicate, and delete form templates
- **YEP-Specific Field Types**: 9 specialized field types for YEP workflows
- **Secure Data Handling**: Encrypted SIN input and secure file uploads
- **Bulk Operations**: Support for bulk attendance and meeting entry
- **Form Submission Processing**: Automatic creation/update of YEP entities
- **Integration**: Seamless integration with existing YEP dashboard

### Available Form Types
1. **Mentor Registration Form** - Register and manage mentors
2. **Participant Registration Form** - Comprehensive participant onboarding
3. **Workshop Registration Form** - Create and manage workshops
4. **Advisor Meeting Form** - Record advisor meetings
5. **Bulk Attendance Form** - Record attendance for multiple participants
6. **Bulk Meeting Form** - Record multiple meetings at once

## YEP-Specific Field Types

### 1. Participant Lookup (`yep-participant-lookup`)
- **Purpose**: Search and select existing participants
- **Features**: Autocomplete search, participant details display
- **Use Cases**: Meeting forms, attendance records, mentor assignments

### 2. Mentor Lookup (`yep-mentor-lookup`)
- **Purpose**: Search and select existing mentors
- **Features**: Autocomplete search, mentor details display
- **Use Cases**: Meeting forms, participant assignments

### 3. Secure SIN Input (`yep-sin-secure`)
- **Purpose**: Secure Social Insurance Number input
- **Features**: Real-time validation, secure hashing, masked display
- **Security**: Only last 4 digits stored, full SIN encrypted with bcrypt

### 4. Mentor Assignment (`yep-mentor-assignment`)
- **Purpose**: Multi-select mentor assignments
- **Features**: Checkbox selection, mentor details display
- **Use Cases**: Participant forms, bulk operations

### 5. Participant Assignment (`yep-participant-assignment`)
- **Purpose**: Multi-select participant assignments
- **Features**: Checkbox selection, participant details display
- **Use Cases**: Mentor forms, workshop assignments

### 6. Workshop Selector (`yep-workshop-selector`)
- **Purpose**: Select workshops with context
- **Features**: Workshop details, date/location display
- **Use Cases**: Attendance forms, meeting scheduling

### 7. Meeting Topics (`yep-meeting-topics`)
- **Purpose**: Pre-defined topic selection for meetings
- **Features**: Multi-select checkboxes, common topics
- **Use Cases**: Meeting forms, advisor discussions

### 8. Bulk Attendance Entry (`yep-attendance-bulk`)
- **Purpose**: Record attendance for multiple participants
- **Features**: Table-based entry, participant selection, notes
- **Use Cases**: Workshop attendance, event tracking

### 9. Secure File Upload (`yep-file-secure`)
- **Purpose**: Secure document uploads
- **Features**: Drag-and-drop, progress tracking, encryption
- **Security**: AES-256 encryption, restricted access

## Getting Started

### Accessing YEP Forms
1. Navigate to the Youth Empowerment dashboard
2. Click on the "Forms" tab
3. Use "Manage Forms" to access the forms management interface

### Creating a New Form
1. Click "Create Form" in the forms list
2. Select a template from the dropdown
3. The form will be created with default fields
4. Click "Edit" to customize the form

### Editing a Form
1. Click "Edit" on any form in the list
2. Use the form editor to:
   - Modify form details (name, description)
   - Add/remove sections
   - Add/remove fields
   - Configure field properties
   - Set validation rules
3. Click "Save" to save changes

### Using Forms
1. Click "Use Form" on any form in the list
2. Fill out the form fields
3. Submit the form
4. The form will be processed and create/update YEP entities

## Form Editor

### Sections
- **Details Tab**: Configure form name, description, and metadata
- **Sections Tab**: Manage form sections and fields
- **Drag & Drop**: Reorder sections and fields
- **Field Configuration**: Set field properties, validation, and conditional logic

### Field Configuration
- **Basic Properties**: Label, type, placeholder, helper text
- **Validation**: Required fields, pattern matching, length limits
- **Conditional Logic**: Show/hide fields based on other field values
- **YEP-Specific Settings**: Target entity, security options, bulk entry settings

## Security Features

### Data Protection
- **SIN Encryption**: All SIN data is hashed using bcrypt with 12 salt rounds
- **File Encryption**: Uploaded files are encrypted using AES-256
- **Access Control**: Forms are restricted to admin and YEP manager roles
- **Audit Trail**: All form submissions are logged with timestamps

### Secure Fields
- **SIN Input**: Real-time validation, secure hashing, masked display
- **File Upload**: Encrypted storage, type validation, size limits
- **Participant Data**: Secure handling of sensitive participant information

## Integration

### YEP Dashboard Integration
- Forms are accessible from the Youth Empowerment dashboard
- Quick access buttons for common form operations
- Form management tab with overview of available forms

### Data Processing
- Form submissions automatically create/update YEP entities
- Support for participants, mentors, workshops, meetings, and attendance
- Bulk operations for efficient data entry
- Error handling and validation

## Best Practices

### Form Design
1. **Keep forms focused**: Each form should have a clear purpose
2. **Use appropriate field types**: Choose YEP-specific fields when relevant
3. **Set validation rules**: Ensure data quality with proper validation
4. **Test forms**: Always test forms before making them available

### Security
1. **Use secure fields**: Always use secure SIN and file upload fields for sensitive data
2. **Validate inputs**: Set appropriate validation rules for all fields
3. **Limit access**: Ensure only authorized users can access forms
4. **Regular audits**: Review form submissions and data processing regularly

### Performance
1. **Optimize bulk operations**: Use bulk forms for multiple records
2. **Limit field count**: Keep forms manageable with reasonable field counts
3. **Use conditional logic**: Show/hide fields to reduce form complexity
4. **Test processing**: Ensure form processing is efficient and reliable

## Troubleshooting

### Common Issues
1. **Form not saving**: Check validation rules and required fields
2. **Field not displaying**: Verify field type and configuration
3. **Submission errors**: Check form template and data processing
4. **Access denied**: Verify user permissions and role assignments

### Support
- Check the form editor for validation errors
- Review form submission logs for processing issues
- Contact system administrator for access or permission issues
- Refer to this documentation for field type usage and best practices

## Technical Details

### Architecture
- **Frontend**: React with TypeScript, Next.js framework
- **Backend**: Server actions with Firebase/Firestore
- **Security**: bcrypt for hashing, AES-256 for encryption
- **Storage**: Firebase Storage for files, Firestore for data

### Data Flow
1. Form creation/editing in the form editor
2. Form submission through the submission interface
3. Data processing and validation
4. Entity creation/update in YEP collections
5. Audit logging and status tracking

### File Structure
```
src/
├── app/yep-forms/
│   ├── page.tsx (forms list)
│   ├── actions.ts (server actions)
│   ├── client.tsx (client components)
│   ├── editor/[formId]/page.tsx (form editor)
│   └── submit/[formId]/page.tsx (form submission)
├── components/yep-forms/
│   ├── yep-form-editor.tsx (main editor)
│   ├── yep-form-submission.tsx (submission handler)
│   ├── yep-field-renderers.tsx (field components)
│   ├── participant-lookup-field.tsx
│   ├── mentor-lookup-field.tsx
│   ├── sin-secure-field.tsx
│   ├── secure-file-upload.tsx
│   ├── bulk-attendance-entry.tsx
│   └── bulk-meeting-entry.tsx
└── lib/
    ├── yep-forms-types.ts (type definitions)
    ├── yep-form-templates.ts (default templates)
    └── yep-forms-processor.ts (submission processing)
```

## Conclusion

The YEP Forms Management System provides a powerful and flexible solution for managing Youth Empowerment Program data. With its specialized field types, security features, and seamless integration, it streamlines form creation and data processing while maintaining the highest standards of data protection and user experience.
