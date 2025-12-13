// Content script: relaye l'état du process depuis la webapp vers l'extension
(() => {
  let pendingSuccessTimer = null;
  let notificationContainer = null;
  let currentState = 'hidden';

  const relay = (type) => (e) => {
    try { chrome.runtime.sendMessage({ type, detail: e.detail || {} }); } catch {}
  };

  // Double attachement pour document et window (certains frameworks dispatch sur document)
  ['saave:add-started','saave:add-progress','saave:add-finished','saave:add-error'].forEach((evt) => {
    const handler = relay(evt);
    window.addEventListener(evt, handler, { capture: true });
    document.addEventListener(evt, handler, { capture: true });
  });

  // Create smooth notification UI
  function createNotification() {
    console.log('🏗️ Creating notification UI...');
    if (notificationContainer) {
      console.log('✅ Notification container already exists');
      return notificationContainer;
    }

    const container = document.createElement('div');
    container.className = 'saave-notification-container hidden';
    container.innerHTML = `
      <div class="saave-notification-card">
        <div class="saave-notification-content">
          <div class="saave-notification-icon">
            <div class="saave-notification-spinner"></div>
            <svg class="saave-notification-checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <svg class="saave-notification-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
          </div>
          <div class="saave-notification-text">Saving page...</div>
        </div>
        <div class="saave-notification-actions">
          <button class="saave-notification-btn" data-saave-action="primary" type="button"></button>
          <button class="saave-notification-btn secondary" data-saave-action="dismiss" type="button">Dismiss</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    notificationContainer = container;
    console.log('✅ Notification container created and appended to body');
    console.log('Container element:', container);
    return container;
  }

  function showNotification(text, state = 'loading', progress = 35) {
    console.log('🔔🔔🔔 SHOW NOTIFICATION CALLED 🔔🔔🔔');
    console.log('Text:', text);
    console.log('State:', state);
    console.log('Progress:', progress);

    const container = createNotification();
    const textEl = container.querySelector('.saave-notification-text');
    const spinner = container.querySelector('.saave-notification-spinner');
    const checkmark = container.querySelector('.saave-notification-checkmark');
    const errorIcon = container.querySelector('.saave-notification-error-icon');
    const actions = container.querySelector('.saave-notification-actions');
    const primaryBtn = container.querySelector('[data-saave-action="primary"]');
    const progressBar = null;

    console.log('Elements found:', {
      textEl: !!textEl,
      spinner: !!spinner,
      checkmark: !!checkmark,
      errorIcon: !!errorIcon,
      progressBar: !!progressBar
    });

    currentState = state;
    container.classList.remove('hidden', 'success', 'error', 'closing', 'has-actions');
    console.log('✅ Removed hidden class, notification should be visible now');
    console.log('Container classes:', container.className);

    if (textEl) textEl.textContent = text;
    // progress bar removed intentionally (minimal shadcn style)
    try {
      if (actions) actions.style.display = 'none';
      if (primaryBtn) primaryBtn.textContent = '';
      container.dataset.saavePrimaryTarget = '';
    } catch {}

    if (state === 'loading') {
      console.log('⏳ Setting LOADING state');
      spinner.style.display = 'block';
      checkmark.style.display = 'none';
      errorIcon.style.display = 'none';
    } else if (state === 'success') {
      console.log('✅ Setting SUCCESS state');
      container.classList.add('success');
      spinner.style.display = 'none';
      checkmark.style.display = 'block';
      errorIcon.style.display = 'none';
      if (progressBar) progressBar.style.width = '100%';

      // Auto-hide after 2.5 seconds
      console.log('⏰ Auto-hide scheduled in 2.5s');
      setTimeout(() => hideNotification(), 2500);
    } else if (state === 'error') {
      console.log('❌ Setting ERROR state');
      container.classList.add('error');
      spinner.style.display = 'none';
      checkmark.style.display = 'none';
      errorIcon.style.display = 'block';
      if (progressBar) progressBar.style.width = '100%';

      // Auto-hide after 3 seconds
      console.log('⏰ Auto-hide scheduled in 3s');
      setTimeout(() => hideNotification(), 3000);
    }

    console.log('✅ showNotification() completed');
  }

  function hideNotification() {
    if (!notificationContainer) return;

    notificationContainer.classList.add('closing');
    setTimeout(() => {
      if (notificationContainer) {
        notificationContainer.classList.add('hidden');
        notificationContainer.classList.remove('closing');
      }
    }, 250);
  }

  // Listen for messages from background script (for extension icon click)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨📨📨 CONTENT SCRIPT RECEIVED MESSAGE 📨📨📨');
    console.log('Message:', JSON.stringify(message, null, 2));
    console.log('Sender:', sender);

    // Handle direct saveBookmark action
    if (message.action === 'saveBookmark') {
      showNotification('Saving page...', 'loading', 35);
      sendResponse({ status: 'notification shown' });
      return true;
    }

    // Handle progress updates
    if (message.type === 'progress') {
      const stepProgress = {
        'scraping': 50,
        'screenshot': 75,
        'metadata': 95
      };
      const progress = stepProgress[message.step] || 50;
      showNotification('Saving page...', 'loading', progress);

      if (message.step === 'metadata') {
        setTimeout(() => showNotification('Bookmark saved!', 'success'), 300);
      }
      return true;
    }

    // Handle success/error from background
    if (message.type === 'success') {
      showNotification('Bookmark saved!', 'success');
      return true;
    }

    if (message.type === 'error') {
      showNotification(message.error || 'Error saving', 'error');
      return true;
    }

    // Handle toast messages (from background script via chrome.action.onClicked)
    if (message.type === 'saave:toast') {
      console.log('🍞 Toast message detected!');
      console.log('Action:', message.action);

      if (message.action === 'start') {
        console.log('🚀 START action - showing loading notification');
        if (pendingSuccessTimer) {
          try { clearTimeout(pendingSuccessTimer); } catch {}
          pendingSuccessTimer = null;
        }
        showNotification(message.text || 'Saving page...', 'loading', 35);
      } else if (message.action === 'success') {
        console.log('✅ SUCCESS action - showing success notification');
        if (pendingSuccessTimer) {
          try { clearTimeout(pendingSuccessTimer); } catch {}
          pendingSuccessTimer = null;
        }
        showNotification(message.text || 'Bookmark saved!', 'success', 100);
      } else if (message.action === 'error') {
        console.log('❌ ERROR action - showing error notification');
        if (pendingSuccessTimer) {
          try { clearTimeout(pendingSuccessTimer); } catch {}
          pendingSuccessTimer = null;
        }
        showNotification(message.text || 'Failed to save', 'error', 100);
      } else if (message.action === 'duplicate') {
        console.log('🔄 DUPLICATE action - showing duplicate notification');
        if (pendingSuccessTimer) {
          try { clearTimeout(pendingSuccessTimer); } catch {}
          pendingSuccessTimer = null;
        }
        showNotification(message.text || 'Already saved', 'success', 100);
      } else if (message.action === 'hide') {
        hideNotification();
      } else if (message.action === 'login') {
        showNotification(message.text || 'Login required', 'error', 100);
        try {
          const container = createNotification();
          const actions = container.querySelector('.saave-notification-actions');
          const primaryBtn = container.querySelector('[data-saave-action="primary"]');
          container.classList.add('has-actions');
          container.dataset.saavePrimaryTarget = message.target || 'login';
          if (primaryBtn) primaryBtn.textContent = message.buttonText || 'Login';
          if (actions) actions.style.display = 'flex';
        } catch {}
      } else if (message.action === 'upgrade') {
        showNotification(message.text || 'Upgrade required', 'error', 100);
        try {
          const container = createNotification();
          const actions = container.querySelector('.saave-notification-actions');
          const primaryBtn = container.querySelector('[data-saave-action="primary"]');
          container.classList.add('has-actions');
          container.dataset.saavePrimaryTarget = message.target || 'upgrade';
          if (primaryBtn) primaryBtn.textContent = message.buttonText || 'Upgrade';
          if (actions) actions.style.display = 'flex';
        } catch {}
      }
      sendResponse({ received: true });
      return true;
    }

    return true;
  });

  // Legacy toast function for backward compatibility
  function showToast(text, state) {
    showNotification(text, state, state === 'success' ? 100 : 50);
  }

  function hideToast(delayMs = 0) {
    if (delayMs <= 0) {
      hideNotification();
    } else {
      setTimeout(() => hideNotification(), delayMs);
    }
  }

  // Écouter les messages de l'app via window.postMessage
  window.addEventListener('message', (event) => {
    // Sécurité : vérifier l'origine
    if (event.source !== window) return;
    if (!event.data || typeof event.data !== 'object') return;
    
    if (event.data.type === 'saave:bookmarkStarted') {
      console.log('[CONTENT] Received bookmarkStarted from app, notifying background');
      // Relayer au background script
      chrome.runtime.sendMessage({
        type: 'bookmarkStarted',
        id: event.data.id,
        url: event.data.url
      });
    }
  });

  // Click handlers for CTA buttons (login / upgrade)
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest('[data-saave-action]');
    if (!btn) return;
    const container = notificationContainer;
    const action = btn.getAttribute('data-saave-action') || '';
    if (action === 'dismiss') {
      hideNotification();
      return;
    }
    if (action === 'primary') {
      const target = (container && container.dataset && container.dataset.saavePrimaryTarget) ? container.dataset.saavePrimaryTarget : '';
      try { chrome.runtime.sendMessage({ type: 'saave:open', target }); } catch {}
    }
  }, { capture: true });

})();


