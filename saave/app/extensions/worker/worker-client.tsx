'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ExtensionWorkerClient() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Saving…');

  const url = useMemo(() => String(searchParams.get('url') || '').trim(), [searchParams]);

  useEffect(() => {
    (async () => {
      if (!url || !isValidHttpUrl(url)) {
        setMessage('Invalid URL');
        try {
          window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'invalid_url', url } }));
        } catch {}
        return;
      }

      // Make sure user is logged-in (same-origin, so cookie auth works)
      try {
        const profile = await fetch('/api/user/profile', { method: 'GET' });
        if (profile.status === 401) {
          setMessage('Login required');
          try {
            window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'login_required', url } }));
          } catch {}
          return;
        }
      } catch {
        setMessage('Network error');
        try {
          window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'network_error', url } }));
        } catch {}
        return;
      }

      try {
        const res = await fetch('/api/bookmarks/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        // Duplicate
        if (res.status === 409) {
          setMessage('Already saved');
          try {
            window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'duplicate', url } }));
          } catch {}
          return;
        }

        // Not logged-in
        if (res.status === 401) {
          setMessage('Login required');
          try {
            window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'login_required', url } }));
          } catch {}
          return;
        }

        // Free limit reached (we use 402/403 or explicit body errors elsewhere)
        if (res.status === 402 || res.status === 403) {
          setMessage('Upgrade required');
          try {
            window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'limit_reached', url } }));
          } catch {}
          return;
        }

        if (!res.ok) {
          let text = '';
          try { text = await res.text(); } catch {}
          setMessage('Failed');
          try {
            window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: text || 'error', url } }));
          } catch {}
          return;
        }

        // Started: notify extension immediately
        setMessage('Started');
        try {
          window.dispatchEvent(new CustomEvent('saave:add-started', { detail: { url } }));
        } catch {}

        // Close the worker tab shortly after.
        setTimeout(() => {
          try { window.close(); } catch {}
        }, 250);
      } catch (e: any) {
        setMessage('Network error');
        try {
          window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'network_error', url } }));
        } catch {}
      }
    })();
  }, [url]);

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md border border-gray-800 rounded-xl bg-[#232526] p-5">
        <div className="text-sm font-semibold">Saave</div>
        <div className="mt-2 text-sm text-gray-300">{message}</div>
        <div className="mt-3 text-xs text-gray-500">This tab will close automatically.</div>
      </div>
    </div>
  );
}


