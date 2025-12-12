import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    // Vérifier que Stripe est configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Webhook secret is not configured. Please set STRIPE_WEBHOOK_SECRET environment variable.' },
        { status: 500 }
      );
    }

    // Créer l'instance Stripe après avoir vérifié que la clé existe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Helper: persist plan/customer/subscription in dev file
    const SUBS_FILE = join(process.cwd(), 'dev-subscriptions.json');
    const writeDevSub = (email: string, update: { plan?: 'free' | 'pro'; customerId?: string | null; subscriptionId?: string | null; status?: string | null; }) => {
      try {
        let subs: Record<string, any> = {};
        if (existsSync(SUBS_FILE)) {
          try { subs = JSON.parse(readFileSync(SUBS_FILE, 'utf8')) || {}; } catch {}
        }
        const current = subs[email] || {};
        subs[email] = { ...current, ...update };
        // Default bookmarkLimit derived in GET; keep file minimal
        writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf8');
      } catch (e) {
        console.warn('⚠️ Failed to write dev-subscriptions.json:', e);
      }
    };

    // Gérer les différents types d'événements
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);
        
        // Ici, tu pourrais sauvegarder l'information de subscription dans ta base de données
        // Par exemple, mettre à jour le statut de l'utilisateur à "pro"
        const customerEmail = session.customer_email || session.metadata?.email;
        
        if (customerEmail) {
          const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id || null;
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id || null;
          writeDevSub(customerEmail, { plan: 'pro', customerId, subscriptionId, status: 'active' });
          console.log(`✅ Marked ${customerEmail} as pro (dev)`);
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription created:', subscription.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);
        try {
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id || null;
          // Attempt to fetch customer to get email if not present in event
          let email: string | null = null;
          try {
            const customer = await (new Stripe(process.env.STRIPE_SECRET_KEY!)).customers.retrieve(customerId as string);
            email = (customer as any)?.email || null;
          } catch {}
          if (email) {
            const status = subscription.status;
            // Avoid transient downgrades: keep pro unless explicitly canceled/expired
            const downgradeStatuses = new Set(['canceled', 'incomplete_expired']);
            const plan: 'pro' | 'free' = downgradeStatuses.has(status) ? 'free' : 'pro';
            writeDevSub(email, { plan, customerId, subscriptionId: subscription.id, status });
          }
        } catch {}
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', subscription.id);
        try {
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id || null;
          let email: string | null = null;
          try {
            const customer = await (new Stripe(process.env.STRIPE_SECRET_KEY!)).customers.retrieve(customerId as string);
            email = (customer as any)?.email || null;
          } catch {}
          if (email) {
            writeDevSub(email, { plan: 'free', customerId, subscriptionId: subscription.id, status: subscription.status });
          }
        } catch {}
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}