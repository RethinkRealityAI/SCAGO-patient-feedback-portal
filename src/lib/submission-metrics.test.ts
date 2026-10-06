import { describe, it, expect } from 'vitest';
import {
  buildSurveySchema,
  deriveRating,
  deriveExperience,
  deriveNarratives,
  summariseRatings,
  schemaHasRatingField,
  getRatingValue,
} from './submission-metrics';

/**
 * Mirrors the live "Hospital Experience Reporting Portal" survey document:
 * the overall score lives under an editor-generated nanoid id, and the
 * narrative is split across three visit-type-specific "anything else" fields.
 */
const hospitalSurvey = {
  id: 'QDl3z7vLa0IQ4JgHBZ2s',
  sections: [
    {
      id: 'v2-contact-information-section',
      fields: [
        { id: 'name-group', type: 'group', fields: [
          { id: 'firstName', type: 'text', label: 'First name' },
          { id: 'lastName', type: 'text', label: 'Last name' },
        ] },
        { id: 'hospitalName', type: 'hospital-on', label: 'Which hospital did you visit?' },
        { id: 'nzZ0TKWTf2oO3fEFhVyQc', type: 'nps', label: 'Rate your overall hospital experience?' },
      ],
    },
    {
      id: 'v2-hospital-engagement-section',
      fields: [
        { id: 'outpatientReceptionRating', type: 'rating', label: 'Reception with the first person encountered' },
        { id: 'edReceptionRating', type: 'rating', label: 'Reception with the first person encountered (e.g., Triage Nurse)' },
        { id: 'timelyMannerRationaleED', type: 'textarea', label: 'Please provide rationale:' },
        { id: 'anythingElseED', type: 'textarea', label: 'Is there anything else you would like us to know about this hospital interaction?' },
        { id: 'anythingElseInpatient', type: 'textarea', label: 'Is there anything else you would like us to know about this hospital interaction?' },
        { id: 'additionalFeedback', type: 'textarea', label: 'Anything else you might want to add in your own words?' },
      ],
    },
  ],
};

const schema = buildSurveySchema(hospitalSurvey);

describe('buildSurveySchema', () => {
  it('flattens nested group fields into the type and label maps', () => {
    expect(schema.fieldTypes.firstName).toBe('text');
    expect(schema.fieldLabels.lastName).toBe('Last name');
  });

  it('captures editor-generated field ids with their types', () => {
    expect(schema.fieldTypes['nzZ0TKWTf2oO3fEFhVyQc']).toBe('nps');
  });

  it('preserves form order', () => {
    expect(schema.fieldOrder.indexOf('hospitalName'))
      .toBeLessThan(schema.fieldOrder.indexOf('nzZ0TKWTf2oO3fEFhVyQc'));
  });

  it('accepts an already-flattened survey summary', () => {
    const flat = buildSurveySchema({ fieldTypes: { q1: 'nps' }, fieldLabels: { q1: 'Score' }, fieldOrder: ['q1'] });
    expect(flat.fieldTypes.q1).toBe('nps');
  });
});

describe('deriveRating', () => {
  it('reads the NPS answer stored under a nanoid field id', () => {
    const rating = deriveRating({ 'nzZ0TKWTf2oO3fEFhVyQc': 8 }, schema);
    expect(rating).toMatchObject({ value: 8, raw: 8, max: 10, isOverall: true });
    expect(rating!.label).toBe('Rate your overall hospital experience?');
  });

  it('prefers the overall NPS score over a star sub-score', () => {
    const rating = deriveRating({ 'nzZ0TKWTf2oO3fEFhVyQc': 7, edReceptionRating: 5 }, schema);
    expect(rating!.fieldId).toBe('nzZ0TKWTf2oO3fEFhVyQc');
    expect(rating!.value).toBe(7);
  });

  it('falls back to a 1-5 star field and normalises it onto the 0-10 scale', () => {
    const rating = deriveRating({ edReceptionRating: 2 }, schema);
    expect(rating).toMatchObject({ value: 4, raw: 2, max: 5, isOverall: false });
  });

  it('normalises a 5-star answer to a perfect 10', () => {
    expect(deriveRating({ outpatientReceptionRating: 5 }, schema)!.value).toBe(10);
  });

  it('still honours the legacy top-level `rating` field', () => {
    const rating = deriveRating({ rating: 9 }, buildSurveySchema(null));
    expect(rating).toMatchObject({ value: 9, fieldId: 'rating', isOverall: true });
  });

  it('returns null when the respondent answered no score question', () => {
    expect(deriveRating({ firstName: 'Ada', anythingElseInpatient: 'All good' }, schema)).toBeNull();
  });

  it('returns null rather than 0 for an unanswered score', () => {
    expect(getRatingValue({ 'nzZ0TKWTf2oO3fEFhVyQc': 0 }, schema)).toBeNull();
  });
});

describe('deriveExperience', () => {
  it('picks the visit-specific "anything else" narrative', () => {
    const experience = deriveExperience({ anythingElseInpatient: 'The nurses were wonderful.' }, schema);
    expect(experience).toMatchObject({ text: 'The nurses were wonderful.', fieldId: 'anythingElseInpatient' });
  });

  it('prefers an experience narrative over an incidental rationale field', () => {
    const experience = deriveExperience(
      { timelyMannerRationaleED: 'Waited two hours.', anythingElseED: 'Staff were dismissive.' },
      schema
    );
    expect(experience!.fieldId).toBe('anythingElseED');
  });

  it('falls back to any narrative answer when no preferred field was filled in', () => {
    const experience = deriveExperience({ timelyMannerRationaleED: 'Waited two hours.' }, schema);
    expect(experience!.fieldId).toBe('timelyMannerRationaleED');
  });

  it('still honours the legacy hospitalInteraction field', () => {
    const experience = deriveExperience({ hospitalInteraction: 'Legacy text' }, buildSurveySchema(null));
    expect(experience!.text).toBe('Legacy text');
  });

  it('returns null when nothing was written', () => {
    expect(deriveExperience({ edReceptionRating: 3 }, schema)).toBeNull();
  });

  it('ignores whitespace-only answers', () => {
    expect(deriveExperience({ anythingElseED: '   ' }, schema)).toBeNull();
  });
});

describe('deriveNarratives', () => {
  it('returns every narrative answer, best first', () => {
    const narratives = deriveNarratives(
      {
        timelyMannerRationaleED: 'Waited two hours.',
        anythingElseED: 'Staff were dismissive.',
        additionalFeedback: 'Thanks for asking.',
      },
      schema
    );
    expect(narratives.map(n => n.fieldId)).toEqual([
      'anythingElseED',
      'additionalFeedback',
      'timelyMannerRationaleED',
    ]);
  });
});

describe('summariseRatings', () => {
  const only = () => schema;

  it('excludes unrated submissions from the average instead of counting them as zero', () => {
    const summary = summariseRatings(
      [
        { 'nzZ0TKWTf2oO3fEFhVyQc': 10 },
        { 'nzZ0TKWTf2oO3fEFhVyQc': 8 },
        { firstName: 'Unrated' },
        { firstName: 'Also unrated' },
      ],
      only
    );
    expect(summary.total).toBe(4);
    expect(summary.rated).toBe(2);
    expect(summary.average).toBe(9);
  });

  it('returns a null average when nothing is rated', () => {
    const summary = summariseRatings([{ firstName: 'Unrated' }], only);
    expect(summary.average).toBeNull();
    expect(summary.nps).toBeNull();
  });

  it('buckets scores and computes NPS over respondents only', () => {
    const summary = summariseRatings(
      [
        { 'nzZ0TKWTf2oO3fEFhVyQc': 10 }, // promoter, excellent
        { 'nzZ0TKWTf2oO3fEFhVyQc': 7 },  // passive, good
        { 'nzZ0TKWTf2oO3fEFhVyQc': 2 },  // detractor, needs improvement
        { firstName: 'Unrated' },
      ],
      only
    );
    expect(summary).toMatchObject({
      excellent: 1,
      good: 1,
      needsImprovement: 1,
      promoters: 1,
      passives: 1,
      detractors: 1,
      rated: 3,
    });
    expect(summary.nps).toBe(0);
  });

  it('mixes normalised star scores into the same average', () => {
    // 5 stars → 10, plus an 8 on the NPS scale → mean of 9.
    const summary = summariseRatings(
      [{ outpatientReceptionRating: 5 }, { 'nzZ0TKWTf2oO3fEFhVyQc': 8 }],
      only
    );
    expect(summary.average).toBe(9);
  });
});

describe('schemaHasRatingField', () => {
  it('is true for a survey that asks for a score', () => {
    expect(schemaHasRatingField(schema)).toBe(true);
  });

  it('is false for a survey with no score question', () => {
    const consent = buildSurveySchema({
      sections: [{ fields: [{ id: 'email', type: 'email', label: 'Email' }] }],
    });
    expect(schemaHasRatingField(consent)).toBe(false);
  });
});
