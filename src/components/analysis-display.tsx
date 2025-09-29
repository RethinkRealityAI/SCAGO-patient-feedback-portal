'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Heart,
  Users,
  Star,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface AnalysisDisplayProps {
  analysisText: string;
}

interface ParsedAnalysis {
  overview: {
    totalSubmissions: number;
    averageRating: number;
    ratings: { excellent: number; good: number; poor: number };
    sentimentChange: number;
  };
  sentiment: string;
  keyTopics: string[];
  areasForImprovement: string[];
  recommendations: string[];
  summary: string;
}

function parseAnalysisText(text: string): ParsedAnalysis {
  const lines = text.split('\n');
  
  // Extract numbers from overview
  const totalMatch = text.match(/Total submissions:\s*(\d+)/i);
  const avgRatingMatch = text.match(/Average rating:\s*([\d.]+)/i);
  // Look for ratings 8-10, 5-7, and below 5
  const excellentMatch = text.match(/excellent.*?(\d+)|8-10.*?(\d+)|high.*?rating.*?(\d+)/i);
  const goodMatch = text.match(/good.*?(\d+)|5-7.*?(\d+)|average.*?rating.*?(\d+)/i);
  const poorMatch = text.match(/poor.*?(\d+)|below 5.*?(\d+)|low.*?rating.*?(\d+)/i);
  const changeMatch = text.match(/Change in average rating.*?:\s*([+-]?[\d.]+)/i);
  const sentimentMatch = text.match(/Overall:\s*(\w+)/i) || text.match(/Sentiment[:\s]+(\w+)/i);

  // Extract sections
  const keyTopicsSection = text.match(/Key Topics[:\n]+([\s\S]*?)(?=\n\n|Areas for|Recommendations|Summary|$)/i);
  const areasSection = text.match(/Areas for Improvement[:\n]+([\s\S]*?)(?=\n\n|Recommendations|Summary|$)/i);
  const recommendationsSection = text.match(/Recommendations[:\n]+([\s\S]*?)(?=\n\n|Summary|$)/i);
  const summarySection = text.match(/Summary[:\n]+([\s\S]*?)$/i);

  const extractListItems = (section: string | undefined) => {
    if (!section) return [];
    return section
      .split('\n')
      .filter(line => line.trim().match(/^[-•*]\s+/))
      .map(line => line.replace(/^[-•*]\s+/, '').trim())
      .filter(Boolean);
  };

  return {
    overview: {
      totalSubmissions: totalMatch ? parseInt(totalMatch[1]) : 0,
      averageRating: avgRatingMatch ? parseFloat(avgRatingMatch[1]) : 0,
      ratings: {
        excellent: excellentMatch ? parseInt(excellentMatch[1] || excellentMatch[2] || excellentMatch[3]) : 0,
        good: goodMatch ? parseInt(goodMatch[1] || goodMatch[2] || goodMatch[3]) : 0,
        poor: poorMatch ? parseInt(poorMatch[1] || poorMatch[2] || poorMatch[3]) : 0,
      },
      sentimentChange: changeMatch ? parseFloat(changeMatch[1]) : 0,
    },
    sentiment: sentimentMatch ? sentimentMatch[1] : 'Neutral',
    keyTopics: extractListItems(keyTopicsSection?.[1]),
    areasForImprovement: extractListItems(areasSection?.[1]),
    recommendations: extractListItems(recommendationsSection?.[1]),
    summary: summarySection?.[1]?.trim() || text.split('\n').slice(0, 3).join(' '),
  };
}

export default function AnalysisDisplay({ analysisText }: AnalysisDisplayProps) {
  const parsed = useMemo(() => parseAnalysisText(analysisText), [analysisText]);

  const satisfactionScore = useMemo(() => {
    const total = parsed.overview.ratings.excellent + parsed.overview.ratings.good + parsed.overview.ratings.poor;
    if (total === 0) return 0;
    // Calculate percentage of excellent and good ratings
    return Math.round(
      ((parsed.overview.ratings.excellent + parsed.overview.ratings.good) / total) * 100
    );
  }, [parsed.overview.ratings]);

  const sentimentColor = {
    'Positive': 'text-green-600 bg-green-50 border-green-200',
    'Neutral': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'Negative': 'text-red-600 bg-red-50 border-red-200',
  }[parsed.sentiment] || 'text-gray-600 bg-gray-50 border-gray-200';

  const sentimentIcon = {
    'Positive': Heart,
    'Neutral': Minus,
    'Negative': AlertTriangle,
  }[parsed.sentiment] || Minus;

  const SentimentIcon = sentimentIcon;

  return (
    <div className="space-y-6">
      {/* Header with Sentiment */}
      <Alert className={cn("border-2", sentimentColor)}>
        <SentimentIcon className="h-5 w-5" />
        <AlertDescription className="ml-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-lg">Overall Sentiment: {parsed.sentiment}</span>
              <p className="text-sm opacity-80 mt-1">{parsed.summary}</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submissions */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {parsed.overview.totalSubmissions}
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">submissions analyzed</p>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Avg. Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              {parsed.overview.averageRating.toFixed(1)}
              <span className="text-lg text-amber-500">/10</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {parsed.overview.sentimentChange > 0 ? (
                <>
                  <ArrowUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+{parsed.overview.sentimentChange.toFixed(1)}</span>
                </>
              ) : parsed.overview.sentimentChange < 0 ? (
                <>
                  <ArrowDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">{parsed.overview.sentimentChange.toFixed(1)}</span>
                </>
              ) : (
                <span className="text-xs text-gray-600">No change</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hospital Satisfaction */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Satisfaction Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-bold",
              satisfactionScore >= 80 ? "text-green-600" : satisfactionScore >= 60 ? "text-yellow-600" : "text-red-600"
            )}>
              {satisfactionScore}%
            </div>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
              {satisfactionScore >= 80 ? 'Excellent' : satisfactionScore >= 60 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        {/* Poor Ratings Alert */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-900 dark:text-red-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Poor Ratings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {parsed.overview.ratings.poor}
            </div>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Hospital Ratings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#C8262A]" />
            Hospital Ratings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Excellent (8-10)
                </span>
                <span className="font-semibold">{parsed.overview.ratings.excellent}</span>
              </div>
              <Progress value={(parsed.overview.ratings.excellent / (parsed.overview.totalSubmissions || 1)) * 100} className="h-2 bg-green-100" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  Good (5-7)
                </span>
                <span className="font-semibold">{parsed.overview.ratings.good}</span>
              </div>
              <Progress value={(parsed.overview.ratings.good / (parsed.overview.totalSubmissions || 1)) * 100} className="h-2 bg-yellow-100" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Poor (&lt;5)
                </span>
                <span className="font-semibold">{parsed.overview.ratings.poor}</span>
              </div>
              <Progress value={(parsed.overview.ratings.poor / (parsed.overview.totalSubmissions || 1)) * 100} className="h-2 bg-red-100" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Topics */}
      {parsed.keyTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C8262A]" />
              Key Topics
            </CardTitle>
            <CardDescription>Most commonly mentioned themes in feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {parsed.keyTopics.map((topic, idx) => (
                <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement */}
      {parsed.areasForImprovement.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Areas for Improvement
            </CardTitle>
            <CardDescription>Critical issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {parsed.areasForImprovement.map((area, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-orange-200/50">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-sm font-semibold">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{area}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {parsed.recommendations.length > 0 && (
        <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Actionable Recommendations
            </CardTitle>
            <CardDescription>Suggested improvements for better patient care</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {parsed.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-green-200/50">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{rec}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
