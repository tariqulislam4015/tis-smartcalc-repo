/* =========================================================
   TIS SmartCalc — extra classroom models
   B-12 Basic · G-Plot Graphing · ST-Data Statistics · PX-Base Programmer
   ========================================================= */
(function (G) {
  'use strict';
  const E = G.TISEngine;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* typed text → engine syntax */
  function normalize(s) {
    return String(s)
      .replace(/\*\*/g, '^').replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
      .replace(/\bpi\b/gi, 'π').replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([0-9.a-zA-Zπ]+)/g, 'sqrt($1)')
      .replace(/\bexp\(/g, 'e^(').replace(/\barcsin\(/g, 'asin(').replace(/\barccos\(/g, 'acos(').replace(/\barctan\(/g, 'atan(')
      .replace(/\bsin\^-1\(/g, 'asin(').replace(/\bcos\^-1\(/g, 'acos(').replace(/\btan\^-1\(/g, 'atan(')
      .replace(/\s+/g, '');
  }
  const fmtD = (v) => (isFinite(v) ? E.format(v, {}, 'dec').html : '—');
  const fmtX = (v) => (isFinite(v) ? E.format(v, {}).html : '—');

  /* =========================== B-12 BASIC =========================== */
  function createBasic(host, hooks = {}) {
    host.innerHTML = `
      <div class="bc">
        <div class="bc-top"><div class="sx-brand"><img src="assets/logo.svg" alt=""><div><b>TIS</b> B-12<small>Classroom Desk Calculator</small></div></div><div class="sx-solar"><i></i><i></i><i></i><i></i></div></div>
        <div class="bc-lcd"><div class="bc-ind"><b class="m">M</b><b class="gt">GT</b></div><div class="bc-expr"></div><div class="bc-val">0</div></div>
        <div class="bc-tape" aria-label="tape"></div>
        <div class="bc-keys"></div>
      </div>`;
    const keys = [
      ['MC', 'mc', 'f'], ['MR', 'mr', 'f'], ['M−', 'mm', 'f'], ['M+', 'mp', 'f'], ['GT', 'gt', 'f'],
      ['√', 'sqrt', 'f'], ['x²', 'sq', 'f'], ['%', 'pct', 'f'], ['±', 'neg', 'f'], ['⌫', 'del', 'c'],
      ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/', 'o'], ['AC', 'ac', 'c'],
      ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*', 'o'], ['(', '(', 'f'],
      ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-', 'o'], [')', ')', 'f'],
      ['0', '0'], ['00', '00'], ['.', '.'], ['+', '+', 'o'], ['=', '=', 'eq'],
    ];
    const kb = host.querySelector('.bc-keys');
    keys.forEach(([l, a, c]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'bk ' + (c || 'n'); b.textContent = l; b.dataset.a = a; kb.appendChild(b); });
    const exprEl = host.querySelector('.bc-expr'), valEl = host.querySelector('.bc-val'), tape = host.querySelector('.bc-tape');
    let expr = '', done = false, M = 0, GT = 0;
    const disp = (s) => s.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−').replace(/sqrt\(/g, '√(');
    function preview() {
      try { return expr ? E.run(expr, { vars: {}, Ans: 0 }) : 0; } catch (e) { return null; }
    }
    function render(final) {
      exprEl.textContent = disp(expr) || ' ';
      const v = preview();
      if (final !== undefined) valEl.innerHTML = final;
      else valEl.innerHTML = v === null ? '<span class="dim">…</span>' : fmtD(v);
      host.querySelector('.bc-ind .m').classList.toggle('on', M !== 0);
      host.querySelector('.bc-ind .gt').classList.toggle('on', GT !== 0);
    }
    function lastNumberRange() { const m = expr.match(/(\d*\.?\d+)$/); return m ? [expr.length - m[1].length, m[1]] : null; }
    function press(a, label) {
      hooks.key && hooks.key(label || a); hooks.sound && hooks.sound();
      const isOp = /^[+\-*/]$/.test(a);
      if (done && !isOp && !['mp', 'mm', 'mr', 'mc', 'gt', 'pct', 'neg', 'sq', 'sqrt'].includes(a)) { expr = ''; }
      if (done && isOp) expr = String(preview() ?? 0);
      done = false;
      switch (a) {
        case 'ac': expr = ''; break;
        case 'del': expr = expr.replace(/sqrt\($/, '').slice(0, expr.endsWith('sqrt(') ? expr.length : -1); break;
        case '=': {
          const v = preview(); if (v === null) { render('<span class="err">Error</span>'); return; }
          GT += v; done = true;
          const row = document.createElement('div'); row.innerHTML = `<span>${esc(disp(expr))}</span><b>= ${fmtD(v)}</b>`; tape.prepend(row);
          while (tape.children.length > 30) tape.lastChild.remove();
          hooks.history && hooks.history({ expr: disp(expr), html: fmtD(v), dec: String(v), value: v, model: 'B-12' });
          expr = String(Number(v.toPrecision(12))); render(fmtD(v)); return;
        }
        case 'sqrt': expr = done ? `sqrt(${expr})` : expr + 'sqrt('; break;
        case 'sq': expr = /[\d)]$/.test(expr) ? expr + '²' : expr; break;
        case 'pct': expr = /[\d)]$/.test(expr) ? expr + '%' : expr; break;
        case 'neg': { const r = lastNumberRange(); if (r) { const pre = expr.slice(0, r[0]); expr = pre.endsWith('(-') ? pre.slice(0, -2) + r[1] : pre + '(-' + r[1]; } else expr += '-'; break; }
        case 'mp': case 'mm': { const v = preview(); if (v !== null) { M += a === 'mp' ? v : -v; done = true; } break; }
        case 'mr': expr += (/[\d)]$/.test(expr) ? '*' : '') + `(${Number(M.toPrecision(12))})`; break;
        case 'mc': M = 0; break;
        case 'gt': expr = String(Number(GT.toPrecision(12))); done = true; break;
        default:
          if (isOp && /[+\-*/]$/.test(expr)) expr = expr.slice(0, -1);
          expr += a;
      }
      render();
    }
    kb.addEventListener('pointerdown', (e) => { const b = e.target.closest('.bk'); if (!b) return; e.preventDefault(); b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 130); press(b.dataset.a, b.textContent); });
    render();
    return {
      keydown(e) {
        const k = e.key; const map = { Enter: '=', '=': '=', Backspace: 'del', Escape: 'ac', Delete: 'ac', '%': 'pct' };
        if (/^[0-9.+\-*/()]$/.test(k)) { press(k, k); return true; }
        if (map[k]) { press(map[k], k); return true; }
        return false;
      },
    };
  }

  /* =========================== G-PLOT GRAPH =========================== */
  function createGraph(host, hooks = {}) {
    const COLORS = ['#16a34a', '#2563eb', '#dc2626', '#a855f7'];
    host.innerHTML = `
      <div class="gp">
        <div class="gp-head"><div class="sx-brand"><img src="assets/logo.svg" alt=""><div><b>TIS</b> G-Plot<small>Graphing Calculator · radians</small></div></div></div>
        <div class="gp-funcs">
          ${[0, 1, 2, 3].map((i) => `<label class="gp-f"><input type="checkbox" checked data-on="${i}"><i style="background:${COLORS[i]}"></i><span>f${i + 1}(x)=</span><input type="text" data-f="${i}" spellcheck="false" autocomplete="off" value="${['x^2-2x-3', 'sin(x)', '', ''][i]}" placeholder="${['e.g. 2x+1', 'e.g. sqrt(x)', 'e.g. x^3-3x', 'e.g. ln(x)'][i]}"></label>`).join('')}
        </div>
        <div class="gp-canvas"><canvas></canvas><div class="gp-tip"></div>
          <div class="gp-zoom"><button type="button" data-z="in" title="Zoom in">＋</button><button type="button" data-z="out" title="Zoom out">－</button><button type="button" data-z="reset" title="Reset view">⟲</button></div>
        </div>
        <div class="gp-tools">
          <button type="button" data-t="roots">Roots (f1)</button>
          <button type="button" data-t="ext">Min / Max (f1)</button>
          <button type="button" data-t="int">f1 ∩ f2</button>
          <button type="button" data-t="table">Table</button>
          <span class="gp-area">∫ f1 dx from <input type="text" value="0" data-a="a"> to <input type="text" value="3" data-a="b"> <button type="button" data-t="area">Area</button></span>
          <button type="button" data-t="clear" class="ghost">Clear marks</button>
        </div>
        <div class="gp-out"></div>
      </div>`;
    const cv = host.querySelector('canvas'), wrap = host.querySelector('.gp-canvas'), tip = host.querySelector('.gp-tip'), out = host.querySelector('.gp-out');
    const ctx = cv.getContext('2d');
    let view = { cx: 0, cy: 0, scale: 40 }; // px per unit
    let fns = [], marks = [], area = null, hover = null;

    function compile() {
      fns = [0, 1, 2, 3].map((i) => {
        const inp = host.querySelector(`[data-f="${i}"]`), on = host.querySelector(`[data-on="${i}"]`).checked;
        const s = normalize(inp.value);
        if (!s || !on) { inp.classList.remove('bad'); return null; }
        try {
          const tree = E.parse(s); inp.classList.remove('bad');
          return (x) => { const old = E.S.angle; E.S.angle = 'RAD'; try { return E.evaluate(tree, { vars: { X: x }, Ans: 0 }); } catch (e) { return NaN; } finally { E.S.angle = old; } };
        } catch (e) { inp.classList.add('bad'); return null; }
      });
    }
    function size() {
      const r = wrap.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr);
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    }
    const W = () => cv.width / (window.devicePixelRatio || 1), Hh = () => cv.height / (window.devicePixelRatio || 1);
    const sx = (x) => W() / 2 + (x - view.cx) * view.scale, sy = (y) => Hh() / 2 - (y - view.cy) * view.scale;
    const wx = (px) => view.cx + (px - W() / 2) / view.scale, wy = (py) => view.cy - (py - Hh() / 2) / view.scale;
    function niceStep() { const raw = 80 / view.scale; const p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
    function css(v) { return getComputedStyle(host).getPropertyValue(v).trim(); }
    function draw() {
      const w = W(), h = Hh(); ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css('--graph-bg') || '#fff'; ctx.fillRect(0, 0, w, h);
      const step = niceStep();
      ctx.lineWidth = 1; ctx.font = '11px ui-monospace, monospace';
      // grid
      ctx.strokeStyle = css('--graph-grid') || '#e5e7eb';
      ctx.beginPath();
      for (let x = Math.ceil(wx(0) / step) * step; x < wx(w); x += step) { ctx.moveTo(Math.round(sx(x)) + .5, 0); ctx.lineTo(Math.round(sx(x)) + .5, h); }
      for (let y = Math.ceil(wy(h) / step) * step; y < wy(0); y += step) { ctx.moveTo(0, Math.round(sy(y)) + .5); ctx.lineTo(w, Math.round(sy(y)) + .5); }
      ctx.stroke();
      // axes
      ctx.strokeStyle = css('--graph-axis') || '#334155'; ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(0, sy(0)); ctx.lineTo(w, sy(0)); ctx.moveTo(sx(0), 0); ctx.lineTo(sx(0), h); ctx.stroke();
      ctx.fillStyle = css('--graph-label') || '#475569';
      const lab = (v) => String(Number(v.toPrecision(6)));
      const ay = Math.min(Math.max(sy(0) + 14, 14), h - 4), ax = Math.min(Math.max(sx(0) + 4, 4), w - 40);
      for (let x = Math.ceil(wx(0) / step) * step; x < wx(w); x += step) if (Math.abs(x) > step / 2) ctx.fillText(lab(x), sx(x) + 3, ay);
      for (let y = Math.ceil(wy(h) / step) * step; y < wy(0); y += step) if (Math.abs(y) > step / 2) ctx.fillText(lab(y), ax, sy(y) - 3);
      // area
      if (area && fns[0]) {
        ctx.fillStyle = 'rgba(22,163,74,.22)'; ctx.beginPath(); ctx.moveTo(sx(area.a), sy(0));
        for (let i = 0; i <= 200; i++) { const x = area.a + (area.b - area.a) * i / 200; const y = fns[0](x); ctx.lineTo(sx(x), sy(isFinite(y) ? y : 0)); }
        ctx.lineTo(sx(area.b), sy(0)); ctx.closePath(); ctx.fill();
      }
      // curves
      fns.forEach((f, i) => {
        if (!f) return;
        ctx.strokeStyle = COLORS[i]; ctx.lineWidth = 2.4; ctx.beginPath();
        let pen = false, prev = null;
        for (let px = 0; px <= w; px += 1) {
          const y = f(wx(px)); const py = sy(y);
          if (!isFinite(y) || Math.abs(py) > 1e5) { pen = false; prev = null; continue; }
          if (pen && prev !== null && Math.abs(py - prev) > h * 1.5) pen = false;
          if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
          prev = py;
        }
        ctx.stroke();
      });
      // marks
      marks.forEach((m) => {
        ctx.fillStyle = m.c || '#111'; ctx.beginPath(); ctx.arc(sx(m.x), sy(m.y), 5, 0, 7); ctx.fill();
        ctx.fillStyle = css('--graph-label') || '#111'; ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.fillText(`(${lab(m.x)}, ${lab(m.y)})`, sx(m.x) + 7, sy(m.y) - 7);
      });
      // hover trace
      if (hover && fns.some(Boolean)) {
        const x = wx(hover.px); ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(hover.px, 0); ctx.lineTo(hover.px, h); ctx.stroke(); ctx.setLineDash([]);
        const parts = [`x = ${lab(x)}`];
        fns.forEach((f, i) => { if (!f) return; const y = f(x); if (isFinite(y)) { ctx.fillStyle = COLORS[i]; ctx.beginPath(); ctx.arc(hover.px, sy(y), 4, 0, 7); ctx.fill(); parts.push(`<b style="color:${COLORS[i]}">f${i + 1}</b> = ${lab(y)}`); } });
        tip.innerHTML = parts.join('<br>'); tip.style.display = 'block';
        tip.style.left = Math.min(hover.px + 12, w - 130) + 'px'; tip.style.top = '8px';
      } else tip.style.display = 'none';
    }
    // pan / zoom / pinch
    const pts = new Map(); let lastDist = 0;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); });
    cv.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (p && pts.size === 1) { view.cx -= (e.offsetX - p.x) / view.scale; view.cy += (e.offsetY - p.y) / view.scale; }
      if (p) pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastDist) view.scale = Math.min(5000, Math.max(0.5, view.scale * d / lastDist)); lastDist = d;
      }
      hover = { px: e.offsetX }; draw();
    });
    const up = (e) => { pts.delete(e.pointerId); lastDist = 0; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => { hover = null; draw(); });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault(); const k = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const x0 = wx(e.offsetX), y0 = wy(e.offsetY); view.scale = Math.min(5000, Math.max(0.5, view.scale * k));
      view.cx = x0 - (e.offsetX - W() / 2) / view.scale; view.cy = y0 + (e.offsetY - Hh() / 2) / view.scale; draw();
    }, { passive: false });
    host.querySelector('.gp-zoom').addEventListener('click', (e) => {
      const z = e.target.dataset.z; if (!z) return;
      if (z === 'in') view.scale *= 1.4; else if (z === 'out') view.scale /= 1.4; else view = { cx: 0, cy: 0, scale: 40 };
      draw();
    });
    host.querySelector('.gp-funcs').addEventListener('input', () => { compile(); marks = []; area = null; draw(); });

    // analysis
    function scanRoots(f, a, b, n = 1200) {
      const r = []; let x0 = a, y0 = f(a);
      for (let i = 1; i <= n; i++) {
        const x1 = a + (b - a) * i / n, y1 = f(x1);
        if (isFinite(y0) && isFinite(y1)) {
          if (y0 === 0) r.push(x0);
          else if (y0 * y1 < 0 && Math.abs(y1 - y0) < 1e3 * (b - a) / n * 50 + 10) {
            let lo = x0, hi = x1, fl = y0; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2, fm = f(m); if (fl * fm <= 0) hi = m; else { lo = m; fl = fm; } }
            r.push((lo + hi) / 2);
          }
        }
        x0 = x1; y0 = y1;
      }
      return r;
    }
    function scanExt(f, a, b, n = 1200) {
      const r = []; const ys = []; for (let i = 0; i <= n; i++) ys.push(f(a + (b - a) * i / n));
      for (let i = 1; i < n; i++) {
        if (![ys[i - 1], ys[i], ys[i + 1]].every(isFinite)) continue;
        const isMin = ys[i] < ys[i - 1] && ys[i] <= ys[i + 1], isMax = ys[i] > ys[i - 1] && ys[i] >= ys[i + 1];
        if (!isMin && !isMax) continue;
        let lo = a + (b - a) * (i - 1) / n, hi = a + (b - a) * (i + 1) / n; const g = (Math.sqrt(5) - 1) / 2;
        for (let k = 0; k < 80; k++) { const m1 = hi - g * (hi - lo), m2 = lo + g * (hi - lo); const c = isMin ? f(m1) < f(m2) : f(m1) > f(m2); if (c) hi = m2; else lo = m1; }
        const x = (lo + hi) / 2; r.push({ x, y: f(x), t: isMin ? 'Min' : 'Max' });
      }
      return r;
    }
    const clean = (v) => (Math.abs(v) < 1e-9 ? 0 : Number(v.toPrecision(10)));
    host.querySelector('.gp-tools').addEventListener('click', (e) => {
      const t = e.target.dataset.t; if (!t) return;
      compile(); const a = wx(0), b = wx(W()); let html = '';
      if (t === 'clear') { marks = []; area = null; out.innerHTML = ''; draw(); return; }
      if (t !== 'table' && !fns[0]) { out.innerHTML = '<p class="warn">Enter f1(x) first.</p>'; return; }
      if (t === 'roots') {
        const r = scanRoots(fns[0], a, b).map(clean); marks = r.map((x) => ({ x, y: 0, c: COLORS[0] }));
        html = `<b>Roots of f1 in view:</b> ${r.length ? r.map((x) => 'x = ' + fmtX(x)).join(', ') : 'none in this window'}`;
      } else if (t === 'ext') {
        const r = scanExt(fns[0], a, b); marks = r.map((p) => ({ x: clean(p.x), y: clean(p.y), c: '#f59e0b' }));
        html = `<b>Turning points of f1:</b> ${r.length ? r.map((p) => `${p.t} (${fmtX(clean(p.x))}, ${fmtX(clean(p.y))})`).join(' · ') : 'none in this window'}`;
      } else if (t === 'int') {
        if (!fns[1]) { out.innerHTML = '<p class="warn">Enter f2(x) too.</p>'; return; }
        const d = (x) => fns[0](x) - fns[1](x); const r = scanRoots(d, a, b).map(clean);
        marks = r.map((x) => ({ x, y: clean(fns[0](x)), c: '#7c3aed' }));
        html = `<b>f1 ∩ f2:</b> ${r.length ? r.map((x) => `(${fmtX(x)}, ${fmtX(clean(fns[0](x)))})`).join(' · ') : 'no intersection in view'}`;
      } else if (t === 'area') {
        try {
          const A = E.run(normalize(host.querySelector('[data-a="a"]').value), { vars: {} }), B = E.run(normalize(host.querySelector('[data-a="b"]').value), { vars: {} });
          const v = E.integrate(fns[0], A, B); area = { a: A, b: B };
          html = `<b>∫<sub>${fmtD(A)}</sub><sup>${fmtD(B)}</sup> f1(x) dx</b> = ${fmtX(v)} <span class="dim">(≈ ${fmtD(v)})</span>`;
          hooks.history && hooks.history({ expr: `∫ f1 dx, ${fmtD(A)}→${fmtD(B)}`, html: fmtX(v), model: 'G-Plot' });
        } catch (er) { html = '<p class="warn">Check the limits.</p>'; }
      } else if (t === 'table') {
        const step = niceStep() / 2, start = Math.ceil(view.cx / step - 5) * step;
        const rows = []; for (let i = 0; i < 11; i++) { const x = clean(start + i * step); rows.push(`<tr><td>${fmtD(x)}</td>${fns.map((f) => (f ? `<td>${fmtD(clean(f(x)))}</td>` : '')).join('')}</tr>`); }
        html = `<table class="gp-tbl"><tr><th>x</th>${fns.map((f, i) => (f ? `<th style="color:${COLORS[i]}">f${i + 1}</th>` : '')).join('')}</tr>${rows.join('')}</table>`;
      }
      out.innerHTML = html; draw();
    });

    compile();
    new ResizeObserver(size).observe(wrap);
    return { resize: size };
  }

  /* =========================== ST-DATA STATISTICS =========================== */
  function createStat(host, hooks = {}) {
    host.innerHTML = `
      <div class="stp">
        <div class="gp-head"><div class="sx-brand"><img src="assets/logo.svg" alt=""><div><b>TIS</b> ST-Data<small>Statistics & Regression</small></div></div></div>
        <div class="st-in">
          <label>X data <small>(comma / space / new line)</small><textarea data-x spellcheck="false">12, 15, 11, 18, 20, 15, 17, 14, 15, 19</textarea></label>
          <label>Y data <small>(optional → regression)</small><textarea data-y spellcheck="false" placeholder="leave empty for 1-variable"></textarea></label>
          <label class="st-fr">Use Y as frequency of X <input type="checkbox" data-freq></label>
          <div class="st-btns"><button type="button" data-go class="pri">Calculate</button><button type="button" data-demo>Regression demo</button><button type="button" data-clr class="ghost">Clear</button></div>
        </div>
        <div class="st-cards"></div>
        <div class="gp-canvas st-chart"><canvas></canvas></div>
      </div>`;
    const cards = host.querySelector('.st-cards'), cv = host.querySelector('canvas'), wrap = host.querySelector('.st-chart'), ctx = cv.getContext('2d');
    const parse = (s) => s.split(/[\s,;]+/).filter(Boolean).map((t) => { try { return E.run(normalize(t), { vars: {} }); } catch (e) { return NaN; } });
    let last = null;
    function calc() {
      let xs = parse(host.querySelector('[data-x]').value), ys = parse(host.querySelector('[data-y]').value);
      const freq = host.querySelector('[data-freq]').checked;
      if (!xs.length || xs.some(isNaN) || ys.some(isNaN)) { cards.innerHTML = '<p class="warn">Please enter valid numbers.</p>'; return; }
      if (ys.length && ys.length !== xs.length) { cards.innerHTML = `<p class="warn">X has ${xs.length} values but Y has ${ys.length}.</p>`; return; }
      if (freq && ys.length) { const ex = []; xs.forEach((x, i) => { for (let k = 0; k < Math.round(ys[i]); k++) ex.push(x); }); xs = ex; ys = []; }
      const s = E.stats(xs, ys.length ? ys : null);
      const c = (l, v, k) => `<div class="stc ${k || ''}"><span>${l}</span><b>${v}</b></div>`;
      let h = c('n', s.n) + c('Mean x̄', fmtD(s.mean), 'hi') + c('Median', fmtD(s.med)) + c('Mode', s.mode.length > 5 ? '—' : s.mode.map(fmtD).join(', ')) +
        c('Σx', fmtD(s.sum)) + c('Σx²', fmtD(s.sum2)) + c('σx (pop.)', fmtD(s.sdp)) + c('sx (sample)', fmtD(s.sds)) +
        c('Variance σ²', fmtD(s.sdp * s.sdp)) + c('Min', fmtD(s.min)) + c('Q₁', fmtD(s.q1)) + c('Q₃', fmtD(s.q3)) + c('Max', fmtD(s.max)) + c('Range', fmtD(s.max - s.min));
      if (ys.length) h += c('ȳ', fmtD(s.meanY)) + c('Σxy', fmtD(s.sumXY)) + c('A (intercept)', fmtD(s.A), 'hi') + c('B (slope)', fmtD(s.B), 'hi') + c('r', fmtD(s.r), 'hi') + c('r²', fmtD(s.r * s.r)) + `<div class="stc wide hi"><span>Regression line</span><b>ŷ = ${fmtD(s.A)} ${s.B < 0 ? '−' : '+'} ${fmtD(Math.abs(s.B))}x</b></div>`;
      cards.innerHTML = h; last = { xs, ys, s }; draw();
      hooks.history && hooks.history({ expr: `Stats n=${s.n}`, html: `x̄=${fmtD(s.mean)}, σ=${fmtD(s.sdp)}` + (ys.length ? `, ŷ=${fmtD(s.A)}+${fmtD(s.B)}x` : ''), model: 'ST-Data' });
    }
    function draw() {
      const r = wrap.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = r.width, h = r.height, pad = 34; ctx.clearRect(0, 0, w, h);
      const cs = getComputedStyle(host); ctx.fillStyle = cs.getPropertyValue('--graph-bg') || '#fff'; ctx.fillRect(0, 0, w, h);
      if (!last) return;
      const lbl = cs.getPropertyValue('--graph-label') || '#475569'; ctx.font = '11px ui-monospace, monospace';
      const { xs, ys, s } = last;
      if (ys.length) {
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const px = (x) => pad + (x - x0) / ((x1 - x0) || 1) * (w - 2 * pad), py = (y) => h - pad - (y - y0) / ((y1 - y0) || 1) * (h - 2 * pad);
        ctx.strokeStyle = cs.getPropertyValue('--graph-axis'); ctx.beginPath(); ctx.moveTo(pad, pad / 2); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad / 2, h - pad); ctx.stroke();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px(x0), py(s.A + s.B * x0)); ctx.lineTo(px(x1), py(s.A + s.B * x1)); ctx.stroke();
        ctx.fillStyle = '#16a34a'; xs.forEach((x, i) => { ctx.beginPath(); ctx.arc(px(x), py(ys[i]), 5, 0, 7); ctx.fill(); });
        ctx.fillStyle = lbl; ctx.fillText(`x: ${x0} … ${x1}`, pad, h - 10); ctx.fillText(`y: ${y0} … ${y1}`, pad + 4, 14);
      } else {
        const n = xs.length, k = Math.max(3, Math.min(12, Math.ceil(Math.log2(n) + 1)));
        const lo = s.min, hi = s.max === s.min ? s.min + 1 : s.max, bw = (hi - lo) / k;
        const bins = new Array(k).fill(0); xs.forEach((x) => bins[Math.min(k - 1, Math.floor((x - lo) / bw))]++);
        const mx = Math.max(...bins), bh = h - 2 * pad - 30, colW = (w - 2 * pad) / k;
        bins.forEach((c, i) => {
          const hh = c / mx * bh; ctx.fillStyle = 'rgba(22,163,74,.75)';
          ctx.fillRect(pad + i * colW + 2, h - pad - hh, colW - 4, hh);
          ctx.fillStyle = lbl; ctx.fillText(String(c), pad + i * colW + colW / 2 - 3, h - pad - hh - 4);
          ctx.fillText(String(Number((lo + i * bw).toPrecision(4))), pad + i * colW, h - pad + 13);
        });
        // box plot
        const bx = (v) => pad + (v - lo) / (hi - lo) * (w - 2 * pad), by = 16;
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(bx(s.min), by + 7); ctx.lineTo(bx(s.q1), by + 7); ctx.moveTo(bx(s.q3), by + 7); ctx.lineTo(bx(s.max), by + 7); ctx.stroke();
        ctx.strokeRect(bx(s.q1), by, bx(s.q3) - bx(s.q1), 14); ctx.beginPath(); ctx.moveTo(bx(s.med), by); ctx.lineTo(bx(s.med), by + 14); ctx.stroke();
      }
    }
    host.querySelector('[data-go]').onclick = calc;
    host.querySelector('[data-demo]').onclick = () => { host.querySelector('[data-x]').value = '1, 2, 3, 4, 5, 6, 7, 8'; host.querySelector('[data-y]').value = '52, 55, 61, 64, 70, 71, 78, 83'; host.querySelector('[data-freq]').checked = false; calc(); };
    host.querySelector('[data-clr]').onclick = () => { host.querySelectorAll('textarea').forEach((t) => (t.value = '')); cards.innerHTML = ''; last = null; draw(); };
    new ResizeObserver(draw).observe(wrap);
    setTimeout(calc, 0);
    return { resize: draw };
  }

  /* =========================== PX-BASE PROGRAMMER =========================== */
  function createProgrammer(host, hooks = {}) {
    host.innerHTML = `
      <div class="px">
        <div class="bc-top"><div class="sx-brand"><img src="assets/logo.svg" alt=""><div><b>TIS</b> PX-Base<small>BASE-N · 32-bit Logic</small></div></div></div>
        <div class="px-lcd"><div class="px-expr"></div><div class="px-val">0</div>
          <div class="px-all">${['HEX', 'DEC', 'OCT', 'BIN'].map((b) => `<button type="button" data-b="${b}"><span>${b}</span><code></code></button>`).join('')}</div>
        </div>
        <div class="px-keys"></div>
      </div>`;
    const K = [
      ['A', 'A', 'hx'], ['B', 'B', 'hx'], ['C', 'C', 'hx'], ['D', 'D', 'hx'], ['E', 'E', 'hx'], ['F', 'F', 'hx'],
      ['AND', ' and ', 'lg'], ['OR', ' or ', 'lg'], ['XOR', ' xor ', 'lg'], ['XNOR', ' xnor ', 'lg'], ['NOT', 'not ', 'lg'], ['Neg', 'neg ', 'lg'],
      ['7', '7'], ['8', '8'], ['9', '9'], ['(', '('], [')', ')'], ['DEL', 'del', 'c'],
      ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*', 'o'], ['÷', '/', 'o'], ['AC', 'ac', 'c'],
      ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'o'], ['−', '-', 'o'], ['<<', ' << ', 'o'],
      ['0', '0'], ['Ans', 'ans'], ['>>', ' >> ', 'o'], ['=', '=', 'eq'],
    ];
    const kb = host.querySelector('.px-keys');
    K.forEach(([l, a, c]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'bk ' + (c || 'n') + (a === '=' ? ' wide' : ''); b.textContent = l; b.dataset.a = a; kb.appendChild(b); });
    const R = { HEX: 16, DEC: 10, OCT: 8, BIN: 2 };
    let base = 'DEC', expr = '', ans = 0n, done = false;
    const wrap32 = (n) => BigInt.asIntN(32, n);
    const show = (n, b) => {
      if (b === 'DEC') return wrap32(n).toString();
      const s = BigInt.asUintN(32, n).toString(R[b]).toUpperCase();
      return b === 'BIN' ? s.replace(/\B(?=(\d{4})+(?!\d))/g, ' ') : s;
    };
    function evalExpr(s) {
      const toks = s.match(/and|xnor|xor|or|not|neg|ans|<<|>>|[0-9A-F]+|[()+\-*/]/gi) || [];
      let i = 0;
      const prec = { or: 1, xor: 2, xnor: 2, and: 3, '<<': 4, '>>': 4, '+': 5, '-': 5, '*': 6, '/': 6 };
      function primary() {
        const t = toks[i++]; if (t === undefined) throw 0;
        const tl = t.toLowerCase();
        if (tl === 'not') return wrap32(~primary());
        if (tl === 'neg' || t === '-') return wrap32(-primary());
        if (t === '(') { const v = bin(0); if (toks[i] === ')') i++; return v; }
        if (tl === 'ans') return ans;
        const digits = '0123456789ABCDEF'.slice(0, R[base]);
        if (![...t.toUpperCase()].every((ch) => digits.includes(ch))) throw 0;
        let v = 0n; for (const ch of t.toUpperCase()) v = v * BigInt(R[base]) + BigInt(parseInt(ch, 16));
        return wrap32(v);
      }
      function bin(minP) {
        let a = primary();
        for (;;) {
          const op = (toks[i] || '').toLowerCase(); const p = prec[op];
          if (!p || p < minP) break;
          i++; const b = bin(p + 1);
          switch (op) {
            case '+': a = a + b; break; case '-': a = a - b; break; case '*': a = a * b; break;
            case '/': if (b === 0n) throw 1; a = a / b; break;
            case 'and': a = a & b; break; case 'or': a = a | b; break; case 'xor': a = a ^ b; break; case 'xnor': a = ~(a ^ b); break;
            case '<<': a = a << (b & 31n); break; case '>>': a = a >> (b & 31n); break;
          }
          a = wrap32(a);
        }
        return a;
      }
      const v = bin(1); if (i < toks.length) throw 0; return v;
    }
    const exprEl = host.querySelector('.px-expr'), valEl = host.querySelector('.px-val');
    function render(err) {
      exprEl.textContent = expr.replace(/\*/g, '×').replace(/\//g, '÷') || ' ';
      let v = null; try { v = expr ? evalExpr(expr) : (done ? ans : 0n); } catch (e) { v = null; }
      valEl.innerHTML = err ? `<span class="err">${err}</span>` : v === null ? '<span class="dim">…</span>' : show(v, base);
      host.querySelectorAll('.px-all button').forEach((b) => { b.classList.toggle('on', b.dataset.b === base); b.querySelector('code').textContent = v === null ? '' : show(v, b.dataset.b); });
      kb.querySelectorAll('.bk').forEach((b) => { const a = b.dataset.a; if (/^[0-9A-F]$/.test(a)) b.disabled = parseInt(a, 16) >= R[base]; });
    }
    function press(a, label) {
      hooks.key && hooks.key(label || a); hooks.sound && hooks.sound();
      if (a === 'ac') { expr = ''; done = false; }
      else if (a === 'del') expr = expr.replace(/\s*(and|or|xor|xnor|not|neg|<<|>>|ans)\s*$|.$/i, '');
      else if (a === '=') {
        try { ans = evalExpr(expr); hooks.history && hooks.history({ expr: `[${base}] ` + expr, html: `${show(ans, base)} <span class="dim">(DEC ${show(ans, 'DEC')})</span>`, model: 'PX-Base' }); expr = ''; done = true; }
        catch (e) { render(e === 1 ? 'Math ERROR' : 'Syntax ERROR'); return; }
      } else {
        if (done && /^[0-9A-F(]|not|neg/.test(a)) done = false;
        else if (done) { expr = 'ans'; done = false; }
        expr += a === 'ans' ? 'ans' : a;
      }
      render();
    }
    kb.addEventListener('pointerdown', (e) => { const b = e.target.closest('.bk'); if (!b || b.disabled) return; e.preventDefault(); b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 130); press(b.dataset.a, b.textContent); });
    host.querySelector('.px-all').addEventListener('click', (e) => {
      const b = e.target.closest('[data-b]'); if (!b) return;
      let v = null; try { v = expr ? evalExpr(expr) : ans; } catch (er) { v = null; }
      base = b.dataset.b; if (v !== null) { ans = v; expr = ''; done = true; }
      render();
    });
    render();
    return {
      keydown(e) {
        const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        if (/^[0-9A-F]$/.test(k) && parseInt(k, 16) < R[base]) { press(k, k); return true; }
        const m = { '+': '+', '-': '-', '*': '*', '/': '/', '(': '(', ')': ')', Enter: '=', '=': '=', Backspace: 'del', Escape: 'ac', '&': ' and ', '|': ' or ', '^': ' xor ', '~': 'not ' };
        if (m[e.key]) { press(m[e.key], e.key); return true; }
        return false;
      },
    };
  }

  G.TISModels = { createBasic, createGraph, createStat, createProgrammer, normalize };
})(window);
