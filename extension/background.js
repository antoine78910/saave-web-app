// Configuration de l'API
const API_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

// Fonction pour trouver le port actif du serveur Next.js
async function findActivePort() {
  for (const port of API_PORTS) {
    try {
      const response = await fetch(`http://localhost:${port}/api/bookmarks`, {
        method: 'OPTIONS',
        mode: 'cors'
      });
      if (response.ok || response.status === 405) {
        console.log(`Found active server on port ${port}`);
        return port;
      }
    } catch (error) {
      // Port non disponible, continuer
    }
  }
  throw new Error('No active Saave server found. Please make sure the app is running.');
}

// Fonction pour obtenir l'utilisateur connecté depuis l'app Saave
async function getCurrentUser(port) {
  try {
    console.log('Trying to get user from Saave app...');
    
    // Essayer de récupérer les données depuis l'onglet de l'app Saave s'il est ouvert
    const tabs = await chrome.tabs.query({});
    const saaveTab = tabs.find(tab => tab.url && tab.url.includes(`localhost:${port}`));
    
    if (saaveTab) {
      console.log('Found Saave app tab, getting user from there...');
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: saaveTab.id },
          func: () => {
            console.log('Getting user from Saave app localStorage');
            try {
              // Essayer plusieurs clés possibles
              const keys = Object.keys(localStorage).filter(key => 
                key.includes('supabase') || key.includes('auth') || key.includes('sb-')
              );
              console.log('Available localStorage keys:', keys);
              
              for (const key of keys) {
                try {
                  const data = localStorage.getItem(key);
                  if (data) {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.user && parsed.user.email) {
                      console.log('User found in key:', key);
                      return parsed.user;
                    }
                  }
                } catch (e) {
                  // Ignorer les erreurs de parsing
                }
              }
              
              return null;
            } catch (e) {
              console.error('Error in script:', e);
              return null;
            }
          }
        });
        
        const user = results[0]?.result;
        if (user) {
          console.log('User found from Saave app:', user.email);
          return user;
        }
      } catch (error) {
        console.log('Could not execute script in Saave tab:', error);
      }
    }
    
    // Si pas d'onglet Saave ouvert, essayer de stocker/récupérer l'utilisateur avec chrome.storage
    console.log('No Saave app tab found, checking stored user...');
    
    const stored = await chrome.storage.local.get(['saave_user']);
    if (stored.saave_user) {
      console.log('Found stored user:', stored.saave_user.email);
      return stored.saave_user;
    }
    
    console.log('No user found anywhere');
    return null;
    
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Fonction pour stocker l'utilisateur quand on détecte une connexion
async function storeUser(user) {
  try {
    await chrome.storage.local.set({ saave_user: user });
    console.log('User stored for future use');
  } catch (error) {
    console.error('Error storing user:', error);
  }
}

// Fonction pour extraire les métadonnées d'une page
async function extractPageMetadata(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getMetaContent = (name) => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return meta ? meta.content : '';
        };
        
        const getFavicon = () => {
          const favicon = document.querySelector('link[rel*="icon"]');
          if (favicon) {
            return favicon.href;
          }
          return `${window.location.protocol}//${window.location.host}/favicon.ico`;
        };

        return {
          title: document.title,
          description: getMetaContent('description') || getMetaContent('og:description'),
          favicon: getFavicon(),
          thumbnail: getMetaContent('og:image')
        };
      }
    });
    
    return results[0]?.result;
  } catch (error) {
    console.warn('Could not extract metadata:', error);
    return {
      title: tab.title,
      description: '',
      favicon: '',
      thumbnail: ''
    };
  }
}

// Fonction pour ajouter un bookmark
async function addBookmark(url, title, port, userId, metadata = {}) {
  try {
    console.log(`Adding bookmark: ${title} (${url}) for user ${userId}`);
    
    const bookmarkData = {
      url: url,
      title: title || metadata.title || url,
      description: metadata.description || '',
      favicon: metadata.favicon || '',
      thumbnail: metadata.thumbnail || '',
      user_id: userId,
      source: 'extension'
    };

    const response = await fetch(`http://localhost:${port}/api/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookmarkData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('Bookmark added successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
}

// Fonction pour afficher une notification (avec propriétés complètes)
function showNotification(title, message, type = 'basic') {
  try {
    const notificationOptions = {
      type: type,
      title: title || 'Saave',
      message: message || 'Notification',
      iconUrl: chrome.runtime.getURL('icon48.png')
    };
    
    console.log('Creating notification with options:', notificationOptions);
    
    chrome.notifications.create('saave-notification-' + Date.now(), notificationOptions, function(notificationId) {
      if (chrome.runtime.lastError) {
        console.error('Notification error:', chrome.runtime.lastError);
        // Fallback: essayer sans icône
        chrome.notifications.create('saave-notification-fallback-' + Date.now(), {
          type: type,
          title: title || 'Saave',
          message: message || 'Notification'
        });
      } else {
        console.log('Notification created successfully:', notificationId);
      }
    });
  } catch (error) {
    console.error('Error showing notification:', error);
    // Fallback: afficher dans la console
    console.log(`Notification: ${title} - ${message}`);
  }
}

// Gestionnaire du clic sur l'icône de l'extension
chrome.action.onClicked.addListener(async (tab) => {
  try {
    console.log('Extension icon clicked, tab:', tab);
    
    // Vérifier que l'URL est valide
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showNotification(
        'Saave Error', 
        'Cannot save this page. Please try on a web page.'
      );
      return;
    }

    // Trouver le port actif
    console.log('Finding active server port...');
    const port = await findActivePort();
    
    // Obtenir l'utilisateur connecté
    console.log('Getting current user...');
    const user = await getCurrentUser(port);
    
    if (!user || !user.id) {
      console.log('No user found, user object:', user);
      showNotification(
        'Saave Error', 
        'Please log in to your Saave account first by visiting http://localhost:' + port + '/app and then try again.'
      );
      return;
    }

    console.log('User found:', user.email, 'ID:', user.id);

    // Stocker l'utilisateur pour usage futur
    await storeUser(user);

    // Extraire les métadonnées de la page
    console.log('Extracting page metadata...');
    const metadata = await extractPageMetadata(tab);
    
    // Ajouter le bookmark avec les métadonnées
    console.log('Adding bookmark...');
    await addBookmark(tab.url, tab.title || tab.url, port, user.id, metadata);
    
    // Afficher notification de succès
    showNotification(
      '✅ Saave Success', 
      `Bookmark "${metadata.title || tab.title || 'Page'}" added successfully!`
    );
    
    console.log('Bookmark added successfully');
    
  } catch (error) {
    console.error('Error in extension:', error);
    showNotification(
      'Saave Error', 
      error.message || 'Failed to add bookmark. Please try again.'
    );
  }
});

// Écouter les changements d'onglets pour détecter quand l'utilisateur va sur l'app Saave
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Vérifier si c'est l'app Saave
    for (const port of API_PORTS) {
      if (tab.url.includes(`localhost:${port}`)) {
        console.log('Detected Saave app, trying to get user...');
        try {
          const user = await getCurrentUser(port);
          if (user) {
            await storeUser(user);
            console.log('User detected and stored:', user.email);
          }
        } catch (error) {
          console.log('Could not get user from Saave app:', error);
        }
        break;
      }
    }
  }
});

// Ajouter la permission pour les notifications
chrome.runtime.onInstalled.addListener(() => {
  console.log('Saave extension installed');
}); 