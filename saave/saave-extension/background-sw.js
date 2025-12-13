// Extension configuration (Chrome Web Store friendly)
const DEFAULT_PROD_BASE = 'https://saave.io';

// Variable pour stocker le port du popup actuel (pour les mises à jour d'étapes)
let currentPopupPort = null;
// Mémoriser l'onglet source (où afficher le toast de progression)
let lastSourceTabId = null;
// Fallback: succès si aucun événement n'arrive à temps
let pendingSuccessTimer = null;
// Anti double-click + cancel polling
let savingLockUntil = 0;
let cancelRequested = false;
let activeSaveUrl = null;

// Handle extension icon click - show notification and save bookmark
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🎯🎯🎯 EXTENSION ICON CLICKED 🎯🎯🎯');
  console.log('Tab ID:', tab.id);
  console.log('Tab URL:', tab.url);
  console.log('Tab Title:', tab.title);
  console.log('⏰ Timestamp:', new Date().toISOString());

  // Store the tab info for saving
  lastSourceTabId = tab.id;
  activeSaveUrl = tab.url || null;
  cancelRequested = false;

  // Helper to show toast in content script (inject if needed)
  const sendNotification = async (action, text) => {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'saave:toast',
        action: action,
        text: text
      });
      return true;
    } catch (err) {
      // Content script not loaded, inject it first
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
        // Wait a bit for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 50));
        await chrome.tabs.sendMessage(tab.id, {
          type: 'saave:toast',
          action: action,
          text: text
        });
        return true;
      } catch (injectErr) {
        console.error('❌ Failed to inject and send notification:', injectErr);
        return false;
      }
    }
  };

  // 0) Toujours afficher "Saving page..." immédiatement (avant tout réseau)
  await sendNotification('start', 'Saving page...');

  // Fallback UX: si aucune erreur après 2.5s, afficher "Bookmark added" (sans attendre les checks)
  try { if (pendingSuccessTimer) clearTimeout(pendingSuccessTimer); } catch {}
  pendingSuccessTimer = setTimeout(async () => {
    if (cancelRequested) return;
    console.log('⏳ EXTENSION: Fallback success (no error after 2.5s) -> Bookmark added');
    try { await sendNotification('success', 'Bookmark added'); } catch {}
    try { showNotification('Saave', 'Bookmark added ✓'); } catch {}
  }, 2500);

  // Anti double-click: if user clicks multiple times, keep showing loader but don't restart
  const now = Date.now();
  if (now < savingLockUntil) {
    console.log('⛔ EXTENSION: Click ignored (saving lock active)');
    return;
  }
  savingLockUntil = now + 2500; // 2.5s lock window

  // Trigger bookmark save via a Saave same-origin worker page (backend call with cookies; no /app redirect)
  console.log('💾 Starting bookmark save via Saave worker...');
  try {
    await handleSaveBookmarkFromPopup(tab.url, tab.title, () => {});
  } catch (e) {
    // handleSaveBookmarkFromPopup already reports errors
  }
});

// Gestionnaire de messages du popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message reçu dans background:', message);
  
  if (message.action === 'saveBookmark') {
    handleSaveBookmarkFromPopup(message.url, message.title, sendResponse);
    return true; // Indique que la réponse sera asynchrone
  }
  
  if (message.action === 'clearCache') {
    clearUserCache().then(result => {
      sendResponse({ success: result });
    });
    return true;
  }
  
  // CTA requests from the toast content-script
  if (message && message.type === 'saave:open') {
    const target = String(message.target || '');
    (async () => {
      const { base } = await resolveSaaveBase();
      if (target === 'upgrade') {
        await chrome.tabs.create({ url: `${base}/upgrade`, active: true });
      } else {
        await chrome.tabs.create({ url: `${base}/auth`, active: true });
      }
    })().catch(() => {
      chrome.tabs.create({ url: `${DEFAULT_PROD_BASE}/${message.target === 'upgrade' ? 'upgrade' : 'auth'}`, active: true }).catch(() => {});
    });
    sendResponse({ ok: true });
    return true;
  }

  // Messages de l'app Saave (depuis l'onglet /app)
  if (message.type === 'bookmarkStarted') {
    console.log('✅ [EXT] Bookmark started notification from app:', message.id);
    // Annuler le fallback timer car on a reçu une vraie notification
    if (pendingSuccessTimer) {
      clearTimeout(pendingSuccessTimer);
      pendingSuccessTimer = null;
    }
    // Notifier le popup
    sendStepUpdateToPopup('started');
    // Envoyer notification Chrome
    showNotification('Saave', 'Bookmark saved ✅');
    sendResponse({ received: true });
    return true;
  }

  // Cancel signal relayed from webapp (BookmarkCard dispatches saave:add-error with message 'cancelled')
  if (message.type === 'saave:add-error' && (message.detail?.message === 'cancelled' || message.detail?.error === 'cancelled')) {
    console.log('🛑 EXTENSION: Cancel received from app, stopping polling and hiding notification');
    cancelRequested = true;
    // Stop any pending fallback success
    if (pendingSuccessTimer) {
      try { clearTimeout(pendingSuccessTimer); } catch {}
      pendingSuccessTimer = null;
    }
    if (lastSourceTabId) {
      try {
        // NOTE: onMessage listener is not async; don't use await here.
        sendToastToTab(lastSourceTabId, 'error', 'Bookmark cancelled')
          .then((ok) => console.log('📤 EXTENSION: sent cancel toast =>', ok))
          .catch(() => {});
      } catch {}
    }
    try { if (currentPopupPort) currentPopupPort.postMessage({ type: 'error', error: 'cancelled' }); } catch {}
    try { showNotification('Saave', 'Bookmark cancelled'); } catch {}
    sendResponse({ received: true });
    return true;
  }

  // Generic progress from saave.io tab content-script
  if (message.type === 'saave:add-started' || message.type === 'saave:add-finished') {
    // Stop fallback timer
    if (pendingSuccessTimer) {
      try { clearTimeout(pendingSuccessTimer); } catch {}
      pendingSuccessTimer = null;
    }
    if (lastSourceTabId) {
      sendToastToTab(lastSourceTabId, 'success', 'Bookmark saved')
        .then(() => {})
        .catch(() => {});
    }
    try { showNotification('Saave', 'Bookmark saved ✅'); } catch {}
    sendResponse({ received: true });
    return true;
  }

  if (message.type === 'saave:add-error') {
    const msg = String(message.detail?.message || message.detail?.error || '');
    if (pendingSuccessTimer) {
      try { clearTimeout(pendingSuccessTimer); } catch {}
      pendingSuccessTimer = null;
    }
    if (lastSourceTabId) {
      if (msg === 'login_required') {
        sendToastToTab(lastSourceTabId, 'login', 'Login to Saave to save', { target: 'login', buttonText: 'Login' })
          .then(() => {})
          .catch(() => {});
      } else if (msg === 'limit_reached') {
        sendToastToTab(lastSourceTabId, 'upgrade', 'Free plan limit reached (20). Upgrade to Pro.', { target: 'upgrade', buttonText: 'Upgrade' })
          .then(() => {})
          .catch(() => {});
      } else if (msg === 'duplicate') {
        sendToastToTab(lastSourceTabId, 'duplicate', 'Already saved')
          .then(() => {})
          .catch(() => {});
      } else {
        sendToastToTab(lastSourceTabId, 'error', msg || 'Failed to save')
          .then(() => {})
          .catch(() => {});
      }
    }
    try { showNotification('Saave', msg ? `Error: ${msg}` : 'Error'); } catch {}
    sendResponse({ received: true });
    return true;
  }
});

// Gestionnaire de connexion pour le popup
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    currentPopupPort = port;
    console.log('🔗 Popup connecté');
    
    port.onDisconnect.addListener(() => {
      currentPopupPort = null;
      console.log('🔌 Popup déconnecté');
    });
  }
});

// Fonction pour envoyer une mise à jour d'étape au popup
function sendStepUpdateToPopup(step) {
  if (currentPopupPort) {
    currentPopupPort.postMessage({
      type: 'stepUpdate',
      step: step
    });
  } else {
    // Fallback si pas de connexion directe
    chrome.runtime.sendMessage({
      type: 'stepUpdate',
      step: step
    }).catch(() => {
      // Ignore les erreurs si le popup n'est pas ouvert
    });
  }
  console.log(`📡 Étape envoyée au popup: ${step}`);
}

// Fonction pour envoyer une erreur au popup
function sendErrorToPopup(error) {
  if (currentPopupPort) {
    currentPopupPort.postMessage({
      type: 'error',
      error: error
    });
  } else {
    chrome.runtime.sendMessage({
      type: 'error',
      error: error
    }).catch(() => {});
  }
  console.log(`❌ Erreur envoyée au popup: ${error}`);
}

// Fonction pour envoyer le succès au popup
function sendSuccessToPopup() {
  if (currentPopupPort) {
    currentPopupPort.postMessage({
      type: 'success'
    });
  } else {
    chrome.runtime.sendMessage({
      type: 'success'
    }).catch(() => {});
  }
  console.log('✅ Succès envoyé au popup');
}

// Fonction utilitaire pour vider le cache utilisateur
async function clearUserCache() {
  try {
    await chrome.storage.local.remove(['saave_user']);
    console.log('🧹 Cache utilisateur vidé');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du vidage du cache:', error);
    return false;
  }
}

// Gestionnaire de sauvegarde de bookmark depuis le popup
async function handleSaveBookmarkFromPopup(url, title, sendResponse) {
  try {
    const safeUrl = String(url || '').trim();
    if (!safeUrl) throw new Error('Missing URL');
    try { new URL(safeUrl); } catch { throw new Error('Invalid URL'); }

    const { base } = await resolveSaaveBase();
    const workerUrl = `${base}/extensions/worker?url=${encodeURIComponent(safeUrl)}&title=${encodeURIComponent(String(title || ''))}`;
    await chrome.tabs.create({ url: workerUrl, active: false });

    // Immediate response: the webapp will handle login/quota and will notify the extension via content-script events.
    try { sendResponse({ success: true, started: true }); } catch {}
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde popup:', error);
    sendErrorToPopup(error.message);
    sendResponse({ success: false, error: error.message });
  }
}

async function resolveSaaveBase() {
  try {
    const stored = await chrome.storage.local.get(['saave_api_base']);
    const v = String(stored?.saave_api_base || '').trim();
    if (v) return { base: v.replace(/\/$/, ''), mode: 'stored', port: null };
  } catch {}
  return { base: DEFAULT_PROD_BASE, mode: 'default', port: null };
}

// NOTE: We intentionally avoid calling Saave APIs from the extension service worker.
// Auth/quota is handled by the Saave webapp itself (same-origin), via /extensions/worker?url=...

// Fonction pour afficher les notifications
function showNotification(title, message) {
  const safeTitle = String(title || 'Saave');
  const safeMessage = String(message || '');
  const icon = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL('icons/icon48.png')
    : undefined;
  try {
    if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.create) {
      chrome.notifications.create(`saave-${Date.now()}`, {
        type: 'basic',
        title: safeTitle,
        message: safeMessage,
        iconUrl: icon || 'icon.png'
      });
      return;
    }
  } catch (err) {}
  try {
    if (self && self.registration && self.registration.showNotification) {
      self.registration.showNotification(safeTitle, {
        body: safeMessage,
        icon: icon,
      });
    }
  } catch (err2) {
    console.warn('Notification fallback failed:', err2);
  }
}

// Helper: reliably message content script; if not present, inject then retry
async function sendToastToTab(tabId, action, text, extra = {}) {
  const payload = { type: 'saave:toast', action, text, ...(extra && typeof extra === 'object' ? extra : {}) };
  try {
    await chrome.tabs.sendMessage(tabId, payload);
    return true;
  } catch (err) {
    try {
      try {
        await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
      } catch {}
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      await chrome.tabs.sendMessage(tabId, payload);
      return true;
    } catch (err2) {
      console.warn('sendToastToTab failed:', err2);
      return false;
    }
  }
}

// NOTE: Legacy onClicked handler removed.
// We use the single handler defined at the top of this file to avoid double runs and stale errors.

// NOTE: only one onMessage listener is used (defined above) to avoid double handling.

// Gestionnaire de clic sur les notifications
if (chrome.notifications && chrome.notifications.onClicked) {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    if (notificationId.startsWith('saave-login-required') || notificationId.startsWith('saave-open-login')) {
      try {
        const { base } = await resolveSaaveBase();
        await chrome.tabs.create({ url: `${base}/auth`, active: true });
      } catch {
        await chrome.tabs.create({ url: 'https://saave.io/auth', active: true });
      }
    }
  });
}

// Initialisation (service worker lifecycle)
self.addEventListener('activate', () => {
  console.log('🔧 Saave service worker active');
});


