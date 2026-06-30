/* =========================================================
   Agro-Place — интерактив (vanilla JS, без зависимостей)
   ========================================================= */
(function () {
  'use strict';

  /* ---------- состояние формы продавца ---------- */
  var seller = {
    orgName: '', inn: '', fio: '', email: '', phone: '',
    spec: '', assortment: '', brands: '', notify: 'sms',
    phoneVerified: false, agreePd: false, agreeNotify: false
  };

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- тема (тёмная по умолчанию) ---------- */
  function applyTheme(isLight) {
    var root = document.documentElement;
    if (isLight) {
      root.removeAttribute('data-theme');
      localStorage.setItem('agro-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('agro-theme', 'light');
    }
  }

  function toggleTheme(originEl) {
    var root = document.documentElement;
    var isLight = root.getAttribute('data-theme') === 'light';
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!document.startViewTransition || reduceMotion) {
      applyTheme(isLight);
      return;
    }

    var rect = originEl && originEl.getBoundingClientRect ? originEl.getBoundingClientRect() : null;
    var x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    var y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    var endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    var transition = document.startViewTransition(function () { applyTheme(isLight); });
    transition.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + endRadius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 600, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
      );
    });
  }

  /* ---------- навигация между экранами ---------- */
  var screens = {
    landing: $('#screen-landing'),
    seller:  $('#screen-seller'),
    success: $('#screen-success')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('is-hidden', key !== name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToId(id) {
    function go() {
      var el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
    }
    if (screens.landing.classList.contains('is-hidden')) {
      showScreen('landing');
      setTimeout(go, 80);
    } else {
      go();
    }
  }

  /* ---------- переключатель аудитории ---------- */
  var audienceTitles = {
    buyer:  'Выгодное условие для каждой из сторон',
    seller: 'Выгодное партнерство для каждой из сторон на понятных условиях'
  };

  function setAudience(role) {
    $$('.toggle__btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-audience') === role);
    });
    $$('.aud').forEach(function (panel) {
      panel.classList.toggle('is-hidden', panel.getAttribute('data-panel') !== role);
    });
    var title = $('#audience-title');
    if (title && audienceTitles[role]) title.textContent = audienceTitles[role];
  }

  /* ---------- делегирование data-action ---------- */
  document.addEventListener('click', function (e) {
    var actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      switch (action) {
        case 'go-home':
        case 'go-landing': e.preventDefault(); showScreen('landing'); break;
        case 'go-seller':  showScreen('seller'); break;
        case 'nav-buyer':  setAudience('buyer');  scrollToId('audience'); break;
        case 'nav-seller': setAudience('seller'); scrollToId('audience'); break;
        case 'scroll-why':    scrollToId('why'); break;
        case 'scroll-notify': scrollToId('notify'); break;
        case 'toggle-theme':  toggleTheme(actionEl); break;
      }
      return;
    }
    var audBtn = e.target.closest('.toggle__btn');
    if (audBtn) { setAudience(audBtn.getAttribute('data-audience')); }
  });

  /* ---------- форма «Сообщить о запуске» ---------- */
  var leadForm   = $('#lead-form');
  var leadPdBtn  = $('#lead-pd');
  var leadSubmit = $('#lead-submit');
  var leadPdOk   = false;

  if (leadPdBtn) {
    leadPdBtn.addEventListener('click', function () {
      leadPdOk = !leadPdOk;
      leadPdBtn.classList.toggle('is-active', leadPdOk);
      if (leadSubmit) leadSubmit.disabled = !leadPdOk;
    });
  }

  if (leadForm) {
    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!leadPdOk) return;
      $('#lead-email').classList.add('is-hidden');
      $('#lead-phone').classList.add('is-hidden');
      $('#lead-submit').classList.add('is-hidden');
      if (leadPdBtn) leadPdBtn.classList.add('is-hidden');
      $('#lead-done').classList.remove('is-hidden');
    });
  }

  /* ---------- форма продавца: текстовые поля ---------- */
  $$('[data-field]').forEach(function (input) {
    var key = input.getAttribute('data-field');
    var evt = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(evt, function () {
      seller[key] = input.value;
      updateSubmit();
    });
  });

  /* ---------- подтверждение телефона по СМС ---------- */
  var getCodeBtn = $('#get-code');
  var codeRow    = $('#code-row');
  var verifiedEl = $('#phone-verified');

  if (getCodeBtn) {
    getCodeBtn.addEventListener('click', function () {
      var digits = (seller.phone || '').replace(/\D/g, '');
      if (digits.length >= 5) {
        codeRow.classList.remove('is-hidden');
        getCodeBtn.classList.add('is-hidden');
        var code = $('#sms-code');
        if (code) code.focus();
      }
    });
  }

  var verifyBtn = $('#verify-code');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', function () {
      var val = ($('#sms-code').value || '').replace(/\D/g, '');
      if (val.length >= 4) {
        seller.phoneVerified = true;
        codeRow.classList.add('is-hidden');
        verifiedEl.classList.remove('is-hidden');
        updateSubmit();
      }
    });
  }

  /* ---------- радиокнопки ассортимента ---------- */
  var assortGroup = $('[data-radio="assortment"]');
  if (assortGroup) {
    assortGroup.addEventListener('click', function (e) {
      var radio = e.target.closest('.radio');
      if (!radio) return;
      seller.assortment = radio.getAttribute('data-value');
      $$('.radio', assortGroup).forEach(function (r) {
        r.classList.toggle('is-active', r === radio);
      });
    });
  }

  /* ---------- способ уведомления ---------- */
  var notifySeg = $('[data-seg="notify"]');
  if (notifySeg) {
    notifySeg.addEventListener('click', function (e) {
      var btn = e.target.closest('.seg__btn');
      if (!btn) return;
      seller.notify = btn.getAttribute('data-value');
      $$('.seg__btn', notifySeg).forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
    });
  }

  /* ---------- согласия (чекбоксы) ---------- */
  $$('.check').forEach(function (chk) {
    chk.addEventListener('click', function () {
      var key = chk.getAttribute('data-consent') === 'pd' ? 'agreePd' : 'agreeNotify';
      seller[key] = !seller[key];
      chk.classList.toggle('is-active', seller[key]);
      updateSubmit();
    });
  });

  /* ---------- активация кнопки отправки ---------- */
  function canSubmit() {
    return !!(seller.orgName && seller.inn && seller.fio && seller.email &&
              seller.phone && seller.phoneVerified && seller.spec &&
              seller.agreePd && seller.agreeNotify);
  }
  function updateSubmit() {
    var btn = $('#seller-submit');
    if (btn) btn.disabled = !canSubmit();
  }

  /* ---------- отправка предзаявки ---------- */
  var sellerForm = $('#seller-form');
  if (sellerForm) {
    sellerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (canSubmit()) showScreen('success');
    });
  }

})();
