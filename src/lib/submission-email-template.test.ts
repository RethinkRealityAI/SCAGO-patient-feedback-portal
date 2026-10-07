import { describe, it, expect } from 'vitest';
import {
  buildPdfFilename,
  escapeHtml,
  formatSubmissionDate,
  generateSubmissionEmailTemplate,
} from './submission-email-template';

const base = {
  surveyTitle: 'Counselling Intake Form',
  submissionDate: 'October 7, 2026 at 1:50 p.m. ET',
  submitterName: 'Jane Doe',
  dashboardLink: 'https://scago-portal.netlify.app/dashboard/counselling-intake',
  attachmentName: 'Counselling_Intake_Form_Jane_Doe.pdf',
};

describe('generateSubmissionEmailTemplate', () => {
  it('escapes the submitter name, which comes from a public form', () => {
    const html = generateSubmissionEmailTemplate({
      ...base,
      submitterName: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('contains no emoji', () => {
    const html = generateSubmissionEmailTemplate(base);
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('styles the button inline so email clients cannot recolour the link', () => {
    const html = generateSubmissionEmailTemplate(base);
    const link = html.match(/<a href="[^"]+"[^>]*>/)![0];
    expect(link).toContain('color:#FFFFFF');
    expect(link).toContain('text-decoration:none');
    expect(html).not.toMatch(/<style/);
  });

  it('links to the form dashboard', () => {
    expect(generateSubmissionEmailTemplate(base)).toContain(`href="${base.dashboardLink}"`);
  });

  it('shows the actual attachment name, and omits the block without one', () => {
    expect(generateSubmissionEmailTemplate(base)).toContain(base.attachmentName);
    expect(generateSubmissionEmailTemplate({ ...base, attachmentName: undefined })).not.toContain('>PDF<');
  });

  it('omits the "Submitted by" row for anonymous submissions', () => {
    expect(generateSubmissionEmailTemplate({ ...base, submitterName: undefined })).not.toContain('Submitted by');
  });
});

describe('formatSubmissionDate', () => {
  it('renders Toronto time regardless of the server time zone', () => {
    // 17:50 UTC on Oct 7 is 1:50 p.m. Eastern Daylight Time.
    const text = formatSubmissionDate(new Date('2026-10-07T17:50:00Z'));
    expect(text).toContain('October 7, 2026');
    expect(text).toMatch(/1:50/);
    expect(text).toMatch(/ET$/);
  });
});

describe('buildPdfFilename', () => {
  it('collapses punctuation into single underscores', () => {
    expect(buildPdfFilename('Counselling Intake Form', 'TEST Submission - please ignore'))
      .toBe('Counselling_Intake_Form_TEST_Submission_please_ignore.pdf');
  });

  it('never ends a segment with a dangling underscore', () => {
    expect(buildPdfFilename('Form', 'Abcdefghij Klmnopqrst Uvwxyzabcdefgh')).not.toMatch(/_\.pdf$/);
  });
});

describe('escapeHtml', () => {
  it('escapes all HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
