// Configuration de l'API Saave
// Ports à vérifier (incluant le port par défaut 5000)
const API_PORTS = [5000, 3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

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

  // Trigger bookmark save
  console.log('💾 Starting bookmark save...');
  handleSaveBookmarkFromPopup(tab.url, tab.title, async (response) => {
    console.log('📥📥📥 SAVE RESPONSE RECEIVED 📥📥📥');
    console.log('Response:', JSON.stringify(response, null, 2));

    // Show error notification ONLY (success is handled by step1 detection watch)
    if (response && response.error) {
      console.log('❌ Error detected:', response.error);
      if (pendingSuccessTimer) {
        try { clearTimeout(pendingSuccessTimer); } catch {}
        pendingSuccessTimer = null;
      }
      if (response.error === 'duplicate') {
        console.log('📤 Sending DUPLICATE notification...');
        await sendNotification('duplicate', 'Already saved');
      } else {
        console.log('📤 Sending ERROR notification...');
        await sendNotification('error', response.error);
      }
    } else if (response && response.started) {
      console.log('⏳ Process started, waiting for completion...');
      console.log('⏳ SUCCESS will be shown when step1 is detected in /api/bookmarks');
      // Ne rien faire ici - le succès sera affiché par waitForBookmarkAddedStep1
    } else {
      // Ancien comportement pour fallback
      console.log('✅ Success! Sending SUCCESS notification...');
      if (pendingSuccessTimer) {
        try { clearTimeout(pendingSuccessTimer); } catch {}
        pendingSuccessTimer = null;
      }
      await sendNotification('success', 'Bookmark saved!');
    }
  });
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
    console.log('🚀 EXTENSION: Début handleSaveBookmarkFromPopup avec URL:', url);
    console.log('🚀 EXTENSION: Title:', title);
    console.log('⏳ EXTENSION: status=Saving page… (spinner visible)');

    // NOTE: le toast "Saving page..." est envoyé dès le clic (onClicked). Ne pas le renvoyer ici.
    try {
      if (currentPopupPort) {
        currentPopupPort.postMessage({ type: 'progress', step: 'scraping' });
      } else {
        chrome.runtime.sendMessage({ type: 'progress', step: 'scraping' }).catch(() => {});
      }
    } catch {}
    
    // Trouver le port Saave actif
    const port = await findActiveSaavePort();
    console.log('🔌 EXTENSION: Port Saave trouvé:', port);
    
    // Obtenir l'utilisateur connecté (pour vérifier qu'il est connecté)
    const user = await getCurrentUser(port);
    console.log('👤 EXTENSION: Utilisateur trouvé:', user);
    if (!user) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          await sendToastToTab(activeTab.id, 'login', `http://localhost:${port}/auth`);
        }
      } catch {}
      showNotification('Saave', 'Please login to save bookmarks');
      sendResponse({ success: false, error: 'login_required' });
      return;
    }
    
    console.log('📤 EXTENSION: Injection directe de l\'URL dans la webapp...');
    
    // Validation de l'URL
    try {
      new URL(url.trim());
    } catch {
      throw new Error('L\'URL saisie n\'est pas reconnue comme valide.');
    }

    // 1. Obtenir le nombre de bookmarks AVANT de lancer le process
    console.log('📊 EXTENSION: Getting current bookmark count...');
    const initialCount = await getBookmarkCount(port, user.id);
    console.log(`📊 EXTENSION: Initial bookmark count: ${initialCount}`);

    // NOTE: le "Saving page..." est déjà envoyé immédiatement depuis onClicked()

    // Vérifier (et lancer) le process via l'API, puis suivre la progression
    try {
      const processResponse = await fetch(`http://localhost:${port}/api/bookmarks/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), user_id: user.id, source: 'extension' })
      });

      const processText = await processResponse.text();
      let processData;
      try { processData = JSON.parse(processText); } catch {}

      // Si c'est un doublon, retourner l'erreur immédiatement
      if (processResponse.status === 409 || processData?.duplicate) {
        console.log('⚠️ EXTENSION: Duplicate detected (already saved)');
        sendResponse({ success: false, error: 'duplicate' });
        showNotification('Saave', 'Ce site est déjà dans votre bibliothèque');
        return;
      }

      // Erreurs d'accès ou quota
      if (processResponse.status === 401) {
        console.log('❌ EXTENSION: Non connecté');
        sendResponse({ success: false, error: 'login_required' });
        showNotification('Saave', 'Connectez-vous pour sauvegarder');
        return;
      }
      if (processResponse.status === 402 || processResponse.status === 403 || processData?.limit) {
        console.log('⚠️ EXTENSION: Limite atteinte (free plan)');
        sendResponse({ success: false, error: 'limit_reached' });
        showNotification('Saave', 'Limite atteinte — passez en Pro');
        return;
      }

      // Si lancé correctement, attendre l'étape 1 (apparition de la carte loading) puis afficher "Bookmark saved"
      if (processResponse.ok || processResponse.status === 202) {
        console.log('📡 EXTENSION: Process démarré avec succès!');
        console.log('⏱️ EXTENSION: Waiting for step1 appearance in /api/bookmarks to show "Bookmark saved"');

        // Répondre immédiatement (process lancé)
        sendResponse({ success: true, started: true, immediate: false });

        // Surveiller l'apparition de la carte (loading/scraping) en arrière-plan (step 1)
        waitForBookmarkAddedStep1(port, user.id, url.trim(), 30000).then(async (result) => {
          if (cancelRequested) {
            console.log('🛑 EXTENSION: Poll aborted (cancelRequested=true)');
            return;
          }
          if (result && result.ok) {
            console.log('✅✅✅ EXTENSION: Step1 detected, showing "Bookmark saved"');
            // Stop fallback timer
            if (pendingSuccessTimer) {
              try { clearTimeout(pendingSuccessTimer); } catch {}
              pendingSuccessTimer = null;
            }
            try {
              if (currentPopupPort) {
                currentPopupPort.postMessage({ type: 'progress', step: 'metadata' });
              } else {
                chrome.runtime.sendMessage({ type: 'progress', step: 'metadata' }).catch(() => {});
              }
            } catch {}
            if (lastSourceTabId) {
              try {
                const ok = await sendToastToTab(lastSourceTabId, 'success', 'Bookmark saved');
                console.log('📤 EXTENSION: sent step1 success toast =>', ok);
              } catch (e) {
                console.warn('⚠️ EXTENSION: failed to send success toast', e);
              }
            }
            showNotification('Saave', 'Bookmark saved ✓');
          } else {
            console.log('⏰ EXTENSION: Timeout / not found; treating as cancelled or failed', result?.reason);
            if (pendingSuccessTimer) {
              try { clearTimeout(pendingSuccessTimer); } catch {}
              pendingSuccessTimer = null;
            }
            if (lastSourceTabId) {
              try {
                const txt = cancelRequested ? 'Bookmark cancelled' : 'Failed to add';
                const ok = await sendToastToTab(lastSourceTabId, 'error', txt);
                console.log('📤 EXTENSION: sent timeout/error toast =>', ok, txt);
              } catch {}
            }
            try {
              if (currentPopupPort) {
                currentPopupPort.postMessage({ type: 'error', error: cancelRequested ? 'cancelled' : 'failed' });
              } else {
                chrome.runtime.sendMessage({ type: 'error', error: cancelRequested ? 'cancelled' : 'failed' }).catch(() => {});
              }
            } catch {}
            showNotification('Saave', cancelRequested ? 'Bookmark cancelled' : 'Failed to add');
          }
        });

        return;
      }
    } catch (apiError) {
      console.error('❌ Erreur lors de la vérification/lancement API:', apiError);
      // Continue avec l'injection dans l'app en fallback
    }

    // Fallback: injection dans l'app (ancienne méthode)
    // Chercher ou créer un onglet Saave /app
    const tabs = await chrome.tabs.query({});
    let saaveTab = tabs.find(tab => tab.url && tab.url.includes(`localhost:${port}/app`));
    
    if (!saaveTab) {
      console.log('📱 EXTENSION: Création d\'un nouvel onglet /app (en arrière-plan)');
      saaveTab = await chrome.tabs.create({
        url: `http://localhost:${port}/app`,
        active: false
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('📱 EXTENSION: Onglet /app trouvé (ne pas activer pour garder le popup ouvert)');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await chrome.scripting.executeScript({
      target: { tabId: saaveTab.id },
      func: (urlToSave) => {
        const waitForElements = () => {
          return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            const checkElements = () => {
              attempts++;
              const urlInput = document.querySelector('input[type="url"]') || 
                              document.querySelector('input[placeholder*="https://"]') ||
                              document.querySelector('input[placeholder*="URL"]') ||
                              document.querySelector('input[id="url"]');
              const addButton = document.querySelector('button[type="submit"]') ||
                               document.querySelector('form button:last-child');
              if (urlInput && addButton) {
                resolve({ urlInput, addButton });
              } else if (attempts >= maxAttempts) {
                reject(new Error('Impossible de trouver les éléments du formulaire'));
              } else {
                setTimeout(checkElements, 100);
              }
            };
            checkElements();
          });
        };
        waitForElements().then(({ urlInput, addButton }) => {
          urlInput.value = urlToSave;
          urlInput.dispatchEvent(new Event('input', { bubbles: true }));
          urlInput.dispatchEvent(new Event('change', { bubbles: true }));
          setTimeout(() => {
            addButton.click();
          }, 500);
        }).catch(() => {});
      },
      args: [url.trim()]
    });
    
    // Afficher "Bookmark saved ✓" après 3 secondes (fallback)
    setTimeout(() => {
      sendStepUpdateToPopup('started');
      showNotification('Saave', 'Bookmark saved ✅');
    }, 3000);
    
    sendResponse({ success: true, message: 'URL envoyée à la webapp pour traitement!' });
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde popup:', error);
    sendErrorToPopup(error.message);
    sendResponse({ success: false, error: error.message });
  }
}

// Fonction pour trouver le port actif du serveur Saave
async function findActiveSaavePort() {
  for (const port of API_PORTS) {
    try {
      // Essayer plusieurs endpoints pour détecter le serveur
      const endpoints = [
        `/api/bookmarks`,
        `/api/inngest`,
        `/app`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`http://localhost:${port}${endpoint}`, {
            method: 'GET',
            mode: 'no-cors' // Utiliser no-cors pour éviter les erreurs CORS
          });
          // Avec no-cors, on ne peut pas vérifier le status, mais si ça ne throw pas, le serveur répond
          console.log(`✅ Serveur Saave trouvé sur le port ${port} (via ${endpoint})`);
          return port;
        } catch (e) {
          // Essayer avec OPTIONS
          try {
            const optResponse = await fetch(`http://localhost:${port}${endpoint}`, {
              method: 'OPTIONS',
              mode: 'cors'
            });
            if (optResponse.ok || optResponse.status === 405 || optResponse.status === 200) {
              console.log(`✅ Serveur Saave trouvé sur le port ${port} (via OPTIONS ${endpoint})`);
              return port;
            }
          } catch {}
        }
      }
    } catch (error) {
      // Port non disponible, continuer la recherche
      continue;
    }
  }
  throw new Error('Aucun serveur Saave trouvé. Assurez-vous que l\'application Saave est lancée sur le port 5000 (ou 3000-3010).');
}

// Fonction pour obtenir le nombre total de bookmarks (inclut loading pour détecter +1 tôt)
async function getBookmarkCount(port, userId) {
  try {
    const response = await fetch(`http://localhost:${port}/api/bookmarks?user_id=${userId}`, {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      const total = Array.isArray(data) ? data.length : 0;
      const loadingCount = Array.isArray(data) ? data.filter(b => b.status === 'loading').length : 0;
      const finishedCount = Array.isArray(data) ? data.filter(b => !b.processingStep || b.processingStep === 'finished').length : 0;

      console.log(`📊 Bookmark count check: total=${total}, loading=${loadingCount}, finished=${finishedCount}`);
      return total;
    }
  } catch (error) {
    console.warn('⚠️ Failed to get bookmark count:', error);
  }
  return null;
}

function canonicalizeUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(String(raw));
    const protocol = (u.protocol || 'https:').toLowerCase();
    const hostname = (u.hostname || '').toLowerCase().replace(/^www\./, '');
    const port = (u.port && !['80', '443'].includes(u.port)) ? `:${u.port}` : '';
    let pathname = u.pathname || '/';
    if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    const params = new URLSearchParams(u.search);
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','ref'].forEach(k => params.delete(k));
    const qs = params.toString();
    // Normalize trailing slash so "https://x.com" and "https://x.com/" match
    const full = `${protocol}//${hostname}${port}${pathname}${qs ? `?${qs}` : ''}`;
    return full.replace(/\/$/, '');
  } catch {
    return String(raw).trim().replace(/\/$/, '');
  }
}

async function waitForBookmarkAddedStep1(port, userId, urlToSave, timeoutMs = 12000) {
  const startTime = Date.now();
  let checkCount = 0;
  let failedCount = 0;
  const target = canonicalizeUrl(urlToSave);
  console.log(`⏱️ 🔍 STARTING WATCH for bookmark appearance (step1) url=${target}`);

  while (Date.now() - startTime < timeoutMs) {
    if (cancelRequested) {
      console.log('🛑 EXTENSION: Cancel requested, aborting watch');
      return { ok: false, reason: 'cancelled' };
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    checkCount++;

    let data = null;
    try {
      const res = await fetch(`http://localhost:${port}/api/bookmarks?user_id=${encodeURIComponent(userId)}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`status_${res.status}`);
      data = await res.json();
    } catch (e) {
      failedCount++;
      console.warn(`⚠️ EXTENSION: Check #${checkCount} fetch failed (${failedCount})`, e);
      if (failedCount >= 4) return { ok: false, reason: 'fetch_failed' };
      continue;
    }

    const list = Array.isArray(data) ? data : [];
    const found = list.find((b) => canonicalizeUrl(b?.url) === target);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🔎 EXTENSION: Check #${checkCount} (${elapsed}s) found=${!!found} total=${list.length}`);

    if (found) {
      const step = found.processingStep || found.processing_step || null;
      const status = found.status || null;
      console.log('✅ EXTENSION: Found bookmark entry:', { status, step, id: found.id });
      // Step1 reached as soon as entry exists (loading/scraping) OR saved entry exists
      return { ok: true, status, step, id: found.id };
    }
  }
  console.warn(`⏰ EXTENSION: TIMEOUT waiting for step1 appearance (url=${target})`);
  return { ok: false, reason: 'timeout' };
}

// Fonction pour obtenir l'utilisateur connecté
async function getCurrentUser(port) {
  try {
    console.log('🔍 Recherche de l\'utilisateur connecté...');
    console.log('🔧 Port Saave utilisé:', port);
    
    // Vérifier dans le storage local de l'extension d'abord
    console.log('📦 Vérification du cache extension...');
    const stored = await chrome.storage.local.get(['saave_user']);
    console.log('📦 Contenu du cache:', stored);
    
    if (stored.saave_user && stored.saave_user.id) {
      if (String(stored.saave_user.id || '').startsWith('dev-user-')) {
        await chrome.storage.local.remove(['saave_user']);
      } else {
        console.log('👤 Utilisateur trouvé dans le cache:', stored.saave_user.email);
        return stored.saave_user;
      }
    }
    
    console.log('❌ Aucun utilisateur dans le cache, recherche dans les onglets...');
    const tabs = await chrome.tabs.query({});
    const saaveTab = tabs.find(tab => tab.url && tab.url.includes(`localhost:${port}`));
    
    if (saaveTab) {
      console.log('🎯 Onglet Saave trouvé, extraction de l\'utilisateur...');
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: saaveTab.id },
          func: () => {
            const tryExtractUser = (value) => {
              try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                if (parsed && parsed.user && parsed.user.id) return parsed.user;
                if (parsed && parsed.currentSession && parsed.currentSession.user && parsed.currentSession.user.id) {
                  return parsed.currentSession.user;
                }
                if (parsed && parsed.session && parsed.session.user && parsed.session.user.id) {
                  return parsed.session.user;
                }
              } catch {}
              return null;
            };

            // Prefer explicit profile cache written by the webapp
            try {
              const profileRaw = localStorage.getItem('saave_user_profile');
              if (profileRaw) {
                const profile = JSON.parse(profileRaw);
                if (profile && profile.id) {
                  return { id: profile.id, email: profile.email || '', display_name: profile.display_name || '' };
                }
              }
            } catch {}

            const keys = Object.keys(localStorage).filter(key => 
              key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')
            );
            for (const key of keys) {
              try {
                const data = localStorage.getItem(key);
                const maybeUser = tryExtractUser(data);
                if (maybeUser && maybeUser.id) {
                  return maybeUser;
                }
              } catch {}
            }
            return null;
          }
        });
        const user = results[0]?.result;
        if (user && user.id) {
          console.log('✅ Utilisateur récupéré depuis l\'onglet Saave:', user.email);
          await chrome.storage.local.set({ saave_user: user });
          return user;
        }
      } catch (error) {
        console.log('⚠️ Impossible d\'exécuter le script dans l\'onglet Saave:', error);
      }
    }

    // Fallback: appeler l'API profil avec credentials pour récupérer l'utilisateur
    try {
      console.log('🌐 Tentative /api/user/profile avec credentials');
      const profileRes = await fetch(`http://localhost:${port}/api/user/profile`, {
        method: 'GET',
        credentials: 'include',
      });
      const profileText = await profileRes.text();
      let profile;
      try { profile = JSON.parse(profileText); } catch {}
      if (profile && profile.user && profile.user.id) {
        console.log('✅ Utilisateur récupéré via /api/user/profile:', profile.user.email);
        await chrome.storage.local.set({ saave_user: profile.user });
        return profile.user;
      }
      console.warn('⚠️ Profil API non disponible ou non connecté:', profileRes.status);
    } catch (apiErr) {
      console.warn('⚠️ Erreur appel /api/user/profile:', apiErr);
    }

    console.log('❌ Aucun utilisateur trouvé, retour null');
    return null;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
  }
}

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
async function sendToastToTab(tabId, action, text) {
  const payload = { type: 'saave:toast', action, text };
  try {
    await chrome.tabs.sendMessage(tabId, payload);
    return true;
  } catch (err) {
    try {
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

// À l'ouverture/chargement d'un onglet Saave /app, si une URL est en attente, l'injecter
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  const host = (() => { try { return new URL(tab.url).hostname; } catch { return ''; } })();
  const isApp = (host.startsWith('app.')) || ( /\/app(\b|\?)/.test(tab.url) && (tab.url.includes('saave.io') || /localhost:\\d+/.test(tab.url)) );
  if (!isApp) return;

  const { pendingBookmarkUrl } = await chrome.storage.local.get(['pendingBookmarkUrl']);
  if (!pendingBookmarkUrl) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (u) => { window.dispatchEvent(new CustomEvent('extensionBookmarkRequest', { detail: { url: u } })); },
      args: [pendingBookmarkUrl]
    });
    await chrome.storage.local.remove(['pendingBookmarkUrl']);
    showNotification('Saave', 'Ajout en cours dans Saave.');
  } catch (e) {
    console.warn('⚠️ Injection auto échouée:', e);
  }
});

// Écoute les messages du content script pour afficher des toasts système
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && typeof msg === 'object' && msg.type) {
    if (msg.type === 'saave:add-started') {
      // Ne pas afficher de notification ici, on attend l'augmentation du compteur
      console.log('📡 Bookmark process started, waiting for count increase...');
      try { if (pendingSuccessTimer) clearTimeout(pendingSuccessTimer); } catch {}
    }
    if (msg.type === 'saave:add-progress') {
      const step = msg.detail?.step || '';
      console.log(`📡 Bookmark progress: ${step}`);

      // Ne pas afficher les messages intermédiaires, on attend l'augmentation du compteur
      try { if (pendingSuccessTimer) clearTimeout(pendingSuccessTimer); } catch {}
    }
    if (msg.type === 'saave:add-finished') {
      showNotification('Saave', 'Bookmark saved ✅');
    }
    if (msg.type === 'saave:add-error') {
      const message = String(msg.detail?.message || '');
      showNotification('Saave', `Error: ${message}`);
      try {
        if (message === 'cancelled' && lastSourceTabId) {
          try { sendToastToTab(lastSourceTabId, 'hide').catch(() => {}); } catch {}
        }
      } catch {}
    }
  }
});

// Gestionnaire de clic sur les notifications
if (chrome.notifications && chrome.notifications.onClicked) {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    if (notificationId.startsWith('saave-login-required')) {
      const port = notificationId.split('-').pop();
      if (port && !isNaN(port)) {
        chrome.tabs.create({ url: `http://localhost:${port}` });
      }
    }
  });
}

// Initialisation (service worker lifecycle)
self.addEventListener('activate', () => {
  console.log('🔧 Saave service worker active');
});


