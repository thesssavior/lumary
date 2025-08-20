'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Loader2, Check, ThumbsUp } from 'lucide-react';
import { useHydration } from '@/hooks/useHydration';

type Status = "planned" | "in-progress" | "shipped" | "considering";

interface Feature {
  id: string;
  title: string;
  description: string;
  status: Status;
  votes: number;
  date: string | null;
}

const VOTED_FEATURES_KEY = 'votedFeatures';

// Helper functions for localStorage
const getVotedFeatures = (): string[] => {
  if (typeof window === 'undefined') return [];
  const voted = localStorage.getItem(VOTED_FEATURES_KEY);
  return voted ? JSON.parse(voted) : [];
};

const addVotedFeature = (featureId: string) => {
  if (typeof window === 'undefined') return;
  const voted = getVotedFeatures();
  localStorage.setItem(VOTED_FEATURES_KEY, JSON.stringify([...voted, featureId]));
};

const FeatureCard = ({ feature }: { feature: Feature }) => {
  const t = useTranslations('FeatureBoard');
  const [votes, setVotes] = useState(feature.votes);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isHydrated = useHydration();

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      setHasVoted(getVotedFeatures().includes(feature.id));
    }
  }, [feature.id, isHydrated]);
  
  const handleVote = async () => {
    if (hasVoted || isLoading) return;

    setIsLoading(true);
    
    try {
              const response = await fetch('/api/home/feature-board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureId: feature.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('errors.voteFailed'));
      }

      const result = await response.json();
      if (result.success && result.updatedFeature) {
        setVotes(result.updatedFeature.votes);
        setHasVoted(true);
        addVotedFeature(feature.id);
      } else {
        throw new Error(t('errors.voteFailedUnexpected'));
      }
    } catch (error: any) {
      console.error('Vote error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "planned":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10">{t('statusPlanned')}</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/10">{t('statusInProgress')}</Badge>;
      case "shipped":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-500/10">{t('statusShipped')}</Badge>;
      case "considering":
        return <Badge variant="outline" className="bg-muted text-muted-foreground hover:bg-muted">{t('statusConsidering')}</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Card className="p-4 mb-4 notion-card">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-foreground">{feature.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
          <div className="mt-3 flex items-center gap-2">
            {getStatusBadge(feature.status)}
            {feature.date && (feature.status === "planned" || feature.status === "in-progress") && (
                <span className="text-xs text-muted-foreground">{t('expectedDate', { date: feature.date })}</span>
            )}
            {feature.date && feature.status === "shipped" && (
                <span className="text-xs text-muted-foreground">{t('shippedDate', { date: feature.date })}</span>
            )}
          </div>
        </div>
        <button 
          onClick={handleVote} 
          disabled={hasVoted || isLoading}
          className={`flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
            hasVoted 
              ? 'bg-green-500/10 text-green-700 dark:text-green-300 cursor-not-allowed' 
              : isLoading 
              ? 'bg-muted text-muted-foreground cursor-wait' 
              : 'hover:bg-accent text-muted-foreground'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="m19 14-7-7-7 7" />
          </svg>
          <span className="text-sm font-medium">{votes}</span>
          {/* {hasVoted && <span className="text-xs">{t('votedButton')}</span>} */}
        </button>
      </div>
    </Card>
  );
};

const FeatureBoard = () => {
  const t = useTranslations('FeatureBoard');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/home/feature-board');
        if (!response.ok) {
          throw new Error(t('errors.fetchFeaturesFailed'));
        }
        const data = await response.json();
        setFeatures(data);
      } catch (err: any) {
        setError(err.message || t('errors.fetchFeaturesFailedUnexpected'));
        console.error("Fetch features error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatures();
  }, [t]);


  if (isLoading) {
    return <div><Loader2 className="w-4 h-4 animate-spin" /></div>; // Or a spinner component
  }

  if (error) {
    return <div className="text-destructive">{t('errors.fetchFeaturesError', { error: error })}</div>;
  }

  return (
    <div className="space-y-6 mt-8">
      <h2 className="text-xl font-semibold text-foreground">{t('productRoadmapTitle')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium text-base text-foreground border-b pb-2 border-border">{t('columnPlanned')}</h3>
          {features
            .filter(feature => feature.status === "planned")
            .map(feature => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium text-base text-foreground border-b pb-2 border-border">{t('columnInProgress')}</h3>
          {features
            .filter(feature => feature.status === "in-progress")
            .map(feature => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium text-base text-foreground border-b pb-2 border-border">{t('columnShipped')}</h3>
          {features
            .filter(feature => feature.status === "shipped")
            .map(feature => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium text-base text-foreground border-b pb-2 border-border">{t('columnConsidering')}</h3>
          {features
            .filter(feature => feature.status === "considering")
            .map(feature => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureBoard;
