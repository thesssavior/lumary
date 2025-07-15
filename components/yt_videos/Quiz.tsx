// Path: components/yt_videos/Quiz.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lightbulb } from 'lucide-react'; // Added CheckCircle
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming Card components are available

interface QuizItem {
  question: string;
  answer: string;
}

interface QuizProps {
  summary?: string | null;
  chapters?: { title: string; summary: string }[];
  quizData: QuizItem[] | null; // Pre-loaded quiz from DB
  locale: string;
  contentLanguage?: string; // Content language for quiz generation
  summaryId: string | null; // summaryId might be null initially on /new page
  title?: string | null;
  // isActive: boolean; // To trigger generation, or for other conditional logic if needed
}

const QuizComponent: React.FC<QuizProps> = ({ summary, quizData: initialQuizData, locale, contentLanguage, summaryId, title, chapters }) => {
  const t = useTranslations();

  const [quizItems, setQuizItems] = useState<QuizItem[]>(initialQuizData || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(!!initialQuizData && initialQuizData.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<{ [index: number]: boolean }>({});

  // load quiz items on mount
  useEffect(() => {
    if (initialQuizData) {
      setQuizItems(initialQuizData);
      setIsGenerated(initialQuizData.length > 0);
      setRevealedAnswers({}); // Reset revealed answers when quiz data changes
    } else {
      // If initialQuizData is null (e.g. new summary or summary without quiz), reset state
      setQuizItems([]);
      setIsGenerated(false);
    }
  }, [initialQuizData]);

  const hasContent = summary || (chapters && chapters.length > 0);

  const generateQuiz = async () => {
    if (!hasContent) {
      setError(t('Quiz.errorNoSummary'));
      return;
    }

    const content = chapters && chapters.length > 0
      ? chapters.map(c => `${c.title}\n${c.summary}`).join('\n\n')
      : summary;

    setIsLoading(true);
    setError(null);
    setRevealedAnswers({}); // Reset revealed answers on new generation

    try {
      const response = await fetch('/api/summaries/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          summaryText: content, 
          locale, 
          contentLanguage: contentLanguage || locale,
          title: title 
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || t('Quiz.errorGenerating'));
      }

      const data = await response.json();
      if (data.quiz && Array.isArray(data.quiz)) {
        setQuizItems(data.quiz);
        setIsGenerated(true);
        // Attempt to save only if summaryId is present
        if (summaryId) {
          await saveQuiz(data.quiz, summaryId);
        } else {
          // Quiz is generated but not saved yet as summaryId is missing
          // It will be saved when the summary itself is saved, or if summaryId becomes available later
          console.log("Quiz generated, waiting for summaryId to save.");
        }
      } else {
        throw new Error(t('Quiz.errorInvalidData'));
      }
    } catch (err: any) {
      console.error("Error generating quiz:", err);
      setError(err.message || t('Quiz.errorUnknown'));
    } finally {
      setIsLoading(false);
    }
  };

  const saveQuiz = async (currentQuizItems: QuizItem[], currentSummaryId: string) => {
    if (!currentSummaryId) {
      // This case should ideally be handled before calling saveQuiz,
      // but as a safeguard:
      console.warn("Attempted to save quiz without summaryId.");
      setError(t('Quiz.errorSavingNoId')); // Consider a specific translation
      return;
    }
    if (!currentQuizItems || currentQuizItems.length === 0) {
        console.warn("Attempted to save an empty quiz.");
        return; // Don't save an empty quiz
    }

    setIsSaving(true);
    // setError(null); // Don't clear generation error if saving fails

    try {
      const response = await fetch('/api/summaries/quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          summaryId: currentSummaryId,
          quiz: currentQuizItems 
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || t('Quiz.errorSaving'));
      }
      // Optionally: show a success message or indicator for saving
      console.log("Quiz saved successfully for summaryId:", currentSummaryId);
    } catch (err: any) {
      console.error("Error saving quiz:", err);
      setError(prevError => prevError ? `${prevError}. ${err.message}` : err.message || t('Quiz.errorSavingUnknown'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAnswer = (index: number) => {
    setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 rounded-md">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      </div>
    );
  }

  if ((error || (!summary && !chapters)) && !isGenerated) { // Show error prominently if nothing could be generated/loaded
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 rounded-md bg-red-50 text-red-700">
        <AlertTriangle className="h-10 w-10 mb-3" />
        <p className="font-semibold">{t('Quiz.error')}</p>
        <p className="text-sm mb-4">{error}</p>
        <Button onClick={generateQuiz} variant="outline" disabled={!hasContent || isLoading}>
          {t('Quiz.regenerateButton')}
        </Button>
      </div>
    );
  }
  
  if (!isGenerated) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-10 rounded-md text-center">
        <Lightbulb className="h-12 w-12 mb-6" />
        <h3 className="text-xl font-semibold mb-2">{t('Quiz.title')}</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md">
          {t('Quiz.generateDescription')}
        </p>
        <Button onClick={generateQuiz} size="lg" disabled={!hasContent || isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {t('Quiz.generateButton')}
        </Button>
         {error && ( // Show less prominent error if there was a previous attempt
          <div className="mt-4 text-sm text-red-600">
            <p>{t('Quiz.lastAttemptError')}: {error}</p>
          </div>
        )}
      </div>
    );
  }

  // Quiz is generated or loaded
  return (
    <div className="space-y-2 mt-2">
      {error && ( // Show error if one occurred during generation/saving, even if quiz is displayed
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
          <p><span className="font-semibold">{t('Quiz.errorEncountered')}:</span> {error}</p>
        </div>
      )}

      {quizItems.map((item, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-800 p-4">
            <CardTitle className="text-lg flex items-center">
              {t('Quiz.question')} {index + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-3">
            <p className="text-gray-700 dark:text-gray-300 text-base">{item.question}</p>
            <Button
              onClick={() => toggleAnswer(index)}
              variant="outline"
              size="sm"
              className="mt-2 text-primary hover:bg-primary/10"
            >
              {revealedAnswers[index] ? t('Quiz.hideAnswerButton') : t('Quiz.showAnswerButton')}
            </Button>
            {revealedAnswers[index] && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-r-md">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">{t('Quiz.answer')}:</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{item.answer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuizComponent; // Typically we export the component directly

// If you want to wrap it with ReactFlowProvider or similar (though not needed for Quiz)
// const Quiz: React.FC<QuizProps> = (props) => (
// //   <SomeProviderIfNeeded>
//     <QuizComponent {...props} />
// //   </SomeProviderIfNeeded>
// );
// export default Quiz;