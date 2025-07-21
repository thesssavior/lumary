// app/api/webhooks/lemonsqueezy/route.ts
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient';

const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

/**
 * Subscription statuses that should retain premium access.
 * "cancelled" = user turned off auto‑renew but is still inside a grace period.
 */
const PREMIUM_STATUSES = ['active', 'on_trial', 'paused', 'past_due', 'cancelled'];

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('Lemon Squeezy Webhook Secret not set in environment variables.');
    return new Response('Webhook Secret not configured.', { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const calculatedDigest = hmac.update(rawBody).digest('hex');
    const signatureHeader = req.headers.get('X-Signature') || '';
    // Convert hex digests to Uint8Array for timingSafeEqual compatibility
    const trustedBuf = Buffer.from(calculatedDigest, 'hex');
    const untrustedBuf = Buffer.from(signatureHeader, 'hex');
    const trusted = new Uint8Array(trustedBuf);
    const untrusted = new Uint8Array(untrustedBuf);

    if (trusted.length !== untrusted.length || !crypto.timingSafeEqual(trusted, untrusted)) {
      return new Response('Invalid signature.', { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventName = event.meta?.event_name;
    const attributes = event.data?.attributes;
    const customData = event.meta?.custom_data ?? {};  // ✅ right place
    const userIdFromWebhook = customData?.user_id; // Extract user_id from custom_data

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      let userEmail = attributes?.user_email;
      const status = attributes?.status;
      const variantId = attributes?.variant_id;
      const productName = attributes?.product_name; // Get product name

      if (!userIdFromWebhook && !userEmail) {
        console.warn('Webhook received without user_id *or* user_email.', event.data);
        return new Response('Missing user identifier.', { status: 400 });
      }
        
      userEmail = userEmail.toLowerCase().trim();

      // Determine the plan based on status - use 'premium' for active subscriptions
      const planToUpdate = PREMIUM_STATUSES.includes(status) ? 'premium' : 'free';

      console.log(`Webhook: Updating plan. Event: ${eventName}, Status: ${status}, Variant: ${variantId}, Product: ${productName}, UserID: ${userIdFromWebhook || 'N/A'}, Email: ${userEmail || 'N/A'}`);

      let query = supabase.from('users').update({ plan: planToUpdate });

      if (userIdFromWebhook) {
        query = query.eq('id', userIdFromWebhook);
        console.log(`Updating plan for user ID: ${userIdFromWebhook} to '${planToUpdate}'.`);
      } else if (userEmail) {
        query = query.eq('email', userEmail.toLowerCase().trim());
        console.log(`Updating plan for email: ${userEmail} to '${planToUpdate}'.`);
      } else {
        console.warn('Webhook received without user_id or user_email.', event.data);
        return new Response('Missing user identifier.', { status: 400 });
      }
      
      const { error, data } = await query.select();

      if (error) {
        console.error(`Supabase error updating plan:`, error.message);
      } else {
        console.log(`Successfully updated plan.`);
      }
    } 
    else if ( eventName === 'subscription_payment_failed' || eventName === 'subscription_expired' ) {
      let userEmail = attributes?.user_email;
      // const userIdFromWebhook is already defined above

      if (!userIdFromWebhook && !userEmail) {
            console.warn('Webhook received without user_id or user_email for cancellation/failure.', event.data);
            return new Response('Missing user identifier.', { status: 400 });
      }

      console.log(`Processing ${eventName}. UserID: ${userIdFromWebhook || 'N/A'}, Email: ${userEmail || 'N/A'}. Setting plan to 'free'`);
      
      let query = supabase.from('users').update({ plan: 'free' });

      if (userIdFromWebhook) {
        query = query.eq('id', userIdFromWebhook);
      } else if (userEmail) {
        // Ensure email is defined before using it
        query = query.eq('email', userEmail!.toLowerCase().trim());
      }
      // No need for an else here, as the initial check for !userIdFromWebhook && !userEmail covers it.


      const { error } = await query;

        if (error) {
          console.error(`Supabase error updating plan to 'free':`, error.message);
      } else {
          console.log(`Successfully updated plan to 'free'`);
      }
    }
    
    else {
      console.log(`Received unhandled Lemon Squeezy event: ${eventName}`);
    }

    return new Response('Webhook received successfully.', { status: 200 });

  } catch (error: any) {
    console.error('Error processing Lemon Squeezy webhook:', error.message);
    return new Response(`Webhook error: ${error.message}`, { status: 400 });
  }
}