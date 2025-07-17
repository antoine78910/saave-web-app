"use client";
import { useState } from "react";
import ContextMenu from "../../components/ContextMenu";

export default function UpgradePage() {
  const [yearly, setYearly] = useState(true);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleDelete = () => {
    console.log("Delete action");
  };

  const handleCopyLink = () => {
    console.log("Copy Link action");
  };

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl bg-[#232526] rounded-2xl shadow-lg p-8 flex flex-col items-center border border-gray-700" style={{ position: 'relative' }}>
        {/* Bouton d'action */}
        <button
          onClick={handleMenuClick}
          style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22 }}
          aria-label="Actions"
        >
          &#8942;
        </button>
        {/* Menu contextuel */}
        {showMenu && menuPosition && (
          <ContextMenu
            x={menuPosition.x}
            y={menuPosition.y}
            onDelete={handleDelete}
            onCopyLink={handleCopyLink}
            onClose={() => setShowMenu(false)}
          />
        )}
        <h1 className="text-3xl font-bold mb-2 text-accent">Upgrade to Pro</h1>
        <p className="mb-6 text-gray-300 text-center">Unlock all features and save your links without limits.</p>
        <div className="flex items-center gap-2 mb-8">
          <span className={!yearly ? "text-accent font-semibold" : "text-gray-400"}>Monthly</span>
          <button
            className={`w-12 h-6 rounded-full bg-gray-700 flex items-center transition px-1 ${yearly ? 'justify-end' : 'justify-start'}`}
            onClick={() => setYearly(y => !y)}
            aria-label="Toggle billing period"
          >
            <span className="w-5 h-5 rounded-full bg-accent transition" />
          </button>
          <span className={yearly ? "text-accent font-semibold" : "text-gray-400"}>Yearly</span>
        </div>
        <div className="w-full flex flex-col items-center">
          <div className="text-5xl font-bold mb-2">
            {yearly ? "$5" : "$9"}
            <span className="text-lg font-normal text-gray-400"> /mo</span>
          </div>
          <div className="mb-6 text-gray-400 text-sm">
            {yearly ? "Billed yearly ($60 total)" : "Billed monthly ($9/month)"}
          </div>
          <button className="bg-accent px-8 py-3 rounded-xl text-lg font-semibold text-white shadow hover:bg-accent/90 transition w-full max-w-xs">
            Upgrade now
          </button>
        </div>
      </div>
    </div>
  );
}
