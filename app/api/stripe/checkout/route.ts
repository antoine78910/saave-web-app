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

    // Déterminer le prix et l'intervalle selon le plan choisi
    const isYearly = yearly === true;
    const unitAmount = isYearly ? 6000 : 900; // $60/an ou $9/mois en centimes
    const interval = isYearly ? 'year' : 'month';

    // Créer une session de checkout Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
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
        },
      ],
      mode: 'subscription',
      customer_email: email,
      success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/upgrade?canceled=true`,
      metadata: {
        email,
        plan: isYearly ? 'yearly' : 'monthly',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}