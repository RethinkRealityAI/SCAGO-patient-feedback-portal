'use server';

import '@/ai/genkit'; // Initialize Genkit configuration
import { analyzeFeedback as runAnalysisFlow } from '@/ai/flows/analyze-feedback-flow';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FeedbackSubmission } from './types';
import { unstable_noStore as noStore } from 'next/cache';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function analyzeFeedback() {
  try {
    const feedbackCol = collection(db, 'feedback');
    const feedbackSnapshot = await getDocs(feedbackCol);
    const feedbackList = feedbackSnapshot.docs.map(doc => doc.data() as FeedbackSubmission);

    if (feedbackList.length === 0) {
      return { summary: 'No feedback submissions yet. Start by sharing the survey link!' };
    }

    // Aggregate metrics
    const averageRating = feedbackList.reduce((acc, f) => acc + Number(f.rating || 0), 0) / feedbackList.length;
    let promoters = 0, passives = 0, detractors = 0;
    for (const f of feedbackList) {
      const r = Number(f.rating || 0);
      if (r >= 9) promoters++; else if (r >= 7) passives++; else detractors++;
    }
    const byDate = new Map<string, { count: number; sum: number }>();
    for (const f of feedbackList) {
      const raw = (f as any).submittedAt as any;
      const d = raw && typeof raw.toDate === 'function' ? raw.toDate() : (raw instanceof Date ? raw : (typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : null));
      if (!d || isNaN(d.getTime())) continue;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
      const cur = byDate.get(key) || { count: 0, sum: 0 };
      byDate.set(key, { count: cur.count + 1, sum: cur.sum + Number(f.rating || 0) });
    }
    const sorted = Array.from(byDate.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
    const last7 = sorted.slice(-7);
    const prev7 = sorted.slice(-14, -7);
    const avgLast7 = last7.length ? last7.reduce((a, [,v])=>a+v.sum,0) / last7.reduce((a,[,v])=>a+v.count,0) : 0;
    const avgPrev7 = prev7.length ? prev7.reduce((a, [,v])=>a+v.sum,0) / prev7.reduce((a,[,v])=>a+v.count,0) : 0;
    const trend = avgPrev7 ? (avgLast7 - avgPrev7) : 0;

    // Build AI context text and run analysis
    const feedbackText = feedbackList
      .map(f => `- Rating: ${f.rating}/10, Experience: ${f.hospitalInteraction}`)
      .join('\n');
    const ai = await runAnalysisFlow({ location: 'Various Hospitals', rating: Math.round(averageRating), feedbackText });

    // Compose a rich markdown report
    const report = [
      `# Feedback Insights`,
      ``,
      `## Overview`,
      `- Total submissions: ${feedbackList.length}`,
      `- Average rating: ${averageRating.toFixed(1)}/10`,
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
    console.error('Error analyzing feedback:', error);
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: 'An unknown error occurred during analysis.' };
  }
}

export async function analyzeFeedbackForSurvey(surveyId: string) {
  try {
    const feedbackCol = collection(db, 'feedback');
    const feedbackSnapshot = await getDocs(feedbackCol);
    const feedbackList = feedbackSnapshot.docs
      .map(doc => doc.data() as FeedbackSubmission)
      .filter(f => (f as any).surveyId === surveyId);

    if (feedbackList.length === 0) {
      return { summary: 'No feedback submissions yet for this survey.' };
    }

    // Aggregate metrics (per-survey)
    const averageRating = feedbackList.reduce((acc, f) => acc + Number(f.rating || 0), 0) / feedbackList.length;
    let promoters = 0, passives = 0, detractors = 0;
    for (const f of feedbackList) {
      const r = Number(f.rating || 0);
      if (r >= 9) promoters++; else if (r >= 7) passives++; else detractors++;
    }
    const byDate = new Map<string, { count: number; sum: number }>();
    for (const f of feedbackList) {
      const raw = (f as any).submittedAt as any;
      const d = raw && typeof raw.toDate === 'function' ? raw.toDate() : (raw instanceof Date ? raw : (typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : null));
      if (!d || isNaN(d.getTime())) continue;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
      const cur = byDate.get(key) || { count: 0, sum: 0 };
      byDate.set(key, { count: cur.count + 1, sum: cur.sum + Number(f.rating || 0) });
    }
    const sorted = Array.from(byDate.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
    const last7 = sorted.slice(-7);
    const prev7 = sorted.slice(-14, -7);
    const avgLast7 = last7.length ? last7.reduce((a, [,v])=>a+v.sum,0) / last7.reduce((a,[,v])=>a+v.count,0) : 0;
    const avgPrev7 = prev7.length ? prev7.reduce((a, [,v])=>a+v.sum,0) / prev7.reduce((a,[,v])=>a+v.count,0) : 0;
    const trend = avgPrev7 ? (avgLast7 - avgPrev7) : 0;

    const feedbackText = feedbackList
      .map(f => `- Rating: ${f.rating}/10, Experience: ${f.hospitalInteraction}`)
      .join('\n');
    const ai = await runAnalysisFlow({ location: 'Various Hospitals', rating: Math.round(averageRating), feedbackText });

    const report = [
      `# Feedback Insights (Survey ${surveyId})`,
      ``,
      `## Overview`,
      `- Total submissions: ${feedbackList.length}`,
      `- Average rating: ${averageRating.toFixed(1)}/10`,
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
    console.error('Error analyzing feedback for survey:', error);
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: 'An unknown error occurred during analysis.' };
  }
}

export async function getSubmissions(): Promise<FeedbackSubmission[] | { error: string }> {
  noStore();
  try {
    const feedbackCol = collection(db, 'feedback');
    const q = query(feedbackCol, orderBy('submittedAt', 'desc'));
    const feedbackSnapshot = await getDocs(q);
    const feedbackList = feedbackSnapshot.docs.map(doc => {
      const data = doc.data();
      const raw = data.submittedAt as any;
      const date = raw && typeof raw.toDate === 'function' ? raw.toDate() : (raw instanceof Date ? raw : (typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : new Date()))
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating),
        submittedAt: date,
      } as FeedbackSubmission;
    });
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
    const feedbackCol = collection(db, 'feedback');
    const q = query(feedbackCol, orderBy('submittedAt', 'desc'));
    const feedbackSnapshot = await getDocs(q);
    const feedbackList = feedbackSnapshot.docs
      .map(doc => {
        const data = doc.data();
        const raw = data.submittedAt as any;
        const date = raw && typeof raw.toDate === 'function' ? raw.toDate() : (raw instanceof Date ? raw : (typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : new Date()))
        return {
          id: doc.id,
          ...data,
          rating: Number(data.rating),
          submittedAt: date,
        } as FeedbackSubmission;
      })
      .filter(item => (item as any).surveyId === surveyId);
    return feedbackList;
  } catch (e) {
    console.error("Error fetching submissions for survey:", e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
        return { error: 'Could not fetch submissions due to a permission error. Please check your Firestore security rules.' };
    }
    return { error: 'An unexpected error occurred while fetching submissions.' };
  }
}

export async function generateAnalysisPdf(params: { title: string; surveyId: string; analysisMarkdown: string }): Promise<{ error?: string; pdfBase64?: string }> {
  try {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]); // US Letter portrait
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();
    const margin = 50;

    const title = `${params.title} — Survey ${params.surveyId}`;
    page.drawText(title, { x: margin, y: height - margin - 24, size: 18, font, color: rgb(0.2, 0.2, 0.2) });

    const lines = params.analysisMarkdown.split('\n');
    let cursorY = height - margin - 50;
    const lineHeight = 14;

    for (const raw of lines) {
      const text = raw.replace(/^#+\s*/,'');
      if (cursorY < margin) {
        doc.addPage([612, 792]);
        const newPage = doc.getPage(doc.getPageCount() - 1);
        cursorY = 792 - margin;
        newPage.drawText(text, { x: margin, y: cursorY, size: 12, font, color: rgb(0,0,0) });
        cursorY -= lineHeight;
      } else {
        page.drawText(text, { x: margin, y: cursorY, size: 12, font, color: rgb(0,0,0) });
        cursorY -= lineHeight;
      }
    }

    const pdfBytes = await doc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    return { pdfBase64 };
  } catch (e) {
    console.error('Error generating PDF:', e);
    return { error: 'Failed to generate PDF.' };
  }
}

export async function analyzeSingleFeedback(input: { rating: number; hospitalInteraction: string; location?: string }): Promise<{ error?: string; summary?: string }> {
  try {
    const analysisInput = {
      location: input.location || 'Various Hospitals',
      rating: Math.round(Number(input.rating || 0)),
      feedbackText: input.hospitalInteraction || '',
    };
    const ai = await runAnalysisFlow(analysisInput);
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
    return { error: 'Failed to analyze this submission.' };
  }
}
