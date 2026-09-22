/* Xtobe-2 — auth gate (Step 2 lockdown client side).
   Loaded first in every dashboard page. If API lockdown is enabled and
   there is no valid session, shows a login overlay and patches fetch()
   to attach the Bearer token. Zero dependencies. */
(function () {
  'use strict';
  var token = sessionStorage.getItem('xtobe_token') || '';

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (token && url.indexOf('/api/auth/') === -1) {
        init = init || {};
        init.headers = new Headers(init.headers || (input && input.headers) || {});
        if (!init.headers.has('Authorization')) init.headers.set('Authorization', 'Bearer ' + token);
        if (typeof input === 'string') input = url; else input = new Request(url, input);
      }
    } catch (e) { /* never break the app over header patching */ }
    return origFetch(input, init);
  };

  function overlay() {
    if (document.getElementById('xtobe-auth-overlay')) return;
    var d = document.createElement('div');
    d.id = 'xtobe-auth-overlay';
    d.setAttribute('style', 'position:fixed;inset:0;background:rgba(10,12,18,.92);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;font-family:sans-serif;');
    d.innerHTML =
      '<div style="background:#fff;border-radius:12px;padding:28px;width:300px;max-width:90vw;">' +
      '<h2 style="margin:0 0 4px;font-size:18px;color:#111;">Clinic Dashboard</h2>' +
      '<p style="margin:0 0 14px;font-size:12px;color:#666;">Sign in to continue</p>' +
      '<input id="xtobe-auth-user" placeholder="Username" autocomplete="username"' +
      ' style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;font-size:14px;">' +
      '<input id="xtobe-auth-pass" type="password" placeholder="Password" autocomplete="current-password"' +
      ' style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:12px;font-size:14px;">' +
      '<button id="xtobe-auth-btn" style="width:100%;padding:10px;border:0;border-radius:8px;background:#3E9EFF;color:#fff;font-weight:600;cursor:pointer;font-size:14px;">Sign in</button>' +
      '<p id="xtobe-auth-err" style="color:#c0392b;font-size:12px;margin:8px 0 0;min-height:14px;"></p>' +
      '</div>';
    document.body.appendChild(d);

    function submit() {
      var u = document.getElementById('xtobe-auth-user').value.trim();
      var p = document.getElementById('xtobe-auth-pass').value;
      var err = document.getElementById('xtobe-auth-err');
      err.textContent = '';
      origFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      }).then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (res) {
          if (res.status === 423) { err.textContent = 'Locked — try again in 30 minutes.'; return; }
          if (!res.ok || !res.j.ok) { err.textContent = 'Invalid credentials.'; return; }
          token = res.j.token;
          sessionStorage.setItem('xtobe_token', token);
          d.remove();
        })
        .catch(function () { err.textContent = 'Network error.'; });
    }
    document.getElementById('xtobe-auth-btn').addEventListener('click', submit);
    d.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }

  function gate() {
    origFetch('/api/auth/me').then(function (r) { return r.json(); }).then(function (j) {
      if (j.enabled && !j.authenticated) overlay();
    }).catch(function () { /* API unreachable — let the app surface it */ });
  }

  // global logout hook
  window.xtobeLogout = function () {
    origFetch('/api/auth/logout', { method: 'POST' }).then(function () {
      sessionStorage.removeItem('xtobe_token');
      location.reload();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gate);
  else gate();
})();