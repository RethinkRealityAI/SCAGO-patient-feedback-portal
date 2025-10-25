# 🇫🇷 French Translation Fix Instructions

## Problem
Your existing survey was created BEFORE the translation fixes were applied. The survey data saved in Firestore has English labels baked in, which prevents the translation system from working properly.

## ✅ What Was Fixed

### 1. **Survey Template Updates** (`src/lib/survey-template.ts`)
- ✅ `submitButtonLabel: ''` - Now uses translation system (`t.submit`)
- ✅ `saveProgressEnabled: true` - Keep save progress enabled
- ✅ Fixed character encoding issues

### 2. **Complete Translation Mappings** (`src/lib/translations.ts`)
Added ALL missing option translations:

**Hospital Encounter Types:**
- "Outpatient clinic visit (in person or virtual)" → "Visite de clinique externe (en personne ou virtuelle)"
- "Outpatient clinic visit" → "Visite de clinique externe..."
- "Emergency department (in person or virtual)" → "Service d'urgence (en personne ou virtuel)"
- "Emergency department" → "Service d'urgence..."
- "Inpatient admission" → "Admission en hospitalisation"

**Respectfulness Options:**
- "Very respectful" → "Très respectueux"
- "Somewhat respectful" → "Assez respectueux"
- "Neutral" → "Neutre"
- "Not respectful" → "Pas respectueux"

**Experience Options:**
- "Stigmatization or stereotyping" → "Stigmatisation ou stéréotypage"
- "Anxiety" → "Anxiété"
- "Helplessness or Isolation" → "Sentiment d'impuissance ou d'isolement"
- "Disrespect" → "Manque de respect"
- "Bullying" → "Intimidation"
- "Attentiveness" → "Attention"
- "Compassion/empathy" → "Compassion/empathie"
- "Understanding" → "Compréhension"

**Submit Button:**
- "Submit" → "Soumettre"

---

## 🔧 How To Apply The Fix

### **Option 1: Delete & Recreate Survey** (RECOMMENDED)

This is the cleanest and fastest solution:

1. **Go to your dashboard/editor**
2. **Find the survey** that's showing English text
3. **Delete it** (or rename it as backup)
4. **Create new survey:**
   - Click "Create Survey" button
   - Choose "V2 Template" option
5. **Verify translations work:**
   - Toggle to French (🇫🇷 button)
   - Check all options are in French
   - Check submit button says "Soumettre"

### **Option 2: Edit Existing Survey**

If you want to keep the existing survey:

1. **Go to survey editor**
2. **Click on "Details" tab**
3. **Clear the "Submit Button Label"** field (leave it empty)
4. **Save the survey**
5. **Verify** - reload the survey and toggle to French

---

## 📋 Verification Checklist

After creating a new survey, verify:

- [ ] Toggle to French (🇫🇷 button in top-right)
- [ ] Visit type options show in French:
  - [ ] "Visite de clinique externe (en personne ou virtuelle)"
  - [ ] "Service d'urgence (en personne ou virtuel)"
  - [ ] "Admission en hospitalisation"
- [ ] Submit button shows "Soumettre"
- [ ] "Clear Progress" button shows "Effacer les Progrès Sauvegardés"
- [ ] All other questions and options translate properly
- [ ] Toggle back to English - everything returns to English

---

## 🎯 Why This Happens

**The Translation System Works Like This:**

1. **Survey Template** → Contains English labels
2. **Create Survey** → Copies template to Firestore (with English labels)
3. **Render Survey** → Loads from Firestore, applies translations via `translateOption()`
4. **Problem:** If `submitButtonLabel` is set in the database, it overrides `t.submit`

**The Fix:**
- Template now uses empty string `''` for `submitButtonLabel`
- When rendering, empty string is falsy, so `survey.submitButtonLabel || t.submit` falls back to `t.submit`
- Translation system properly translates all options

---

## 🚀 Deployment

Commit and push the fixes:

```bash
git add .
git commit -m "fix: complete French translation support - all surveyV2 options now translate"
git push
```

Then:
1. Wait for Netlify deployment to complete
2. Delete old survey and create new one from template
3. Verify translations work properly

---

## ✨ Result

After applying these fixes and creating a new survey:
- ✅ All options translate to French
- ✅ Submit button translates to "Soumettre"
- ✅ Clear Progress button translates to "Effacer les Progrès Sauvegardés"
- ✅ Multi-select hospital encounter works correctly
- ✅ All conditional questions show/hide properly

Your surveyV2 template is now **fully bilingual**! 🇨🇦 🇫🇷 ✅

