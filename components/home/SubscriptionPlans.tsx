'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check } from 'lucide-react';
import Image from 'next/image'; // Import Next.js Image component
import { useSession } from 'next-auth/react';

type Plan = {
  id: string; // Product ID
  name: string;
  price: number; // Price in cents
  price_formatted: string;
  description: string;
  buy_link: string; // Probably not needed if using custom checkout
  variant_id: string; // Variant ID
  interval: 'month' | 'week' | null; // Billing interval from variant
};

interface SubscriptionPlansProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionPlans({ isOpen, onClose }: SubscriptionPlansProps) {
  const t = useTranslations('SubscriptionPlans');
  const locale = useLocale();
  const [weeklyPlan, setWeeklyPlan] = useState<Plan | null>(null);
  const [monthlyPlan, setMonthlyPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly'>('weekly');
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Define VAT rate (e.g., 10% for KRW, adjust as needed)
  // TODO: Make this VAT rate configurable or fetch from an API if it varies.
  const VAT_RATE = 0.10;

  const handleCheckout = async (productId: string, variantId: string, userId: string) => {
    setCheckingOutId(variantId); // Track checkout by variantId
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, locale, userId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout error:', data.error);
        setCheckingOutId(null);
      }
    } catch (err) {
      console.error('Checkout exception:', err);
      setCheckingOutId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log("SubscriptionPlans useEffect triggered, isOpen:", isOpen);
      setLoading(true);
      setWeeklyPlan(null);
      setMonthlyPlan(null);
      fetch('/api/lemonsqueezy')
        .then(res => res.json())
        .then(data => {
          console.log("Lemon Squeezy API Data (Products with Variants):", JSON.stringify(data, null, 2));

          const products = data.data || [];
          const variants = data.included || [];
          console.log("All Variants:", JSON.stringify(variants, null, 2));

          let foundWeekly: Plan | null = null;
          let foundMonthly: Plan | null = null;

          variants.forEach((variant: any) => {
            if (variant.type !== 'variants') return;

            console.log(`Processing variant ${variant.id}, interval: ${variant.attributes.interval}`);

            const product = products.find((p: any) => p.type === 'products' && p.id == variant.attributes.product_id);
            if (!product) {
              console.warn(`Product details not found for variant ${variant.id}`);
              return;
            }

            const priceInWon = variant.attributes.price / 100;
            const formattedKoreanWon = priceInWon.toLocaleString('ko-KR', {
              style: 'currency',
              currency: 'KRW',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            });

            const planData: Plan = {
              id: product.id,
              name: product.attributes.name,
              price: variant.attributes.price,
              price_formatted: formattedKoreanWon,
              description: product.attributes.description || '',
              buy_link: '',
              variant_id: variant.id,
              interval: variant.attributes.interval,
            };

            if (variant.attributes.interval === 'week') {
              console.log(`Found weekly plan: ${variant.id} for product ${product.id}`);
              foundWeekly = planData;
            } else if (variant.attributes.interval === 'month') {
              console.log(`Found monthly plan: ${variant.id} for product ${product.id}`);
              foundMonthly = planData;
            }
          });

          console.log("Setting weeklyPlan:", foundWeekly);
          console.log("Setting monthlyPlan:", foundMonthly);
          setWeeklyPlan(foundWeekly);
          setMonthlyPlan(foundMonthly);
          setLoading(false);
        }).catch(err => {
            console.error("Error fetching plans:", err);
            setLoading(false);
        });
    }
  }, [isOpen]);

  const currentPlan = billingCycle === 'weekly' ? weeklyPlan : monthlyPlan;
  const planFeatures = t.raw('features'); // Get features array

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center my-4">
           <div className="inline-flex bg-gray-100 p-1 rounded-full">
               <button
                   onClick={() => setBillingCycle('weekly')}
                   className={`px-4 py-1 rounded-full text-sm font-medium transition-colors duration-150 ${billingCycle === 'weekly' ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
               >
                   {t('weekly')}
               </button>
               <button
                   onClick={() => setBillingCycle('monthly')}
                   className={`px-4 py-1 rounded-full text-sm font-medium transition-colors duration-150 ${billingCycle === 'monthly' ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
               >
                   {t('monthly')}
               </button>
           </div>
        </div>

        <div className="py-4">
          {loading ? (
            <div>{t('loadingPlans')}</div>
          ) : !currentPlan ? (
            <div>Plan not available for selected cycle.</div> // Handle case where plan isn't found
          ) : (
            // Display only the selected plan
            <div key={currentPlan.variant_id} className="border border-gray-200 p-6 rounded-lg shadow-sm bg-white flex flex-col md:flex-row gap-6">
              {/* Left Column */}
              <div className="flex flex-col w-full md:w-1/3">
                 <div className="flex items-center mb-4">
                   <Image
                      src="/lumary.png" // Assuming logo2.png is in the /public directory
                      alt="Lumary Logo"
                      width={48} // Adjust size as needed
                      height={48}
                      className="mr-3 rounded-md" // Add margin and potentially rounded corners
                    />
                     <div>
                        <h3 className="font-semibold text-xl text-gray-800">{currentPlan.name}</h3>
                     </div>
                 </div>
                 <p className="text-sm text-gray-600 mb-4 flex-grow">
                   Get access to all features and benefits of the app. No limits, no restrictions.
                 </p>
                 <p className="text-3xl font-bold text-gray-900 mb-1">{currentPlan.price_formatted}
                    <span className="text-sm font-normal text-gray-500">
                       {billingCycle === 'weekly' ? t('pricePerWeekVat') : t('pricePerMonthVat')}
                    </span>
                 </p>
                 <button
                  onClick={() => handleCheckout(currentPlan.id, currentPlan.variant_id, userId ?? '')}
                  disabled={checkingOutId === currentPlan.variant_id}
                  className="w-full bg-gray-900 text-white font-bold py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200 text-center block mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkingOutId === currentPlan.variant_id ? t('loading') : t('subscribeButton')}
                    {checkingOutId !== currentPlan.variant_id && <span aria-hidden="true">→</span>}
                 </button>
              </div>

              {/* Right Column (Feature List) */}
              <div className="w-full md:w-2/3">
                <h4 className="font-medium text-gray-700 mb-3">{t('featureListTitle')}</h4>
                <ul className="space-y-2">
                   {/* Use translated features */}
                   {Array.isArray(planFeatures) ? planFeatures.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  )) : <li className="text-red-500">Error: Features not loaded correctly.</li>}
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 