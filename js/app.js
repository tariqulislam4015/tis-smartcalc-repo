/* =========================================================
   TIS SmartCalc — app shell: model switching, class tools,
   history, key-cast overlay, theme, PWA install.
   ========================================================= */
(function () {
  'use strict';

  /* ⚙️  Change these two lines if your GitHub user / repo name is different */
  const CONFIG = {
    repo: 'tariqulislam4015/tis-smartcalc-repo',
    apk: 'https://github.com/tariqulislam4015/tis-smartcalc-repo/releases/latest/download/TIS-SmartCalc.apk',
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tis.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tis.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  const prefs = Object.assign({ theme: 'dark', keys: false, sound: false, zoom: 100, model: 'scientific' }, store.get('prefs', {}));
  const savePrefs = () => store.set('prefs', prefs);

  /* ---------- toast & keycast ---------- */
  let toastT;
  function toast(msg) { const t = $('.toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }
  const cast = $('.keycast');
  function keycast(label, layer) {
    if (!prefs.keys) return;
    const c = document.createElement('span');
    c.className = 'kc' + (layer === 1 ? ' s' : layer === 2 ? ' a' : '');
    c.textContent = label;
    cast.appendChild(c);
    while (cast.children.length > 7) cast.firstChild.remove();
    setTimeout(() => { c.classList.add('out'); setTimeout(() => c.remove(), 400); }, 2200);
  }

  /* ---------- sound ---------- */
  let actx;
  function click() {
    if (!prefs.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = 1400;
      g.gain.setValueAtTime(0.08, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.05);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.06);
    } catch (e) { /* no audio */ }
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { /* ignore */ }
  }

  /* ---------- history ---------- */
  let hist = store.get('history', []);
  const histEl = $('.hist');
  const strip = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
  function renderHist() {
    if (!hist.length) { histEl.innerHTML = '<li class="empty">Calculations will appear here. Tap a line to copy its answer.</li>'; return; }
    histEl.innerHTML = hist.slice().reverse().map((h, i) => `<li data-i="${hist.length - 1 - i}"><span class="tag">${h.model}</span><div class="he">${h.expr.replace(/</g, '&lt;')}</div><div class="hr">= ${h.html}</div></li>`).join('');
  }
  function addHist(h) {
    hist.push({ model: h.model, expr: h.expr, html: h.html, dec: h.dec || strip(h.html) });
    if (hist.length > 60) hist = hist.slice(-60);
    store.set('history', hist); renderHist();
    const first = histEl.firstElementChild; if (first) first.classList.add('new');
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied ✓'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied ✓'); } catch (er) { toast('Copy not allowed here'); } ta.remove(); }
  }
  histEl.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) copy(hist[+li.dataset.i].dec); });
  $('[data-hist="copy"]').onclick = () => copy(hist.map((h) => `${h.expr} = ${h.dec}`).join('\n') || '');
  $('[data-hist="clear"]').onclick = () => { hist = []; store.set('history', hist); renderHist(); };
  renderHist();

  /* ---------- models ---------- */
  const hooks = { key: keycast, sound: click, history: addHist, switchModel: (m) => selectModel(m) };
  const models = {};
  const builders = {
    scientific: (el) => TISScientific.create(el, hooks),
    basic: (el) => TISModels.createBasic(el, hooks),
    graph: (el) => TISModels.createGraph(el, hooks),
    stat: (el) => TISModels.createStat(el, hooks),
    programmer: (el) => TISModels.createProgrammer(el, hooks),
  };
  const TIPS = {
    scientific: `<ul>
      <li><kbd class="s">SHIFT</kbd> = হলুদ ফাংশন, <kbd class="a">ALPHA</kbd> = লাল ভ্যারিয়েবল (A–F, X, Y, M)</li>
      <li><kbd>MODE</kbd> → COMP · STAT · EQN (সমীকরণ) · MATRIX · TABLE · BASE-N</li>
      <li><kbd>S⇔D</kbd> ভগ্নাংশ/√/π ↔ দশমিক · <kbd>ENG</kbd> engineering form</li>
      <li><kbd>SHIFT</kbd><kbd>CALC</kbd> = SOLVE (যেমন X²−5X+6 ALPHA= 0)</li>
      <li><kbd>SHIFT</kbd><kbd>MODE</kbd> = SETUP (Deg/Rad, Fix, Sci, Math/Line)</li>
      <li>Keyboard: 0-9 + − * / ^ ( ) · Enter · Backspace · Esc · s c t l n r · x=X</li></ul>`,
    basic: `<ul><li>Live preview: টাইপ করার সাথে সাথে উত্তর দেখা যায়</li><li><kbd>GT</kbd> grand total, <kbd>M+</kbd>/<kbd>M−</kbd>/<kbd>MR</kbd> memory</li><li>Paper tape-এ আগের হিসাবগুলো থাকে</li></ul>`,
    graph: `<ul><li>f(x) লিখুন: <code>x^2-4</code>, <code>2sin(x)</code>, <code>sqrt(x)</code>, <code>1/x</code></li><li>Drag = সরানো, wheel / pinch = zoom, hover = trace</li><li>Roots, Min/Max, Intersection ও ∫ Area এক ক্লিকে</li></ul>`,
    stat: `<ul><li>Data কমা/স্পেস দিয়ে লিখুন → Calculate</li><li>Y দিলে linear regression ŷ = A + Bx ও r</li><li>"Use Y as frequency" দিয়ে frequency table</li></ul>`,
    programmer: `<ul><li>HEX · DEC · OCT · BIN — চাপলেই base বদলায়</li><li>AND OR XOR XNOR NOT Neg, &lt;&lt; &gt;&gt; (32-bit)</li><li>Keyboard: & | ^ ~ ও hex digits</li></ul>`,
  };
  let active = null;
  function selectModel(name) {
    if (!builders[name]) return;
    active = name; prefs.model = name; savePrefs();
    $$('.models [data-model]').forEach((b) => { const on = b.dataset.model === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('.model-host').forEach((h) => { h.hidden = h.dataset.host !== name; });
    const host = $(`[data-host="${name}"]`);
    if (!models[name]) models[name] = builders[name](host);
    else if (models[name].resize) requestAnimationFrame(() => models[name].resize());
    host.classList.remove('enter'); void host.offsetWidth; host.classList.add('enter');
    $('.tip-body').innerHTML = TIPS[name];
  }
  $('.models').addEventListener('click', (e) => { const b = e.target.closest('[data-model]'); if (b) selectModel(b.dataset.model); });

  /* ---------- physical keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    const m = models[active]; if (!m) return;
    if (active === 'scientific') {
      const r = m.keyFor(e); if (!r) return;
      e.preventDefault(); m.press(r[0], r[1]);
      const btn = $(`[data-host="scientific"] [data-k="${r[0]}"]`); if (btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 120); }
    } else if (m.keydown && m.keydown(e)) e.preventDefault();
  });

  /* ---------- tools ---------- */
  function applyPrefs() {
    document.documentElement.dataset.theme = prefs.theme;
    $('meta[name="theme-color"]').content = prefs.theme === 'dark' ? '#0b1416' : '#0f9d58';
    $('[data-tool="keys"]').classList.toggle('on', prefs.keys);
    $('[data-tool="sound"]').classList.toggle('on', prefs.sound);
    $('#stage').style.setProperty('--zoom', prefs.zoom / 100);
    $('.zoom output').textContent = prefs.zoom + '%';
    Object.values(models).forEach((m) => m.resize && m.resize());
  }
  $('.tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]'); if (!b) return;
    const t = b.dataset.tool;
    if (t === 'keys') { prefs.keys = !prefs.keys; toast(prefs.keys ? 'Key-cast ON — pressed keys show on screen' : 'Key-cast OFF'); }
    if (t === 'sound') { prefs.sound = !prefs.sound; toast(prefs.sound ? 'Sound ON' : 'Sound OFF'); }
    if (t === 'theme') prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
    if (t === 'zoom+') prefs.zoom = Math.min(200, prefs.zoom + 10);
    if (t === 'zoom-') prefs.zoom = Math.max(70, prefs.zoom - 10);
    if (t === 'present') {
      const on = !document.body.classList.contains('present');
      document.body.classList.toggle('present', on); b.classList.toggle('on', on);
      try { if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch (er) { /* ignore */ }
      setTimeout(() => Object.values(models).forEach((m) => m.resize && m.resize()), 250);
    }
    savePrefs(); applyPrefs();
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('present')) {
      document.body.classList.remove('present'); $('[data-tool="present"]').classList.remove('on');
      setTimeout(() => Object.values(models).forEach((m) => m.resize && m.resize()), 250);
    }
  });

  /* ---------- app download / install ---------- */
  $('#apkLink').href = CONFIG.apk;
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (isNative) { $('.app-card').remove(); document.body.classList.add('native'); }
  let deferred;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  $('#installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#installBtn').hidden = true; };
  if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href) && !isNative) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* sandboxed preview */ }
  }

  $('#yr').textContent = new Date().getFullYear();
  applyPrefs();
  selectModel(prefs.model || 'scientific');
})();
