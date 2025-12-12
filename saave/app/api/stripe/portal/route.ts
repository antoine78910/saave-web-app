import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAppBaseUrl } from '../../../../lib/urls';

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

    const { customerId } = await request.json();

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Créer une session du portail de facturation
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppBaseUrl()}/`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}