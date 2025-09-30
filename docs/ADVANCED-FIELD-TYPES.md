# Advanced Field Types - Survey Editor Enhancement

## Overview

The survey editor has been significantly enhanced with 17 new advanced field types, making it a powerful form creation tool suitable for healthcare organizations, non-profits, and any complex data collection needs.

## New Field Types

### 1. **File Upload** (`file-upload`)
Upload documents, images, and other files.

**Features:**
- Multiple file upload support (1-10 files)
- File size limits (configurable, default 5MB)
- File type restrictions (.pdf, .jpg, .png, .doc, etc.)
- Visual file preview with remove capability

**Use Cases:**
- Medical document uploads
- Insurance card photos
- Consent form attachments
- Supporting documentation

**Configuration:**
```javascript
{
  type: 'file-upload',
  label: 'Upload Medical Records',
  maxFiles: 3,
  maxFileSize: 10, // MB
  fileTypes: ['.pdf', '.jpg', '.png', '.doc', '.docx']
}
```

---

### 2. **Multi-Text** (`multi-text`)
Add multiple text entries dynamically (e.g., medication list).

**Features:**
- Add/remove entries on the fly
- Each entry is a separate text input
- Ideal for lists of varying length

**Use Cases:**
- Current medications and dosages
- List of symptoms
- Multiple contact persons
- Allergies and conditions

**Configuration:**
```javascript
{
  type: 'multi-text',
  label: 'Current Medications',
  placeholder: 'Enter medication name and dosage'
}
```

---

### 3. **Matrix (Single Choice)** (`matrix-single`)
Rate multiple items on a consistent scale - radio button version.

**Features:**
- Rows: Items to rate
- Columns: Rating options
- Single selection per row
- Perfect for satisfaction surveys

**Use Cases:**
- Service quality ratings
- Multiple aspects of care evaluation
- Feature importance ranking
- Agreement statements

**Configuration:**
```javascript
{
  type: 'matrix-single',
  label: 'Rate your hospital experience',
  rows: [
    { id: '1', label: 'Wait time', value: 'wait-time' },
    { id: '2', label: 'Staff friendliness', value: 'staff' },
    { id: '3', label: 'Cleanliness', value: 'clean' }
  ],
  columns: [
    { id: '1', label: 'Poor', value: '1' },
    { id: '2', label: 'Fair', value: '2' },
    { id: '3', label: 'Good', value: '3' },
    { id: '4', label: 'Excellent', value: '4' }
  ]
}
```

---

### 4. **Matrix (Multiple Choice)** (`matrix-multiple`)
Rate multiple items with multiple selections allowed per row.

**Features:**
- Same as matrix-single but allows checkboxes
- Multiple selections per row
- Ideal for "select all that apply" scenarios

**Use Cases:**
- Symptom checklist across time periods
- Multiple services used per location
- Features utilized across platforms

---

### 5. **Likert Scale** (`likert-scale`)
Standard 5-point agreement scale.

**Features:**
- Strongly Disagree → Strongly Agree
- Single radio group
- Industry-standard format
- Simple and familiar to users

**Use Cases:**
- Satisfaction statements
- Belief/attitude measurements
- Agreement with policies
- Service evaluations

**Configuration:**
```javascript
{
  type: 'likert-scale',
  label: 'I feel my healthcare providers listen to my concerns'
}
```

---

### 6. **Pain Scale** (`pain-scale`)
Visual analog pain scale (0-10) with color coding.

**Features:**
- Visual color gradient (green → yellow → orange → red)
- Large clickable buttons
- Descriptive labels (No Pain, Mild, Moderate, Severe, Worst)
- Healthcare standard

**Use Cases:**
- Pain assessment
- Symptom severity rating
- Discomfort measurement
- Patient-reported outcomes

**Configuration:**
```javascript
{
  type: 'pain-scale',
  label: 'Please indicate your current pain level'
}
```

---

### 7. **Ranking** (`ranking`)
Drag-to-reorder items by priority.

**Features:**
- Drag handles for reordering
- Numbered ranking display
- Touch-friendly
- Visual feedback

**Use Cases:**
- Treatment priority ranking
- Feature preference ordering
- Importance sequencing
- Goal prioritization

**Configuration:**
```javascript
{
  type: 'ranking',
  label: 'Rank treatment priorities',
  options: [
    { id: '1', label: 'Pain management', value: 'pain' },
    { id: '2', label: 'Quality of life', value: 'qol' },
    { id: '3', label: 'Reducing visits', value: 'visits' }
  ]
}
```

---

### 8. **Calculated Field** (`calculated`)
Auto-calculated field based on formula.

**Features:**
- Real-time calculation
- Reference other field IDs
- Read-only display
- Support for basic math operations

**Use Cases:**
- BMI calculation
- Total costs
- Age from birthdate
- Duration calculations

**Configuration:**
```javascript
{
  type: 'calculated',
  label: 'Total Amount',
  calculation: 'subtotal + (subtotal * 0.13)' // Subtotal + 13% tax
}
```

**Formula Examples:**
- `age + 5` - Add 5 to age field
- `height / (weight * weight)` - BMI calculation
- `price * quantity` - Total cost
- Use field IDs directly in formulas

---

### 9. **Date & Time Combined** (`datetime`)
Single field for both date and time selection.

**Features:**
- Date picker + time picker
- Combined into single field
- Stores as object: `{ date: '2025-09-30', time: '14:30' }`

**Use Cases:**
- Appointment scheduling
- Symptom onset time
- Event registration
- Time-sensitive data

---

### 10. **Color Picker** (`color`)
Choose colors with visual picker.

**Features:**
- Native browser color picker
- Hex code display/input
- Visual preview

**Use Cases:**
- Brand preferences
- Visual identification
- Category coding
- Accessibility testing

---

### 11. **Range Slider** (`range`)
Select min and max values from a range.

**Features:**
- Dual-handle slider
- Visual range selection
- Display current values
- Configurable min/max/step

**Use Cases:**
- Age range
- Price range
- Duration range
- Acceptable value ranges

**Configuration:**
```javascript
{
  type: 'range',
  label: 'Acceptable wait time (minutes)',
  min: 0,
  max: 120,
  step: 5
}
```

---

### 12. **Percentage** (`percentage`)
Input for percentage values (0-100%).

**Features:**
- Number input with % symbol
- Visual slider
- Auto-constrained to 0-100
- Large visual feedback

**Use Cases:**
- Improvement rates
- Adherence percentages
- Completion rates
- Satisfaction percentages

---

### 13. **Currency** (`currency`)
Monetary input with prefix/suffix.

**Features:**
- Configurable prefix (e.g., $, €, £)
- Configurable suffix (e.g., CAD, USD)
- Decimal support
- Formatted display

**Use Cases:**
- Out-of-pocket costs
- Donation amounts
- Budget estimates
- Financial impact

**Configuration:**
```javascript
{
  type: 'currency',
  label: 'Out-of-pocket costs',
  prefix: '$',
  suffix: 'CAD'
}
```

---

## Enhanced Validation

All field types now support advanced validation:

### Text Length Validation
```javascript
{
  type: 'text',
  label: 'Short Answer',
  minLength: 10,  // Minimum 10 characters
  maxLength: 100  // Maximum 100 characters
}
```

### Placeholder Text
```javascript
{
  type: 'email',
  label: 'Email Address',
  placeholder: 'you@example.com'
}
```

### Helper Text
```javascript
{
  type: 'phone',
  label: 'Phone Number',
  helperText: 'Include area code'
}
```

---

## Question Bank Updates

The Question Bank now includes 9 new pre-configured advanced questions in the "Advanced" category:

1. **Document Upload** - File upload with PDF/image support
2. **Satisfaction Matrix** - Pre-configured hospital experience matrix
3. **Visual Pain Scale** - 0-10 pain assessment
4. **Medication List** - Multi-text for medications
5. **Treatment Priority Ranking** - Drag-to-rank priorities
6. **Likert Agreement Scale** - Standard agreement question
7. **Appointment Date & Time** - Combined datetime picker
8. **Percentage Input** - Improvement percentage
9. **Currency Amount** - Out-of-pocket costs

Access these from the Question Bank when building surveys!

---

## Matrix Field Configuration

Matrix fields are powerful for grid-style questions. Here's how to configure them in the editor:

### Adding Rows:
1. Select "Matrix (Single Choice)" or "Matrix (Multiple Choice)" as field type
2. In the "Matrix Rows" section, click "Add Row"
3. Enter row labels (e.g., "Wait time", "Staff friendliness")
4. Rows appear as questions in the matrix

### Adding Columns:
1. In the "Matrix Columns" section, click "Add Column"
2. Enter column labels (e.g., "Poor", "Fair", "Good", "Excellent")
3. Columns appear as rating options

### Tips:
- Use 3-7 columns for optimal user experience
- Keep row labels concise
- Use consistent column scales across matrices
- Matrix fields are great for reducing form length

---

## Healthcare-Specific Enhancements

### Pain Scale Best Practices
- Use the visual pain scale for subjective pain assessment
- The 0-10 scale is the healthcare standard
- Color coding helps patients quickly identify levels
- Consider adding context: "at rest" vs "with movement"

### Medication List
- Use multi-text for current medications
- Encourage format: "Medication Name - Dosage - Frequency"
- Example placeholder: "Aspirin - 81mg - Daily"

### File Uploads for Medical Documents
- Insurance cards (front and back)
- Previous test results
- Referral letters
- Medical history documents

---

## Performance Considerations

### File Upload Optimization
- Files are validated on the client side before upload
- Size limits prevent excessive uploads
- File type restrictions improve security
- Progress indicators provide user feedback

### Matrix Field Rendering
- Responsive design adapts to mobile screens
- Horizontal scrolling on small devices
- Touch-optimized selection areas

### Calculated Fields
- Real-time calculation with debouncing
- No server round-trip required
- Safe formula evaluation
- Graceful error handling

---

## Accessibility Features

All new field types include:
- Keyboard navigation support
- Screen reader compatibility
- ARIA labels and descriptions
- Focus indicators
- Touch-friendly hit targets
- High-contrast mode support

---

## Best Practices

### When to Use Each Field Type

**File Upload**: Essential documents, proof, visual records
**Multi-Text**: Variable-length lists, medications, symptoms
**Matrix**: Multiple items with same rating scale
**Likert Scale**: Agreement/disagreement statements
**Pain Scale**: Pain assessment, symptom severity
**Ranking**: Prioritization, preference ordering
**Calculated**: Auto-totals, derived values
**DateTime**: Time-sensitive appointments
**Percentage**: Rates, improvements, completions
**Currency**: Financial information

### Form Design Tips

1. **Group related fields** - Use sections to organize
2. **Progressive disclosure** - Use conditional logic to show/hide
3. **Clear labels** - Be specific and concise
4. **Helper text** - Provide examples and guidance
5. **Mobile-first** - Test on small screens
6. **Accessibility** - Include proper labels and descriptions

---

## Migration from Existing Fields

All existing field types continue to work. No changes needed to existing surveys.

To upgrade a survey:
1. Edit the survey in the editor
2. Add new advanced field types where appropriate
3. Save the survey
4. Test thoroughly before publishing

---

## Technical Details

### Data Structure

**Matrix Fields** store as object:
```json
{
  "row1-value": "column2-value",
  "row2-value": "column1-value"
}
```

**Multi-Text** stores as array:
```json
["Entry 1", "Entry 2", "Entry 3"]
```

**DateTime** stores as object:
```json
{
  "date": "2025-09-30",
  "time": "14:30"
}
```

**Range** stores as object:
```json
{
  "min": 20,
  "max": 50
}
```

---

## Support & Resources

- **Question Bank**: Browse pre-configured questions
- **Templates**: Use section templates for common patterns
- **Block Templates**: Quick field combinations
- **Documentation**: Comprehensive guides in `/docs`
- **Examples**: Sample surveys in templates

---

## Future Enhancements

Planned features:
- Advanced conditional logic (OR conditions, multiple dependencies)
- Field piping (reference previous answers)
- Custom validation messages
- More calculation functions
- Geolocation field
- Signature capture enhancements
- Multi-page forms with progress indicators

---

## Summary

The survey editor now supports **25+ field types** including 17 new advanced types:

✅ File Upload - Documents and images
✅ Multi-Text - Dynamic lists
✅ Matrix (Single/Multiple) - Grid questions
✅ Likert Scale - Agreement scales
✅ Pain Scale - Visual 0-10 healthcare scale
✅ Ranking - Drag-to-order
✅ Calculated - Auto-computed fields
✅ DateTime - Combined date & time
✅ Color Picker - Visual color selection
✅ Range Slider - Min/max selection
✅ Percentage - 0-100% input
✅ Currency - Money with prefix/suffix

Plus enhanced validation, better accessibility, and 60+ pre-configured questions in the Question Bank!

This makes the survey editor one of the most powerful and flexible form builders available, specifically tailored for healthcare and non-profit use cases.

