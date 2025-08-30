// Content script: relaye l'état du process depuis la webapp vers l'extension
(() => {
  const relay = (type) => (e) => {
    try { chrome.runtime.sendMessage({ type, detail: e.detail || {} }); } catch {}
  };

  // Double attachement pour document et window (certains frameworks dispatch sur document)
  ['saave:add-started','saave:add-progress','saave:add-finished','saave:add-error'].forEach((evt) => {
    const handler = relay(evt);
    window.addEventListener(evt, handler, { capture: true });
    document.addEventListener(evt, handler, { capture: true });
  });
})();


