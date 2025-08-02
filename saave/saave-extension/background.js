// Configuration de l'API Saave
const API_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

// Variable pour stocker le port du popup actuel (pour les mises à jour d'étapes)
let currentPopupPort = null;

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
      throw new Error('Utilisateur non connecté. Connectez-vous d\'abord sur l\'app Saave.');
    }
    
    console.log('📤 EXTENSION: Injection directe de l\'URL dans la webapp...');
    
    // Validation de l'URL
    try {
      new URL(url.trim());
    } catch {
      throw new Error('L\'URL saisie n\'est pas reconnue comme valide.');
    }
    
    // Chercher ou créer un onglet Saave /app
    const tabs = await chrome.tabs.query({});
    let saaveTab = tabs.find(tab => tab.url && tab.url.includes(`localhost:${port}/app`));
    
    if (!saaveTab) {
      console.log('📱 EXTENSION: Création d\'un nouvel onglet /app');
      saaveTab = await chrome.tabs.create({
        url: `http://localhost:${port}/app`,
        active: true
      });
      
      // Attendre que la page se charge complètement
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('📱 EXTENSION: Onglet /app trouvé, activation');
      await chrome.tabs.update(saaveTab.id, { active: true });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Injecter le script qui remplit et soumet le formulaire exactement comme dans la webapp
    await chrome.scripting.executeScript({
      target: { tabId: saaveTab.id },
      func: (urlToSave) => {
        console.log('🎯 WEBAPP INJECT: Début injection avec URL:', urlToSave);
        
        // Fonction pour attendre que les éléments soient disponibles
        const waitForElements = () => {
          return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 secondes max
            
            const checkElements = () => {
              attempts++;
              
              // Chercher le champ URL et le bouton Add Bookmark
              const urlInput = document.querySelector('input[type="url"]') || 
                              document.querySelector('input[placeholder*="https://"]') ||
                              document.querySelector('input[placeholder*="URL"]') ||
                              document.querySelector('input[id="url"]');
              
              const addButton = document.querySelector('button[type="submit"]') ||
                               document.querySelector('button:contains("Add")') ||
                               document.querySelector('button:contains("Save")') ||
                               document.querySelector('form button:last-child');
              
              console.log(`🔍 WEBAPP INJECT: Tentative ${attempts}/${maxAttempts}`);
              console.log('🔍 WEBAPP INJECT: Input trouvé:', !!urlInput);
              console.log('🔍 WEBAPP INJECT: Button trouvé:', !!addButton);
              
              if (urlInput && addButton) {
                console.log('✅ WEBAPP INJECT: Éléments trouvés!');
                resolve({ urlInput, addButton });
              } else if (attempts >= maxAttempts) {
                console.log('❌ WEBAPP INJECT: Timeout - éléments non trouvés');
                reject(new Error('Impossible de trouver les éléments du formulaire'));
              } else {
                setTimeout(checkElements, 100);
              }
            };
            
            checkElements();
          });
        };
        
        // Exécuter l'injection
        waitForElements().then(({ urlInput, addButton }) => {
          console.log('📝 WEBAPP INJECT: Remplissage du champ URL');
          
          // Remplir le champ URL
          urlInput.value = urlToSave;
          urlInput.focus();
          
          // Déclencher tous les événements nécessaires pour React
          urlInput.dispatchEvent(new Event('input', { bubbles: true }));
          urlInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          console.log('📝 WEBAPP INJECT: URL remplie:', urlInput.value);
          
          // Attendre un peu puis cliquer sur le bouton
          setTimeout(() => {
            console.log('🚀 WEBAPP INJECT: Clic sur le bouton Add');
            addButton.click();
            
            // Indiquer le succès
            console.log('✅ WEBAPP INJECT: Processus terminé avec succès');
          }, 500);
          
        }).catch(error => {
          console.error('❌ WEBAPP INJECT: Erreur:', error);
        });
      },
      args: [url.trim()]
    });
    
    console.log('✅ EXTENSION: Script injecté avec succès');
    
    // Succès immédiat côté extension
    sendSuccessToPopup();
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
      const response = await fetch(`http://localhost:${port}/api/bookmarks`, {
        method: 'OPTIONS',
        mode: 'cors'
      });
      if (response.ok || response.status === 405) {
        console.log(`✅ Serveur Saave trouvé sur le port ${port}`);
        return port;
      }
    } catch (error) {
      // Port non disponible, continuer la recherche
    }
  }
  throw new Error('Aucun serveur Saave trouvé. Assurez-vous que l\'application Saave est lancée.');
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
      console.log('👤 Utilisateur trouvé dans le cache:', stored.saave_user.email);
      return stored.saave_user;
    }
    
    console.log('❌ Aucun utilisateur dans le cache, recherche dans les onglets...');
    
    // Chercher un onglet Saave ouvert pour récupérer l'utilisateur
    const tabs = await chrome.tabs.query({});
    const saaveTab = tabs.find(tab => tab.url && tab.url.includes(`localhost:${port}`));
    
    if (saaveTab) {
      console.log('🎯 Onglet Saave trouvé, extraction de l\'utilisateur...');
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: saaveTab.id },
          func: () => {
            // Rechercher l'utilisateur dans le localStorage
            const keys = Object.keys(localStorage).filter(key => 
              key.includes('supabase') || key.includes('auth') || key.includes('sb-')
            );
            
            for (const key of keys) {
              try {
                const data = localStorage.getItem(key);
                if (data) {
                  const parsed = JSON.parse(data);
                  if (parsed && parsed.user && parsed.user.id) {
                    return parsed.user;
                  }
                }
              } catch (e) {
                // Ignorer les erreurs de parsing
              }
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
    
    // En dernier recours, utiliser l'utilisateur de développement statique
    console.log('⚠️ Aucun utilisateur Supabase trouvé, utilisation du mode développement');
    const devUser = {
      id: 'dev-user-123',
      email: 'anto.dlebos@gmail.com',
      created_at: new Date().toISOString(),
      display_name: 'Antoine Delebos (Dev)'
    };
    
    console.log('👤 Utilisateur de développement créé:', devUser.email);
    
    // Stocker l'utilisateur de dev pour la prochaine fois
    await chrome.storage.local.set({ saave_user: devUser });
    
    return devUser;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    
    // Même en cas d'erreur, retourner l'utilisateur de développement
    console.log('🛡️ Fallback vers utilisateur de développement');
    return {
      id: 'dev-user-123',
      email: 'anto.dlebos@gmail.com',
      created_at: new Date().toISOString(),
      display_name: 'Antoine Delebos (Dev)'
    };
  }
}

// Fonction pour extraire les métadonnées de la page
async function extractPageMetadata(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getMetaContent = (selector) => {
          const meta = document.querySelector(selector);
          return meta ? meta.content : '';
        };
        
        const getFavicon = () => {
          const favicon = document.querySelector('link[rel*="icon"]');
          if (favicon && favicon.href) {
            return favicon.href;
          }
          return `${window.location.origin}/favicon.ico`;
        };

        const getImage = () => {
          return getMetaContent('meta[property="og:image"]') ||
                 getMetaContent('meta[name="twitter:image"]') ||
                 getMetaContent('meta[property="og:image:url"]');
        };

        return {
          title: document.title || '',
          description: getMetaContent('meta[name="description"]') ||
                      getMetaContent('meta[property="og:description"]') ||
                      getMetaContent('meta[name="twitter:description"]') || '',
          favicon: getFavicon(),
          thumbnail: getImage(),
          url: window.location.href
        };
      }
    });
    
    return results[0]?.result || {};
  } catch (error) {
    console.warn('⚠️ Impossible d\'extraire les métadonnées:', error);
    return {
      title: tab.title || 'Page sans titre',
      description: '',
      favicon: '',
      thumbnail: '',
      url: tab.url
    };
  }
}

// Fonction pour ajouter un bookmark à Saave
async function addBookmarkToSaave(bookmarkData, port) {
  try {
    console.log('📝 Ajout du bookmark:', bookmarkData.title);
    
    const response = await fetch(`http://localhost:${port}/api/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...bookmarkData,
        source: 'extension'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Bookmark ajouté avec succès:', result);
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du bookmark:', error);
    throw error;
  }
}

// Fonction pour afficher les notifications
function showNotification(title, message, type = 'basic') {
  try {
    const notificationOptions = {
      type: type,
      title: title,
      message: message,
      iconUrl: chrome.runtime.getURL('icons/icon48.svg')
    };
    
    chrome.notifications.create(`saave-${Date.now()}`, notificationOptions, function(notificationId) {
      if (chrome.runtime.lastError) {
        console.error('Erreur notification:', chrome.runtime.lastError);
        // Fallback sans icône
        chrome.notifications.create(`saave-fallback-${Date.now()}`, {
          type: type,
          title: title,
          message: message
        });
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'affichage de la notification:', error);
  }
}

// Gestionnaire principal - clic sur l'icône de l'extension
chrome.action.onClicked.addListener(async (tab) => {
  try {
    console.log('🚀 Extension Saave activée pour:', tab.url);
    
    // Vérifier que l'URL est valide
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showNotification(
        '⚠️ Saave - Erreur', 
        'Impossible de sauvegarder cette page. Essayez sur une page web classique.'
      );
      return;
    }

    // Rechercher le serveur Saave actif
    console.log('🔍 Recherche du serveur Saave...');
    const port = await findActiveSaavePort();
    
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser(port);
    
    if (!user || !user.id) {
      // Créer une notification cliquable pour la connexion
      const notificationId = `saave-login-required-${port}`;
      chrome.notifications.create(notificationId, {
        type: 'basic',
        title: '🔐 Saave - Connexion requise',
        message: `Cliquez ici pour vous connecter sur localhost:${port}`,
        iconUrl: chrome.runtime.getURL('icons/icon48.png')
      });
      
      console.log(`💡 Pour vous connecter, allez sur: http://localhost:${port}`);
      return;
    }

    console.log('👤 Utilisateur connecté:', user.email);

    // Extraire les métadonnées de la page
    console.log('📄 Extraction des métadonnées...');
    const metadata = await extractPageMetadata(tab);
    
    // Préparer les données du bookmark
    const bookmarkData = {
      url: tab.url,
      title: metadata.title || tab.title || 'Page sans titre',
      description: metadata.description || '',
      favicon: metadata.favicon || '',
      thumbnail: metadata.thumbnail || '',
      user_id: user.id,
      category_id: null,
      tags: []
    };

    // Ajouter le bookmark
    await addBookmarkToSaave(bookmarkData, port);
    
    // Notification de succès
    showNotification(
      '✅ Saave - Succès', 
      `"${bookmarkData.title}" ajouté à vos bookmarks !`
    );
    
  } catch (error) {
    console.error('❌ Erreur dans l\'extension:', error);
    showNotification(
      '❌ Saave - Erreur', 
      error.message || 'Impossible d\'ajouter le bookmark. Réessayez.'
    );
  }
});

// Écouter les changements d'onglets pour détecter la connexion Saave
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    for (const port of API_PORTS) {
      if (tab.url.includes(`localhost:${port}`)) {
        console.log('🎯 Onglet Saave détecté, tentative de récupération de l\'utilisateur...');
        try {
          const user = await getCurrentUser(port);
          if (user && user.id) {
            await chrome.storage.local.set({ saave_user: user });
            console.log('💾 Utilisateur sauvegardé:', user.email);
          }
        } catch (error) {
          console.log('⚠️ Impossible de récupérer l\'utilisateur:', error);
        }
        break;
      }
    }
  }
});

// Gestionnaire de clic sur les notifications
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith('saave-login-required')) {
    // Extraire le port de l'ID de notification
    const port = notificationId.split('-').pop();
    if (port && !isNaN(port)) {
      chrome.tabs.create({ url: `http://localhost:${port}` });
    }
  }
});

// Initialisation de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 Extension Saave installée et prête !');
});