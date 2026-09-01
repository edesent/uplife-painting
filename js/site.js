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
     There is no backend on this site yet. The form validates, then shows the
     confirmation panel so the flow can be demonstrated end to end. Wire a real
     handler (see README) before telling anyone the form delivers mail. */
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      form.closest('[data-formwrap]').classList.add('is-sent');
      form.reset();
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
