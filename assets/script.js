/* ============================================================
   吉米多维奇刷题版 · 公共交互脚本（无框架依赖）
   功能：主题切换 / 侧边栏 / 解析折叠 / 已做进度 / 上下题导航
        / KaTeX 渲染 / 滚动联动与懒展开
   说明：滚动联动采用「节流滚动监听」而非 IntersectionObserver，
        保证在后台标签页等被节流的环境中依然可靠工作。
   ============================================================ */
(function () {
  'use strict';

  var THEME_KEY = 'jimie_theme';
  var DONE_KEY = 'jimie_done'; // {"ch1":[13,14,...], ...}

  /* ---------- 主题 ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* 隐私模式忽略 */ }
    var btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = t === 'dark' ? '☀️ 日间' : '🌙 夜间';
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    if (!saved) {
      saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
    }
    applyTheme(saved);
    var btn = document.getElementById('theme-btn');
    if (btn) btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- 进度存取 ---------- */
  function loadDone() {
    try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveDone(d) {
    try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
  }
  function chapterId() {
    var m = document.body.getAttribute('data-chapter');
    return m ? 'ch' + m : null;
  }

  /* ---------- 侧边栏（移动端抽屉） ---------- */
  function initSidebar() {
    var tgl = document.getElementById('sidebar-toggle');
    var mask = document.getElementById('sidebar-mask');
    if (!tgl) return;
    tgl.addEventListener('click', function () {
      document.body.classList.toggle('sidebar-open');
    });
    if (mask) mask.addEventListener('click', function () {
      document.body.classList.remove('sidebar-open');
    });
  }

  /* ---------- 解析折叠 ---------- */
  function setCollapsed(card, collapsed, manual) {
    card.classList.toggle('collapsed', collapsed);
    var btn = card.querySelector('.solution-toggle');
    if (btn) btn.textContent = collapsed ? '展开解析 ▾' : '收起解析 ▴';
    if (manual) card.classList.add('manual');
  }
  function initCollapse() {
    document.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.solution-toggle') : null;
      if (!btn) return;
      var card = btn.closest('.problem');
      if (card) setCollapsed(card, !card.classList.contains('collapsed'), true);
    });
  }

  /* ---------- 已做标记 ---------- */
  function qNoOf(card) {
    var el = card.querySelector('.q-no');
    return el ? parseInt(el.getAttribute('data-n'), 10) : NaN;
  }
  function refreshDoneUI() {
    var ch = chapterId();
    if (!ch) { refreshHomeProgress(); return; }
    var done = loadDone();
    var set = {};
    (done[ch] || []).forEach(function (n) { set[n] = true; });
    document.querySelectorAll('.problem').forEach(function (card) {
      var n = qNoOf(card);
      var btn = card.querySelector('.done-btn');
      if (!btn || isNaN(n)) return;
      var on = !!set[n];
      btn.classList.toggle('on', on);
      btn.textContent = on ? '✓ 已做' : '标记已做';
      var idx = document.querySelector('.qindex a[href="#q' + n + '"]');
      if (idx) idx.classList.toggle('done', on);
    });
    updateIndexProgress();
  }
  function initDone() {
    var ch = chapterId();
    if (!ch) { refreshHomeProgress(); return; }
    document.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.done-btn') : null;
      if (!btn) return;
      var card = btn.closest('.problem');
      var n = card ? qNoOf(card) : NaN;
      if (isNaN(n)) return;
      var done = loadDone();
      var arr = done[ch] || [];
      var i = arr.indexOf(n);
      if (i >= 0) arr.splice(i, 1); else arr.push(n);
      arr.sort(function (a, b) { return a - b; });
      done[ch] = arr;
      saveDone(done);
      refreshDoneUI();
    });
    refreshDoneUI();
  }

  /* 首页：每章进度条 */
  function refreshHomeProgress() {
    var bars = document.querySelectorAll('[data-ch-count][data-ch]');
    if (!bars.length) return;
    var done = loadDone();
    bars.forEach(function (bar) {
      var ch = bar.getAttribute('data-ch');
      var total = parseInt(bar.getAttribute('data-ch-count'), 10);
      var n = (done['ch' + ch] || []).length;
      var inner = bar.querySelector('i');
      if (inner) inner.style.width = total ? (100 * n / total).toFixed(1) + '%' : '0';
      var meta = document.getElementById('ch-meta-' + ch);
      if (meta) meta.textContent = n + ' / ' + total + ' 已做';
    });
  }

  function updateIndexProgress() {
    var bar = document.getElementById('ch-progress');
    var ch = chapterId();
    if (!bar || !ch) return;
    var total = parseInt(bar.getAttribute('data-ch-count'), 10);
    var n = (loadDone()[ch] || []).length;
    var inner = bar.querySelector('i');
    if (inner) inner.style.width = total ? (100 * n / total).toFixed(1) + '%' : '0';
    var txt = document.getElementById('ch-progress-text');
    if (txt) txt.textContent = n + ' / ' + total;
  }

  /* ---------- 滚动联动：焦点题 / 侧栏高亮 / 懒展开 ---------- */
  var CARDS = [];
  var FOCUS = null;
  var LAZY = false;
  var scrollPending = false;

  function throttleScroll() {
    if (scrollPending) return;
    scrollPending = true;
    setTimeout(function () {
      scrollPending = false;
      onScroll();
    }, 120);
  }

  function onScroll() {
    if (!CARDS.length) return;
    var vh = window.innerHeight || 800;

    // 1) 懒展开：进入视口附近的折叠卡自动展开（未手动折叠过的）
    if (LAZY) {
      for (var i = 0; i < CARDS.length; i++) {
        var c = CARDS[i];
        if (!c.classList.contains('autolazy')) continue;
        var r = c.getBoundingClientRect();
        if (r.top < vh + 160 && r.bottom > -160) {
          c.classList.remove('autolazy');
          if (!c.classList.contains('manual')) setCollapsed(c, false, false);
        }
      }
    }

    // 2) 焦点题：视口顶部第一条可见题卡
    var cur = null;
    for (var j = 0; j < CARDS.length; j++) {
      var cr = CARDS[j].getBoundingClientRect();
      if (cr.bottom > 140 && cr.top < vh * 0.8) { cur = CARDS[j]; break; }
    }
    if (!cur || cur === FOCUS) return;
    FOCUS = cur;
    var n = qNoOf(cur);

    var links = document.querySelectorAll('.qindex a, .sidebar .sec');
    for (var k = 0; k < links.length; k++) links[k].classList.remove('active');
    var ql = document.querySelector('.qindex a[href="#q' + n + '"]');
    if (ql) {
      ql.classList.add('active');
      if (ql.scrollIntoView) ql.scrollIntoView({ block: 'nearest' });
    }
    var sec = cur.getAttribute('data-secanchor');
    if (sec) {
      var sl = document.querySelector('.sidebar .sec[href="#sec-' + sec + '"]');
      if (sl) sl.classList.add('active');
    }
  }

  function initScrollDirector() {
    CARDS = Array.prototype.slice.call(document.querySelectorAll('.problem'));
    if (!CARDS.length) return;
    LAZY = CARDS.length > 50;
    if (LAZY) {
      var vh = window.innerHeight || 800;
      CARDS.forEach(function (card) {
        var rect = card.getBoundingClientRect();
        if (rect.top > vh) { // 初始视口之外的题默认折叠
          card.classList.add('autolazy');
          setCollapsed(card, true, false);
        }
      });
    }
    onScroll();
    window.addEventListener('scroll', throttleScroll, { passive: true });
    window.addEventListener('resize', throttleScroll, { passive: true });
  }

  /* ---------- 上下题导航 ---------- */
  function scrollToCard(target) {
    var before = window.scrollY;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 后台标签页等 rAF 被冻结的环境中平滑滚动不会推进，700ms 无位移则立即跳转兜底。
    // 注意 CSS 的 html{scroll-behavior:smooth} 会把 behavior:'auto' 也变成平滑，
    // 因此兜底时必须用内联样式临时覆盖。
    setTimeout(function () {
      if (Math.abs(window.scrollY - before) < 30) {
        var html = document.documentElement;
        var prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        target.scrollIntoView({ block: 'start' });
        html.style.scrollBehavior = prev;
        onScroll(); // 事件延迟环境下也立即联动高亮
      }
    }, 700);
  }
  function initQNav() {
    var prevBtn = document.getElementById('qnav-prev');
    var nextBtn = document.getElementById('qnav-next');
    if (!prevBtn || !nextBtn) return;
    function go(delta) {
      if (!CARDS.length) return;
      onScroll(); // 先确保 FOCUS 是最新的
      var idx = FOCUS ? CARDS.indexOf(FOCUS) : -1;
      if (idx < 0) {
        for (var i = 0; i < CARDS.length; i++) {
          var r = CARDS[i].getBoundingClientRect();
          if (r.bottom > 140) { idx = i - (delta > 0 ? 1 : 0); break; }
        }
      }
      var target = CARDS[Math.max(0, Math.min(CARDS.length - 1, idx + delta))];
      if (target) scrollToCard(target);
    }
    prevBtn.addEventListener('click', function () { go(-1); });
    nextBtn.addEventListener('click', function () { go(1); });
  }

  /* ---------- KaTeX ---------- */
  function initMath() {
    if (typeof renderMathInElement !== 'function') return;
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      strict: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initTheme();
    initSidebar();
    initCollapse();
    initDone();
    initQNav();
    initMath();
    initScrollDirector();
    refreshHomeProgress();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
