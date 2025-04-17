'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function UnhookAnalyzer() {
  const t = useTranslations('UnhookAnalyzer');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<{
    title: string;
    thumbnailUrl: string;
    analysis: string;
  } | null>(null);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAnalysis(null);
    setLoading(true);

    try {
      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        throw new Error(t('invalidUrl'));
      }

      const response = await fetch('/api/unhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('error'));
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700">
            {t('videoUrl')}
          </label>
          <input
            type="text"
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? t('analyzing') : t('analyze')}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center space-x-4">
            <img
              src={analysis.thumbnailUrl}
              alt={analysis.title}
              className="w-48 h-27 object-cover rounded-lg"
            />
            <h2 className="text-xl font-semibold">{analysis.title}</h2>
          </div>
          <div className="prose max-w-none">
            <h3 className="text-lg font-medium">{t('analysis')}</h3>
            <div className="whitespace-pre-wrap">{analysis.analysis}</div>
          </div>
        </div>
      )}
    </div>
  );
} 