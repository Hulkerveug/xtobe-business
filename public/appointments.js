'use strict';
/* Xtobe-2 appointments page */
const $ = (s) => document.querySelector(s);
const state = { day: new Date().toISOString().slice(0, 10) };

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
const hhmm = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

async function load() {
  const s = await api('/api/stats');
  if (s.ok) $('#clinicName').textContent = s.clinic;
  $('#day').value = state.day;
  const d = await api('/api/appointments?date=' + state.day);
  $('#dayCount').textContent = d.count + ' bookings';
  $('#slots').innerHTML = d.appointments.length
    ? d.appointments.map((a) => `
      <div class="slot">
        <span class="tm">${hhmm(a.start_at)}</span>
        <div><div class="svc">${esc(a.service)}</div>
        <div class="who">${esc(a.client_name)} · ${a.phone_masked || ''} · ${a.status}</div></div>
        ${a.price_aed ? `<span class="px">AED ${a.price_aed}</span>` : ''}
        ${a.status === 'booked' ? `<button class="x" data-id="${a.id}" title="Cancel">✕</button>` : ''}
      </div>`).join('')
    : '<div class="empty" style="padding:24px 10px">No bookings this day.</div>';
  document.querySelectorAll('.x').forEach((b) => (b.onclick = async () => {
    await api('/api/appointments/' + b.dataset.id + '/cancel', { method: 'POST' });
    toast('Cancelled');
    load();
  }));
}

$('#book').onclick = async () => {
  const name = $('#fName').value.trim();
  const phone = $('#fPhone').value.trim();
  const time = $('#fTime').value || '17:00';
  if (!phone) return toast('Add a WhatsApp number');
  const out = await api('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      name, phone, service: $('#fService').value,
      price_aed: Number($('#fPrice').value) || null,
      start_at: state.day + 'T' + time + ':00.000Z',
    }),
  });
  toast(out.sent ? 'Booked + WhatsApp confirmation sent ✓' : (out.warning || 'Booked (confirmation not sent)'));
  $('#fName').value = ''; $('#fPhone').value = '';
  load();
};

$('#day').onchange = (e) => { state.day = e.target.value; load(); };
const shift = (d) => { const t = new Date(state.day + 'T00:00:00Z'); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
$('#prev').onclick = () => { state.day = shift(-1); load(); };
$('#next').onclick = () => { state.day = shift(1); load(); };

const q = new URLSearchParams(location.search);
if (q.get('client_id')) $('#fName').value = q.get('name') || '';
load();
