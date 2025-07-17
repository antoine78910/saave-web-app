"use client";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl bg-[#232526] rounded-2xl shadow-lg p-8 flex flex-col gap-8 border border-gray-700">
        <h1 className="text-4xl font-bold mb-4">Hello antoine <span className="inline-block">👋</span></h1>
        <div className="bg-[#232526] rounded-xl border border-gray-700 p-6 mb-2">
          <div className="font-semibold mb-2">Name</div>
          <div className="text-gray-400 mb-2 text-sm">Display name on the app.</div>
          <input value="antoine" className="w-full bg-[#181a1b] border border-gray-700 rounded-lg px-4 py-2 text-white mb-2" readOnly />
          <button className="bg-accent text-white px-4 py-2 rounded-lg font-semibold float-right">Update</button>
        </div>
        <div className="bg-[#232526] rounded-xl border border-gray-700 p-6 mb-2">
          <div className="font-semibold mb-2">Email</div>
          <div className="text-gray-400 mb-2 text-sm">Change your email address.</div>
          <input value="anto.delbos@gmail.com" className="w-full bg-[#181a1b] border border-gray-700 rounded-lg px-4 py-2 text-white mb-2" readOnly />
          <button className="bg-accent text-white px-4 py-2 rounded-lg font-semibold float-right">Change Email</button>
        </div>
        <div className="bg-[#2a2324] rounded-xl border border-red-900 p-6">
          <div className="font-semibold text-red-400 mb-2">Danger</div>
          <div className="text-gray-400 mb-2 text-sm">Delete your account. After clicking the button, you will need to confirm the deletion via a link sent to your email.</div>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold float-right">Delete account</button>
        </div>
      </div>
    </div>
  );
}
