import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    // Vérifier que Stripe est configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Créer l'instance Stripe après avoir vérifié que la clé existe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { email, yearly } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Déterminer le plan
    const isYearly = yearly === true;
    const priceIdMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
    const priceIdYearly = process.env.STRIPE_PRICE_ID_YEARLY;
    const envPriceId = isYearly ? priceIdYearly : priceIdMonthly;
    const unitAmount = isYearly ? 6000 : 900; // fallback $60/an ou $9/mois en centimes
    const interval = isYearly ? 'year' : 'month';

    // Créer une session de checkout Stripe
    const base: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [],
      mode: 'subscription',
      customer_email: email,
      allow_promotion_codes: true,
      // Force http on localhost to avoid https->http callback mismatch during dev
      success_url: `${(request.nextUrl.hostname === 'localhost' || /\.localhost$/.test(request.nextUrl.hostname)) ? `http://${request.nextUrl.host}` : request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${(request.nextUrl.hostname === 'localhost' || /\.localhost$/.test(request.nextUrl.hostname)) ? `http://${request.nextUrl.host}` : request.nextUrl.origin}/upgrade?canceled=true`,
      metadata: {
        email,
        plan: isYearly ? 'yearly' : 'monthly',
      },
    };

    if (envPriceId) {
      base.line_items = [{ price: envPriceId, quantity: 1 }];
    } else {
      base.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Saave Pro ${isYearly ? 'Yearly' : 'Monthly'}`,
            description: `Unlimited bookmarks and premium features - ${isYearly ? 'Annual' : 'Monthly'} billing`,
          },
          unit_amount: unitAmount,
          recurring: {
            interval: interval,
          },
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(base);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}