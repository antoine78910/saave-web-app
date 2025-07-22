// Configuration de l'API Saave
const API_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

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
    
    // Vérifier dans le storage local de l'extension d'abord
    const stored = await chrome.storage.local.get(['saave_user']);
    if (stored.saave_user && stored.saave_user.id) {
      console.log('👤 Utilisateur trouvé dans le cache:', stored.saave_user.email);
      return stored.saave_user;
    }
    
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
    
    return null;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
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
      iconUrl: chrome.runtime.getURL('icons/icon48.png')
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
      showNotification(
        '🔐 Saave - Connexion requise', 
        `Veuillez vous connecter sur http://localhost:${port} puis réessayer.`
      );
      
      // Ouvrir l'onglet Saave pour la connexion
      chrome.tabs.create({ url: `http://localhost:${port}` });
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

// Initialisation de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 Extension Saave installée et prête !');
});