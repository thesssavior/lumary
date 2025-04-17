import { useTranslations } from 'next-intl';
import UnhookAnalyzer from '@/components/unhook-analyzer';

export default function UnhookPage() {
  const t = useTranslations('UnhookPage');

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            {t('description')}
          </p>
        </div>
        <div className="mt-12">
          <UnhookAnalyzer />
        </div>
      </div>
    </main>
  );
} 