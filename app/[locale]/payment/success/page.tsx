'use client';
import { CheckCircle, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PaymentSuccess() {
  const t = useTranslations('PaymentSuccess');
  const { data: session, update } = useSession();
  const [plan, setPlan] = useState(session?.user?.plan);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session?.user?.email && plan === 'free') {
      interval = setInterval(async () => {
        try {
            const res = await fetch(`/api/user/plan?email=${session.user.email}`);
            if (!res.ok) {
                console.error("Failed to fetch plan status:", res.status);
                return; 
            }
            const { plan: latestPlan } = await res.json();
            console.log("Fetched plan:", latestPlan);
            if (latestPlan && latestPlan !== 'free') {
              setPlan(latestPlan);
              await update();
              clearInterval(interval);
              setLoading(false);
            }
        } catch (error) {
            console.error("Error polling for plan status:", error);
        }
      }, 3000);
    } else {
      setLoading(false);
    }
    return () => clearInterval(interval);
  }, [session, plan, update]);

  const isPremium = plan && plan !== 'free';
  const displayPlanName = isPremium ? t('planPremium') : t('planFree');
  const isLoadingPlan = loading && !isPremium;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
      <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      
      <div className="mb-8">
          <p className="text-lg text-gray-600 mb-2">
              {t('statusLabel')} <span className="font-semibold text-gray-800">{displayPlanName}</span>
          </p>
          {isLoadingPlan ? (
            <p className="text-yellow-600 animate-pulse">{t('statusUpdating')}</p>
          ) : isPremium ? (
            <p className="text-green-600">{t('statusActive')}</p>
          ) : (
            <p className="text-gray-500">Your plan is currently {displayPlanName}.</p>
          )}
      </div>

      <Button
        size="lg"
        className="bg-black hover:bg-zinc-800 text-white"
        onClick={() => router.push(`/${locale}`)}
      >
        <Plus className="w-5 h-5 mr-2" /> {t('newSummaryButton')}
      </Button>
    </div>
  );
}
