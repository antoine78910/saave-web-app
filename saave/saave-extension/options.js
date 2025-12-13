const DEFAULT_BASE = 'https://saave.io';

function normalizeBase(v) {
  const raw = String(v || '').trim();
  if (!raw) return DEFAULT_BASE;
  return raw.replace(/\/$/, '');
}

async function ensureOptionalHostPermission(base) {
  try {
    const u = new URL(base);
    if (u.hostname !== 'localhost') return true;
    const origin = `${u.protocol}//${u.host}/*`;
    const ok = await chrome.permissions.request({ origins: [origin] });
    return Boolean(ok);
  } catch {
    return false;
  }
}

async function load() {
  const { saave_api_base } = await chrome.storage.local.get(['saave_api_base']);
  const input = document.getElementById('apiBase');
  input.value = normalizeBase(saave_api_base || DEFAULT_BASE);
}

async function save() {
  const input = document.getElementById('apiBase');
  const status = document.getElementById('status');
  const base = normalizeBase(input.value);

  // If user points to localhost, request optional host permission.
  const ok = await ensureOptionalHostPermission(base);
  if (!ok) {
    status.textContent = 'Permission denied (localhost).';
    return;
  }

  await chrome.storage.local.set({ saave_api_base: base });
  status.textContent = 'Saved.';
  setTimeout(() => (status.textContent = ''), 1200);
}

async function reset() {
  const input = document.getElementById('apiBase');
  const status = document.getElementById('status');
  input.value = DEFAULT_BASE;
  await chrome.storage.local.set({ saave_api_base: DEFAULT_BASE });
  status.textContent = 'Reset.';
  setTimeout(() => (status.textContent = ''), 1200);
}

document.addEventListener('DOMContentLoaded', () => {
  load().catch(() => {});
  document.getElementById('save').addEventListener('click', () => save().catch(() => {}));
  document.getElementById('reset').addEventListener('click', () => reset().catch(() => {}));
});


