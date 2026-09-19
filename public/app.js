'use strict';
/* Xtobe-2 dashboard â€” inbox, thread, client card. Vanilla JS, no build step. */

const $ = (s) => document.querySelector(s);
const state = { convs: [], active: null, client: null };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function hhmm(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function initials(name) {
  return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const CH_ICON = { whatsapp: 'W', instagram: 'IG', facebook: 'FB' };
const CH_CLASS = { whatsapp: 'wa', instagram: 'ig', facebook: 'fb' };

async function api(url, opts) {
  const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
  return res.json();
}

/* ---------------- stats + channels ---------------- */
async function loadStats() {
  const s = await api('/api/stats');
  if (!s.ok) return;
  $('#clinicName').textContent = s.clinic;
  $('#kpiAppts').textContent = s.appointments_today;
  $('#kpiRev').textContent = `${s.currency} ${Number(s.revenue_today || 0).toLocaleString()}`;
  $('#inboxHead').textContent = `CONVERSATIONS (${s.unread} unread)`;
  if (s.channels && s.channels.instagram) $('#chipIg').className = 'chip on';
  if (s.channels && s.channels.facebook) $('#chipFb').className = 'chip on';
}

/* ---------------- conversation list ---------------- */
async function loadInbox(keepActive) {
  const data = await api('/api/inbox');
  if (!data.ok) return;
  state.convs = data.conversations || [];
  const list = $('#convs');
  if (!state.convs.length) {
    list.innerHTML = '<div class="empty">No conversations yet.<br>Send a WhatsApp message to your business number, or POST a test webhook.</div>';
    return;
  }
  list.innerHTML = state.convs.map((c) => `
    <div class="conv ${state.active === c.id ? 'sel' : ''}" data-id="${c.id}">
      <div class="av">${initials(c.name)}<span class="ch ${CH_CLASS[c.channel] || 'wa'}">${CH_ICON[c.channel] || 'W'}</span></div>
      <div class="mid">
        <div class="nm">${esc(c.name)}</div>
        <div class="lm">${esc(c.last_message || 'â€”')}</div>
      </div>
      <div class="rt">
        <div class="tm">${hhmm(c.last_message_at)}</div>
        ${c.unread ? `<div class="badge">${c.unread}</div>` : ''}
      </div>
    </div>`).join('');
  list.querySelectorAll('.conv').forEach((el) => {
    el.onclick = () => openConv(Number(el.dataset.id));
  });
  if (keepActive && state.active) return;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- thread ---------------- */
async function openConv(id) {
  state.active = id;
  const d = await api('/api/conversations/' + id);
  if (!d.ok) return toast('Conversation not found');
  state.client = d.client;
  $('#thAv').textContent = initials(d.client.name);
  $('#thName').textContent = d.client.name;
  $('#thSub').textContent = `${d.client.phone_masked || 'masked'} Â· ${d.conversation.channel} Â· ${d.client.consent ? 'consent on' : 'consent pending'}`;
  $('#msgs').innerHTML = (d.messages || []).map((m) => {
    const cls = m.direction === 'in' ? 'in' : (m.status === 'failed' ? 'out failed' : 'out');
    const note = m.direction === 'out'
      ? `${m.status}${m.provider_id ? ' Â· ' + String(m.provider_id).slice(-8) : ''}`
      : 'received';
    return `<div class="bub ${cls}">${esc(m.body)}<div class="meta">${hhmm(m.created_at)} Â· ${note}</div></div>`;
  }).join('') || '<div class="empty">No messages yet.</div>';
  $('#msgs').scrollTop = $('#msgs').scrollHeight;
  $('#sendBtn').disabled = false;
  renderClientCard(d);
  loadInbox(true);
}

function renderClientCard(d) {
  const c = d.client || {};
  const appts = d.upcoming || [];
  $('#clientCard').innerHTML = `
    <div class="card">
      <div class="lbl">CLIENT</div>
      <div class="val">${esc(c.name)}</div>
      <div class="small">${esc(c.phone_masked || 'masked')}</div>
      <div class="small">Consent: <b>${c.consent ? 'given' : 'not yet'}</b></div>
    </div>
    <div class="card">
      <div class="lbl">LAST VISIT</div>
      <div class="val">${esc(c.last_visit || 'first-time client')}</div>
    </div>
    <div class="card">
      <div class="lbl">UPCOMING</div>
      ${appts.length ? appts.map((a) => `
        <div class="appt"><span class="t">${hhmm(a.start_at)}</span>
        <span>${esc(a.service)}</span></div>`).join('')
      : '<div class="small">No appointment booked.</div>'}
      <button class="btn" id="bookBtn">Book appointment â†’</button>
    </div>
    <div class="card">
      <div class="lbl">NOTES</div>
      <textarea id="notesBox" placeholder="Skin type, allergies, preferences...">${esc(c.notes || '')}</textarea>
      <button class="btn" id="saveNotes">Save notes</button>
    </div>
    <div class="card">
      <div class="lbl">PRIVACY</div>
      <div class="small">Numbers are masked in this UI. Consent-based only â€” no cold messaging, no spoofing.</div>
    </div>`;
  $('#saveNotes').onclick = async () => {
    await api('/api/clients/' + c.id, { method: 'PATCH', body: JSON.stringify({ notes: $('#notesBox').value }) });
    toast('Notes saved');
  };
  $('#bookBtn').onclick = () => {
    location.href = `./appointments?client_id=${c.id}&name=${encodeURIComponent(c.name)}`;
  };
}

/* ---------------- send reply ---------------- */
async function sendReply() {
  const box = $('#reply');
  const text = box.value.trim();
  if (!text || !state.active) return;
  $('#sendBtn').disabled = true;
  const out = await api('/api/send', {
    method: 'POST',
    body: JSON.stringify({ conversation_id: state.active, text }),
  });
  box.value = '';
  $('#sendBtn').disabled = false;
  if (out.warning) toast(out.warning);
  else toast(out.status === 'sent' ? 'Sent via WhatsApp âœ“' : 'Queued');
  openConv(state.active);
}

$('#sendBtn').onclick = sendReply;
$('#reply').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
});

/* ---------------- boot ---------------- */
async function boot() {
  await loadStats();
  await loadInbox();
  if (state.convs.length) openConv(state.convs[0].id);
  setInterval(() => { loadStats(); loadInbox(true); }, 15000);
}
boot();
