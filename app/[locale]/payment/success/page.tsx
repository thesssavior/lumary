'use client';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentSuccess() {
  const { data: session, update } = useSession();
  const [plan, setPlan] = useState(session?.user?.plan);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const locale = useLocale();
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session?.user?.email) {
      interval = setInterval(async () => {
        const res = await fetch(`/api/user/plan?email=${session.user.email}`);
        const { plan: latestPlan } = await res.json();
        if (latestPlan && latestPlan !== plan) {
          setPlan(latestPlan);
          await update(); // Refresh the session
          clearInterval(interval);
          setLoading(false);
        }
      }, 2000); // Poll every 2 seconds
    } else {
      setLoading(false);
    }
    return () => clearInterval(interval);
  }, [session, plan, update]);

  return (
    <div className="max-w-lg mx-auto py-16 text-center">
      <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
      <p className="mb-2">Your plan: <span className="font-mono">{plan}</span></p>
      {loading || plan === 'free' ? (
        <p className="text-yellow-600">Updating your plan...</p>
      ) : (
        <p className="text-green-600">Your subscription is now active!</p>
      )}
        <button
        className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium hover:bg-green-200"
        onClick={() => router.push(`/${locale}`)}
        >
        <Plus className="inline w-4 h-4 mr-1" /> 새로운 요약
        </button>
    </div>
  );
}
