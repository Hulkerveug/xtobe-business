'use strict';
/* Xtobe-2 content studio */
const $ = (s) => document.querySelector(s);
let lastResult = null;

function toast(m) {
  const t = $('#toast'); t.textContent = m; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
async function api(u, o) {
  const r = await fetch(u, Object.assign({ headers: { 'Content-Type': 'application/json' } }, o || {}));
  return r.json();
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function boot() {
  const s = await api('/api/stats');
  if (s.ok) $('#clinicName').textContent = s.clinic;
  loadQueue();
}

$('#gen').onclick = async () => {
  const topic = $('#topic').value.trim() || 'signature facial';
  const kind = $('#kind').value;
  $('#gen').disabled = true; $('#gen').textContent = 'Generating…';
  const out = await api('/api/content/generate', {
    method: 'POST', body: JSON.stringify({ kind, topic }),
  });
  $('#gen').disabled = false; $('#gen').textContent = 'Generate ✨';
  if (!out.ok) return toast(out.error || 'failed');
  lastResult = out.result;
  $('#modePill').className = 'mode-pill ' + (out.ai_configured ? 'live' : 'off');
  $('#modePill').textContent = out.ai_configured ? 'AI live' : 'offline templates';
  renderResult(out.result, kind);
};

function renderResult(r, kind) {
  const box = $('#result');
  if (kind === 'story' && r.frames) {
    box.innerHTML = '<div class="gen-result"><div class="sec">' +
      r.frames.map((f, i) => `<b>Frame ${i + 1}:</b> ${esc(f.text)} <span class="small">(${esc(f.sticker)})</span><br>` +
        `<span class="small">${esc(f.note || '')}</span>`).join('</div><div class="sec">') + '</div></div>';
    return;
  }
  if (kind === 'calendar' && r.days) {
    box.innerHTML = '<div class="gen-result"><div class="sec">' +
      r.days.map((d) => `<b>${esc(d.day)}</b> · ${esc(d.format)} · ${esc(d.idea)} <span class="small">${esc(d.best_time)}</span>`).join('<br>') +
      '</div></div>';
    return;
  }
  const tags = Array.isArray(r.hashtags) ? r.hashtags : [];
  box.innerHTML = `
    <div class="gen-result">
      <div class="sec"><b>Hook:</b> ${esc(r.hook || '')}</div>
      <div class="sec"><b>Shots:</b><br>${(r.shots || []).map((s) => '• ' + esc(s)).join('<br>')}</div>
      <div class="sec"><b>Voiceover:</b> ${esc(r.voiceover || '')}</div>
      <div class="sec"><b>Caption (EN):</b> ${esc(r.caption_en || '')}</div>
      <div class="sec"><b>Caption (AR):</b> ${esc(r.caption_ar || '')}</div>
      <div class="hashtags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
      <div class="sec"><b>CTA:</b> ${esc(r.cta || '')}</div>
      <button class="btn" id="copyBtn" style="margin-top:12px">Copy caption + hashtags</button>
    </div>`;
  $('#copyBtn').onclick = () => {
    const text = `${r.caption_en || ''}\n\n${r.caption_ar || ''}\n\n${tags.join(' ')}`;
    navigator.clipboard.writeText(text).then(() => toast('Copied ✓')).catch(() => toast('Copy failed'));
  };
}

$('#queueBtn').onclick = async () => {
  if (!lastResult) return toast('Generate something first');
  const when = $('#sched').value ? new Date($('#sched').value).toISOString() : null;
  const out = await api('/api/content/queue', {
    method: 'POST',
    body: JSON.stringify({
      kind: $('#kind').value,
      caption: lastResult.caption_en || '',
      hashtags: lastResult.hashtags || [],
      body: JSON.stringify(lastResult),
      scheduled_at: when,
    }),
  });
  toast(out.ok ? 'Added to queue ✓' : 'Failed');
  loadQueue();
};

async function loadQueue() {
  const d = await api('/api/content/queue');
  const q = d.queue || [];
  $('#queue').innerHTML = q.length
    ? q.map((i) => `
      <div class="qrow">
        <span class="kind">${esc(i.kind.toUpperCase())}</span>
        <span class="cap">${esc((i.caption || '').slice(0, 80))}</span>
        <span class="when">${i.scheduled_at ? new Date(i.scheduled_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'draft'}</span>
        <button class="del" data-id="${i.id}">✕</button>
      </div>`).join('')
    : '<div class="empty" style="padding:24px 10px">Queue is empty.</div>';
  document.querySelectorAll('.del').forEach((b) => (b.onclick = async () => {
    await api('/api/content/queue/' + b.dataset.id, { method: 'DELETE' });
    loadQueue();
  }));
}

boot();
