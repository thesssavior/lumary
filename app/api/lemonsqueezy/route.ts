import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY!;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!; // Set this in your .env

  // Fetch products, including their variants
  const response = await fetch(`https://api.lemonsqueezy.com/v1/products?filter[store_id]=${storeId}&include=variants`, {
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`,
    }
  });

  if (!response.ok) {
    // Log the error response for debugging
    const errorBody = await response.text();
    console.error(`Lemon Squeezy API Error (${response.status}):`, errorBody);
    return new Response(JSON.stringify({ error: 'Failed to fetch plans' }), { status: 500 });
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), { status: 200 });
} 