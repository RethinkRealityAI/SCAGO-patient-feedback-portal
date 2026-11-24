import { describe, it, expect } from 'vitest';
import { FORM_TEXT_FR, translateValidationMessage } from './form-text-fr';
import { translateFieldLabel, translateOption, translateSectionTitle } from './translations';
import { CONTACT_FORM_ID, createContactFormTemplate } from './contact-form-template';
import { replacePlaceholders, replyToFromSubmission } from './email-placeholders';
import { isConditionMet } from './field-conditions';

/** Every string a visitor can see on the form. */
function visibleStrings(survey: any): string[] {
  const t = survey.thankYouSettings;
  const out: string[] = [survey.title, survey.submitButtonLabel, t.title, t.description, t.buttonText];
  const visit = (field: any) => {
    if (field.type !== 'group' && field.label) out.push(field.label);
    if (field.helperText) out.push(field.helperText);
    if (field.placeholder) out.push(field.placeholder);
    (field.options || []).forEach((o: any) => out.push(o.label));
    (field.fields || []).forEach(visit);
  };
  for (const section of survey.sections) {
    out.push(section.title);
    section.fields.forEach(visit);
  }
  return out.filter(Boolean);
}

const allFields = (survey: any) =>
  survey.sections.flatMap((s: any) => s.fields.flatMap((f: any) => (f.type === 'group' ? f.fields : [f])));

describe('Website contact form', () => {
  const survey = createContactFormTemplate();

  it('has French for every visible string', () => {
    const coveredElsewhere = (s: string) =>
      translateFieldLabel(s, 'fr') !== s || translateOption(s, 'fr') !== s || translateSectionTitle(s, 'fr') !== s;
    const missing = visibleStrings(survey).filter(s => !FORM_TEXT_FR[s] && !coveredElsewhere(s));
    expect(missing).toEqual([]);
  });

  it('has French for the confirmation email', () => {
    const { respondentConfirmation: rc } = survey;
    const fr = rc.translations.fr as any;
    for (const key of ['subject', 'heading', 'message', 'nextSteps', 'urgentNotice']) expect(fr[key], key).toBeTruthy();
    expect(fr.nextSteps).toHaveLength(rc.nextSteps.length);
  });

  it('uses unique field ids, and every id the settings name exists', () => {
    const ids = allFields(survey).map((f: any) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const named = [
      ...survey.emailNotifications.summaryFieldIds,
      survey.emailNotifications.replyToFieldId,
      survey.respondentConfirmation.emailFieldId,
      survey.respondentConfirmation.firstNameFieldId,
      ...survey.dashboardColumns.map(c => c.fieldId),
      ...survey.dashboardFilters.map(c => c.fieldId),
      ...allFields(survey).filter((f: any) => f.conditionField).map((f: any) => f.conditionField),
    ];
    expect(named.filter(id => !ids.includes(id))).toEqual([]);
  });

  it('conditions only name options that exist', () => {
    const fields = allFields(survey);
    for (const f of fields.filter((x: any) => x.conditionField)) {
      const controller = fields.find((x: any) => x.id === f.conditionField);
      const values = controller.options.map((o: any) => o.value);
      expect(f.conditionValues.filter((v: string) => !values.includes(v)), f.id).toEqual([]);
    }
  });

  it('shows the counselling pointer only for counselling messages', () => {
    const notice = allFields(survey).find((f: any) => f.id === 'counsellingNotice');
    expect(isConditionMet(notice, 'Counselling services', 'select')).toBe(true);
    expect(isConditionMet(notice, 'General question', 'select')).toBe(false);
  });

  it('accepts the ways people write phone numbers', () => {
    const phone = allFields(survey).find((f: any) => f.id === 'phone');
    const re = new RegExp(phone.validation.pattern);
    for (const ok of ['(416) 745-4267', '416.745.4267', '+1 416 745 4267', '4167454267']) expect(re.test(ok), ok).toBe(true);
    for (const bad of ['call me', '12', 'abc-defg-hijk']) expect(re.test(bad), bad).toBe(false);
  });

  it('emails info@ by default and lets a test address replace it', () => {
    expect(survey.emailNotifications.recipients).toEqual(['info@sicklecellanemia.ca']);
    expect(createContactFormTemplate(['tech@sicklecellanemia.ca']).emailNotifications.recipients).toEqual(['tech@sicklecellanemia.ca']);
    expect(survey.slug).toBe(CONTACT_FORM_ID);
  });
});

describe('Notification email helpers', () => {
  const base = { surveyTitle: 'Contact Us', submissionDate: 'Nov 23, 2026' };

  it('fills answer placeholders in the subject', () => {
    const subject = replacePlaceholders('Website message: {{answer:inquiryType}} – {{answer:firstName}} {{answer:lastName}}', {
      ...base,
      answers: { inquiryType: 'Membership', firstName: 'Jane', lastName: 'Doe' },
    });
    expect(subject).toBe('Website message: Membership – Jane Doe');
  });

  it('tidies the subject when an answer is missing', () => {
    expect(replacePlaceholders('Website message: {{answer:inquiryType}} – {{answer:firstName}}', { ...base, answers: { inquiryType: 'Membership' } }))
      .toBe('Website message: Membership');
    expect(replacePlaceholders('{{surveyTitle}} - {{submissionDate}}', base)).toBe('Contact Us - Nov 23, 2026');
  });

  it('keeps answers to one short line', () => {
    const subject = replacePlaceholders('{{answer:x}}', { ...base, answers: { x: 'line one\nline two' } });
    expect(subject).toBe('line one line two');
  });

  it('uses the respondent email as Reply-To only when it is a single valid address', () => {
    expect(replyToFromSubmission('email', { email: ' jane@example.com ' })).toBe('jane@example.com');
    expect(replyToFromSubmission('email', { email: 'a@x.com, b@y.com' })).toBeUndefined();
    expect(replyToFromSubmission('email', { email: 'not an email' })).toBeUndefined();
    expect(replyToFromSubmission(undefined, { email: 'jane@example.com' })).toBeUndefined();
  });

  it('translates validation messages to French', () => {
    expect(translateValidationMessage('This field is required.')).toBe('Ce champ est obligatoire.');
    expect(translateValidationMessage('Something new')).toBe('Something new');
  });
});
