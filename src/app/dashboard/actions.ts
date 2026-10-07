'use server';

// AI imports will be loaded dynamically to avoid build issues
import type { FeedbackSubmission } from './types';
import { unstable_noStore as noStore } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getQuestionText, formatAnswerValue } from '@/lib/question-mapping';
import { extractName } from '@/lib/submission-utils';
import { getSurveyContextFromId, getAnalysisPrompt, detectSurveyType, getSurveyContext } from '@/lib/survey-contexts';
import { hospitalLabel } from '@/lib/option-labels';
// NOTE: firebase-admin imports are loaded dynamically to prevent client bundling
// DO NOT use static imports of firebase-admin or related modules
// Dynamic import to prevent client bundling of server-only modules
async function getServerAuth() {
  return await import('@/lib/server-auth');
}

async function getSubmissionUtils() {
  return await import('@/lib/submission-utils');
}

// Type definition for AI analysis results
interface AIAnalysisResult {
  summary: string;
  sentiment: string;
  keyTopics: string[];
  suggestedActions: string[];
}

/**
 * Render one submission as a line of context for the model.
 *
 * Submissions arrive already enriched with the derived `rating` /
 * `hospitalInteraction` values, so this no longer emits
 * `Rating: undefined/10, Experience: undefined` for every editor-built survey —
 * which is what the model was previously being asked to analyse.
 */
function describeSubmissionForAI(submission: FeedbackSubmission): string {
  const parts: string[] = [];

  const rating = Number(submission.rating);
  parts.push(Number.isFinite(rating) ? `Rating: ${rating}/10` : 'Rating: not answered');

  // Resolve the stored slug so the model names hospitals the way people do.
  const hospital = extractSelectionValue((submission as any).hospitalName)
    || extractSelectionValue((submission as any).hospital)
    || extractSelectionValue((submission as any)['hospital-on']);
  if (hospital) parts.push(`Hospital: ${hospitalLabel(hospital)}`);

  const visitType = (submission as any).visitType;
  if (Array.isArray(visitType) && visitType.length > 0) parts.push(`Visit type: ${visitType.join(', ')}`);
  else if (typeof visitType === 'string' && visitType) parts.push(`Visit type: ${visitType}`);

  const experience = (submission.hospitalInteraction || '').replace(/\s+/g, ' ').trim();
  parts.push(`Experience: ${experience ? experience.slice(0, 600) : 'no written feedback'}`);

  return `- ${parts.join(' | ')}`;
}

// Bookkeeping fields, and anything that identifies the person, never go to the model.
const GENERAL_AI_SKIP_KEYS = new Set([
  'id', 'surveyId', 'submittedAt', 'sessionId', 'submittedLanguage', 'reviewed', 'reviewedAt', 'reviewedBy',
  'caseStatus', 'caseStatusUpdatedAt', 'assignedTo', 'caseNotes', 'rating', 'hospitalInteraction',
]);
const GENERAL_AI_PII_PATTERN = /name|email|phone|postal|address|birth|dob|signature|consent|terms|verify|agree/i;

/** One line of model context for a submission to a form that isn't hospital feedback. */
function describeGeneralSubmissionForAI(submission: FeedbackSubmission): string {
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(submission as Record<string, unknown>)) {
    if (GENERAL_AI_SKIP_KEYS.has(key) || GENERAL_AI_PII_PATTERN.test(key)) continue;
    if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') continue;
    let value: string;
    if (Array.isArray(raw)) value = raw.filter(v => typeof v === 'string' || typeof v === 'number').join(', ');
    else if (typeof raw === 'object') value = extractSelectionValue(raw);
    else value = String(raw);
    value = value.replace(/\s+/g, ' ').trim().slice(0, 300);
    if (value) parts.push(`${key}: ${value}`);
  }
  return `- ${parts.join(' | ') || 'no answers'}`;
}

/** The form's own title, so a general analysis is headed with what staff call it. */
async function surveyTitleOf(surveyId: string): Promise<string | null> {
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const snap = await getAdminFirestore().collection('surveys').doc(surveyId).get();
    const title = snap.data()?.title;
    return typeof title === 'string' && title.trim() ? title.trim() : null;
  } catch {
    return null;
  }
}

/** Read a `{ selection, other }` style answer, or a plain string. */
function extractSelectionValue(value: any): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    if (value.selection === 'other' && value.other) return String(value.other).trim();
    if (value.selection) return String(value.selection).trim();
  }
  return '';
}

/** Mean of the submissions that carry a rating — unrated ones are excluded. */
function averageRatingOf(submissions: FeedbackSubmission[]): { average: number | null; rated: number } {
  const values = submissions
    .map(s => Number(s.rating))
    .filter(n => Number.isFinite(n));
  if (values.length === 0) return { average: null, rated: 0 };
  return {
    average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    rated: values.length,
  };
}

/** Count of rated submissions in each satisfaction band. */
function ratingBandsOf(submissions: FeedbackSubmission[]): { excellent: number; good: number; poor: number } {
  let excellent = 0, good = 0, poor = 0;
  for (const s of submissions) {
    const r = Number(s.rating);
    if (!Number.isFinite(r)) continue;
    if (r >= 8) excellent++;
    else if (r >= 5) good++;
    else poor++;
  }
  return { excellent, good, poor };
}

/**
 * Explicit, unambiguously-labelled breakdown lines for the report body.
 *
 * `AnalysisDisplay` parses these back out to fill its metric cards. Without
 * them its loose fallback patterns latched onto unrelated lines (the word
 * "average rating" satisfied its "good ratings" pattern), so the Satisfaction
 * Rate card read 100% on a data set the same report called Negative.
 */
function ratingBreakdownLines(submissions: FeedbackSubmission[]): string[] {
  const { excellent, good, poor } = ratingBandsOf(submissions);
  return [
    `- Excellent ratings (8-10): ${excellent}`,
    `- Good ratings (5-7): ${good}`,
    `- Poor ratings (0-4): ${poor}`,
  ];
}

/**
 * Short-lived cache of generated analyses, keyed by survey and data version.
 *
 * The per-survey dashboard runs an analysis automatically on every page load.
 * On the Gemini free tier (~20 requests per model per day) a handful of page
 * refreshes exhausts the day's allowance, after which every AI feature errors.
 * Reusing a recent result for the same submission set keeps repeat views free
 * while still regenerating as soon as a new submission arrives.
 *
 * Process-local by design: on serverless each instance keeps its own copy,
 * which is fine — worst case is a cache miss.
 */
const ANALYSIS_CACHE_TTL_MS = 10 * 60 * 1000;
const analysisCache = new Map<string, { at: number; result: { summary?: string; error?: string } }>();

function readAnalysisCache(key: string) {
  const hit = analysisCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ANALYSIS_CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  return hit.result;
}

function writeAnalysisCache(key: string, result: { summary?: string; error?: string }) {
  analysisCache.set(key, { at: Date.now(), result });
  // Keep the map from growing without bound across many surveys.
  if (analysisCache.size > 50) {
    const oldest = [...analysisCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) analysisCache.delete(oldest[0]);
  }
}

/**
 * Turn any AI failure into a message an admin can act on.
 *
 * Loaded dynamically because the AI utils pull in server-only modules.
 */
async function toUserFacingAIError(error: unknown): Promise<string> {
  try {
    const { describeAIError } = await import('@/ai/utils/error-handler');
    return describeAIError(error);
  } catch {
    return error instanceof Error ? error.message : 'AI analysis failed.';
  }
}

/**
 * Dynamic AI import helper.
 *
 * This used to swallow load failures and return a hand-written "analysis"
 * instead. On a clinical feedback dashboard that is worse than an error:
 * the canned text is indistinguishable from a real AI summary, so a broken
 * API key looked like a working feature producing bland results. Failures now
 * propagate so the caller can say what actually went wrong.
 */
async function getAIAnalysis() {
  // Initialize genkit configuration (throws AIConfigurationError if unset)
  await import('@/ai/genkit');
  // Import the analysis flow
  const { analyzeFeedback } = await import('@/ai/flows/analyze-feedback-flow');
  return analyzeFeedback;
}

export async function analyzeFeedback() {
  try {
    // Verify user has dashboard access (server-side auth check)
    const { enforcePagePermission } = await getServerAuth();
    await enforcePagePermission('forms-dashboard');

    // Fetch all submissions using utility function (handles both new and legacy structures)
    const { fetchAllSubmissionsAdmin } = await getSubmissionUtils();
    const feedbackList = await fetchAllSubmissionsAdmin();

    if (feedbackList.length === 0) {
      return { summary: 'No feedback submissions yet. Start by sharing the survey link!' };
    }

    // Aggregate metrics. Only rated submissions count toward the average and
    // the NPS buckets — an unanswered rating is not a zero-star review.
    const { average: averageRating, rated: ratedCount } = averageRatingOf(feedbackList);
    let promoters = 0, passives = 0, detractors = 0;
    for (const f of feedbackList) {
      const r = Number(f.rating);
      if (!Number.isFinite(r)) continue;
      if (r >= 9) promoters++; else if (r >= 7) passives++; else detractors++;
    }
    const byDate = new Map<string, { count: number; sum: number }>();
    for (const f of feedbackList) {
      const r = Number(f.rating);
      if (!Number.isFinite(r)) continue;
      const raw = (f as any).submittedAt as any;
      const d = raw && typeof raw.toDate === 'function' ? raw.toDate() : (raw instanceof Date ? raw : (typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : null));
      if (!d || isNaN(d.getTime())) continue;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
      const cur = byDate.get(key) || { count: 0, sum: 0 };
      byDate.set(key, { count: cur.count + 1, sum: cur.sum + r });
    }
    const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const last7 = sorted.slice(-7);
    const prev7 = sorted.slice(-14, -7);
    const avgLast7 = last7.length ? last7.reduce((a, [, v]) => a + v.sum, 0) / last7.reduce((a, [, v]) => a + v.count, 0) : 0;
    const avgPrev7 = prev7.length ? prev7.reduce((a, [, v]) => a + v.sum, 0) / prev7.reduce((a, [, v]) => a + v.count, 0) : 0;
    const trend = avgPrev7 ? (avgLast7 - avgPrev7) : 0;

    // Build AI context text and run analysis - Limit to 100 entries to prevent token limits
    const feedbackText = feedbackList
      .slice(0, 100)
      .map(describeSubmissionForAI)
      .join('\n');

    // Scale rating from 0-10 to 1-5 to match AI schema requirements
    const scaleRating = (val: number) => Math.max(1, Math.min(5, Math.ceil(val / 2)));
    const normalizedRating = scaleRating(averageRating ?? 6);

    const runAnalysisFlow = await getAIAnalysis();
    const ai: AIAnalysisResult = await runAnalysisFlow({
      location: 'Various Hospitals',
      rating: normalizedRating,
      feedbackText
    });

    // Compose a rich markdown report
    const report = [
      `# Feedback Insights`,
      ``,
      `## Overview`,
      `- Total submissions: ${feedbackList.length}`,
      `- Average rating: ${averageRating === null ? 'no ratings submitted' : `${averageRating.toFixed(1)}/10 (across ${ratedCount} of ${feedbackList.length} submissions)`}`,
      ...ratingBreakdownLines(feedbackList),
      `- NPS segments: Promoters ${promoters}, Passives ${passives}, Detractors ${detractors}`,
      `- Change in average rating (last 7 days vs prior 7 days): ${trend >= 0 ? '+' : ''}${trend.toFixed(1)}`,
      ``,
      `## Sentiment`,
      `- Overall: ${ai.sentiment}`,
      ``,
      `## Key Topics`,
      ...ai.keyTopics.map(t => `- ${t}`),
      ``,
      `## Recommendations`,
      ...ai.suggestedActions.map(a => `- ${a}`),
      ``,
      `## Summary`,
      ai.summary,
    ].join('\n');

    return { summary: report };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error('Error analyzing feedback:', error);
    return { error: await toUserFacingAIError(error) };
  }
}

export async function analyzeFeedbackForSurvey(surveyId: string) {
  try {
    // Verify user has dashboard access (server-side auth check)
    const { enforcePagePermission } = await getServerAuth();
    await enforcePagePermission('forms-dashboard');

    // Validate surveyId
    if (!surveyId || surveyId.trim() === '') {
      return { error: 'Survey ID is required for analysis.' };
    }

    // Fetch submissions for this survey using utility function
    const { fetchSubmissionsForSurveyAdmin } = await getSubmissionUtils();
    const allSubmissions = await fetchSubmissionsForSurveyAdmin(surveyId);

    // Get survey-specific context
    let surveyContext = getSurveyContextFromId(surveyId, allSubmissions);
    if (surveyContext.type === 'general') {
      surveyContext = { ...surveyContext, title: await surveyTitleOf(surveyId) ?? surveyContext.title };
    }

    // Filter by surveyId (already filtered by fetchSubmissionsForSurveyAdmin, but ensure consistency)
    const feedbackList = allSubmissions.filter(f => f.surveyId && f.surveyId === surveyId);

    if (feedbackList.length === 0) {
      return { summary: `No submissions yet for this ${surveyContext.title.toLowerCase()}.` };
    }

    // Reuse a recent analysis of the same data rather than spending another
    // request from the (small) daily quota on a page refresh. The key includes
    // the submission count and newest timestamp, so new data always regenerates.
    const newestAt = Math.max(...feedbackList.map(f => new Date(f.submittedAt).getTime() || 0));
    const cacheKey = `${surveyId}:${surveyContext.type}:${feedbackList.length}:${newestAt}`;
    const cached = readAnalysisCache(cacheKey);
    if (cached) return cached;

    // Build context-aware data summary
    let feedbackText = '';
    let metrics: any = {};

    if (surveyContext.type === 'consent') {
      // Consent-specific data summary
      const mayContactYes = feedbackList.filter(s => (s as any).mayContact === 'yes').length;
      const scdConnections = feedbackList.flatMap(s => {
        const conn = (s as any).scdConnection;
        return Array.isArray(conn) ? conn : [conn];
      }).filter(Boolean);
      const cities = feedbackList.map(s => (s as any).city?.selection).filter(Boolean);
      const hospitals = feedbackList.map(s => (s as any).primaryHospital?.selection).filter(Boolean);

      feedbackText = feedbackList.slice(0, 75).map(f => {
        const firstName = (f as any).firstName || '';
        const lastName = (f as any).lastName || '';
        const city = (f as any).city?.selection || '';
        const conn = (f as any).scdConnection;
        const connStr = Array.isArray(conn) ? conn.join(', ') : conn;
        return `- Name: ${firstName} ${lastName}, City: ${city}, SCD Connection: ${connStr}, May Contact: ${(f as any).mayContact}`;
      }).join('\n');

      metrics = {
        totalSubmissions: feedbackList.length,
        mayContactRate: `${Math.round((mayContactYes / feedbackList.length) * 100)}%`,
        topSCDConnections: [...new Set(scdConnections)].slice(0, 3).join(', '),
        topCities: [...new Set(cities)].slice(0, 3).join(', '),
        topHospitals: [...new Set(hospitals)].slice(0, 3).join(', ')
      };
    } else if (surveyContext.type === 'overview') {
      // Overview mode - cross-survey insights
      const surveyBreakdown = new Map<string, number>();
      feedbackList.forEach(f => {
        const sid = (f as any).surveyId || 'unknown';
        surveyBreakdown.set(sid, (surveyBreakdown.get(sid) || 0) + 1);
      });

      feedbackText = `Survey breakdown: ${Array.from(surveyBreakdown.entries()).map(([id, count]) => `${id}: ${count}`).join(', ')}`;

      metrics = {
        totalSubmissions: feedbackList.length,
        uniqueSurveys: surveyBreakdown.size,
        avgSubmissionsPerSurvey: Math.round(feedbackList.length / surveyBreakdown.size)
      };
    } else if (surveyContext.type === 'general') {
      feedbackText = feedbackList
        .slice(0, 75)
        .map(describeGeneralSubmissionForAI)
        .join('\n');
      metrics = { totalSubmissions: feedbackList.length };
    } else {
      // Feedback-specific data summary. Only rated submissions feed the
      // average and the NPS buckets; a skipped rating is not a zero.
      const { average: averageRating, rated: ratedCount } = averageRatingOf(feedbackList);
      let promoters = 0, passives = 0, detractors = 0;
      for (const f of feedbackList) {
        const r = Number(f.rating);
        if (!Number.isFinite(r)) continue;
        if (r >= 9) promoters++; else if (r >= 7) passives++; else detractors++;
      }

      feedbackText = feedbackList
        .slice(0, 75)
        .map(describeSubmissionForAI)
        .join('\n');

      metrics = {
        totalSubmissions: feedbackList.length,
        ratedSubmissions: `${ratedCount} of ${feedbackList.length}`,
        averageRating: averageRating === null ? 'No ratings submitted' : `${averageRating.toFixed(1)}/10`,
        promoters,
        passives,
        detractors
      };
      // Rendered verbatim below (not through the camelCase key formatter) so
      // AnalysisDisplay can parse the bands back out of the report body.
      (metrics as any)._extraOverviewLines = ratingBreakdownLines(feedbackList);
      // Kept numeric for the model's 1-5 input schema below.
      (metrics as any)._averageRatingValue = averageRating;
    }

    // Get context-aware AI prompt
    const contextPrompt = getAnalysisPrompt(surveyContext, feedbackList.length);

    // Run AI analysis with survey-specific context
    // Scale rating from 0-10 to 1-5 to match AI schema requirements
    const scaleRating = (val: number) => Math.max(1, Math.min(5, Math.ceil(val / 2)));
    const normalizedRating = surveyContext.type === 'feedback'
      ? scaleRating(Number(metrics._averageRatingValue ?? 6))
      : 4; // Default to 4 for non-feedback surveys to avoid schema errors

    const aiInput = {
      location: surveyContext.type === 'feedback' ? 'Various Hospitals' : 'SCAGO Community',
      rating: normalizedRating,
      feedbackText: `${contextPrompt}\n\nData (Submissions 1-${Math.min(feedbackList.length, 75)}):\n${feedbackText}`
    };

    const runAnalysisFlow = await getAIAnalysis();
    const ai: AIAnalysisResult = await runAnalysisFlow(aiInput);

    // Build survey-type specific report
    const report = [
      `# ${surveyContext.title} Analysis`,
      ``,
      `## Overview`,
      // `_`-prefixed entries are internal (raw values kept for the model input).
      // camelCase keys become sentence case, so `totalSubmissions` reads as
      // "Total submissions" rather than "total Submissions".
      ...Object.entries(metrics)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => {
          const words = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
          return `- ${words.charAt(0).toUpperCase()}${words.slice(1)}: ${value}`;
        }),
      ...((metrics._extraOverviewLines as string[] | undefined) ?? []),
      ``,
      `## Sentiment`,
      `- Overall: ${ai.sentiment}`,
      ``,
      `## Key Insights`,
      ...ai.keyTopics.map(t => `- ${t}`),
      ``,
      `## Recommendations`,
      ...ai.suggestedActions.map(a => `- ${a}`),
      ``,
      `## Summary`,
      ai.summary,
    ].join('\n');

    const result = { summary: report };
    writeAnalysisCache(cacheKey, result);
    return result;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error('Error analyzing feedback for survey:', error);
    return { error: await toUserFacingAIError(error) };
  }
}

export async function getSubmissions(): Promise<FeedbackSubmission[] | { error: string }> {
  noStore();
  try {
    // Use utility function that handles both new and legacy structures
    const { fetchAllSubmissions } = await import('@/lib/submission-utils');
    const feedbackList = await fetchAllSubmissions();
    return feedbackList;
  } catch (e) {
    console.error("Error fetching submissions:", e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
      return { error: 'Could not fetch submissions due to a permission error. Please check your Firestore security rules.' };
    }
    return { error: 'An unexpected error occurred while fetching submissions.' };
  }
}

export async function getSubmissionsForSurvey(surveyId: string): Promise<FeedbackSubmission[] | { error: string }> {
  noStore();
  try {
    // Validate surveyId
    if (!surveyId || surveyId.trim() === '') {
      return { error: 'Survey ID is required.' };
    }

    // Use utility function that handles both new and legacy structures
    const { fetchSubmissionsForSurvey } = await import('@/lib/submission-utils');
    const feedbackList = await fetchSubmissionsForSurvey(surveyId);
    return feedbackList;
  } catch (e) {
    console.error("Error fetching submissions for survey:", e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
      return { error: 'Could not fetch submissions due to a permission error. Please check your Firestore security rules.' };
    }
    return { error: 'An unexpected error occurred while fetching submissions.' };
  }
}

export async function generateAnalysisPdf(params: {
  title: string;
  surveyId: string;
  analysisMarkdown: string;
  includeSubmissions?: boolean;
}): Promise<{ error?: string; pdfBase64?: string }> {
  try {
    // Verify user has dashboard access (server-side auth check)
    const { enforcePagePermission } = await getServerAuth();
    await enforcePagePermission('forms-dashboard');
    const doc = await PDFDocument.create();
    let currentPage = doc.addPage([612, 792]); // US Letter portrait
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = currentPage.getSize();
    const margin = 50;

    // Title
    const title = `${params.title} — Survey ${params.surveyId}`;
    currentPage.drawText(title, {
      x: margin,
      y: height - margin - 24,
      size: 20,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2)
    });

    // Date
    currentPage.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: margin,
      y: height - margin - 45,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // AI Analysis Section
    const lines = params.analysisMarkdown.split('\n');
    let cursorY = height - margin - 70;
    const lineHeight = 14;

    for (const raw of lines) {
      const isHeader = raw.startsWith('#');
      const text = raw.replace(/^#+\s*/, '').replace(/^\*\s*/, '• ');
      const textFont = isHeader ? boldFont : font;
      const textSize = isHeader ? 14 : 11;

      // Check if we need a new page
      if (cursorY < margin + lineHeight) {
        currentPage = doc.addPage([612, 792]);
        cursorY = height - margin;
      }

      // Draw text with proper formatting
      if (text.trim()) {
        currentPage.drawText(text, {
          x: text.startsWith('• ') ? margin + 15 : margin,
          y: cursorY,
          size: textSize,
          font: textFont,
          color: rgb(0, 0, 0)
        });
        cursorY -= lineHeight * (isHeader ? 1.5 : 1);
      } else {
        cursorY -= lineHeight * 0.5; // Half spacing for empty lines
      }
    }

    // Include submissions data if requested
    if (params.includeSubmissions) {
      // Add a new page for submissions
      currentPage = doc.addPage([612, 792]);
      cursorY = height - margin;

      currentPage.drawText('Submission Data', {
        x: margin,
        y: cursorY,
        size: 16,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2)
      });
      cursorY -= 30;

      // Fetch submissions for the survey using utility function
      const { fetchAllSubmissionsAdmin, fetchSubmissionsForSurveyAdmin } = await getSubmissionUtils();
      let submissions: FeedbackSubmission[] = [];
      if (params.surveyId === 'all') {
        submissions = await fetchAllSubmissionsAdmin();
      } else {
        submissions = await fetchSubmissionsForSurveyAdmin(params.surveyId);
      }
      // Sort by submittedAt descending
      submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

      // Add submission summary
      currentPage.drawText(`Total Submissions: ${submissions.length}`, {
        x: margin,
        y: cursorY,
        size: 12,
        font,
        color: rgb(0, 0, 0)
      });
      cursorY -= 20;

      // Add each submission
      for (const [idx, submission] of submissions.entries()) {
        if (cursorY < margin + 100) {
          currentPage = doc.addPage([612, 792]);
          cursorY = height - margin;
        }

        // Submission header
        currentPage.drawText(`Submission #${idx + 1}`, {
          x: margin,
          y: cursorY,
          size: 12,
          font: boldFont,
          color: rgb(0.3, 0.3, 0.3)
        });
        cursorY -= 15;

        // Submission details
        const details = [
          `Date: ${new Date(submission.submittedAt).toLocaleString()}`,
          `Rating: ${submission.rating}/10`,
          `Experience: ${(submission.hospitalInteraction || '').substring(0, 100)}${(submission.hospitalInteraction || '').length > 100 ? '...' : ''}`
        ];

        for (const detail of details) {
          currentPage.drawText(detail, {
            x: margin + 10,
            y: cursorY,
            size: 10,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
          cursorY -= 12;
        }

        cursorY -= 10; // Extra spacing between submissions
      }
    }

    const pdfBytes = await doc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    return { pdfBase64 };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error('Error generating PDF:', e);
    return { error: 'Failed to generate PDF.' };
  }
}

export async function exportSubmissionsPdf(params: {
  title: string;
  surveyId: string;
  submissions: FeedbackSubmission[];
  fieldLabels?: Record<string, string>;
  fieldOrder?: string[];
}): Promise<{ error?: string; pdfBase64?: string }> {
  try {
    const { enforcePagePermission } = await getServerAuth();
    await enforcePagePermission('forms-dashboard');

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const margin = 50;
    const pageWidth = 612;
    const pageHeight = 792;
    const maxTextWidth = pageWidth - margin * 2;
    const lineHeight = 14;

    let currentPage = doc.addPage([pageWidth, pageHeight]);
    let cursorY = pageHeight - margin;

    // Title
    currentPage.drawText(`${params.title} Export`, {
      x: margin,
      y: cursorY,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1)
    });
    cursorY -= 25;

    currentPage.drawText(`Total Submissions: ${params.submissions.length}`, {
      x: margin,
      y: cursorY,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });
    cursorY -= 30;

    for (const [idx, sub] of params.submissions.entries()) {
      // Check for new page before starting a new submission
      if (cursorY < margin + 100) {
        currentPage = doc.addPage([pageWidth, pageHeight]);
        cursorY = pageHeight - margin;
      }

      // Submission Divider/Header
      currentPage.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: pageWidth - margin, y: cursorY },
        thickness: 1,
        color: rgb(0.9, 0.9, 0.9)
      });
      cursorY -= 20;

      const name = extractName(sub);
      const headerText = `Submission #${idx + 1} - ${name || 'Anonymous'} - ${new Date(sub.submittedAt).toLocaleString()}`;
      currentPage.drawText(headerText, {
        x: margin,
        y: cursorY,
        size: 11,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2)
      });
      cursorY -= 20;

      // Determine fields to display and their order
      let fields = Object.entries(sub).filter(([k]) => !['id', 'surveyId', 'submittedAt', 'userId', 'sessionId'].includes(k));

      if (params.fieldOrder && params.fieldOrder.length > 0) {
        const order = params.fieldOrder;
        // Only include fields that are in the survey's field order (filter out irrelevant columns)
        fields = fields.filter(([k]) => order.includes(k));
        fields.sort((a, b) => {
          const indexA = order.indexOf(a[0]);
          const indexB = order.indexOf(b[0]);
          return indexA - indexB;
        });
      }

      for (const [key, value] of fields) {
        if (value === null || value === undefined || value === '') continue;

        const label = params.fieldLabels?.[key] || getQuestionText(key);
        let displayValue = '';

        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'url' in (value[0] as any)) {
          // File upload array: include file names and URLs
          displayValue = value.map((f: any) => f.name ? `${f.name} - ${f.url}` : f.url).join(', ');
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'url' in value) {
          // Single file upload object
          displayValue = value.name ? `${value.name} - ${value.url}` : value.url;
        } else {
          const formatted = formatAnswerValue(value);
          displayValue = Array.isArray(formatted) ? formatted.join(', ') : formatted;
          if (displayValue === 'N/A') displayValue = '';
        }

        if (!displayValue.trim()) continue;

        // Ensure we don't run off the page
        if (cursorY < margin + 40) {
          currentPage = doc.addPage([pageWidth, pageHeight]);
          cursorY = pageHeight - margin;
        }

        // Draw label
        currentPage.drawText(`${label}:`, {
          x: margin,
          y: cursorY,
          size: 10,
          font: boldFont,
          color: rgb(0.3, 0.3, 0.3)
        });
        cursorY -= 12;

        // Draw value with wrapping (simple wrapping)
        const wrappedLines = [];
        const words = displayValue.split(' ');
        let currentLine = '';
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (font.widthOfTextAtSize(testLine, 9) < maxTextWidth - 20) {
            currentLine = testLine;
          } else {
            wrappedLines.push(currentLine);
            currentLine = word;
          }
        }
        wrappedLines.push(currentLine);

        for (const line of wrappedLines) {
          if (cursorY < margin + 15) {
            currentPage = doc.addPage([pageWidth, pageHeight]);
            cursorY = pageHeight - margin;
          }
          currentPage.drawText(line, {
            x: margin + 10,
            y: cursorY,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
          cursorY -= 11;
        }
        cursorY -= 5; // Space between fields
      }
      cursorY -= 15; // Space between submissions
    }

    const pdfBytes = await doc.save();
    return { pdfBase64: Buffer.from(pdfBytes).toString('base64') };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error('Error exporting PDF:', e);
    return { error: 'Failed to generate export PDF' };
  }
}

export async function exportSubmissionPdf(params: {
  submission: FeedbackSubmission;
  fieldLabels?: Record<string, string>;
  fieldOrder?: string[];
  surveyTitle?: string; // Optional survey title for better PDF naming
}): Promise<{ error?: string; pdfBase64?: string }> {
  try {
    const { enforcePagePermission } = await getServerAuth();
    await enforcePagePermission('forms-dashboard');

    const sub = params.submission;
    const { generateSubmissionPdf } = await import('@/lib/pdf-generator');
    const { extractName, parseFirestoreDate } = await import('@/lib/submission-utils');

    // Internal fields to exclude from PDF content
    const excludeKeys = new Set(['id', 'surveyId', 'sessionId', 'submittedAt', 'userId']);

    // We need to reorder the data object before passing it to generateSubmissionPdf
    // BUT generateSubmissionPdf uses Object.entries, so we should create an object with keys in order.
    const orderedData: Record<string, any> = {};
    if (params.fieldOrder && params.fieldOrder.length > 0) {
      // Only include fields from the survey's field order (no irrelevant columns)
      for (const key of params.fieldOrder) {
        if (sub[key as keyof FeedbackSubmission] !== undefined) {
          orderedData[key] = sub[key as keyof FeedbackSubmission];
        }
      }
    } else {
      // Copy all fields except internal ones
      for (const [key, value] of Object.entries(sub)) {
        if (!excludeKeys.has(key) && value !== undefined && value !== null) {
          orderedData[key] = value;
        }
      }
    }

    // Create a descriptive title
    const submitterName = extractName(sub);
    const title = params.surveyTitle
      ? `${params.surveyTitle}${submitterName ? ` - ${submitterName}` : ''}`
      : `Form Submission${submitterName ? ` - ${submitterName}` : ''}`;

    // Parse submittedAt robustly — it may arrive as string, Date, or Firestore Timestamp
    const submittedAt = parseFirestoreDate(sub.submittedAt);

    const pdfBytes = await generateSubmissionPdf({
      title,
      surveyId: sub.surveyId,
      submittedAt,
      data: orderedData,
      fieldLabels: params.fieldLabels
    });

    if (!pdfBytes) return { error: 'Failed to generate PDF' };
    return { pdfBase64: Buffer.from(pdfBytes).toString('base64') };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error('Error exporting single PDF:', e);
    return { error: 'Failed to generate PDF' };
  }
}

export async function analyzeSingleFeedback(input: { rating: number; hospitalInteraction: string; location?: string }): Promise<{ error?: string; summary?: string }> {
  try {
    // Scale rating from 0-10 to 1-5 to match AI schema requirements
    const scaleRating = (val: number) => Math.max(1, Math.min(5, Math.ceil(val / 2)));
    const normalizedRating = scaleRating(input.rating || 0);

    const analysisInput = {
      location: input.location || 'Various Hospitals',
      rating: normalizedRating,
      feedbackText: input.hospitalInteraction || '',
    };
    const runAnalysisFlow = await getAIAnalysis();
    const ai: AIAnalysisResult = await runAnalysisFlow(analysisInput);
    const report = [
      `# Feedback Analysis`,
      ``,
      `## Summary`,
      ai.summary,
      ``,
      `## Sentiment`,
      `- ${ai.sentiment}`,
      ``,
      `## Key Topics`,
      ...ai.keyTopics.map(t => `- ${t}`),
      ``,
      `## Recommendations`,
      ...ai.suggestedActions.map(a => `- ${a}`),
    ].join('\n');
    return { summary: report };
  } catch (e) {
    console.error('Error analyzing single feedback:', e);
    return { error: await toUserFacingAIError(e) };
  }
}

export async function chatWithFeedbackData(query: string, surveyId?: string): Promise<{ error?: string; response?: string }> {
  try {
    // Verify user has dashboard access (server-side auth check)
    const authModule = await getServerAuth();
    await authModule.enforcePagePermission('forms-dashboard');

    // Fetch submissions using utility function
    const utilsModule = await getSubmissionUtils();
    const allSubmissions = await utilsModule.fetchAllSubmissionsAdmin();
    const surveyContext = getSurveyContextFromId(surveyId || 'all', allSubmissions);

    // Filter by survey if surveyId is provided
    let feedbackList = allSubmissions;
    if (surveyId && surveyId !== 'all') {
      feedbackList = feedbackList.filter(f => f.surveyId && f.surveyId === surveyId);
    }

    if (feedbackList.length === 0) {
      return { response: `No ${surveyContext.title.toLowerCase()} data available yet. Please collect some submissions first!` };
    }

    // Add survey context to the query
    const contextualizedQuery = `Context: You are analyzing ${surveyContext.title} (${surveyContext.description}).

Key fields in this survey:
${surveyContext.keyFields.map(f => `- ${f}`).join('\n')}

${surveyContext.analysisPrompt}

User question: ${query}`;

    // Dynamically import AI flow with specialized error handling
    let chatWithData;
    try {
      const flowModule = await import('@/ai/flows/chat-with-data-flow');
      chatWithData = flowModule.chatWithData;
    } catch (importError) {
      console.error('[chatWithFeedbackData] Failed to import AI flow:', importError);
      return { error: await toUserFacingAIError(importError) };
    }

    // Process the request
    try {
      const response = await chatWithData(contextualizedQuery, feedbackList);
      return { response };
    } catch (processError) {
      console.error('[chatWithFeedbackData] Processing failed:', processError);
      return { error: await toUserFacingAIError(processError) };
    }

  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error('[chatWithFeedbackData] Unexpected error:', e);
    return { error: 'An unexpected system error occurred. Please try again later.' };
  }
}