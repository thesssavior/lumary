// app/api/webhooks/lemonsqueezy/route.ts
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient'; // Adjust path if needed

const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

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

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      let userEmail = attributes?.user_email;
      const planName = attributes?.variant_name || attributes?.product_name; 
      const status = attributes?.status;

      if (!userEmail || !planName) {
        return new Response('Missing user email or plan name.', { status: 400 });
      }

      userEmail = userEmail.toLowerCase().trim();

      const activeStatuses = ['active', 'on_trial', 'paused', 'past_due'];
      const planToUpdate = activeStatuses.includes(status) ? planName : 'free';

      const { error, data } = await supabase
        .from('users')
        .update({ plan: planToUpdate })
        .eq('email', userEmail)
        .select();

      if (error) {
      } else {
      }
    } 
    else if (eventName === 'subscription_cancelled' || eventName === 'subscription_payment_failed' ) {
        const userEmail = attributes?.user_email;
        if (!userEmail) {
             return new Response('Missing user email.', { status: 400 });
        }

        console.log(`Processing ${eventName} for ${userEmail}. Setting plan to 'free'`);

        const { error } = await supabase
        .from('users')
        .update({ plan: 'free' }) 
        .eq('email', userEmail);

         if (error) {
            console.error(`Supabase error updating plan to 'free' for ${userEmail}:`, error.message);
        } else {
            console.log(`Successfully updated plan for ${userEmail} to 'free'`);
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