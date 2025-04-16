"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { YoutubeIcon, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

export function VideoSummary() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSummary("");

    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error(t('error'));
      }

      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId, locale }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('error'));
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder={t('videoUrl')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="border-zinc-200 bg-white text-black placeholder:text-zinc-400 ring-1 ring-ring ring-offset-2 focus-visible:ring-red-600 focus-visible:ring-offset-white transition-colors"
            required
            pattern="^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/).+"
            title="Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=..., https://youtu.be/..., https://www.youtube.com/embed/..., or https://m.youtube.com/watch?v=...)"
          />
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <YoutubeIcon className="mr-2 h-4 w-4" />
            {loading ? t('loading') : t('getSummary')}
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card className="p-6 bg-white border-zinc-200">
          <div className="space-y-3">
            <Skeleton className="h-4 w-[250px] bg-zinc-100" />
            <Skeleton className="h-4 w-[400px] bg-zinc-100" />
            <Skeleton className="h-4 w-[350px] bg-zinc-100" />
          </div>
        </Card>
      )}

      {summary && (
        <Card className="p-6 bg-white border-zinc-200">
          <div className="prose prose-zinc max-w-none">
            <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1]:mt-10 [&>h2]:mb-5 [&>h2]:mt-8 [&>h3]:mb-4 [&>h3]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}