import Stripe from 'stripe';
import { loadStripe, Stripe as StripeClient } from '@stripe/stripe-js';

// Server-side Stripe instance (use only in API routes)
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-09-30.endive' as any,
    })
  : null;

// Client-side Stripe promise (lazy-loaded)
let stripePromise: Promise<StripeClient | null> | null = null;

export function getStripePromise(): Promise<StripeClient | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('Stripe publishable key not configured');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// Demo mode detection
export function isStripeDemoMode(): boolean {
  return !process.env.STRIPE_SECRET_KEY || 
         process.env.STRIPE_SECRET_KEY.includes('PLACEHOLDER') ||
         process.env.STRIPE_SECRET_KEY === '';
}
