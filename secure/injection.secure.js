/**
 * XTOBE BUSINESS — SECURE INJECTION SCRIPT
 * Served ONLY if Referer/Origin in ALLOWED_DOMAINS + valid token
 * © 2026 XTOBE BUSINESS — Proprietary
 */
(function(){
  const script = document.currentScript;
  if (!script) return;
  const clinicId = script.dataset.clinic || script.getAttribute('data-clinic') || 'default';
  const token = script.dataset.token || script.getAttribute('data-token');
  const apiBase = script.dataset.api || 'https://api.xtobe.ae'; // or https://xtobe-business.onrender.com

  if (!token) {
    console.error('XTOBE: Missing data-token — get token via HMAC(clinic_id|domain, LICENSE_SECRET)');
    return;
  }

  const headers = {
    'x-clinic-id': clinicId,
    'x-xtobe-license': token
  };

  fetch(`${apiBase}/api/brand/${encodeURIComponent(clinicId)}?token=${encodeURIComponent(token)}`, { headers })
    .then(r=>{
      if (!r.ok) throw new Error('License invalid '+r.status);
      return r.json();
    })
    .then(brand=>{
      // Apply brand
      const primary = brand.primary || brand.primary_color || '#3E9EFF';
      document.documentElement.style.setProperty('--primary', primary);
      document.documentElement.style.setProperty('--xtobe-primary', primary);

      if (brand.name) document.title = brand.name + ' | ' + (brand.tagline || "Growth Engine");

      // Logo
      const logoEls = document.querySelectorAll('[data-xtobe-logo]');
      logoEls.forEach(el=>{
        if (el.tagName === 'IMG') el.src = brand.logo_url || brand.logo;
        else el.style.backgroundImage = `url(${brand.logo_url||brand.logo})`;
      });

      // Name
      const nameEls = document.querySelectorAll('[data-xtobe-name]');
      nameEls.forEach(el=>{ el.textContent = brand.name; });

      // Colors
      if (brand.colors) {
        Object.entries(brand.colors).forEach(([k,v])=>{
          document.documentElement.style.setProperty(`--${k}`, v);
        });
      }

      // REQUIRED footer per license — 10px 35% opacity
      if (!document.querySelector('[data-xtobe-powered]')) {
        const footer = document.createElement('div');
        footer.setAttribute('data-xtobe-powered','true');
        footer.innerHTML = `<div style="font-size:10px;opacity:0.35;text-align:center;padding:8px;letter-spacing:0.5px;">POWERED BY XTOBE</div>`;
        document.body.appendChild(footer);
      }

      // Invisible watermark already added server-side, add client confirmation
      const meta = document.querySelector('meta[name="xtobe-license"]');
      if (meta) console.log('XTOBE LICENSE', meta.content, 'clinic', clinicId);
    })
    .catch(e=>{
      console.error('XTOBE: License verification failed — brand not applied', e);
      // Do not apply brand, leave default
    });
})();
