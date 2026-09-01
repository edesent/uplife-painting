/* UpLife Painting — mobile nav, scroll reveal, gallery lightbox, form stub.
   No dependencies. Loaded with `defer` from every page. */
(function () {
  'use strict';

  /* ---- mobile nav ---- */
  var burger = document.querySelector('.burger');
  if (burger) {
    var nav = document.querySelector('.nav');
    var cta = document.querySelector('.header__cta');
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('nav--open');
      if (cta) cta.classList.toggle('header__cta--open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---- reveal on scroll ---- */
  var targets = document.querySelectorAll('.reveal');
  if (targets.length) {
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      targets.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---- lightbox for gallery shots ---- */
  var shots = Array.prototype.slice.call(document.querySelectorAll('[data-lb]'));
  if (shots.length) {
    var box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Project photo');
    box.innerHTML =
      '<button class="lb__close" type="button" aria-label="Close">×</button>' +
      '<button class="lb__nav lb__prev" type="button" aria-label="Previous photo">‹</button>' +
      '<button class="lb__nav lb__next" type="button" aria-label="Next photo">›</button>' +
      '<div><img alt=""><p class="lb__cap"></p></div>';
    document.body.appendChild(box);

    var img = box.querySelector('img');
    var cap = box.querySelector('.lb__cap');
    var idx = 0;
    var opener = null;

    function show(i) {
      idx = (i + shots.length) % shots.length;
      var src = shots[idx];
      var full = src.getAttribute('data-lb') || src.querySelector('img').src;
      img.src = full;
      img.alt = src.querySelector('img').alt || '';
      cap.textContent = src.getAttribute('data-cap') || img.alt;
    }
    function open(i, from) {
      opener = from || null;
      show(i);
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      box.querySelector('.lb__close').focus();
    }
    function close() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      img.src = '';
      if (opener) opener.focus();
    }

    shots.forEach(function (s, i) {
      s.addEventListener('click', function () { open(i, s); });
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          open(i, s);
        }
      });
    });
    box.querySelector('.lb__close').addEventListener('click', close);
    box.querySelector('.lb__prev').addEventListener('click', function () { show(idx - 1); });
    box.querySelector('.lb__next').addEventListener('click', function () { show(idx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---- estimate form ----
     Posts to /api/estimate. The confirmation panel is only shown when the API
     confirms a lead was actually delivered somewhere — see api/estimate.js. */
  document.querySelectorAll('form[data-estimate]').forEach(function (form) {
    var wrap = form.closest('[data-formwrap]');
    var errBox = wrap.querySelector('[data-error]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';
    var shown = Date.now();

    function fail(msg) {
      if (!errBox) return;
      errBox.querySelector('[data-error-msg]').textContent = msg;
      errBox.hidden = false;
      errBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (errBox) errBox.hidden = true;

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.elapsed = Date.now() - shown;

      if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }

      fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          return { ok: r.ok, status: r.status, body: j };
        });
      }).then(function (r) {
        if (r.ok && r.body.ok) { wrap.classList.add('is-sent'); return; }
        fail(
          r.body.code === 'not_configured' || r.status === 503
            ? 'This form is not taking messages just yet. Please call or text 586-356-3663 and we will get straight back to you.'
            : r.body.code === 'bad_phone'
              ? 'That phone number does not look right \u2014 please check it and try again.'
              : 'Sorry, that did not go through. Please call or text 586-356-3663 and we will get straight back to you.'
        );
      }).catch(function () {
        fail('Sorry, that did not go through \u2014 you may be offline. Please call or text 586-356-3663.');
      }).then(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
      });
    });
  });

  /* ---- mark the current page in the nav ---- */
  var here = location.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (here.length > 1) here = here.replace(/\/$/, '');
  document.querySelectorAll('.nav a').forEach(function (a) {
    var href = a.getAttribute('href').replace(/\.html$/, '').replace(/\/$/, '');
    if (href === here || (here === '' && href === '/')) a.setAttribute('aria-current', 'page');
  });
})();
