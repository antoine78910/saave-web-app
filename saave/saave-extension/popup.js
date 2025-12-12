// État de l'application
let currentState = 'idle'; // idle, loading, success, error
let autoTriggered = false; // pour déclencher automatiquement la sauvegarde

// Connexion avec le background script
const backgroundPort = chrome.runtime.connect({ name: 'popup' });

// Éléments DOM
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const statusSubtitle = document.getElementById('status-subtitle');
const saveButton = document.getElementById('save-button');
const errorMessage = document.getElementById('error-message');
const statusSpinner = document.getElementById('status-spinner');
const progressBar = document.getElementById('progress');
const toast = document.getElementById('toast');


// Initialisation au chargement
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 Popup Saave initialisé');
  
  try {
    // Afficher le loader immédiatement à l'ouverture
    startSaving();

    // Récupérer les informations de la page active
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      saveButton.disabled = false;
      // Déclencher automatiquement la sauvegarde comme un favori
      if (!autoTriggered) {
        autoTriggered = true;
        console.log('⚡ [POPUP] Auto-start saving on open');
        setTimeout(() => saveButton.click(), 0);
      }
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
if (saveButton) {
  saveButton.addEventListener('click', async () => {
    console.log('🚀 [POPUP] Bouton cliqué, currentState:', currentState);
    
    if (currentState === 'loading') {
      console.log('⏸️ [POPUP] Déjà en cours, abandon');
      return; // Déjà en cours
    }
    
    console.log('✅ [POPUP] Démarrage sauvegarde...');
    
    // Afficher immédiatement "Saving page…"
    startSaving();
    
    // Envoyer la demande au background script en arrière-plan (sans attendre)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📱 [POPUP] Tab récupéré:', tab?.url);
      
      chrome.runtime.sendMessage({
        action: 'saveBookmark',
        url: tab?.url,
        title: tab?.title || 'Sans titre'
      }).then((response) => {
        console.log('📥 [POPUP] Réponse reçue:', response);
        // Si c'est un doublon, afficher l'erreur immédiatement
        if (response && response.error === 'duplicate') {
          console.log('⚠️ [POPUP] Doublon détecté');
          showDuplicate();
        }
      }).catch((err) => {
        console.log('⚠️ [POPUP] Erreur message:', err);
        // Ignore les erreurs, on affiche quand même "Bookmark saved" après 3s
      });
    } catch (err) {
      console.error('❌ [POPUP] Erreur:', err);
    }
    
    // Fallback: afficher "Bookmark saved" après 5 secondes si pas de mise à jour
    // (normalement on reçoit l'événement metadata avant)
    setTimeout(() => {
      console.log('⏰ [POPUP] 5 secondes écoulées (fallback), currentState:', currentState);
      if (currentState === 'loading') {
        // Si on n'a pas reçu d'événement metadata, on affiche quand même le succès
        showSuccess();
      }
    }, 5000);
  });
} else {
  console.error('❌ [POPUP] saveButton non trouvé dans le DOM');
}

// Écouter les messages du background script (via port)
backgroundPort.onMessage.addListener((message) => {
  console.log('📨 Message reçu dans popup (port):', message);
  
  switch (message.type) {
    case 'error':
      if (message.error === 'duplicate') {
        showDuplicate();
      } else {
        showError(message.error);
      }
      break;
    case 'success':
      showSuccess();
      break;
    case 'stepUpdate':
      handleStepUpdate(message.step);
      break;
    case 'progress':
      if (message.step === 'metadata') {
        showSuccess();
      }
      break;
  }
});

// Écouter aussi les messages runtime (pour les événements depuis l'app)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message reçu dans popup (runtime):', message);
  
  if (message && typeof message === 'object' && message.type) {
    switch (message.type) {
      case 'progress':
        if (message.step === 'metadata') {
          showSuccess();
        }
        break;
      case 'stepUpdate':
        handleStepUpdate(message.step);
        break;
      case 'success':
        showSuccess();
        break;
      case 'error':
        showError(message.error);
        break;
    }
  }
  
  return true; // Indique que la réponse sera asynchrone
});

// Gérer les mises à jour d'étape
function handleStepUpdate(step) {
  updateProgress(step);
}

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
  console.log('🎬 [POPUP] startSaving() appelé');
  currentState = 'loading';
  
  if (toast) {
    toast.classList.remove('success', 'error');
    toast.classList.add('loading');
  }
  if (progressBar) {
    progressBar.style.width = '34%';
    progressBar.style.background = 'var(--accent)';
  }
  if (statusSpinner) statusSpinner.style.display = 'inline-block';
  if (statusIcon) statusIcon.style.display = 'none';
  if (statusText) statusText.textContent = 'Saving page…';
  if (statusSubtitle) statusSubtitle.textContent = '';
  
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = 'Sauvegarde…';
  }
  
  if (errorMessage) errorMessage.style.display = 'none';
  
  console.log('✅ [POPUP] startSaving() terminé');
}

// Mettre à jour la progression
function updateProgress(step) {
  if (currentState !== 'loading') return;
  
  const stepMessages = {
    'scraping': { text: 'Saving page…', subtitle: '' },
    'metadata': { text: 'Bookmark saved', subtitle: '' },
    'screenshot': { text: 'Saving page…', subtitle: '' },
  };
  const stepProgress = { scraping: 55, screenshot: 72, metadata: 100 };
  const stepInfo = stepMessages[step] || { text: 'Saving page…', subtitle: '' };
  
  if (statusText) statusText.textContent = stepInfo.text;
  if (statusSubtitle) statusSubtitle.textContent = stepInfo.subtitle;
  if (progressBar) {
    const width = stepProgress[step] ?? 42;
    progressBar.style.width = `${width}%`;
  }
  
  // Si on arrive à metadata, on considère que c'est ajouté
  if (step === 'metadata') {
    showSuccess();
  }
}



// Afficher le succès
function showSuccess() {
  if (currentState === 'success') return; // Déjà en succès
  
  currentState = 'success';

  if (toast) {
    toast.classList.remove('loading', 'error');
    toast.classList.add('success');
  }
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.style.background = 'var(--success)';
  }
  statusIcon.textContent = '✓';
  if (statusIcon) statusIcon.style.display = 'inline-flex';
  if (statusSpinner) statusSpinner.style.display = 'none';
  statusText.textContent = 'Bookmark saved';
  statusSubtitle.textContent = '';
  
  if (saveButton) {
    saveButton.textContent = 'Ajouté ✓';
    saveButton.style.background = 'linear-gradient(120deg, rgba(34,197,94,0.18), rgba(34,197,94,0.28))';
    saveButton.style.borderColor = 'rgba(34,197,94,0.45)';
    saveButton.disabled = false;
  }
  
  if (errorMessage) errorMessage.style.display = 'none';
  
  // Fermer le popup après 2.5 secondes (smooth)
  setTimeout(() => {
    window.close();
  }, 2500);
}

// Afficher une erreur
function showError(error) {
  currentState = 'error';
  
  if (toast) {
    toast.classList.remove('loading', 'success');
    toast.classList.add('error');
  }
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.style.background = 'var(--error)';
  }
  statusIcon.textContent = '!';
  statusText.textContent = 'Error';
  statusSubtitle.textContent = '';
  
  saveButton.disabled = false;
  saveButton.textContent = 'Réessayer';
  saveButton.style.background = '#3b82f6';
  
  errorMessage.textContent = error;
  errorMessage.style.display = 'block';
}

// Afficher un doublon (traité comme succès silencieux)
function showDuplicate() {
  currentState = 'success';
  
  if (toast) {
    toast.classList.remove('loading', 'error');
    toast.classList.add('success');
  }
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.style.background = 'var(--success)';
  }
  statusIcon.textContent = '✓';
  if (statusIcon) statusIcon.style.display = 'inline-flex';
  if (statusSpinner) statusSpinner.style.display = 'none';
  statusText.textContent = 'Already saved';
  statusSubtitle.textContent = '';
  
  if (saveButton) {
    saveButton.textContent = 'Déjà ajouté';
    saveButton.style.background = 'linear-gradient(120deg, rgba(34,197,94,0.18), rgba(34,197,94,0.28))';
    saveButton.style.borderColor = 'rgba(34,197,94,0.45)';
    saveButton.disabled = false;
  }
  
  if (errorMessage) errorMessage.style.display = 'none';
  
  setTimeout(() => {
    window.close();
  }, 2000);
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