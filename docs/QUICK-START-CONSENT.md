# Quick Start: Using the Digital Consent Template

## 🚀 Create Your First Consent Survey

1. **Navigate to the Editor**
   - Go to `/editor` in your application

2. **Create New Survey**
   - Click the "New Survey" button
   - A dropdown menu will appear with 3 options

3. **Select the Template**
   - Choose **"Digital Consent & Information Collection"**
   - The system will create a new survey with all fields pre-configured

4. **Customize (Optional)**
   - Change colors, labels, or descriptions
   - Add/remove fields as needed
   - Adjust validation rules

5. **Share the Survey**
   - Copy the survey URL from `/survey/{surveyId}`
   - Share with your participants

## 📋 What's Included

The consent template includes:

### ✅ Pre-configured Sections:
- **About SCAGO & Consent** - Age verification and notice
- **Basic Information** - Contact details and address
- **SCD Connection** - Relationship to sickle cell disease
- **Care Information** - Primary hospital selection
- **Stay Connected** - Communication preferences
- **Consent Confirmation** - Digital signature

### 🎯 Smart Features:
- **Conditional Logic** - Fields appear based on user choices
- **Grouped Fields** - Name, email/phone, city/province side-by-side
- **Validation** - Email, phone, date, and required field validation
- **Save Progress** - Users can resume later
- **Professional Design** - SCAGO red theme (#C8262A)

## 🎨 Template Dropdown Options

When you click "New Survey", you'll see:

1. **Patient Feedback Survey**
   - Standard feedback form
   - Contact info + hospital experience

2. **Patient Feedback Survey (V2)**
   - Adaptive form with visit types
   - Outpatient, Emergency, Inpatient flows

3. **Digital Consent & Information Collection** ⭐ NEW
   - SCAGO consent form
   - Patient registration and information

## 📊 Viewing Responses

After participants submit:

1. **Dashboard**: `/dashboard/{surveyId}`
   - View submission count
   - Export to CSV
   - See completion rate

2. **Individual Responses**
   - Click any submission to see details
   - All consent information displayed
   - Export options available

## 💡 Pro Tips

### DO:
✅ Test the form before sharing
✅ Review privacy settings
✅ Export data regularly
✅ Respect user preferences

### DON'T:
❌ Skip legal review
❌ Share consent forms publicly
❌ Modify consent language without approval
❌ Delete submissions without backup

## 🔒 Security Checklist

Before going live:

- [ ] Firestore security rules configured
- [ ] HTTPS enabled
- [ ] Privacy policy reviewed
- [ ] Consent language approved
- [ ] Data retention policy set
- [ ] Backup system in place

## 📞 Field IDs for Data Export

When exporting data, look for these field IDs:

**Basic Info:**
- `firstName`, `lastName`
- `email`, `phone`
- `streetAddress`, `city`, `province`, `postalCode`

**SCD Connection:**
- `scdConnection` (array)
- `individual1Name`, `individual1DOB`
- `individual2Name`, `individual2DOB`
- `individual3Name`, `individual3DOB`

**Preferences:**
- `mayContact`
- `preferredContactMethod`
- `joinMailingList`
- `joinSupportGroups`
- `consentToAdvocacy`

**Signature:**
- `digitalSignature`
- `signatureDate`

## 🆘 Troubleshooting

**Q: Dropdown doesn't appear when I click "New Survey"**
- Clear browser cache and refresh
- Check console for JavaScript errors

**Q: Some fields aren't showing in the form**
- Check conditional logic settings
- Verify all required parent fields are visible

**Q: Can't submit the form**
- Scroll to top to see validation errors
- Check all required fields are filled
- Verify conditional fields are complete

**Q: Need to add more household members**
- Currently limited to 3 individuals
- Can add more fields in editor manually

## 🎓 Learn More

- **Full Guide**: `docs/consent-survey-guide.md`
- **Creating Surveys**: `docs/creating-surveys.md`
- **Changelog**: `docs/CHANGELOG-consent-template.md`

## ⚡ Quick Commands

```bash
# Start development server
npm run dev

# Navigate to editor
http://localhost:3000/editor

# Create new consent survey
Click "New Survey" → Select "Digital Consent & Information Collection"
```

---

**Need help?** Check the comprehensive documentation in the `/docs` folder!
