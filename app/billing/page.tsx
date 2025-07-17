"use client";

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl bg-[#232526] rounded-2xl shadow-lg p-8 flex flex-col items-center border border-gray-700">
        <h1 className="text-3xl font-bold mb-4 text-accent">Billing</h1>
        <p className="mb-6 text-gray-300 text-center">Manage your subscription and payment details here.</p>
        <div className="w-full bg-[#181a1b] rounded-xl border border-gray-700 p-6 mb-2">
          <div className="font-semibold mb-2">Current Plan</div>
          <div className="text-gray-400 mb-2 text-sm">Pro (Monthly)</div>
        </div>
        <div className="w-full bg-[#181a1b] rounded-xl border border-gray-700 p-6 mb-2">
          <div className="font-semibold mb-2">Payment Method</div>
          <div className="text-gray-400 mb-2 text-sm">Visa **** 4242</div>
        </div>
        <button className="bg-accent text-white px-4 py-2 rounded-lg font-semibold mt-4">Update Payment</button>
      </div>
    </div>
  );
}
