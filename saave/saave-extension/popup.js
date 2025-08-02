// État de l'application
let currentState = 'idle'; // idle, loading, success, error

// Connexion avec le background script
const backgroundPort = chrome.runtime.connect({ name: 'popup' });

// Éléments DOM
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const statusSubtitle = document.getElementById('status-subtitle');
const saveButton = document.getElementById('save-button');
const errorMessage = document.getElementById('error-message');
const pageInfo = document.getElementById('page-info');
const pageUrl = document.getElementById('page-url');
const pageTitle = document.getElementById('page-title');


// Initialisation au chargement
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 Popup Saave initialisé');
  
  try {
    // Récupérer les informations de la page active
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      displayPageInfo(tab.url, tab.title);
      saveButton.disabled = false;
    } else {
      showError('Cette page ne peut pas être sauvegardée');
      saveButton.disabled = true;
    }
  } catch (error) {
    console.error('❌ Erreur initialisation popup:', error);
    showError('Erreur lors de l\'initialisation');
  }
});

// Gérer le clic sur le bouton sauvegarder
saveButton.addEventListener('click', async () => {
  console.log('🚀 POPUP: Clic sur le bouton sauvegarder');
  console.log('🚀 POPUP: currentState:', currentState);
  
  if (currentState === 'loading') {
    console.log('⏸️ POPUP: Processus déjà en cours, abandon');
    return;
  }
  
  try {
    console.log('🔄 POPUP: Démarrage sauvegarde bookmark...');
    
    // Récupérer la page active
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('📱 POPUP: Onglet actuel récupéré:', tab);
    
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
      console.log('❌ POPUP: Page non valide:', { tab: !!tab, url: tab?.url });
      throw new Error('Page non valide pour la sauvegarde');
    }
    
    console.log('✅ POPUP: Page valide, URL:', tab.url);
    console.log('📝 POPUP: Titre:', tab.title);
    
    // Démarrer le processus de sauvegarde
    console.log('🎬 POPUP: Démarrage de l\'animation de chargement');
    startSaving();
    
    // Envoyer la demande au background script
    console.log('📤 POPUP: Envoi du message vers background script');
    const response = await chrome.runtime.sendMessage({
      action: 'saveBookmark',
      url: tab.url,
      title: tab.title || 'Sans titre'
    });
    
    console.log('📥 POPUP: Réponse reçue du background script:', response);
    
    if (response && response.success) {
      console.log('✅ POPUP: Bookmark sauvegardé avec succès');
      showSuccess();
    } else {
      console.log('❌ POPUP: Erreur dans la réponse:', response);
      throw new Error(response?.error || response?.message || 'Erreur inconnue');
    }
    
  } catch (error) {
    console.error('❌ POPUP: Erreur sauvegarde:', error);
    showError(error.message);
  }
});

// Écouter les messages du background script
backgroundPort.onMessage.addListener((message) => {
  console.log('📨 Message reçu dans popup:', message);
  
  switch (message.type) {
    case 'error':
      showError(message.error);
      break;
    case 'success':
      showSuccess();
      break;
  }
});

// Gérer la déconnexion
backgroundPort.onDisconnect.addListener(() => {
  console.log('🔌 Connexion avec background fermée');
});

// Afficher les informations de la page
function displayPageInfo(url, title) {
  try {
    const urlObj = new URL(url);
    pageUrl.textContent = urlObj.hostname;
    pageTitle.textContent = title || 'Sans titre';
    pageInfo.style.display = 'block';
  } catch (error) {
    console.warn('⚠️ URL invalide:', url);
  }
}

// Démarrer le processus de sauvegarde
function startSaving() {
  currentState = 'loading';
  
  statusIcon.innerHTML = '<div class="spinner"></div>';
  statusText.textContent = 'Envoi vers Saave.io...';
  statusSubtitle.textContent = 'Ouverture de l\'application';
  
  saveButton.disabled = true;
  saveButton.textContent = 'Envoi...';
  
  errorMessage.style.display = 'none';
}



// Afficher le succès
function showSuccess() {
  currentState = 'success';
  
  statusIcon.innerHTML = '✅';
  statusText.textContent = 'URL envoyée !';
  statusSubtitle.textContent = 'Traitement en cours dans Saave.io';
  
  saveButton.textContent = 'Envoyé ✓';
  saveButton.style.background = '#10b981';
  
  errorMessage.style.display = 'none';
  
  // Fermer le popup après 2 secondes
  setTimeout(() => {
    window.close();
  }, 2000);
}

// Afficher une erreur
function showError(error) {
  currentState = 'error';
  
  statusIcon.innerHTML = '❌';
  statusText.textContent = 'Erreur';
  statusSubtitle.textContent = 'Impossible de sauvegarder';
  
  saveButton.disabled = false;
  saveButton.textContent = 'Réessayer';
  saveButton.style.background = '#3b82f6';
  
  errorMessage.textContent = error;
  errorMessage.style.display = 'block';
}

// Gestion des raccourcis clavier
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !saveButton.disabled) {
    saveButton.click();
  }
  if (e.key === 'Escape') {
    window.close();
  }
  
  // Raccourci pour vider le cache : Ctrl+Shift+R
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    clearExtensionCache();
  }
});

// Fonction pour vider le cache de l'extension
async function clearExtensionCache() {
  try {
    console.log('🧹 Vidage du cache utilisateur...');
    
    statusIcon.innerHTML = '🧹';
    statusText.textContent = 'Vidage du cache...';
    statusSubtitle.textContent = 'Suppression des données en cache';
    
    const response = await chrome.runtime.sendMessage({
      action: 'clearCache'
    });
    
    if (response.success) {
      statusIcon.innerHTML = '✅';
      statusText.textContent = 'Cache vidé !';
      statusSubtitle.textContent = 'Réessayez maintenant';
      
      setTimeout(() => {
        // Réinitialiser l'interface
        statusIcon.innerHTML = '🚀';
        statusText.textContent = 'Prêt à sauvegarder';
        statusSubtitle.textContent = 'Regardez le processus dans l\'app Saave.io';
        saveButton.disabled = false;
      }, 2000);
    } else {
      showError('Impossible de vider le cache');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du vidage du cache:', error);
    showError('Erreur lors du vidage du cache');
  }
}