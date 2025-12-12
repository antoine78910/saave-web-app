"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useAuth } from "../src/hooks/useAuth";
import { useSubscription } from "../src/hooks/useSubscription";
import UserMenu from "./UserMenu";

const AppTopBar: React.FC = () => {
  const { user, signOut } = useAuth();
  const userEmail = user?.email || null;
  const { subscription, loading: subscriptionLoading } = useSubscription(userEmail);

  return (
    <nav className="w-full sticky top-0 z-50 bg-[#181a1b] border-b border-gray-800 flex items-center px-4 h-14 mb-4">
      <Link href="/" className="flex items-center select-none">
        <div className="relative h-8 w-28">
          <Image src="/logo.png" alt="Saave logo" fill priority className="object-contain" />
        </div>
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {!user && (
          <Link
            href="/auth"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-[#232526] shadow-xs hover:bg-accent hover:text-white h-8 px-3 border-accent text-accent font-bold"
          >
            Sign In
          </Link>
        )}

        

        {user && subscription?.plan === "pro" && (
          <button
            onClick={async () => {
              if (subscription?.customerId) {
                try {
                  const response = await fetch("/api/stripe/portal", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ customerId: subscription.customerId }),
                  });
                  if (response.ok) {
                    const { url } = await response.json();
                    window.location.href = url;
                  }
                } catch (err) {
                  console.error("Error opening billing portal:", err);
                }
              }
            }}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-green-600 shadow-xs hover:bg-green-700 text-white h-8 px-3 font-bold"
          >
            Billing
          </button>
        )}

        {user && (
          <UserMenu 
            userEmail={userEmail || "No email"} 
            displayName={user?.display_name} 
            onSignOut={signOut}
            isPro={subscription?.plan === 'pro'}
          />
        )}
      </div>
    </nav>
  );
};

export default AppTopBar;


