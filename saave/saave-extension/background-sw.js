// Configuration de l'API Saave
// Ports à vérifier (incluant le port par défaut 5000)
const API_PORTS = [5000, 3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

// Variable pour stocker le port du popup actuel (pour les mises à jour d'étapes)
let currentPopupPort = null;
// Mémoriser l'onglet source (où afficher le toast de progression)
let lastSourceTabId = null;
// Fallback: succès si aucun événement n'arrive à temps
let pendingSuccessTimer = null;
// No separate windows, stick to Chrome notifications only

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
    showNotification('Saave', 'Bookmark added ✅');
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
    
    // Vérifier d'abord si c'est un doublon en appelant directement l'API
    try {
      const checkResponse = await fetch(`http://localhost:${port}/api/bookmarks/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), user_id: user.id })
      });
      
      const checkText = await checkResponse.text();
      let checkData;
      try { checkData = JSON.parse(checkText); } catch {}
      
      // Si c'est un doublon, retourner l'erreur immédiatement
      if (checkResponse.status === 409 || checkData?.duplicate) {
        sendResponse({ success: false, error: 'duplicate' });
        showNotification('Saave', 'Ce site est déjà dans votre bibliothèque');
        return;
      }
      
      // Si l'API a réussi, on peut continuer
      if (checkResponse.ok || checkResponse.status === 202) {
        // Afficher "Bookmark added ✓" après 3 secondes
        setTimeout(() => {
          sendStepUpdateToPopup('started');
          showNotification('Saave', 'Bookmark added ✅');
        }, 3000);
        sendResponse({ success: true });
        return;
      }
    } catch (apiError) {
      console.error('❌ Erreur lors de la vérification API:', apiError);
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
    
    // Afficher "Bookmark added ✓" après 3 secondes (fallback)
    setTimeout(() => {
      sendStepUpdateToPopup('started');
      showNotification('Saave', 'Bookmark added ✅');
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

// Gestionnaire principal - clic sur l'icône de l'extension (sans ouvrir/rediriger d'onglet)
(chrome.action && chrome.action.onClicked ? chrome.action.onClicked : chrome.browserAction.onClicked).addListener(async (tab) => {
  try {
    console.log('🚀 [EXT] Icon clicked for URL:', tab?.url);

    if (!tab?.url || !/^https?:/i.test(tab.url)) {
      showNotification('⚠️ Saave', 'Ouvrez une page web pour l\'ajouter.');
      return;
    }

    const urlToAdd = tab.url;
    const port = await findActiveSaavePort();
    console.log('✅ [EXT] Server on port:', port);

    // Prompt login if no session
    const user = await getCurrentUser(port);
    if (!user || !user.id) {
      await sendToastToTab(tab.id, 'login', `http://localhost:${port}/auth`);
      showNotification('Saave', 'Please login to save bookmarks');
      return;
    }

    // Afficher "Bookmark added ✅" après 3 secondes (simple et fiable)
    setTimeout(() => {
      showNotification('Saave', 'Bookmark added ✅');
    }, 3000);

    const controller = new AbortController();
    const res = await fetch(`http://localhost:${port}/api/bookmarks/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlToAdd, user_id: user?.id, source: 'extension' }),
      signal: controller.signal,
    });
    const text = await res.text();
    console.log('📡 [EXT] Process response:', res.status, text);
    if (res.status === 401) {
      await sendToastToTab(tab.id, 'login', `http://localhost:${port}/auth`);
      showNotification('Saave', 'Please login to save bookmarks');
      return;
    }
    if (res.status === 409) {
      await sendToastToTab(tab.id, 'duplicate');
      try { await sendToastToTab(tab.id, 'hide'); } catch {}
      showNotification('Saave', 'Already saved • Skipped');
      return;
    }
    if (!res.ok && res.status !== 202) throw new Error(text || `HTTP ${res.status}`);

    // Fallback: si pas d'événement, on a déjà programmé un succès ci-dessus
  } catch (error) {
    console.error('❌ [EXT] Error on icon click:', error);
    // No early timer to clear
    await sendToastToTab(tab?.id, 'error', error?.message || 'Failed to add');
    showNotification('Saave - Error', error?.message || 'Failed to add');
  }
});

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
      showNotification('Saave', 'Adding bookmark...');
      try { sendStepUpdateToPopup('started'); } catch {}
      try { if (pendingSuccessTimer) clearTimeout(pendingSuccessTimer); } catch {}
      try { if (lastSourceTabId) { sendToastToTab(lastSourceTabId, 'success', 'Bookmark saved ✓'); } } catch {}
    }
    if (msg.type === 'saave:add-progress') {
      showNotification('Saave', `Processing: ${msg.detail?.step || ''}`);
      try { sendStepUpdateToPopup('started'); } catch {}
      try { if (pendingSuccessTimer) clearTimeout(pendingSuccessTimer); } catch {}
      try { if (lastSourceTabId) { sendToastToTab(lastSourceTabId, 'success', 'Bookmark saved ✓'); } } catch {}
    }
    if (msg.type === 'saave:add-finished') {
      showNotification('Saave', 'Bookmark added ✅');
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


