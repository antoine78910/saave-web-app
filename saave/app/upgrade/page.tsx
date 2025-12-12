"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from '@stripe/stripe-js';
import { useSubscription } from "../../src/hooks/useSubscription";
import { useAuth } from "../../src/hooks/useAuth";
import { getAppUrl } from "../../lib/urls";

// Initialiser Stripe 
// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!); // Temporarily unused

export default function UpgradePage() {
  const [yearly, setYearly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userEmail = user?.email || null;
  const { subscription, loading: subscriptionLoading } = useSubscription(userEmail);

  // Si l'utilisateur est déjà Pro, rediriger vers l'app (via effet pour éviter setState pendant render)
  useEffect(() => {
    if (subscription?.plan === 'pro') {
      router.replace(getAppUrl('/'));
    }
  }, [subscription?.plan, router]);

  const handleUpgrade = async () => {
    if (!userEmail) {
      try { if (typeof window !== 'undefined') sessionStorage.setItem('redirectAfterAuth', '/upgrade'); } catch {}
      router.push('/auth');
      return;
    }
    setLoading(true);
    
    try {
      // Créer une session de checkout
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          yearly: yearly, // Envoyer l'information du plan choisi
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Rediriger vers Stripe Checkout
      window.location.href = url;
      
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-sync after auth return
  useEffect(() => {
    if (!userEmail) return;
    try {
      const key = 'redirectAfterAuth';
      const pending = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
      if (pending === '/upgrade') {
        sessionStorage.removeItem(key);
        // Trigger sync silently
        (async () => {
          setSyncing(true);
          setSyncMsg('Syncing your plan...');
          try {
            const res = await fetch('/api/user/subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmail, plan: 'pro' })
            });
            if (!res.ok) {
              const text = await res.text();
              setSyncMsg(`Sync failed (${res.status}). ${text || ''}`);
              setSyncing(false);
              return;
            }
            // Verify server now returns pro
            const verify = await fetch(`/api/user/subscription?email=${encodeURIComponent(userEmail)}`);
            const data = await verify.json();
            if (data?.plan === 'pro' || data?.bookmarkLimit === -1) {
              setSyncMsg('Plan synced. Redirecting...');
              router.push(getAppUrl('/'));
              return;
            }
            setSyncMsg('Sync completed, but plan still appears as Free. Please refresh /app.');
          } catch (e) {
            setSyncMsg('Sync error. Please retry.');
          } finally {
            setSyncing(false);
          }
        })();
      }
    } catch {}
  }, [userEmail, router]);

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8 items-start justify-center">
        {/* Colonne gauche : features */}
        <div className="flex-1 flex flex-col gap-7 min-w-[260px]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Never lose an important link again.</h1>
          <p className="text-gray-300 mb-2 text-lg">Saave.io —find it in seconds, whether it&apos;s an article, video, post, or tool.</p>
          <ul className="flex flex-col gap-4 mt-4">
            <li className="flex items-start gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <span className="font-semibold">Instant capture</span><br />
                <span className="text-gray-400 text-sm">Paste any URL and it&apos;s safely stored—no friction.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">🤖</span>
              <div>
                <span className="font-semibold">AI summaries</span><br />
                <span className="text-gray-400 text-sm">Get the key takeaways of articles and videos without reopening them.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">🏷️</span>
              <div>
                <span className="font-semibold">Auto-tagging</span><br />
                <span className="text-gray-400 text-sm">Your library organizes itself—no folders, no mess.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">🔎</span>
              <div>
                <span className="font-semibold">Advanced AI Search</span><br />
                <span className="text-gray-400 text-sm">Type an idea; our AI will always find the most relevant, guaranteed.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">🖼️</span>
              <div>
                <span className="font-semibold">Visual previews</span><br />
                <span className="text-gray-400 text-sm">Thumbnails and screenshots help you spot what you need at a glance.</span>
              </div>
            </li>
          </ul>
        </div>
        {/* Colonne droite : pricing card */}
        <div className="flex-1 max-w-md w-full">
          <div className="bg-[#232526] rounded-2xl shadow-lg border border-gray-700 flex flex-col p-7">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg"><span className="text-white">Saave</span><span className="text-accent">.pro</span></span>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-[#181a1b] rounded-full p-1 relative">
                    <button className={`px-3 py-1 rounded-full text-xs font-semibold transition ${!yearly ? 'bg-accent text-white' : 'text-gray-400'}`} onClick={() => setYearly(false)}>Monthly</button>
                    <button className={`px-3 py-1 rounded-full text-xs font-semibold transition ${yearly ? 'bg-accent text-white' : 'text-gray-400'} relative`} onClick={() => setYearly(true)}>
                      Yearly
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                        -45%
                      </span>
                    </button>
                  </div>
                  {yearly && (
                    <span className="bg-gradient-to-r from-green-500 to-green-400 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-sm whitespace-nowrap">
                      💰 Best Deal
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-gray-300 mb-4">Become a Saave.pro member in one simple subscription.</div>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-bold">${yearly ? '5' : '9'}</span>
              <span className="text-base text-gray-400 font-normal">/month</span>
              {yearly && <span className="ml-2 text-green-400 text-sm font-bold">5 month free !</span>}
            </div>
            <div className="text-gray-400 text-sm mb-5">Billed {yearly ? 'annually' : 'monthly'}.</div>
            <ul className="flex flex-col gap-2 mb-6">
              <li className="flex items-center gap-2 text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Unlimited bookmarks
              </li>
              <li className="flex items-center gap-2 text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Unlimited exports
              </li>
              <li className="flex items-center gap-2 text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Priority support
              </li>
              <li className="flex items-center gap-2 text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Support of a creator
              </li>
            </ul>
            <button 
              onClick={handleUpgrade}
              disabled={loading || subscriptionLoading}
              className="bg-accent px-8 py-3 rounded-xl text-lg font-semibold text-white shadow hover:bg-accent/90 transition w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Upgrade'}
            </button>
            <button
              onClick={async () => {
                try {
                  if (!userEmail) {
                    try { if (typeof window !== 'undefined') sessionStorage.setItem('redirectAfterAuth', '/upgrade'); } catch {}
                    router.push('/auth');
                    return;
                  }
                  setSyncing(true);
                  setSyncMsg('Syncing your plan...');
                  const res = await fetch('/api/user/subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, plan: 'pro' })
                  });
                  if (!res.ok) {
                    const text = await res.text();
                    setSyncMsg(`Sync failed (${res.status}). ${text || ''}`);
                    setSyncing(false);
                    return;
                  }
                  // Verify server now returns pro
                  const verify = await fetch(`/api/user/subscription?email=${encodeURIComponent(userEmail)}`);
                  const data = await verify.json();
                  if (data?.plan === 'pro' || data?.bookmarkLimit === -1) {
                    setSyncMsg('Plan synced. Redirecting...');
                    router.push(getAppUrl('/'));
                    return;
                  }
                  setSyncMsg('Sync completed, but plan still appears as Free. Please refresh /app.');
                } catch {
                  setSyncMsg('Sync error. Please retry.');
                } finally {
                  setSyncing(false);
                }
              }}
              className="mt-3 w-full px-8 py-2 rounded-md border border-gray-600 text-sm text-gray-300 hover:bg-white/5 transition"
            >
              I already upgraded – sync my plan
            </button>
            {syncMsg && (
              <div className="mt-2 text-xs text-gray-400">{syncMsg}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
