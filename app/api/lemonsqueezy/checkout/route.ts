export const runtime = 'nodejs';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { productId, variantId, locale } = await req.json();
  const apiKey = process.env.LEMONSQUEEZY_API_KEY!;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!;
  const baseUrl = process.env.NEXTAUTH_URL!; // e.g. https://yourdomain.com
  const returnUrl = `${baseUrl}/${locale}/payment/success`;

  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          product_options: {
            redirect_url: returnUrl,
            enabled_variants: [],
          },
          checkout_options: {
            embed: true,
          },
          checkout_data: {
            name: "홍길동",
            billing_address: {
              country: "KR",
            },
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: storeId }
          },
          variant: {
            data: { type: 'variants', id: variantId }
          }
        }
      }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Lemon Squeezy API Error:", errorData);
    return new Response(JSON.stringify({ error: errorData.error || 'Failed to create checkout session' }), { status: 500 });
  }

  const data = await response.json();
  const url = data.data.attributes.url;
  return new Response(JSON.stringify({ url }), { status: 200 });
} 