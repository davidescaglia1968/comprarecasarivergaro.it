/* ============================================================
   comprarecasarivergaro.it — main.js (JS nativo, zero dipendenze)
   1) menu mobile   2) banner cookie/consenso   3) gate script opzionali
   4) validazione client dei moduli (l'invio resta a FormSubmit)
   Nessuna analitica, nessun tracciamento: vedi privacy_cookie in site-config.json
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'cookie_consent'; // allineato a casepodenzano.it
  var consent = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var save = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };

  /* --- 1. menu mobile ------------------------------------------------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  /* --- 2 + 3. consenso e script non essenziali ------------------------ */
  var GATE_ATTR = 'data-optional'; // <script data-optional data-src="..."> non carica finché non ci sono i "accetta"

  function applyConsent(value) {
    if (value !== 'accetta') return;
    document.querySelectorAll('script[' + GATE_ATTR + '][data-src]').forEach(function (el) {
      if (el.dataset.loaded) return;
      var s = document.createElement('script');
      s.src = el.getAttribute('data-src');
      s.async = true;
      if (el.getAttribute('data-optional') === 'map') s.defer = true;
      document.head.appendChild(s);
      el.dataset.loaded = '1';
    });
    document.querySelectorAll('[data-consent-placeholder]').forEach(function (box) {
      var src = box.getAttribute('data-src');
      if (!src) return;
      var f = document.createElement('iframe');
      f.src = src;
      f.width = box.getAttribute('data-width') || 600;
      f.height = box.getAttribute('data-height') || 340;
      f.loading = 'lazy';
      f.title = box.getAttribute('data-title') || 'Contenuto esterno';
      f.setAttribute('allowfullscreen', '');
      box.innerHTML = '';
      box.appendChild(f);
      box.dataset.embedded = '1';
    });
  }

  var banner = document.getElementById('cookie-banner');
  if (banner) {
    if (!consent()) {
      banner.hidden = false;
      var accept = document.getElementById('cookie-accept');
      var reject = document.getElementById('cookie-reject');
      var close = function () { banner.hidden = true; banner.setAttribute('hidden', ''); };
      if (accept) accept.addEventListener('click', function () { save('accetta'); applyConsent('accetta'); close(); });
      if (reject) reject.addEventListener('click', function () { save('tecnici'); close(); });
      var first = banner.querySelector('button');
      if (first) first.focus({ preventScroll: true });
    } else {
      applyConsent(consent());
    }
  } else if (consent() === 'accetta') {
    applyConsent('accetta');
  }

  /* --- 4. validazione locale dei moduli ------------------------------- */
  function mark(form, el, msg) {
    el.classList.add('is-invalid');
    var p = el.parentNode.querySelector('.form-error');
    if (!p) {
      p = document.createElement('span');
      p.className = 'form-error';
      p.setAttribute('role', 'status');
      el.parentNode.appendChild(p);
    }
    p.textContent = msg;
    el.setAttribute('aria-invalid', 'true');
  }
  function clear(form, el) {
    el.classList.remove('is-invalid');
    var p = el.parentNode.querySelector('.form-error');
    if (p) p.remove();
    el.removeAttribute('aria-invalid');
  }
  document.querySelectorAll('form.form').forEach(function (form) {
    form.setAttribute('novalidate', '');
    form.querySelectorAll('input,select,textarea').forEach(function (el) {
      el.addEventListener('blur', function () { validateOne(form, el); });
      el.addEventListener('input', function () { if (el.classList.contains('is-invalid')) clear(form, el); });
    });
    form.addEventListener('submit', function (e) {
      var ok = true;
      var firstBad = null;
      form.querySelectorAll('input[required],select[required],textarea[required]').forEach(function (el) {
        if (!validateOne(form, el)) { ok = false; if (!firstBad) firstBad = el; }
      });
      if (!ok) { e.preventDefault(); if (firstBad) firstBad.focus(); }
    });
  });
  function validateOne(form, el) {
    if (el.type === 'checkbox') {
      if (el.required && !el.checked) { mark(form, el, 'Serve la conferma per poterti rispondere.'); return false; }
      clear(form, el); return true;
    }
    var v = (el.value || '').trim();
    if (el.required && !v) { mark(form, el, 'Campo necessario.'); return false; }
    if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) { mark(form, el, 'Controlla l\u2019indirizzo email.'); return false; }
    clear(form, el);
    return true;
  }
  var style = document.createElement('style');
  style.textContent = '.is-invalid{border-color:#fca5a5!important}.is-invalid:focus{outline-color:#fca5a5}';
  document.head.appendChild(style);
})();
