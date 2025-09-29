# Translation System Documentation

This document provides detailed information about the bilingual translation system implemented in the patient feedback portal.

## Overview

The translation system provides comprehensive English/French bilingual support for all user-facing text in the application, including form fields, UI elements, section titles, and interactive components.

## Architecture

### Core Files

- **`translations.ts`** - Central translation library with all text translations
- **`../components/language-toggle.tsx`** - Reusable language switcher component  
- **`../components/form-field-renderer.tsx`** - Form field component with translation support
- **`../components/survey-list.tsx`** - Survey listing with language toggle

### Translation Functions

#### `useTranslation(language: 'en' | 'fr')`
Hook that returns the translation object for the specified language.

```typescript
const t = useTranslation('fr');
console.log(t.submit); // "Soumettre"
```

#### `translateFieldLabel(label: string, language: 'en' | 'fr')`
Translates form field labels with fallback to original text.

```typescript
translateFieldLabel('First name', 'fr'); // "Prénom"
translateFieldLabel('Custom Field', 'fr'); // "Custom Field" (fallback)
```

#### `translateOption(option: string, language: 'en' | 'fr')`
Translates dropdown options, radio buttons, and checkbox labels.

```typescript
translateOption('Patient', 'fr'); // "Patient"
translateOption('Emergency department', 'fr'); // "Service d'urgence"
```

#### `translateSectionTitle(title: string, language: 'en' | 'fr')`
Translates section headers and titles.

```typescript
translateSectionTitle('Hospital Engagement', 'fr'); // "Engagement Hospitalier"
```

## Adding New Translations

### Step 1: Update the Translation Interface

Add new keys to the `Translation` interface:

```typescript
export interface Translation {
  // ... existing keys
  newFieldLabel: string;
  anotherOption: string;
}
```

### Step 2: Add Translations

Add both English and French translations:

```typescript
export const translations: Record<'en' | 'fr', Translation> = {
  en: {
    // ... existing translations
    newFieldLabel: 'New Field Label',
    anotherOption: 'Another Option',
  },
  fr: {
    // ... existing translations  
    newFieldLabel: 'Nouvelle Étiquette de Champ',
    anotherOption: 'Autre Option',
  }
};
```

### Step 3: Update Mapping Functions

Add mappings to the appropriate helper function:

```typescript
// For field labels
const labelMappings: Record<string, keyof Translation> = {
  // ... existing mappings
  'New Field Label': 'newFieldLabel',
};

// For options
const optionMappings: Record<string, keyof Translation> = {
  // ... existing mappings
  'Another Option': 'anotherOption',
};
```

### Step 4: Use in Components

Use the translation in your components:

```typescript
function MyComponent({ isFrench }: { isFrench: boolean }) {
  const t = useTranslation(isFrench ? 'fr' : 'en');
  
  return (
    <label>{translateFieldLabel('New Field Label', isFrench ? 'fr' : 'en')}</label>
  );
}
```

## Translation Categories

### UI Elements
- Buttons (Submit, Share, Clear Progress)
- Messages (Progress saved, Thank you, etc.)
- Navigation and controls

### Form Fields
- Field labels (First name, Email, Phone, etc.)
- Placeholders (Select an option, Enter text, etc.)
- Validation messages

### Medical/Hospital Terms
- Patient types (Patient, Caregiver, Visitor)
- Hospital departments and services
- Visit types (Outpatient, Emergency, Inpatient)

### Location Terms
- Provinces, cities, regions
- Geographic selectors

### Time/Date Terms
- Months, days, time periods
- Date/time labels and formats

## French Translation Guidelines

### Gender Agreement
French nouns have gender. Ensure proper agreement:
- `un hôpital` (masculine)
- `une ville` (feminine)
- `le patient` / `la patiente`

### Formal Language
Use formal language appropriate for healthcare:
- Use `vous` form (formal "you")
- Professional medical terminology
- Respectful, clear language

### Common Patterns
- **Select options:** `Sélectionnez` + appropriate article
- **Please specify:** `Veuillez spécifier`
- **Required fields:** `Obligatoire`
- **Optional fields:** `Optionnel`

## Testing Translations

### Manual Testing
1. Toggle between English and French using the language switcher
2. Verify all text elements are translated
3. Test form interactions in both languages
4. Check dropdown options and placeholders

### Automated Testing
Consider adding tests for:
- Translation function coverage
- Missing translation detection
- Language toggle functionality

## Performance Considerations

- Translations are loaded statically (no API calls)
- Use React.memo for components with frequent re-renders
- Translation functions are lightweight with O(1) lookup

## Extending to Other Languages

To add additional languages:

1. Update the language type: `'en' | 'fr' | 'es'`
2. Add translations to the `translations` object
3. Update mapping functions to handle new language
4. Add language option to the LanguageToggle component

## Common Issues & Solutions

### Missing Translations
- **Issue:** Text not translating
- **Solution:** Check if mapping exists in helper functions

### Inconsistent Terminology  
- **Issue:** Same concept translated differently
- **Solution:** Use consistent keys and centralized translations

### Context-Specific Translations
- **Issue:** Same word needs different translations in different contexts
- **Solution:** Create context-specific translation keys

### Performance Issues
- **Issue:** Slow translation lookups
- **Solution:** Ensure mappings use proper TypeScript types for optimization

## Future Enhancements

- **Dynamic Loading:** Load translations asynchronously for better performance
- **Pluralization:** Add support for plural forms in French
- **Regional Variants:** Support for Quebec French vs. France French
- **Translation Management:** Integration with translation management tools
- **RTL Support:** Prepare for right-to-left languages if needed
