'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ExtensionSaveClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Preparing your save…');

  const url = useMemo(() => String(searchParams.get('url') || '').trim(), [searchParams]);
  // title is optional; kept for future improvements
  const title = useMemo(() => String(searchParams.get('title') || '').trim(), [searchParams]);

  useEffect(() => {
    (async () => {
      if (!url || !isValidHttpUrl(url)) {
        setStatus('error');
        setMessage('Invalid URL.');
        try {
          window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'invalid_url', url } }));
        } catch {}
        return;
      }

      // Store for /app auto-submit after auth
      try {
        sessionStorage.setItem('extensionBookmarkUrl', url);
        if (title) sessionStorage.setItem('extensionBookmarkTitle', title);
      } catch {}

      // Ask same-origin API if user is logged-in (no CORS issues here)
      try {
        const res = await fetch('/api/user/profile', { method: 'GET' });
        if (res.status === 401) {
          setMessage('Login required…');
          try {
            window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'login_required', url } }));
          } catch {}
          router.replace('/auth');
          return;
        }

        if (!res.ok) {
          setStatus('error');
          setMessage('Saave is temporarily unavailable.');
          try {
            window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'server_unavailable', url } }));
          } catch {}
          return;
        }

        // Logged-in: go to /app, it will pick sessionStorage and start the process.
        setMessage('Redirecting to your library…');
        router.replace('/app');
      } catch {
        setStatus('error');
        setMessage('Network error.');
        try {
          window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'network_error', url } }));
        } catch {}
      }
    })();
  }, [router, title, url]);

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md border border-gray-800 rounded-xl bg-[#232526] p-5">
        <div className="text-sm font-semibold">Saave</div>
        <div className="mt-2 text-sm text-gray-300">{message}</div>
        {status === 'error' && (
          <div className="mt-3 text-xs text-red-300">
            You can open <span className="text-red-200">saave.io/app</span> and try again.
          </div>
        )}
      </div>
    </div>
  );
}


