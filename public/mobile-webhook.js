(() => {
  const storageKey = 'xtobe_msgs';
  const status = document.getElementById('status');
  const inbox = document.getElementById('inbox');
  const text = document.getElementById('text');

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function render(messages) {
    inbox.innerHTML = messages.length ? messages.map((message) => `
      <article class="message">
        <div class="tag">${message.source === 'webhook' ? 'WEBHOOK' : 'LOCAL'}</div>
        <div>${escapeHtml(message.text)}</div>
        <small>${escapeHtml(message.from || '')} · ${escapeHtml(message.time || '')}</small>
      </article>`).join('') : '<div class="empty">No messages yet</div>';
  }

  async function sync() {
    try {
      const response = await fetch('/api/messages', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      status.textContent = `Online · ${data.count} from webhook`;
      render([...data.messages, ...readLocal()]);
    } catch {
      const local = readLocal();
      status.textContent = `Offline mode · ${local.length} local`;
      render(local);
    }
  }

  window.add = async function add() {
    const value = text.value.trim();
    if (!value) return;
    const local = readLocal();
    local.unshift({ text: value, from: 'You', time: new Date().toLocaleTimeString(), source: 'local' });
    localStorage.setItem(storageKey, JSON.stringify(local.slice(0, 100)));
    text.value = '';
    await sync();
  };

  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    sync();
    setInterval(sync, 10000);
  });
})();