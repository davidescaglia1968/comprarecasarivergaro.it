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

  /* --- 5. lightbox galleria (JS nativo: focus trap, Esc, frecce, contatore) --- */
  (function lightbox() {
    var shots = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
    if (!shots.length) return;
    var groups = {};
    shots.forEach(function (a) { (groups[a.getAttribute('data-lightbox')] = groups[a.getAttribute('data-lightbox')] || []).push(a); });
    var box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Foto dell immobile');
    box.innerHTML =
      '<div class="lb-top"><p class="lb-counter" aria-live="polite"></p><button type="button" class="lb-btn" data-lb="close" aria-label="Chiudi la galleria">Chiudi (Esc)</button></div>' +
      '<div class="lb-stage"><img alt=""></div>' +
      '<div class="lb-nav"><button type="button" class="lb-btn" data-lb="prev">← Prec.</button><p class="lb-cap"></p><button type="button" class="lb-btn" data-lb="next">Succ.</button></div>';
    document.body.appendChild(box);
    var img = box.querySelector('img'), cap = box.querySelector('.lb-cap'), counter = box.querySelector('.lb-counter');
    var cur = [], idx = 0, lastFocus = null;
    function show(i) {
      idx = (i + cur.length) % cur.length;
      var a = cur[idx];
      img.src = a.getAttribute('href');
      img.alt = (a.querySelector('img') && a.querySelector('img').getAttribute('alt')) || 'Foto dell immobile';
      cap.textContent = a.getAttribute('data-caption') || '';
      counter.textContent = cur.length > 1 ? 'Foto ' + (idx + 1) + ' di ' + cur.length : 'Foto 1';
    }
    function open(a) {
      cur = groups[a.getAttribute('data-lightbox')];
      lastFocus = document.activeElement;
      show(cur.indexOf(a));
      box.dataset.open = '1';
      document.body.style.overflow = 'hidden';
      box.querySelector('[data-lb="close"]').focus();
    }
    function close() {
      box.dataset.open = '0';
      document.body.style.overflow = '';
      img.removeAttribute('src');
      if (lastFocus) lastFocus.focus();
    }
    shots.forEach(function (a) {
      a.setAttribute('role', 'button');
      a.setAttribute('aria-label', 'Apri la foto a schermo intero');
      a.addEventListener('click', function (e) { e.preventDefault(); open(a); });
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]');
      if (!b) { if (e.target === box || e.target.classList.contains('lb-stage')) close(); return; }
      var k = b.getAttribute('data-lb');
      if (k === 'close') close();
      if (k === 'next') show(idx + 1);
      if (k === 'prev') show(idx - 1);
    });
    document.addEventListener('keydown', function (e) {
      if (box.dataset.open !== '1') return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'Tab') {
        var f = box.querySelectorAll('button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  })();

  /* --- 6. filtri catalogo (letti da data/properties.json, niente backend) --- */
  (function filtri() {
    var root = document.getElementById('filtri');
    var list = document.getElementById('catalogo');
    if (!root || !list) return;
    var cards = Array.prototype.slice.call(list.children);
    var count = document.getElementById('fl-count');
    var selects = Array.prototype.slice.call(root.querySelectorAll('[data-filter]'));
    function valori(a) {
      if (a.tagName === 'SELECT') return (a.value || '').toLowerCase();
      return (a.value || '').trim().toLowerCase();
    }
    function applica() {
      var f = {};
      selects.forEach(function (a) { var v = valori(a); if (v) f[a.getAttribute('data-filter')] = v; });
      var n = 0;
      cards.forEach(function (c) {
        var ok = true;
        Object.keys(f).forEach(function (k) {
          if (k === 'prezzo') {
            var p = Number(c.getAttribute('data-prezzo') || 0);
            if (!p || p > Number(f[k])) ok = false;
          } else {
            var v = (c.getAttribute('data-' + k) || '').toLowerCase();
            if (v !== f[k]) ok = false;
          }
        });
        c.hidden = !ok;
        if (ok) n++;
      });
      if (count) count.textContent = n === cards.length
        ? cards.length + ' immobili in catalogo'
        : n + (n === 1 ? ' immobile trovato su ' : ' immobili trovati su ') + cards.length;
      var empty = document.getElementById('fl-empty');
      if (empty) empty.hidden = n !== 0;
    }
    if (count) { var tot = cards.length; if (tot) count.textContent = tot + ' immobili in catalogo'; }
    selects.forEach(function (a) { a.addEventListener('input', applica); a.addEventListener('change', applica); });
    var reset = document.getElementById('fl-reset');
    if (reset) reset.addEventListener('click', function () {
      selects.forEach(function (a) { a.value = ''; });
      applica();
    });
    var none = document.createElement('div');
    none.id = 'fl-empty';
    none.className = 'empty-state';
    none.hidden = true;
    none.innerHTML = '<p>Nessuna scheda corrisponde a questi filtri. Prova ad allargare la zona o il budget — oppure dimmi cosa cerchi e cerco io.</p>' +
      '<a class="btn btn-primary" href="index.html#la-villa-non-fa-per-te">Ricerca personalizzata</a>';
    list.parentNode.insertBefore(none, list.nextSibling);
  })();
  var style = document.createElement('style');
  style.textContent = '.is-invalid{border-color:#fca5a5!important}.is-invalid:focus{outline-color:#fca5a5}';
  document.head.appendChild(style);
})();
