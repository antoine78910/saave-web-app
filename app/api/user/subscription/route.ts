import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Chercher le client par email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      // Utilisateur pas encore client Stripe = plan gratuit
      return NextResponse.json({
        plan: 'free',
        bookmarkLimit: 20,
        customerId: null,
      });
    }

    const customer = customers.data[0];
    
    // Récupérer les abonnements actifs du client
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      return NextResponse.json({
        plan: 'pro',
        bookmarkLimit: -1, // -1 = illimité
        customerId: customer.id,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      });
    }

    // Client existe mais pas d'abonnement actif = plan gratuit
    return NextResponse.json({
      plan: 'free',
      bookmarkLimit: 20,
      customerId: customer.id,
    });

  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}