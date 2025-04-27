import SubscriptionPlans from '@/components/SubscriptionPlans';
import { useTranslations } from 'next-intl';

export default function PaymentPage() {
  const t = useTranslations('PaymentPage');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-16 px-4">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-3 text-gray-800">{t('title')}</h1>
        <p className="mb-8 text-gray-600 text-center">
          {t('description_line1')}<br />
          {t('description_line2')}
        </p>
        <SubscriptionPlans />
      </div>
    </div>
  );
} 