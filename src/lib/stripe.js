// src/lib/stripe.js
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

export const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Price IDs from Stripe Dashboard
export const PRICES = {
  monthly: process.env.REACT_APP_STRIPE_PRICE_MONTHLY,
  annual:  process.env.REACT_APP_STRIPE_PRICE_ANNUAL,
  local:   process.env.REACT_APP_STRIPE_PRICE_LOCAL,
  boost:   process.env.REACT_APP_STRIPE_PRICE_BOOST,
  pro:     process.env.REACT_APP_STRIPE_PRICE_PRO,
};

// ── Subscription checkout ────────────────────────────────────
// This calls a Supabase Edge Function that creates a Stripe session
export const startSubscription = async (priceKey, userId) => {
  const priceId = PRICES[priceKey];
  if (!priceId) throw new Error('Invalid price key: ' + priceKey);

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      priceId,
      userId,
      successUrl: window.location.origin + '/dashboard?subscribed=1',
      cancelUrl:  window.location.origin + '/dashboard?cancelled=1',
    },
  });
  if (error) throw error;

  const stripe = await stripePromise;
  const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
  if (stripeError) throw stripeError;
};

// ── Ad campaign payment ──────────────────────────────────────
export const payForCampaign = async (campaignData, userId) => {
  const priceId = PRICES[campaignData.package_id];
  if (!priceId) throw new Error('Invalid package');

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      priceId,
      userId,
      metadata: { type: 'campaign', ...campaignData },
      successUrl: window.location.origin + '/dashboard?campaign=success',
      cancelUrl:  window.location.origin + '/dashboard?campaign=cancelled',
    },
  });
  if (error) throw error;

  const stripe = await stripePromise;
  await stripe.redirectToCheckout({ sessionId: data.sessionId });
};

// ── Subscription status ──────────────────────────────────────
export const checkSubscription = (profile) => {
  if (!profile) return false;
  if (!profile.subscribed) return false;
  if (!profile.sub_until) return profile.subscribed;
  return new Date(profile.sub_until) > new Date();
};
