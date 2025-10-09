'use server';

// AI imports will be loaded dynamically to avoid build issues
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

// Type definition for AI analysis results
interface AIAnalysisResult {
  summary: string;
  sentiment: string;
  keyTopics: string[];
  suggestedActions: string[];
}

// Dynamic AI import helper
async function getAIAnalysis() {
  try {
    // Initialize genkit configuration
    await import('@/ai/genkit');
    // Import the analysis flow
    const { analyzeFeedback } = await import('@/ai/flows/analyze-feedback-flow');
    return analyzeFeedback;
  } catch (error) {
    console.error('Failed to load AI analysis:', error);
    // Return a fallback function that provides complete analysis structure
    return async (input: any): Promise<AIAnalysisResult> => ({
      summary: `Analysis based on ${input.location}: Rating ${input.rating}/10. ${input.feedbackText ? 'Feedback received.' : 'No detailed feedback available.'}`,
      sentiment: input.rating >= 8 ? 'Positive' : input.rating >= 6 ? 'Neutral' : 'Negative',
      keyTopics: input.feedbackText ? ['Patient Experience', 'Service Quality'] : ['No feedback available'],
      suggestedActions: ['Continue monitoring feedback', 'Address any concerns raised']
    });
  }
}
import { db } from '@/lib/firebase';
import type { FeedbackSubmission } from './types';
import { unstable_noStore as noStore } from 'next/cache';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getSurveyContextFromId, getAnalysisPrompt, detectSurveyType, getSurveyContext } from '@/lib/survey-contexts';

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
    const runAnalysisFlow = await getAIAnalysis();
    const ai: AIAnalysisResult = await runAnalysisFlow({ location: 'Various Hospitals', rating: Math.round(averageRating), feedbackText });

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
    const allSubmissions = feedbackSnapshot.docs.map(doc => doc.data() as FeedbackSubmission);
    
    // Get survey-specific context
    const surveyContext = getSurveyContextFromId(surveyId, allSubmissions);
    
    const feedbackList = allSubmissions.filter(f => (f as any).surveyId === surveyId);

    if (feedbackList.length === 0) {
      return { summary: `No submissions yet for this ${surveyContext.title.toLowerCase()}.` };
    }

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
      
      feedbackText = feedbackList.map(f => {
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
    } else {
      // Feedback-specific data summary
      const averageRating = feedbackList.reduce((acc, f) => acc + Number(f.rating || 0), 0) / feedbackList.length;
      let promoters = 0, passives = 0, detractors = 0;
      for (const f of feedbackList) {
        const r = Number(f.rating || 0);
        if (r >= 9) promoters++; else if (r >= 7) passives++; else detractors++;
      }
      
      feedbackText = feedbackList
        .map(f => `- Rating: ${f.rating}/10, Experience: ${f.hospitalInteraction}`)
        .join('\n');
      
      metrics = {
        totalSubmissions: feedbackList.length,
        averageRating: averageRating.toFixed(1),
        promoters,
        passives,
        detractors
      };
    }

    // Get context-aware AI prompt
    const contextPrompt = getAnalysisPrompt(surveyContext, feedbackList.length);
    
    // Run AI analysis with survey-specific context
    const aiInput = {
      location: surveyContext.type === 'consent' ? 'SCAGO Community' : 'Various Hospitals',
      rating: surveyContext.type === 'feedback' ? Math.round(Number(metrics.averageRating)) : 8,
      feedbackText: `${contextPrompt}\n\nData:\n${feedbackText}`
    };
    
    const runAnalysisFlow = await getAIAnalysis();
    const ai: AIAnalysisResult = await runAnalysisFlow(aiInput);

    // Build survey-type specific report
    const report = [
      `# ${surveyContext.title} Analysis`,
      ``,
      `## Overview`,
      ...Object.entries(metrics).map(([key, value]) => `- ${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`),
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

export async function generateAnalysisPdf(params: { 
  title: string; 
  surveyId: string; 
  analysisMarkdown: string;
  includeSubmissions?: boolean;
}): Promise<{ error?: string; pdfBase64?: string }> {
  try {
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
      const text = raw.replace(/^#+\s*/,'').replace(/^\*\s*/,'• ');
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

      // Fetch submissions for the survey
      const feedbackCol = collection(db, 'feedback');
      const feedbackSnapshot = await getDocs(feedbackCol);
      const submissions = feedbackSnapshot.docs
        .map(doc => doc.data() as FeedbackSubmission)
        .filter(f => params.surveyId === 'all' || (f as any).surveyId === params.surveyId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

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
    return { error: 'Failed to analyze this submission.' };
  }
}

export async function chatWithFeedbackData(query: string, surveyId?: string): Promise<{ error?: string; response?: string }> {
  try {
    const feedbackCol = collection(db, 'feedback');
    const feedbackSnapshot = await getDocs(feedbackCol);
    let feedbackList = feedbackSnapshot.docs.map(doc => doc.data() as FeedbackSubmission);
    
    // Get survey context
    const allSubmissions = [...feedbackList];
    const surveyContext = getSurveyContextFromId(surveyId || 'all', allSubmissions);
    
    // Filter by survey if surveyId is provided
    if (surveyId && surveyId !== 'all') {
      feedbackList = feedbackList.filter(f => (f as any).surveyId === surveyId);
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

    // Use the chat-with-data flow
    const { chatWithData } = await import('@/ai/flows/chat-with-data-flow');
    const response = await chatWithData(contextualizedQuery, feedbackList);
    
    return { response };
  } catch (e) {
    console.error('Error in chat with feedback data:', e);
    return { error: 'Failed to process your query. Please try again.' };
  }
}