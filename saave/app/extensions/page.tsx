"use client";

import React from "react";

export default function ExtensionsPage() {
  const CRX_URL = "/saave-extension.zip"; // packaged zip you can serve from /public
  const INSTALL_HELP = "https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked";

  return (
    <div className="min-h-screen bg-[#181a1b] text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Install Saave Extension</h1>
        <p className="text-gray-300 mb-4">
          Add bookmarks from Chrome in one click. The process runs in the background; the web app is not opened.
        </p>
        <div className="bg-[#232526] border border-gray-700 rounded-xl p-5 mb-8">
          <h2 className="text-xl font-semibold mb-3">Chrome (Developer mode)</h2>
          <ol className="list-decimal pl-5 space-y-2 text-gray-300">
            <li>Download the packaged extension:
              <a className="text-green-400 underline ml-2" href={CRX_URL} download>Download saave-extension.zip</a>
            </li>
            <li>Unzip it locally.</li>
            <li>Open chrome://extensions and enable Developer mode.</li>
            <li>Click “Load unpacked” and select the unzipped folder (saave-extension).</li>
            <li>Pin Saave in the toolbar.</li>
          </ol>
          <p className="text-xs text-gray-400 mt-3">Need help? See
            <a className="text-green-400 underline ml-1" href={INSTALL_HELP} target="_blank" rel="noreferrer">Chrome’s guide</a>.
          </p>
        </div>

        <div className="bg-[#232526] border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-semibold mb-3">How it works</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-300">
            <li>Click the Saave icon on any page → a small toast appears “Saving page…”.</li>
            <li>Within ~1s, it switches to “Bookmark added”, and the full process runs server‑side.</li>
            <li>If you are not logged in, you’ll be prompted to login on /auth.</li>
            <li>No new tab is opened; everything is background.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


