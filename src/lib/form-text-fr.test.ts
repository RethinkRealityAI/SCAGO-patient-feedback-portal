import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { FORM_TEXT_FR } from './form-text-fr';
import { translateFieldLabel, translateOption, translateSectionTitle } from './translations';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildSurvey } = require('../../scripts/create-counselling-intake-form.js');

/** Every string a respondent can see on the counselling form. */
function visibleStrings(survey: any): string[] {
  const out: string[] = [survey.title, survey.submitButtonLabel, survey.thankYouSettings.title, survey.thankYouSettings.description];
  const visit = (field: any) => {
    if (field.label) out.push(field.label);
    if (field.helperText) out.push(field.helperText);
    if (field.placeholder) out.push(field.placeholder);
    (field.options || []).forEach((o: any) => out.push(o.label));
    if (field.otherOption?.placeholder) out.push(field.otherOption.placeholder);
    (field.fields || []).forEach(visit);
  };
  for (const section of survey.sections) {
    out.push(section.title);
    section.fields.forEach(visit);
  }
  return out.filter(Boolean);
}

describe('Counselling Intake Form French coverage', () => {
  const survey = buildSurvey(['test@example.com']);

  it('has a French translation for every visible string', () => {
    // Strings the engine already translates through its keyed table.
    const coveredElsewhere = (s: string) =>
      translateFieldLabel(s, 'fr') !== s || translateOption(s, 'fr') !== s || translateSectionTitle(s, 'fr') !== s;
    const missing = visibleStrings(survey).filter(s => !FORM_TEXT_FR[s] && !coveredElsewhere(s));
    expect(missing).toEqual([]);
  });

  it('translates through the engine translators', () => {
    expect(translateSectionTitle('How We Can Reach You', 'fr')).toBe('Comment vous joindre');
    expect(translateOption('Myself', 'fr')).toBe('Moi-même');
    expect(translateFieldLabel('Postal code', 'fr')).toBe('Code postal');
  });

  it('leaves English untouched', () => {
    expect(translateFieldLabel('Postal code', 'en')).toBe('Postal code');
  });

  it('has French for the confirmation email', () => {
    const fr = survey.respondentConfirmation.translations.fr;
    for (const key of ['subject', 'heading', 'message', 'nextSteps', 'urgentNotice']) {
      expect(fr[key], key).toBeTruthy();
    }
    expect(fr.nextSteps).toHaveLength(survey.respondentConfirmation.nextSteps.length);
  });
});
