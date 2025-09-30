# Survey Editor - Quick Reference Guide

## 🚀 Creating Surveys

### Blank Survey (Start from Scratch)
```
New Survey → ✨ Blank Survey
```
- Empty section ready for your questions
- Maximum flexibility
- Build exactly what you need

### Template-Based
```
New Survey → Choose Template
```
- Patient Feedback Survey (standard)
- Patient Feedback V2 (adaptive)
- Digital Consent Form (SCAGO)

---

## 📝 Field Types Cheat Sheet

### Basic Input
| Type | Usage | Example |
|------|-------|---------|
| `text` | Short answer | Name, comments |
| `textarea` | Long answer | Detailed feedback |
| `email` | Email address | Contact email |
| `phone` | Phone number | Contact phone |
| `number` | Numeric input | Age, count |
| `date` | Date picker | Birth date, visit date |
| `time` | Time picker | Appointment time |
| `url` | Website address | Portfolio link |

### Selection
| Type | Usage | Example |
|------|-------|---------|
| `select` | Dropdown list | Province, category |
| `radio` | Single choice | Yes/No, visit type |
| `checkbox` | Multiple choice | Services used, symptoms |
| `boolean-checkbox` | Yes/No checkbox | I agree, I confirm |

### Specialized
| Type | Usage | Example |
|------|-------|---------|
| `province-ca` | Canadian provinces | Province selector |
| `city-on` | Ontario cities | City selector |
| `hospital-on` | Ontario hospitals | Hospital selector |
| `department-on` | Hospital departments | Department selector |

### Advanced
| Type | Usage | Example |
|------|-------|---------|
| `file-upload` | Documents/images | Medical records, insurance |
| `multi-text` | Dynamic lists | Medications, symptoms |
| `matrix-single` | Grid ratings (radio) | Satisfaction ratings |
| `matrix-multiple` | Grid ratings (checkbox) | Services used by location |
| `likert-scale` | Agreement scale | "I agree that..." statements |
| `pain-scale` | 0-10 visual scale | Pain level assessment |
| `ranking` | Drag to order | Treatment priorities |
| `calculated` | Auto-computed | Total amount, BMI |
| `datetime` | Date + time | Appointment scheduling |
| `percentage` | 0-100% | Improvement rate |
| `currency` | Money amount | Out-of-pocket costs |
| `color` | Color picker | Brand preferences |
| `range` | Min/max slider | Acceptable wait time |

### Rating
| Type | Usage | Example |
|------|-------|---------|
| `rating` | 1-5 stars | Overall experience |
| `nps` | 1-10 scale | Quality of care |
| `slider` | Range slider | Satisfaction level |

### Special
| Type | Usage | Example |
|------|-------|---------|
| `digital-signature` | Signature capture | Consent signature |
| `anonymous-toggle` | Hide contact fields | Anonymous submission |
| `group` | Side-by-side fields | First + Last name |

---

## ⚙️ Configuration Options

### All Fields
```javascript
{
  id: 'fieldId',
  label: 'Question label',
  type: 'field-type',
  validation: {
    required: true  // Make field required
  }
}
```

### Text Fields
```javascript
{
  type: 'text',
  minLength: 10,        // Min characters
  maxLength: 100,       // Max characters
  placeholder: 'Enter text...',  // Placeholder
}
```

### Number/Slider
```javascript
{
  type: 'slider',
  min: 0,
  max: 100,
  step: 5
}
```

### File Upload
```javascript
{
  type: 'file-upload',
  maxFiles: 3,              // Max number of files
  maxFileSize: 5,           // Max MB per file
  fileTypes: ['.pdf', '.jpg', '.png']  // Allowed types
}
```

### Matrix
```javascript
{
  type: 'matrix-single',
  rows: [
    { id: '1', label: 'Wait time', value: 'wait' },
    { id: '2', label: 'Staff', value: 'staff' }
  ],
  columns: [
    { id: '1', label: 'Poor', value: '1' },
    { id: '2', label: 'Fair', value: '2' },
    { id: '3', label: 'Good', value: '3' }
  ]
}
```

### Calculated
```javascript
{
  type: 'calculated',
  calculation: 'fieldId1 + fieldId2'  // Use field IDs in formula
}
```

### Currency
```javascript
{
  type: 'currency',
  prefix: '$',
  suffix: 'CAD'
}
```

---

## 🔗 Conditional Logic

### Show field when another equals value
```javascript
{
  id: 'followup',
  label: 'Follow-up details',
  conditionField: 'needFollowup',  // ID of controlling field
  conditionValue: 'yes'             // Required value
}
```

### Common Patterns
- Show text when "Other" selected
- Show follow-up when answer is "No"
- Show visit details based on visit type

---

## 📦 Quick Add Options

### From Question Bank
1. Click "Add from Question Bank"
2. Browse categories or search
3. Click to add pre-configured question

### From Templates
1. Click "Add Section Template"
2. Choose pre-built section
3. Edit as needed

### From Blocks
1. Click "Add Block"
2. Choose field combination
3. Customize fields

---

## 🎨 Appearance Customization

### Theme Color
```
Appearance → Theme Color
```
Pick any hex color for branding

### Shadows & Sizes
```
Appearance → Card Shadow/Sizes
```
- Card shadow: none/sm/md/lg
- Title sizes: sm/md/lg/xl
- Label sizes: xs/sm/md

### Submit Button
```
Details → Submit Button Label
```
Customize button text (default: "Submit")

---

## ✅ Validation Rules

### Required Fields
Toggle "Required" switch for each field

### Section-Level Required
Toggle "Require all" in section header
- Disables individual field toggles
- All fields in section required

### Pattern Validation
Auto-applied for:
- Email (email validation)
- Phone (North America format)
- URL (valid URL format)

Custom patterns available via regex

---

## 💾 Save & Share

### Auto-Save
Changes auto-save to browser while editing

### Save Survey
Click "Save" button to save to database

### Share Link
```
/survey/[surveyId]
```
Copy and share this link with respondents

### View Dashboard
```
/dashboard/[surveyId]
```
View submissions and analytics

---

## 📊 Matrix Field Quick Setup

1. **Add Matrix Field**
   - Choose `matrix-single` or `matrix-multiple`

2. **Add Rows** (items to rate)
   - Click "Add Row"
   - Enter labels: "Wait time", "Staff", etc.

3. **Add Columns** (rating options)
   - Click "Add Column"
   - Enter labels: "Poor", "Fair", "Good", etc.

4. **Best Practices**
   - 3-7 rows recommended
   - 3-7 columns recommended
   - Keep labels concise

---

## 🎯 Common Use Cases

### Patient Feedback
```
1. Contact Information section
2. Hospital Experience section
3. Add: rating, NPS, matrix, textarea
```

### Consent Form
```
1. About & Consent section
2. Basic Information section
3. Digital signature field
4. Date field
```

### Registration Form
```
1. Personal Information
2. Demographics (optional)
3. Communication preferences
4. Consent checkbox
```

### Medication Tracking
```
1. Multi-text field for medications
2. Pain scale for current pain
3. Date of last appointment
4. Text area for notes
```

---

## 🔧 Troubleshooting

### Field not showing?
Check conditional logic - field may be hidden

### Can't save?
Check for validation errors (red highlights)

### Matrix too wide?
Reduce number of columns or split into multiple matrices

### File upload not working?
Check file type and size limits

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save survey | Ctrl/Cmd + S |
| Add section | (use button) |
| Add question | (use button) |
| Delete field | (use trash icon) |
| Move field up | (use arrow buttons) |
| Move field down | (use arrow buttons) |

---

## 📱 Mobile Considerations

- All fields are touch-friendly
- Matrices scroll horizontally on mobile
- File upload works with camera
- Drag-and-drop works with touch
- Form auto-saves progress

---

## 🎓 Learning Path

### Beginner
1. Create blank survey
2. Add basic text fields
3. Add select/radio options
4. Test your survey

### Intermediate
1. Use question bank
2. Add conditional logic
3. Use section templates
4. Customize appearance

### Advanced
1. Create matrix questions
2. Use calculated fields
3. Setup file uploads
4. Build adaptive surveys with conditionals

---

## 💡 Pro Tips

1. **Start with blank** for unique forms
2. **Use templates** for common scenarios
3. **Browse question bank** before creating custom questions
4. **Test conditional logic** thoroughly
5. **Keep matrices small** (< 7×7)
6. **Add helper text** for complex questions
7. **Use placeholders** for examples
8. **Test on mobile** before sharing
9. **Save frequently** while editing
10. **Use groups** for side-by-side fields

---

## 📚 Resources

- **Advanced Field Types Guide**: `ADVANCED-FIELD-TYPES.md`
- **Performance Guide**: `PERFORMANCE-OPTIMIZATION.md`
- **Full Guide**: `creating-surveys.md`
- **Templates Guide**: `survey-builder-templates-guide.md`
- **Complete Summary**: `SURVEY-EDITOR-ENHANCEMENTS-SUMMARY.md`

---

## 🆘 Need Help?

1. Check this quick reference
2. Read detailed docs in `/docs`
3. Try creating a test survey
4. Experiment with blank survey

**Remember:** The blank survey option gives you maximum flexibility to build exactly what you need! ✨

