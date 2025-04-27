'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

type Plan = {
  id: string;
  name: string;
  price: number; // Keep as number for sorting
  price_formatted: string; // Store formatted price for display
  description: string;
  buy_link: string;
  variant_id: string; // Add variant_id
};

export default function SubscriptionPlans() {
  const t = useTranslations('SubscriptionPlans');
  const locale = useLocale();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const handleCheckout = async (productId: string, variantId: string) => {
    setCheckingOutId(productId);
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, locale }),
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
    fetch('/api/lemonsqueezy')
      .then(res => res.json())
      .then(data => {
        // Lemon Squeezy API returns products in data.data and variants in data.included
        const variants = (data.included || []).filter((item: any) => item.type === 'variants');
        const formatted = data.data.map((product: any) => {
          // Find the first variant for this product
          const variant = variants.find((v: any) => v.attributes.product_id == product.id);
          return {
            id: product.id,
            name: product.attributes.name,
            price: product.attributes.price, // price is in cents
            price_formatted: product.attributes.price_formatted || `$${(product.attributes.price / 100).toFixed(2)}`,
            description: product.attributes.description || '',
            buy_link: product.attributes.buy_now_url,
            variant_id: variant ? variant.id : '',
          };
        });
        // Sort plans by price (ascending)
        formatted.sort((a: Plan, b: Plan) => a.price - b.price);
        setPlans(formatted);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading plans...</div>;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
      {plans.map(plan => (
        <div key={plan.id} className="border border-gray-200 p-6 rounded-lg shadow-sm bg-white flex flex-col h-full">
          <h3 className="font-semibold text-lg text-gray-800 mb-2">{plan.name}</h3>
          <p className="text-2xl font-bold text-gray-900 mb-3">{plan.price_formatted}</p>
          <div className="prose prose-sm text-gray-600 mb-4 flex-grow" dangerouslySetInnerHTML={{ __html: plan.description }} />
          <button
            onClick={() => handleCheckout(plan.id, plan.variant_id)}
            disabled={checkingOutId === plan.id}
            className="w-full bg-yellow-500 text-white font-bold py-2 px-4 rounded hover:bg-yellow-600 transition-colors duration-200 text-center block mt-auto"
          >
            {checkingOutId === plan.id ? t('loading') : t('subscribeButton')}
          </button>
        </div>
      ))}
    </div>
  );
} 