'use strict';
/**
 * Xtobe-2 — injection.secure.js — white-label frontend loader.
 * Served from /injection.js ONLY to whitelisted Referer/Origin domains.
 *
 * Flow:
 *   1. Clinic page includes: <script src="https://host/injection.js" defer></script>
 *   2. This script calls POST /api/brand/session (same-origin cookie/CORS) to get
 *      a license token bound to (clinic_id, base_domain) — the browser never
 *      sees LICENSE_SECRET.
 *   3. It fetches the clinic brand and applies: --brand-primary CSS var,
 *      [data-xtobe-logo], [data-xtobe-name], title, and the REQUIRED
 *      "POWERED BY XTOBE" footer (10px, 35% opacity) per license.
 */
(function () {
  var API = (function () {
    try { return new URL(document.currentScript.src).origin; } catch (e) { return ''; }
  })();

  function post(url, body) {
    return fetch(API + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body || {}),
    });
  }

  function apply(brand) {
    var primary = brand.primary || '#3E9EFF';
    document.documentElement.style.setProperty('--brand-primary', primary);
    document.documentElement.style.setProperty('--xtobe-primary', primary);
    if (brand.accent) document.documentElement.style.setProperty('--brand-accent', brand.accent);
    if (brand.name) document.title = brand.name + ' — ' + (brand.tagline || 'Clinic Growth Engine');

    document.querySelectorAll('[data-xtobe-logo]').forEach(function (el) {
      if (el.tagName === 'IMG' && brand.logo_url) el.src = brand.logo_url;
      else if (brand.logo_url) el.style.backgroundImage = 'url(' + brand.logo_url + ')';
    });
    document.querySelectorAll('[data-xtobe-name]').forEach(function (el) { el.textContent = brand.name || ''; });

    if (!document.querySelector('[data-xtobe-powered]')) {
      var f = document.createElement('div');
      f.setAttribute('data-xtobe-powered', '1');
      f.style.cssText = 'text-align:center;padding:8px;opacity:.35;font-size:10px;letter-spacing:.12em';
      f.textContent = 'POWERED BY XTOBE';
      document.body.appendChild(f);
    }
  }

  function boot() {
    var clinicId = (document.querySelector('script[data-clinic]') || {}).dataset ? document.querySelector('script[data-clinic]').dataset.clinic : null;
    post('/api/brand/session', { clinic_id: clinicId || 'default' })
      .then(function (r) { if (!r.ok) throw new Error('session ' + r.status); return r.json(); })
      .then(function (s) {
        return fetch(API + '/api/brand?clinic_id=' + encodeURIComponent(s.clinic_id || 'default'), {
          headers: { 'x-clinic-id': s.clinic_id || 'default', 'x-license-token': s.token },
          credentials: 'include',
        });
      })
      .then(function (r) { if (!r.ok) throw new Error('brand ' + r.status); return r.json(); })
      .then(function (j) { apply(j.brand || j); })
      .catch(function (e) { console.error('XTOBE: brand not applied —', e.message); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
