import { describe, it, expect } from 'vitest';
import { getSurveyContextFromId } from './survey-contexts';

describe('getSurveyContextFromId', () => {
  it('treats a form without ratings or hospital answers as a general form', () => {
    const subs = [{ surveyId: 'intake', counsellingType: ['Grief and Loss'], ageGroup: 'Adult' }];
    expect(getSurveyContextFromId('intake', subs).type).toBe('general');
  });

  it('recognises hospital feedback even when the first response skipped the rating', () => {
    const subs = [
      { surveyId: 'hosp', visitType: 'ER' },
      { surveyId: 'hosp', rating: 8 },
    ];
    expect(getSurveyContextFromId('hosp', subs).type).toBe('feedback');
  });

  it('recognises the consent form', () => {
    const subs = [{ surveyId: 'consent', digitalSignature: 'x' }];
    expect(getSurveyContextFromId('consent', subs).type).toBe('consent');
  });

  it('uses the overview for all surveys', () => {
    expect(getSurveyContextFromId('all', []).type).toBe('overview');
  });
});
