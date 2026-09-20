'use strict';
/**
 * Xtobe-2 — White-label branding engine.
 * Each clinic gets THEIR name, logo, colors on every screen.
 * "Powered by Xtobe" only in a small footer — we are invisible infrastructure.
 *
 * Branding JSON per clinic (stored in clinics.branding):
 * { name, tagline, logo_url, primary, accent, whatsapp, instagram, address }
 */

const DEFAULTS = {
  name: 'Xtobe Demo Clinic',
  tagline: 'Clinic Growth Engine',
  logo_url: null,
  primary: '#3E9EFF',
  accent: '#34d399',
  whatsapp: '+971 56 313 6305',
  instagram: null,
  address: 'Dubai, UAE',
};

module.exports = function brandModule(db) {
  const nowIso = () => new Date().toISOString();

  function getBranding(clinicId) {
    const row = db.prepare('SELECT branding FROM clinics WHERE id = ?').get(clinicId || 'default');
    if (!row || !row.branding) return { ...DEFAULTS };
    try { return { ...DEFAULTS, ...JSON.parse(row.branding) }; }
    catch { return { ...DEFAULTS }; }
  }

  function setBranding(clinicId, patch) {
    const cur = getBranding(clinicId);
    const next = { ...cur, ...patch };
    // ensure clinic row exists
    const exists = db.prepare('SELECT id FROM clinics WHERE id = ?').get(clinicId || 'default');
    if (!exists) {
      db.prepare(`INSERT INTO clinics (id, name, plan, usage_month, created_at) VALUES (?, ?, 'growth', ?, ?)`)
        .run(clinicId || 'default', next.name, nowIso().slice(0, 7), nowIso());
    }
    db.prepare('UPDATE clinics SET branding = ?, name = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(next), next.name, nowIso(), clinicId || 'default');
    return next;
  }

  /** CSS variables injected into every page for this clinic */
  function cssVars(brand) {
    return `:root{--brand-primary:${brand.primary};--brand-accent:${brand.accent}}`;
  }

  /** Apply branding to a page: title, logo, colors (used by all screens) */
  function applyScript(brand) {
    return `
(function(){
  var b = ${JSON.stringify(brand)};
  document.title = b.name + ' — ' + b.tagline;
  var st = document.createElement('style');
  st.textContent = '${cssVars(brand)}';
  document.head.appendChild(st);
  // replace nav brand text + logo
  document.querySelectorAll('.brand, [data-brand]').forEach(function(el){
    el.innerHTML = (b.logo_url ? '<img src="'+b.logo_url+'" style="height:26px;border-radius:7px"> ' : '') + (b.name || 'Clinic');
  });
  // recolor primary elements to clinic colors
  document.querySelectorAll('style').forEach(function(s){});
  if (b.primary) {
    var c = document.createElement('style');
    c.textContent = '.btn.w,.btn.b,nav .cta{background:'+b.primary+'!important;color:#fff!important} a.btn.p{background:'+b.primary+'!important} .stat .n{color:'+b.primary+'!important}';
    document.head.appendChild(c);
  }
  // footer powered-by (small, always ours)
  var f = document.querySelector('footer');
  if (f) {
    var pb = document.createElement('div');
    pb.style.cssText = 'text-align:center;padding:10px;opacity:.35;font-size:10px;letter-spacing:.12em';
    pb.textContent = 'POWERED BY XTOBE';
    f.appendChild(pb);
  }
})();`;
  }

  return { DEFAULTS, getBranding, setBranding, cssVars, applyScript };
};
