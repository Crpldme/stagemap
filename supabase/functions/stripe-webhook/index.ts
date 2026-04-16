// supabase/functions/stripe-webhook/index.ts
// Deploy with: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  switch (event.type) {
    // ── Subscription activated ───────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id;
      if (!userId) break;

      const isSubscription = session.mode === 'subscription';
      if (isSubscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const plan = sub.items.data[0].price.id === Deno.env.get('STRIPE_PRICE_ANNUAL')
          ? 'annual' : 'monthly';
        const until = new Date(sub.current_period_end * 1000).toISOString();

        await supabase.from('profiles').update({
          subscribed: true,
          sub_plan: plan,
          sub_until: until,
          stripe_customer_id: session.customer,
        }).eq('id', userId);
      } else {
        // One-time campaign payment — activate campaign
        const meta = session.metadata;
        if (meta?.type === 'campaign') {
          await supabase.from('campaigns').insert({
            user_id: userId,
            package_id: meta.package_id,
            event_title: meta.event_title,
            city: meta.city,
            genre: meta.genre,
            budget: Number(meta.budget),
            platforms: JSON.parse(meta.platforms || '["stagemap"]'),
            status: 'active',
            stripe_payment_id: session.payment_intent,
          });
        }
      }
      break;
    }

    // ── Subscription cancelled ───────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.from('profiles')
        .update({ subscribed: false, sub_plan: null, sub_until: null })
        .eq('stripe_customer_id', sub.customer);
      break;
    }

    // ── Subscription renewed ─────────────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const until = new Date(sub.current_period_end * 1000).toISOString();
        await supabase.from('profiles')
          .update({ sub_until: until })
          .eq('stripe_customer_id', invoice.customer);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
