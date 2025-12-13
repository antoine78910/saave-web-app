import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    const host = request.nextUrl.hostname || '';
    const isLocalhost = host === 'localhost' || /\.localhost$/i.test(host);
    const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);
    const shouldUseStripe = hasStripe && !isLocalhost && process.env.NODE_ENV === 'production';
    const isProd = process.env.NODE_ENV === 'production' && !isLocalhost;

    // Optional production override: PRO_EMAILS="a@b.com,c@d.com"
    const proEmails = String(process.env.PRO_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    console.log(`🔧 GET /api/user/subscription - Email: ${email} | host=${host} | stripe=${shouldUseStripe}`);
    
    if (!email || email === 'No email') {
      console.log('📧 Email invalide, retour subscription par défaut');
      return NextResponse.json({
        subscription_type: 'free',
        subscription_status: 'active',
        bookmarks_limit: 20,
        bookmarks_count: 0,
        plan: 'free',
        bookmarkLimit: 20,
        dev_mode: false
      });
    }

    // Prod override first (useful when Stripe isn't configured yet)
    if (isProd && proEmails.includes(String(email).toLowerCase())) {
      return NextResponse.json({
        plan: 'pro',
        bookmarkLimit: -1,
        customerId: null,
        subscriptionId: null,
        subscriptionStatus: 'active',
        subscription_type: 'pro',
        subscription_status: 'active',
        bookmarks_limit: -1,
        dev_mode: false,
        override: 'PRO_EMAILS',
      }, { status: 200 });
    }

    // --- PROD MODE (Stripe) ---
    if (shouldUseStripe) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const customers = await stripe.customers.list({ email, limit: 1 });
        const customer = customers.data?.[0] || null;
        if (!customer) {
          return NextResponse.json({
            plan: 'free',
            bookmarkLimit: 20,
            customerId: null,
            subscriptionId: null,
            subscriptionStatus: 'none',
            dev_mode: false,
          }, { status: 200 });
        }
        const customerId = customer.id;
        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
        const downgradeStatuses = new Set(['canceled', 'incomplete_expired']);
        const best = subs.data?.find(s => !downgradeStatuses.has(s.status)) || null;
        const status = best?.status || 'none';
        const isPro = Boolean(best && !downgradeStatuses.has(status));
        return NextResponse.json({
          plan: isPro ? 'pro' : 'free',
          bookmarkLimit: isPro ? -1 : 20,
          customerId,
          subscriptionId: best?.id || null,
          subscriptionStatus: status,
          // compat fields used elsewhere in the app
          subscription_type: isPro ? 'pro' : 'free',
          subscription_status: status,
          bookmarks_limit: isPro ? -1 : 20,
          dev_mode: false,
        }, { status: 200 });
      } catch (e) {
        console.warn('⚠️ Stripe subscription lookup failed, falling back to dev mode:', e);
        // Fallthrough to dev-mode logic below
      }
    }

    // In production without Stripe config, do NOT use dev json fallbacks
    if (isProd && !shouldUseStripe) {
      console.warn('⚠️ Stripe not configured in production; returning free plan');
      return NextResponse.json({
        plan: 'free',
        bookmarkLimit: 20,
        customerId: null,
        subscriptionId: null,
        subscriptionStatus: 'none',
        subscription_type: 'free',
        subscription_status: 'none',
        bookmarks_limit: 20,
        dev_mode: false,
        misconfigured: 'STRIPE_SECRET_KEY',
      }, { status: 200 });
    }
    
    // Compter les vrais bookmarks de l'utilisateur
    let userBookmarksCount = 0;
    try {
      const BOOKMARKS_FILE = join(process.cwd(), 'dev-bookmarks.json');
      if (existsSync(BOOKMARKS_FILE)) {
        const data = readFileSync(BOOKMARKS_FILE, 'utf8');
        const allBookmarks = JSON.parse(data);
        userBookmarksCount = allBookmarks.filter((bookmark: any) => 
          bookmark.user_id === 'dev-user-123'
        ).length;
      }
    } catch (error) {
      console.warn('⚠️ Erreur lecture bookmarks pour comptage:', error);
    }

    // Charger un éventuel plan forcé en dev depuis un fichier local
    const SUBS_FILE = join(process.cwd(), 'dev-subscriptions.json');
    let forcedPlan: 'free' | 'pro' = 'free';
    let lastStatus: string | null = null;
    if (existsSync(SUBS_FILE)) {
      try {
        const subsRaw = readFileSync(SUBS_FILE, 'utf8');
        const subs = JSON.parse(subsRaw) as Record<string, { plan: 'free' | 'pro'; status?: string | null }>;
        const record = subs[email];
        if (record && (record.plan === 'pro' || record.plan === 'free')) {
          forcedPlan = record.plan;
          lastStatus = record.status ?? null;
        }
      } catch (e) {
        console.warn('⚠️ Erreur lecture dev-subscriptions.json:', e);
      }
    }

    // Treat any non-canceled/expired status as Pro to avoid flicker in dev
    const nonProDowngrade = new Set(['canceled', 'incomplete_expired']);
    const isPro = forcedPlan === 'pro' || (lastStatus && !nonProDowngrade.has(lastStatus));
    const mockSubscription = {
      subscription_type: isPro ? 'pro' : 'free',
      subscription_status: isPro ? (lastStatus || 'active') : (lastStatus || 'active'),
      bookmarks_limit: isPro ? -1 : 20, // compat API
      bookmarks_count: userBookmarksCount,
      plan: isPro ? 'pro' : 'free', // frontend
      bookmarkLimit: isPro ? -1 : 20, // hook
      dev_mode: true
    };
    
    console.log('✅ Subscription simulée retournée:', mockSubscription);
    
    return NextResponse.json(mockSubscription, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('❌ Erreur subscription:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch subscription (dev mode)',
        subscription_type: 'free',
        subscription_status: 'active',
        bookmarks_limit: 20,
        bookmarks_count: 0,
        plan: 'free',
        bookmarkLimit: 20,
        dev_mode: true
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim();
    const plan = String(body?.plan || 'free').toLowerCase() as 'free' | 'pro';
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    if (plan !== 'free' && plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const SUBS_FILE = join(process.cwd(), 'dev-subscriptions.json');
    let subs: Record<string, { plan: 'free' | 'pro' }> = {};
    if (existsSync(SUBS_FILE)) {
      try {
        subs = JSON.parse(readFileSync(SUBS_FILE, 'utf8')) || {};
      } catch {
        subs = {};
      }
    }
    subs[email] = { plan };
    writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf8');

    return NextResponse.json({ ok: true, email, plan });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}