"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function SuccessContent() {
  // const router = useRouter(); // Temporarily unused
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attendre un peu pour laisser les webhooks se traiter
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Processing your upgrade...</h1>
          <p className="text-gray-400">This will only take a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image src="/logo.png" alt="Saave logo" width={120} height={40} className="mx-auto" />
        </div>

        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Welcome to Saave Pro!
        </h1>
        
        <p className="text-gray-300 mb-8">
          Your upgrade was successful! You now have access to unlimited bookmarks and all Pro features.
        </p>

        {/* Features Summary */}
        <div className="bg-[#232526] border border-gray-700 rounded-lg p-6 mb-8 text-left">
          <h2 className="font-bold mb-4 text-center">What you get with Pro:</h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Unlimited bookmarks
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Advanced search & filters
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Priority customer support
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link 
            href="/app"
            className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-green-700 transition-colors"
          >
            Start Using Saave Pro
          </Link>
          
          {sessionId && (
            <p className="text-xs text-gray-500">
              Session ID: {sessionId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}