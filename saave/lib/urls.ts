// Centralized helpers for building absolute URLs for site and app
// Uses env vars when available, with sensible fallbacks in dev
export function getSiteBaseUrl(): string {
  const envSite = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || '';
  if (envSite) return envSite;
  // Avoid window on server
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function getAppBaseUrl(): string {
  const envApp = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
  if (envApp) return envApp;

  // Browser-aware fallbacks
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const normalizedPort = port ? `:${port}` : '';

    // If already on app subdomain, keep origin
    if (/^app\./i.test(hostname)) {
      return `${protocol}//${hostname}${normalizedPort}`.replace(/\/+$/, '');
    }

    // Dev: map localhost → app.localhost
    if (hostname === 'localhost' || /\.localhost$/i.test(hostname)) {
      return `${protocol}//app.localhost${normalizedPort}`;
    }

    // Prod fallback: same apex → app.saave.io
    if (/\.saave\.io$/i.test(hostname)) {
      return `https://app.saave.io`;
    }

    // Generic fallback: path-based
    return `${window.location.origin.replace(/\/+$/, '')}/app`;
  }

  // Server-side fallback
  const siteBase = getSiteBaseUrl();
  if (siteBase) return `${siteBase}/app`;
  return '/app';
}

function join(base: string, path?: string): string {
  if (!path || path === '/') return base;
  const b = base.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

export function getAppUrl(path?: string): string {
  return join(getAppBaseUrl(), path);
}

export function getSiteUrl(path?: string): string {
  return join(getSiteBaseUrl(), path);
}


