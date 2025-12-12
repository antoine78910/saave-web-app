"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../src/hooks/useAuth";
import { useSubscription } from "../../src/hooks/useSubscription";
import { supabase } from "../../lib/supabase-client";

export default function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const userEmail = user?.email || null;
  const { subscription, loading: subLoading } = useSubscription(userEmail);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/user/profile?user_id=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setDisplayName(data?.display_name || "");
        }
      } catch {}
    };
    loadProfile();
  }, [user?.id]);

  const planLabel = useMemo(() => {
    if (subLoading) return "...";
    const isPro = (subscription?.plan === 'pro') || (subscription?.bookmarkLimit === -1);
    return isPro ? "Pro" : "Free";
  }, [subscription?.plan, subscription?.bookmarkLimit, subLoading]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, display_name: displayName }),
      });
      if (!res.ok) throw new Error("Failed to save");
      // Notify useAuth to update local display name
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("userProfileUpdated", { detail: { display_name: displayName } }));
      }
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (e) {
      setSaveMsg("Error");
      setTimeout(() => setSaveMsg(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    window.location.href = "/upgrade";
  };

  const handleManageSubscription = async () => {
    try {
      if (!subscription?.customerId) return;
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: subscription.customerId })
      });
      if (!response.ok) throw new Error('Failed to open portal');
      const { url } = await response.json();
      window.location.href = url || 'https://billing.stripe.com/p/session';
    } catch (e) {
      console.error('Error opening billing portal:', e);
      // Fallback link if API not configured
      window.location.href = 'https://billing.stripe.com/p/session';
    }
  };

  const handleChangeEmail = async () => {
    if (!changingEmail) {
      setChangingEmail(true);
      setNewEmail(user?.email || "");
      return;
    }
    if (!newEmail || newEmail === user?.email) {
      setChangingEmail(false);
      return;
    }
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMsg("Check your inbox to confirm the change");
      setChangingEmail(false);
      setTimeout(() => setEmailMsg(null), 4000);
    } catch (e) {
      setEmailMsg("Failed to start email change");
      setTimeout(() => setEmailMsg(null), 2500);
    }
  };

  const handleDelete = async () => {
    if (!user?.id) return;
    if (confirmText.toLowerCase() !== "delete") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (!res.ok) throw new Error("Delete failed");
      await signOut();
      window.location.href = "/auth";
    } catch (e) {
      setDeleting(false);
      alert("Failed to delete account. Please try again.");
    }
  };

  if (authLoading) return <div className="p-6">Loading...</div>;
  if (!user) return <div className="p-6">Please sign in.</div>;

  return (
    <div className="min-h-screen bg-[#181a1b] text-white px-6 py-10">
      <div className="max-w-3xl mx-auto relative">
        {subscription?.plan === 'pro' && (
          <div className="absolute -top-4 right-0 inline-flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow" aria-label="Saave Pro">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 4l2.6 4.2L20 8l-4 3-1 5-3-2-3 2-1-5-4-3 5.4-.8L12 4z" />
            </svg>
            <span>Pro</span>
          </div>
        )}
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 tracking-tight flex items-center gap-3">
          <span>
            Hello {(displayName || user.display_name || (user.email?.split("@")[0] ?? "there"))}
          </span>
          <span className="inline-block">👋</span>
        </h1>

        <div className="grid gap-6">
          <section className="bg-[#202223] border border-gray-700 rounded-xl p-5">
            <h2 className="text-lg font-medium mb-1">Name</h2>
            <p className="text-sm text-gray-400 mb-3">Display name on the app.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full px-3 py-2 rounded-md bg-[#1a1c1d] border border-gray-700 text-gray-200 outline-none focus:border-gray-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                >{saving ? "Saving..." : "Update"}</button>
                {saveMsg && <span className="text-sm text-gray-400">{saveMsg}</span>}
              </div>
            </div>
          </section>

          <section className="bg-[#202223] border border-gray-700 rounded-xl p-5">
            <h2 className="text-lg font-medium mb-1">Email</h2>
            <p className="text-sm text-gray-400 mb-3">Email address for your account.</p>
            <div className="space-y-3">
              <input
                value={changingEmail ? newEmail : (user.email || '')}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={!changingEmail}
                className="w-full px-3 py-2 rounded-md bg-[#1a1c1d] border border-gray-700 text-gray-200 outline-none focus:border-gray-500 disabled:opacity-80"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleChangeEmail}
                  className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white"
                >{changingEmail ? "Save Email" : "Change Email"}</button>
                {changingEmail && (
                  <button
                    onClick={() => { setChangingEmail(false); setNewEmail(""); }}
                    className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15"
                  >Cancel</button>
                )}
                {emailMsg && <span className="text-sm text-gray-400">{emailMsg}</span>}
              </div>
            </div>
          </section>

          <section className="bg-[#202223] border border-gray-700 rounded-xl p-5">
            <h2 className="text-lg font-medium mb-1">Subscription</h2>
            <p className="text-sm text-gray-400 mb-3">Your current plan and billing.</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-300">Current plan</div>
                <div className="text-base flex items-center gap-2">
                  {planLabel}
                  {subscription?.plan === 'pro' && (
                    <span className="inline-flex items-center gap-1 text-green-500 text-xs font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <title>Saave Pro</title>
                        <path d="M12 3l2.5 4.5L20 5l-2 6-6-2-6 2-2-6 5.5 2.5L12 3zM4 19a1 1 0 011-1h14a1 1 0 110 2H5a1 1 0 01-1-1z" />
                      </svg>
                      Pro
                    </span>
                  )}
                </div>
              </div>
              {subscription?.plan === 'pro' ? (
                <button
                  onClick={handleManageSubscription}
                  className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                    <path d="M12 3l2.5 4.5L20 5l-2 6-6-2-6 2-2-6 5.5 2.5L12 3zM4 19a1 1 0 011-1h14a1 1 0 110 2H5a1 1 0 01-1-1z" />
                  </svg>
                  Manage subscription
                </button>
              ) : null}
            </div>
          </section>

          <section className="bg-[#241f20] border border-red-900/40 rounded-xl p-5">
            <h2 className="text-lg font-medium mb-2 text-red-400">Delete account</h2>
            <p className="text-sm text-red-300 mb-3">This action is irreversible. All your bookmarks will be permanently deleted.</p>
            <div className="space-y-3">
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3 py-2 rounded-md bg-[#1a1c1d] border border-gray-700 text-gray-200 outline-none focus:border-gray-500"
              />
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText.toLowerCase() !== "delete"}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >{deleting ? "Deleting..." : "Delete my account"}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


