"use client";
import { useState } from "react";

export default function UpgradePage() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8 items-start justify-center">
        {/* Colonne gauche : features */}
        <div className="flex-1 flex flex-col gap-7 min-w-[260px]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Never lose an important link again.</h1>
          <p className="text-gray-300 mb-2 text-lg">Save it now—find it in seconds, whether it&apos;s an article, video, post, or tool.</p>
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
                <span className="text-green-400 text-[11px] font-bold mb-0.5">-45%</span>
                <div className="flex gap-1 bg-[#181a1b] rounded-full p-1">
                  <button className={`px-3 py-1 rounded-full text-xs font-semibold transition ${!yearly ? 'bg-accent text-white' : 'text-gray-400'}`} onClick={() => setYearly(false)}>Monthly</button>
                  <button className={`px-3 py-1 rounded-full text-xs font-semibold transition ${yearly ? 'bg-accent text-white' : 'text-gray-400'}`} onClick={() => setYearly(true)}>Yearly</button>
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
            <button className="bg-accent px-8 py-3 rounded-xl text-lg font-semibold text-white shadow hover:bg-accent/90 transition w-full">Upgrade</button>
          </div>
        </div>
      </div>
    </div>
  );
}
