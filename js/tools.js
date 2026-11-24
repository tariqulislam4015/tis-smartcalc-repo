/* =========================================================
   TIS SmartCalc — class tools
   Chart-Lab (pie · donut · line) · Date calculator · CGPA (4.00 / 5.00)
   ========================================================= */
(function (G) {
  'use strict';
  const E = G.TISEngine;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tis.tool.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tis.tool.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const PAL = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#475569'];
  const num = (s) => {
    s = String(s ?? '').trim(); if (!s) return NaN;
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    try { return E.run(G.TISModels.normalize(s), { vars: {} }); } catch (e) { return NaN; }
  };
  const nf = (v, d = 4) => (isFinite(v) ? Number(v).toLocaleString('en-US', { maximumFractionDigits: d }) : '—');
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const brand = (name, sub) => `<div class="gp-head"><div class="sx-brand"><img src="assets/logo.svg" alt=""><div><b>TIS</b> ${name}<small>${sub}</small></div></div></div>`;

  /* ============================ CHART-LAB ============================ */
  function sample(type) {
    if (type === 'line') return {
      type: 'line', title: 'Average marks by month', vals: true,
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [{ name: 'Class A', values: ['62', '68', '71', '75', '80', '84'] }, { name: 'Class B', values: ['55', '60', '58', '66', '70', '77'] }],
    };
    return {
      type: type || 'pie', title: 'Class time by topic', vals: true,
      labels: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'],
      series: [{ name: 'Hours', values: ['30', '20', '25', '15', '10'] }],
    };
  }

  function createCharts(host, hooks = {}) {
    let st = store.get('chart', null) || sample('pie');
    host.innerHTML = `
      <div class="gp tl">
        ${brand('Chart-Lab', 'Pie chart · Donut · Line graph')}
        <div class="seg" role="tablist">
          <button type="button" data-type="pie">Pie chart</button><button type="button" data-type="donut">Donut</button><button type="button" data-type="line">Line graph</button>
        </div>
        <div class="ch-grid">
          <div class="ch-figcol">
            <div class="gp-canvas ch-fig"><canvas></canvas><div class="gp-tip"></div></div>
            <div class="ch-legend"></div>
          </div>
          <div class="ch-side">
            <label class="fld">Chart title<input type="text" data-title spellcheck="false"></label>
            <div class="ch-tbl-wrap"><table class="ch-tbl"></table></div>
            <div class="row-btns">
              <button type="button" data-act="row">+ Row</button>
              <button type="button" data-act="series" class="only-line">+ Line</button>
              <button type="button" data-act="sample">Sample data</button>
              <button type="button" data-act="clear" class="ghost">Clear</button>
            </div>
            <label class="chk"><input type="checkbox" data-vals> Show values on chart</label>
            <button type="button" class="tl-btn pri" data-act="png">Save as PNG</button>
            <p class="note">Values accept expressions too, e.g. <code>3/4*100</code>. The starting numbers are sample data — replace them with yours.</p>
          </div>
        </div>
      </div>`;
    const $ = (s) => host.querySelector(s);
    const cv = $('canvas'), ctx = cv.getContext('2d'), wrap = $('.ch-fig'), tip = $('.gp-tip'), tbl = $('.ch-tbl'), legend = $('.ch-legend');
    let geo = null, prog = 1;
    const save = () => store.set('chart', st);
    const isLine = () => st.type === 'line';

    function renderTable() {
      host.querySelector('.tl').classList.toggle('is-line', isLine());
      host.querySelectorAll('[data-type]').forEach((b) => b.classList.toggle('on', b.dataset.type === st.type));
      $('[data-title]').value = st.title; $('[data-vals]').checked = !!st.vals;
      const ser = isLine() ? st.series : st.series.slice(0, 1);
      let h = '<thead><tr><th>Label</th>' + ser.map((s, j) => isLine()
        ? `<th><span class="sw" style="background:${PAL[j % PAL.length]}"></span><input class="tl-in hd" data-sname="${j}" value="${esc(s.name)}" aria-label="Line name">${st.series.length > 1 ? `<button type="button" class="x-del" data-delser="${j}" aria-label="Remove line">×</button>` : ''}</th>`
        : '<th class="r">Value</th>').join('') + '<th></th></tr></thead><tbody>';
      st.labels.forEach((l, i) => {
        h += `<tr><td>${!isLine() ? `<span class="sw" style="background:${PAL[i % PAL.length]}"></span>` : ''}<input class="tl-in" data-lab="${i}" value="${esc(l)}" placeholder="Label ${i + 1}"></td>` +
          ser.map((s, j) => `<td><input class="tl-in num" inputmode="decimal" data-v="${i}" data-s="${j}" value="${esc(s.values[i] ?? '')}" placeholder="0"></td>`).join('') +
          `<td><button type="button" class="x-del" data-delrow="${i}" aria-label="Remove row">×</button></td></tr>`;
      });
      tbl.innerHTML = h + '</tbody>';
    }

    function data() {
      const ser = isLine() ? st.series : st.series.slice(0, 1);
      return { labels: st.labels.map((l, i) => l || `Item ${i + 1}`), series: ser.map((s) => ({ name: s.name, v: st.labels.map((_, i) => num(s.values[i])) })) };
    }

    function size() {
      const r = wrap.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr);
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    }
    function css(v, d) { return getComputedStyle(host).getPropertyValue(v).trim() || d; }

    function draw() {
      const w = cv.width / (window.devicePixelRatio || 1), h = cv.height / (window.devicePixelRatio || 1);
      const bg = css('--graph-bg', '#fff'), ink = css('--ink', '#0f172a'), lab = css('--graph-label', '#475569');
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = ink; ctx.font = '700 15px "Hind Siliguri", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(st.title || '', w / 2, 24, w - 20);
      const D = data(); geo = null;
      if (isLine()) drawLine(D, w, h, lab, bg); else drawPie(D, w, h, lab, bg, ink);
      renderLegend(D);
    }

    function drawPie(D, w, h, lab, bg, ink) {
      const v = D.series[0] ? D.series[0].v : [];
      const items = D.labels.map((l, i) => ({ l, v: v[i], c: PAL[i % PAL.length], i })).filter((x) => isFinite(x.v) && x.v > 0);
      const total = items.reduce((s, x) => s + x.v, 0);
      ctx.textAlign = 'center';
      if (!total) { ctx.fillStyle = lab; ctx.font = '14px system-ui'; ctx.fillText('Enter positive values in the table', w / 2, h / 2); return; }
      const small = w < 440, cx = w / 2, cy = h / 2 + 14, r = Math.max(50, Math.min(w / 2 - (small ? 26 : 92), (h - 40) / 2 - 30));
      const donut = st.type === 'donut';
      let a = -Math.PI / 2; const end = -Math.PI / 2 + Math.PI * 2 * prog;
      items.forEach((x) => {
        x.a0 = a; x.a1 = a + (x.v / total) * Math.PI * 2; a = x.a1;
        const a1 = Math.min(x.a1, end); if (a1 <= x.a0) return;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, x.a0, a1); ctx.closePath();
        ctx.fillStyle = x.c; ctx.fill(); ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.stroke();
      });
      if (donut) {
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
        ctx.fillStyle = ink; ctx.font = `700 ${Math.round(r * 0.22)}px ui-monospace, monospace`; ctx.textBaseline = 'middle';
        ctx.fillText(nf(total, 2), cx, cy - r * 0.06); ctx.font = `${Math.max(11, Math.round(r * 0.1))}px system-ui`; ctx.fillStyle = lab; ctx.fillText('Total', cx, cy + r * 0.16); ctx.textBaseline = 'alphabetic';
      }
      if (prog >= 1) {
        ctx.font = '600 12px system-ui, sans-serif';
        items.forEach((x) => {
          const m = (x.a0 + x.a1) / 2, pct = x.v / total * 100;
          const txt = st.vals ? `${nf(pct, 1)}%` : '';
          if (!txt) return;
          if (pct >= 6) { // inside slice
            const rr = donut ? r * 0.78 : r * 0.64;
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(txt, cx + Math.cos(m) * rr, cy + Math.sin(m) * rr); ctx.textBaseline = 'alphabetic';
          } else if (!small) { // leader line
            const x1 = cx + Math.cos(m) * (r + 4), y1 = cy + Math.sin(m) * (r + 4), x2 = cx + Math.cos(m) * (r + 18), y2 = cy + Math.sin(m) * (r + 18);
            ctx.strokeStyle = x.c; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2 + (Math.cos(m) >= 0 ? 10 : -10), y2); ctx.stroke();
            ctx.fillStyle = lab; ctx.textAlign = Math.cos(m) >= 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(txt, x2 + (Math.cos(m) >= 0 ? 13 : -13), y2); ctx.textBaseline = 'alphabetic';
          }
        });
      }
      geo = { kind: 'pie', cx, cy, r, ri: donut ? r * 0.56 : 0, items, total };
    }

    function niceScale(lo, hi, n = 5) {
      if (lo === hi) { lo -= 1; hi += 1; }
      const raw = (hi - lo) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
      const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
      return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step };
    }
    function drawLine(D, w, h, lab, bg) {
      const all = D.series.flatMap((s) => s.v).filter(isFinite);
      const n = D.labels.length;
      ctx.textAlign = 'center';
      if (!all.length || n < 1) { ctx.fillStyle = lab; ctx.font = '14px system-ui'; ctx.fillText('Enter values in the table', w / 2, h / 2); return; }
      let mn = Math.min(...all), mx = Math.max(...all);
      if (mn > 0 && mn < mx * 0.35) mn = 0;
      const sc = niceScale(mn, mx, h < 320 ? 4 : 5);
      const L = 52, R = 18, T = 42, B = 38, pw = w - L - R, ph = h - T - B;
      const X = (i) => L + 18 + (n === 1 ? (pw - 36) / 2 : (i / (n - 1)) * (pw - 36)), Y = (v) => T + ph - ((v - sc.lo) / (sc.hi - sc.lo)) * ph;
      ctx.font = '11px ui-monospace, monospace'; ctx.lineWidth = 1;
      for (let v = sc.lo; v <= sc.hi + sc.step / 2; v += sc.step) {
        const y = Math.round(Y(v)) + 0.5;
        ctx.strokeStyle = css('--graph-grid', '#e5e7eb'); ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
        ctx.fillStyle = lab; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(nf(v, 3), L - 8, y);
      }
      ctx.strokeStyle = css('--graph-axis', '#334155'); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(L, T - 6); ctx.lineTo(L, T + ph); ctx.lineTo(w - R, T + ph); ctx.stroke();
      const every = Math.max(1, Math.ceil(n * 56 / pw));
      ctx.fillStyle = lab; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '12px system-ui, sans-serif';
      D.labels.forEach((l, i) => { if (i % every === 0) ctx.fillText(l.length > 10 ? l.slice(0, 9) + '…' : l, X(i), T + ph + 8); });
      ctx.textBaseline = 'alphabetic';
      const upto = (n - 1) * prog;
      D.series.forEach((s, j) => {
        const c = PAL[j % PAL.length];
        ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
        let pen = false;
        for (let i = 0; i < n; i++) {
          if (i > upto + 1e-9) break;
          if (!isFinite(s.v[i])) { pen = false; continue; }
          let x = X(i), y = Y(s.v[i]);
          if (i > upto) break;
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
          const nx = i + 1;
          if (nx <= n - 1 && nx > upto && isFinite(s.v[nx])) { const f = upto - i; ctx.lineTo(x + (X(nx) - x) * f, y + (Y(s.v[nx]) - y) * f); }
        }
        ctx.stroke();
        s.v.forEach((v, i) => {
          if (!isFinite(v) || i > upto + 1e-9) return;
          ctx.beginPath(); ctx.arc(X(i), Y(v), 4.2, 0, 7); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = c; ctx.stroke();
          if (st.vals && prog >= 1 && n <= 16) { ctx.fillStyle = c; ctx.font = '600 11px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(nf(v, 2), X(i), Y(v) - 9 - j * 0); }
        });
      });
      geo = { kind: 'line', X, Y, n, L, R, T, ph, D };
    }

    function renderLegend(D) {
      if (isLine()) {
        legend.innerHTML = D.series.map((s, j) => {
          const v = s.v.filter(isFinite);
          const avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
          return `<div class="lg"><i style="background:${PAL[j % PAL.length]}"></i><span>${esc(s.name)}</span><span class="p">avg ${nf(avg, 2)}</span><b>${v.length ? nf(Math.min(...v), 2) + '–' + nf(Math.max(...v), 2) : '—'}</b></div>`;
        }).join('');
        return;
      }
      const v = D.series[0] ? D.series[0].v : []; const tot = v.filter((x) => isFinite(x) && x > 0).reduce((a, b) => a + b, 0);
      legend.innerHTML = D.labels.map((l, i) => (isFinite(v[i]) && v[i] > 0
        ? `<div class="lg"><i style="background:${PAL[i % PAL.length]}"></i><span>${esc(l)}</span><b>${nf(v[i], 3)}</b><span class="p">${nf(v[i] / tot * 100, 2)}%</span></div>` : '')).join('') +
        (tot ? `<div class="lg tot"><i></i><span>Total</span><b>${nf(tot, 3)}</b><span class="p">100%</span></div>` : '');
    }

    function animate() {
      if (reduced()) { prog = 1; draw(); return; }
      const t0 = performance.now();
      const step = (t) => { const p = Math.min(1, (t - t0) / 650); prog = 1 - Math.pow(1 - p, 3); draw(); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }

    // hover tooltip
    cv.addEventListener('pointermove', (e) => {
      if (!geo) return; const x = e.offsetX, y = e.offsetY; let html = '';
      if (geo.kind === 'pie') {
        const d = Math.hypot(x - geo.cx, y - geo.cy);
        if (d <= geo.r && d >= geo.ri) {
          let a = Math.atan2(y - geo.cy, x - geo.cx); if (a < -Math.PI / 2) a += Math.PI * 2;
          const it = geo.items.find((s) => a >= s.a0 && a < s.a1);
          if (it) html = `<b style="color:${it.c}">${esc(it.l)}</b><br>${nf(it.v, 4)} · ${nf(it.v / geo.total * 100, 2)}%`;
        }
      } else {
        const i = Math.round(((x - geo.L) / (geo.X(geo.n - 1) - geo.L || 1)) * (geo.n - 1));
        if (i >= 0 && i < geo.n && y > geo.T - 10 && y < geo.T + geo.ph + 10) html = `<b>${esc(geo.D.labels[i])}</b>` + geo.D.series.map((s, j) => `<br><span style="color:${PAL[j % PAL.length]}">●</span> ${esc(s.name)}: ${nf(s.v[i], 4)}`).join('');
      }
      if (html) { tip.innerHTML = html; tip.style.display = 'block'; tip.style.left = Math.min(x + 14, wrap.clientWidth - 150) + 'px'; tip.style.top = Math.max(6, y - 50) + 'px'; } else tip.style.display = 'none';
    });
    cv.addEventListener('pointerleave', () => (tip.style.display = 'none'));

    host.querySelector('.seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-type]'); if (!b || b.dataset.type === st.type) return;
      const was = st.type; st.type = b.dataset.type;
      if (st.type === 'line' && st.series.length === 1 && was !== 'line' && st.title === sample('pie').title) st = sample('line');
      else if (st.type !== 'line' && was === 'line' && st.title === sample('line').title) { st = sample(st.type); }
      save(); renderTable(); animate();
    });
    $('[data-title]').addEventListener('input', (e) => { st.title = e.target.value; save(); draw(); });
    $('[data-vals]').addEventListener('change', (e) => { st.vals = e.target.checked; save(); draw(); });
    tbl.addEventListener('input', (e) => {
      const t = e.target, d = t.dataset;
      if (d.lab !== undefined) st.labels[+d.lab] = t.value;
      else if (d.v !== undefined) { st.series[+d.s].values[+d.v] = t.value; t.classList.toggle('bad', t.value.trim() !== '' && !isFinite(num(t.value))); }
      else if (d.sname !== undefined) st.series[+d.sname].name = t.value;
      save(); prog = 1; draw();
    });
    tbl.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.delrow !== undefined) { const i = +b.dataset.delrow; st.labels.splice(i, 1); st.series.forEach((s) => s.values.splice(i, 1)); }
      if (b.dataset.delser !== undefined) st.series.splice(+b.dataset.delser, 1);
      save(); renderTable(); prog = 1; draw();
    });
    tbl.addEventListener('keydown', (e) => { // Enter → next row
      if (e.key !== 'Enter') return; e.preventDefault();
      const ins = [...tbl.querySelectorAll('input:not(.hd)')]; const k = ins.indexOf(e.target); if (k >= 0 && ins[k + 1]) ins[k + 1].focus();
    });
    host.querySelector('.row-btns').addEventListener('click', (e) => {
      const a = e.target.dataset.act; if (!a) return;
      if (a === 'row') { st.labels.push(''); st.series.forEach((s) => s.values.push('')); save(); renderTable(); draw(); const ins = tbl.querySelectorAll(`[data-lab="${st.labels.length - 1}"]`); if (ins[0]) ins[0].focus(); return; }
      if (a === 'series' && st.series.length < 6) st.series.push({ name: 'Line ' + (st.series.length + 1), values: st.labels.map(() => '') });
      if (a === 'sample') st = sample(st.type);
      if (a === 'clear') { st.title = ''; st.labels = ['', '', '']; st.series = [{ name: isLine() ? 'Line 1' : 'Value', values: ['', '', ''] }]; }
      save(); renderTable(); animate();
    });
    $('[data-act="png"]').addEventListener('click', () => {
      try {
        const out = document.createElement('canvas'); out.width = cv.width; out.height = cv.height + 40 * (window.devicePixelRatio || 1);
        const o = out.getContext('2d'); o.fillStyle = css('--graph-bg', '#fff'); o.fillRect(0, 0, out.width, out.height); o.drawImage(cv, 0, 0);
        const dpr = window.devicePixelRatio || 1; o.scale(dpr, dpr); o.fillStyle = css('--graph-label', '#475569'); o.font = '11px system-ui'; o.textAlign = 'right';
        o.fillText('TIS SmartCalc · TIS Academy', out.width / dpr - 10, out.height / dpr - 14);
        const a = document.createElement('a'); a.href = out.toDataURL('image/png'); a.download = (st.title || 'tis-chart').replace(/[^\w\-]+/g, '-') + '.png';
        document.body.appendChild(a); a.click(); a.remove();
      } catch (er) { /* downloads blocked in preview */ }
    });

    renderTable();
    new ResizeObserver(size).observe(wrap);
    setTimeout(animate, 30);
    return { resize: size };
  }

  /* ============================ DATE ============================ */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS_BN = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAY = 86400000;
  const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // m: 0-11
  const parseD = (s) => { const m = /^(\d{1,6})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); const d = new Date(t); d.setUTCFullYear(+m[1]); return isNaN(d) ? null : d; };
  const iso = (d) => `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const todayISO = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; };
  const longD = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const wd = (d) => `${DAYS[d.getUTCDay()]} <span class="bn">(${DAYS_BN[d.getUTCDay()]})</span>`;
  function ymd(a, b) { // a <= b ; whole months first (month-end safe), then leftover days
    let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    let t = addYMD(a, 0, months, 0);
    while (months > 0 && t > b) { months--; t = addYMD(a, 0, months, 0); }
    return { y: Math.floor(months / 12), m: months % 12, d: Math.round((b - t) / DAY) };
  }
  function addYMD(dt, y, m, d) {
    const Y0 = dt.getUTCFullYear() + y, M0 = dt.getUTCMonth() + m;
    const Y = Y0 + Math.floor(M0 / 12), M = ((M0 % 12) + 12) % 12;
    const day = Math.min(dt.getUTCDate(), dim(Y, M));
    const r = new Date(Date.UTC(2000, M, day)); r.setUTCFullYear(Y);
    return new Date(r.getTime() + d * DAY);
  }
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const ymdText = (o) => [o.y && plural(o.y, 'year'), o.m && plural(o.m, 'month'), (o.d || (!o.y && !o.m)) && plural(o.d, 'day')].filter(Boolean).join(', ');
  function weekdaysBetween(a, b) { // Mon–Fri, inclusive of a, exclusive of b
    const n = Math.round((b - a) / DAY); const full = Math.floor(n / 7); let c = full * 5;
    for (let i = 0, k = a.getUTCDay(); i < n % 7; i++, k = (k + 1) % 7) if (k !== 0 && k !== 6) c++;
    return c;
  }
  function isoWeek(d) { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / DAY + 1) / 7); }
  const dayOfYear = (d) => Math.round((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1;
  const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  function createDate(host, hooks = {}) {
    const t = todayISO(), y0 = t.slice(0, 4) + '-01-01';
    const st = Object.assign({ tab: 'diff', a: y0, b: t, incl: false, base: t, op: '+', ay: '0', am: '0', aw: '0', ad: '100', dob: '2000-01-01', asof: t }, store.get('date', {}));
    host.innerHTML = `
      <div class="gp tl dt">
        ${brand('Date', 'Date · Month · Year calculator')}
        <div class="seg" role="tablist"><button type="button" data-tab="diff">Between two dates</button><button type="button" data-tab="add">Add / Subtract</button><button type="button" data-tab="age">Age</button></div>
        <div class="dt-pane" data-pane="diff">
          <div class="dt-row">
            <label class="fld">From date<input type="date" data-k="a"></label>
            <label class="fld">To date<input type="date" data-k="b"></label>
          </div>
          <div class="dt-quick"><button type="button" data-q="b">To = today</button><button type="button" data-q="swap">⇄ Swap</button><label class="chk"><input type="checkbox" data-k="incl"> Count the end day too (+1)</label></div>
        </div>
        <div class="dt-pane" data-pane="add">
          <div class="dt-row">
            <label class="fld">Start date<input type="date" data-k="base"></label>
            <label class="fld">Operation<select data-k="op"><option value="+">Add (+)</option><option value="-">Subtract (−)</option></select></label>
          </div>
          <div class="dt-row four">
            <label class="fld">Years<input type="number" inputmode="numeric" data-k="ay" min="0"></label>
            <label class="fld">Months<input type="number" inputmode="numeric" data-k="am" min="0"></label>
            <label class="fld">Weeks<input type="number" inputmode="numeric" data-k="aw" min="0"></label>
            <label class="fld">Days<input type="number" inputmode="numeric" data-k="ad" min="0"></label>
          </div>
        </div>
        <div class="dt-pane" data-pane="age">
          <div class="dt-row">
            <label class="fld">Date of birth<input type="date" data-k="dob"></label>
            <label class="fld">Age on (date)<input type="date" data-k="asof"></label>
          </div>
          <div class="dt-quick"><button type="button" data-q="asof">Today</button></div>
        </div>
        <div class="dt-big" aria-live="polite"></div>
        <div class="st-cards dt-cards"></div>
        <div class="row-btns"><button type="button" data-act="copy">Copy result</button><button type="button" data-act="hist">Save to history</button></div>
      </div>`;
    const $ = (s) => host.querySelector(s), big = $('.dt-big'), cards = $('.dt-cards');
    host.querySelectorAll('[data-k]').forEach((el) => { if (el.type === 'checkbox') el.checked = !!st[el.dataset.k]; else el.value = st[el.dataset.k]; });
    let lastText = '';
    const card = (l, v, k) => `<div class="stc ${k || ''}"><span>${l}</span><b>${v}</b></div>`;

    function calc() {
      host.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === st.tab));
      host.querySelectorAll('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== st.tab));
      store.set('date', st);
      let h = '', c = '';
      if (st.tab === 'diff') {
        let a = parseD(st.a), b = parseD(st.b);
        if (!a || !b) { big.innerHTML = '<small>Pick both dates</small>'; cards.innerHTML = ''; return; }
        const neg = b < a; if (neg) [a, b] = [b, a];
        const b2 = st.incl ? new Date(b.getTime() + DAY) : b;
        const o = ymd(a, b2), days = Math.round((b2 - a) / DAY);
        h = `<small>${neg ? 'Earlier by' : 'Difference'}</small><b>${ymdText(o)}</b><small>${longD(a)} → ${longD(b)}${st.incl ? ' (end day included)' : ''}</small>`;
        c = card('Total days', nf(days), 'hi') + card('Weeks', `${Math.floor(days / 7)} w ${days % 7} d`) + card('Total months', `${o.y * 12 + o.m} m ${o.d} d`) +
          card('Weekdays (Mon–Fri)', nf(weekdaysBetween(a, b2))) + card('Fridays', nf(countDow(a, b2, 5))) + card('Total hours', nf(days * 24)) + card('Total minutes', nf(days * 1440)) +
          card('Years (decimal)', nf(days / 365.2425, 4)) + card('From is a', wd(a)) + card('To is a', wd(b));
        lastText = `${longD(a)} to ${longD(b)}: ${ymdText(o)} (${days} days)`;
      } else if (st.tab === 'add') {
        const b = parseD(st.base); if (!b) { big.innerHTML = '<small>Pick a start date</small>'; cards.innerHTML = ''; return; }
        const s = st.op === '-' ? -1 : 1, Y = (parseInt(st.ay, 10) || 0) * s, M = (parseInt(st.am, 10) || 0) * s, D = ((parseInt(st.aw, 10) || 0) * 7 + (parseInt(st.ad, 10) || 0)) * s;
        const r = addYMD(b, Y, M, D);
        if (isNaN(r)) { big.innerHTML = '<small>Out of range</small>'; return; }
        const parts = [st.ay > 0 && plural(+st.ay, 'year'), st.am > 0 && plural(+st.am, 'month'), st.aw > 0 && plural(+st.aw, 'week'), st.ad > 0 && plural(+st.ad, 'day')].filter(Boolean).join(', ') || '0 days';
        h = `<small>${longD(b)} ${st.op === '-' ? '−' : '+'} ${parts}</small><b>${longD(r)}</b><small>${wd(r)}</small>`;
        c = card('Result (ISO)', iso(r), 'hi') + card('Day of year', `${dayOfYear(r)} / ${leap(r.getUTCFullYear()) ? 366 : 365}`) + card('ISO week', isoWeek(r)) +
          card('Leap year?', leap(r.getUTCFullYear()) ? 'Yes' : 'No') + card('Days in that month', dim(r.getUTCFullYear(), r.getUTCMonth())) + card('Total days moved', nf(Math.round((r - b) / DAY)));
        lastText = `${longD(b)} ${st.op} ${parts} = ${longD(r)} (${DAYS[r.getUTCDay()]})`;
      } else {
        const a = parseD(st.dob), b = parseD(st.asof);
        if (!a || !b) { big.innerHTML = '<small>Pick both dates</small>'; cards.innerHTML = ''; return; }
        if (b < a) { big.innerHTML = '<small>The "age on" date is before the birth date</small>'; cards.innerHTML = ''; return; }
        const o = ymd(a, b), days = Math.round((b - a) / DAY);
        let nb = addYMD(a, o.y + 1, 0, 0); if (o.m === 0 && o.d === 0) nb = b;
        const toNb = Math.round((nb - b) / DAY);
        h = `<small>Age</small><b>${ymdText(o)}</b><small>Born on ${longD(a)}, a ${wd(a)}</small>`;
        c = card('Total days lived', nf(days), 'hi') + card('Total weeks', nf(Math.floor(days / 7))) + card('Total months', nf(o.y * 12 + o.m)) + card('Total hours', nf(days * 24)) +
          card('Next birthday', toNb === 0 ? '🎉 Today!' : `in ${plural(toNb, 'day')}`) + card('Next birthday on', `${longD(nb)}<br><small>${wd(nb)}</small>`);
        lastText = `Age on ${longD(b)}: ${ymdText(o)} (${days} days)`;
      }
      big.innerHTML = h; cards.innerHTML = c;
    }
    function countDow(a, b, dow) { const n = Math.round((b - a) / DAY); let c = Math.floor(n / 7); for (let i = 0, k = a.getUTCDay(); i < n % 7; i++, k = (k + 1) % 7) if (k === dow) c++; return c; }

    host.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; st[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; calc(); });
    host.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tab) { st.tab = b.dataset.tab; calc(); }
      if (b.dataset.q === 'b') { st.b = todayISO(); $('[data-k="b"]').value = st.b; calc(); }
      if (b.dataset.q === 'asof') { st.asof = todayISO(); $('[data-k="asof"]').value = st.asof; calc(); }
      if (b.dataset.q === 'swap') { [st.a, st.b] = [st.b, st.a]; $('[data-k="a"]').value = st.a; $('[data-k="b"]').value = st.b; calc(); }
      if (b.dataset.act === 'copy') hooks.copy && hooks.copy(lastText);
      if (b.dataset.act === 'hist' && lastText) { const [l, r] = lastText.split(/: | = /); hooks.history && hooks.history({ expr: l, html: esc(r || lastText), dec: lastText, model: 'Date' }); }
    });
    calc();
    return {};
  }

  /* ============================ CGPA ============================ */
  const SCALES = {
    4: { label: 'Out of 4.00 (University · UGC)', max: 4, credit: '3', grades: [['A+', 80, 4], ['A', 75, 3.75], ['A-', 70, 3.5], ['B+', 65, 3.25], ['B', 60, 3], ['B-', 55, 2.75], ['C+', 50, 2.5], ['C', 45, 2.25], ['D', 40, 2], ['F', 0, 0]] },
    5: { label: 'Out of 5.00 (SSC / HSC)', max: 5, credit: '1', grades: [['A+', 80, 5], ['A', 70, 4], ['A-', 60, 3.5], ['B', 50, 3], ['C', 40, 2], ['D', 33, 1], ['F', 0, 0]] },
  };
  function sampleRows(scale) {
    if (scale === 5) return [['Bangla', '101', '', '82', ''], ['English', '107', '', '74', ''], ['Mathematics', '109', '', '91', ''], ['Physics', '136', '', '78', ''], ['Chemistry', '137', '', '69', ''], ['Higher Math (4th)', '126', '', '72', '', true]]
      .map(([sub, code, credit, marks, grade, opt]) => ({ sub, code, credit, marks, grade, opt: !!opt }));
    return [['Calculus I', 'MAT101', '3', '', 'A'], ['Linear Algebra', 'MAT103', '3', '', 'A+'], ['Physics I', 'PHY101', '3', '', 'B+'], ['English', 'ENG101', '2', '', 'A-'], ['Programming Lab', 'CSE102', '1.5', '', 'A']]
      .map(([sub, code, credit, marks, grade]) => ({ sub, code, credit, marks, grade, opt: false }));
  }
  function createCGPA(host, hooks = {}) {
    const saved = store.get('cgpa', null);
    const st = saved || { scale: 4, rows: { 4: sampleRows(4), 5: sampleRows(5) }, prev: { 4: { cg: '', cr: '' }, 5: { cg: '', cr: '' } } };
    host.innerHTML = `
      <div class="gp tl cg">
        ${brand('CGPA', 'GPA / CGPA calculator · 4.00 & 5.00 scale')}
        <div class="seg" role="tablist"><button type="button" data-scale="4">Out of 4.00</button><button type="button" data-scale="5">Out of 5.00</button></div>
        <p class="note cg-scale-note"></p>
        <div class="cg-tbl-wrap"><table class="cg-tbl"></table></div>
        <div class="row-btns">
          <button type="button" data-act="add">+ Subject</button><button type="button" data-act="sample">Sample data</button><button type="button" data-act="clear" class="ghost">Clear all</button>
        </div>
        <div class="cg-prev">
          <label class="fld">Previous CGPA <small>(optional)</small><input type="text" inputmode="decimal" data-prev="cg" placeholder="e.g. 3.45"></label>
          <label class="fld">Credits already completed <small>(optional)</small><input type="text" inputmode="decimal" data-prev="cr" placeholder="e.g. 60"></label>
        </div>
        <div class="cg-res" aria-live="polite"></div>
        <div class="row-btns"><button type="button" class="tl-btn pri" data-act="copy">Copy result</button><button type="button" data-act="hist">Save to history</button></div>
        <details class="cg-ref"><summary>Grading scale used</summary><div class="cg-ref-body"></div></details>
      </div>`;
    const $ = (s) => host.querySelector(s), tbl = $('.cg-tbl'), res = $('.cg-res');
    const S = () => SCALES[st.scale], rows = () => st.rows[st.scale];
    const gpOf = (g) => { const x = S().grades.find((r) => r[0] === g); return x ? x[2] : NaN; };
    const gradeFromMarks = (m) => { if (!isFinite(m)) return ''; const x = S().grades.find((r) => m >= r[1]); return x ? x[0] : 'F'; };
    const save = () => store.set('cgpa', st);
    let summary = '';

    function rowGrade(r) { if (r.grade) return r.grade; const m = num(r.marks); return isFinite(m) && m >= 0 && m <= 100 ? gradeFromMarks(m) : ''; }
    function renderTable() {
      host.querySelectorAll('[data-scale]').forEach((b) => b.classList.toggle('on', +b.dataset.scale === st.scale));
      host.querySelector('.cg').classList.toggle('s5', st.scale === 5);
      $('.cg-scale-note').innerHTML = st.scale === 4
        ? 'University system: GPA = Σ(credit × grade point) ÷ Σ credit. Enter a grade, or marks (%) to get the grade automatically. Subject and code are optional.'
        : 'SSC / HSC system: subjects count equally (credit 1). Tick the 4th (optional) subject — only its grade point above 2.00 is added. Any F in a main subject means GPA 0.00.';
      const opts = (sel) => `<option value="">${'Auto'}</option>` + S().grades.map((g) => `<option value="${g[0]}" ${g[0] === sel ? 'selected' : ''}>${g[0]} · ${g[2].toFixed(2)}</option>`).join('');
      tbl.innerHTML = `<colgroup><col style="width:30px"><col><col style="width:96px"><col style="width:66px"><col style="width:72px"><col style="width:120px"><col style="width:62px">${st.scale === 5 ? '<col style="width:40px">' : ''}<col style="width:36px"></colgroup><thead><tr><th>#</th><th>Subject <small>(opt.)</small></th><th>Code <small>(opt.)</small></th><th class="r">Credit</th><th class="r">Marks %</th><th>Grade</th><th class="r">GP</th>${st.scale === 5 ? '<th title="4th / optional subject">4th</th>' : ''}<th></th></tr></thead><tbody>` +
        rows().map((r, i) => `<tr data-i="${i}">
          <td class="n">${i + 1}</td>
          <td><input class="tl-in" data-f="sub" value="${esc(r.sub)}" placeholder="Subject ${i + 1}"></td>
          <td><input class="tl-in code" data-f="code" value="${esc(r.code)}" placeholder="—"></td>
          <td><input class="tl-in num" inputmode="decimal" data-f="credit" value="${esc(r.credit)}" placeholder="${S().credit}"></td>
          <td><input class="tl-in num" inputmode="decimal" data-f="marks" value="${esc(r.marks)}" placeholder="—"></td>
          <td><select class="tl-in" data-f="grade">${opts(r.grade)}</select></td>
          <td class="gp"></td>
          ${st.scale === 5 ? `<td class="c"><input type="checkbox" data-f="opt" ${r.opt ? 'checked' : ''} aria-label="Optional subject"></td>` : ''}
          <td><button type="button" class="x-del" data-del="${i}" aria-label="Remove subject">×</button></td></tr>`).join('') + '</tbody>';
      $('[data-prev="cg"]').value = st.prev[st.scale].cg; $('[data-prev="cr"]').value = st.prev[st.scale].cr;
      $('[data-prev="cg"]').placeholder = st.scale === 4 ? 'e.g. 3.45' : 'e.g. 4.50';
      $('.cg-ref-body').innerHTML = `<table class="gp-tbl"><tr><th>Marks</th><th>Grade</th><th>GP</th></tr>${S().grades.map((g, k) => `<tr><td>${k === 0 ? g[1] + '–100' : g[1] + '–' + (S().grades[k - 1][1] - 1)}</td><td>${g[0]}</td><td>${g[2].toFixed(2)}</td></tr>`).join('')}</table>`;
      calc();
    }

    function letterFor(g) { const x = S().grades.find((r) => g >= r[2] - 1e-9); return x ? x[0] : 'F'; }
    function calc() {
      const R = rows(); let sc = 0, sp = 0, fail = false, bonus = 0, mainCr = 0, counted = 0, missing = 0;
      R.forEach((r, i) => {
        const g = rowGrade(r), gp = gpOf(g);
        let cr = num(r.credit); if (!(cr > 0)) cr = num(S().credit);
        const cell = tbl.querySelector(`tr[data-i="${i}"] td.gp`), mk = tbl.querySelector(`tr[data-i="${i}"] [data-f="marks"]`);
        if (mk) mk.classList.toggle('bad', r.marks.trim() !== '' && !(num(r.marks) >= 0 && num(r.marks) <= 100));
        if (!g) { if (cell) cell.innerHTML = '<span class="dim">—</span>'; if (r.sub || r.code) missing++; return; }
        if (cell) cell.innerHTML = `<span class="${g === 'F' ? 'bad-t' : ''}">${gp.toFixed(2)}</span>${!r.grade ? `<small>${g}</small>` : ''}`;
        counted++;
        if (st.scale === 5 && r.opt) { bonus += Math.max(0, gp - 2) * cr; return; }
        if (g === 'F') fail = true;
        sc += cr; sp += cr * gp; mainCr += cr;
      });
      if (!counted) { res.innerHTML = '<p class="note">Add subjects with a grade or marks to see the result.</p>'; summary = ''; return; }
      const max = S().max;
      let gpa = mainCr ? (sp + bonus) / mainCr : 0;
      if (st.scale === 5) { gpa = Math.min(5, gpa); if (fail) gpa = 0; }
      const gpaR = Math.round(gpa * 100) / 100;
      const pc = num(st.prev[st.scale].cg), pr = num(st.prev[st.scale].cr);
      let cum = null; if (isFinite(pc) && pc >= 0 && pc <= max && pr > 0) cum = Math.round(((pc * pr + gpa * mainCr) / (pr + mainCr)) * 100) / 100;
      const shown = cum ?? gpaR;
      const letter = fail && st.scale === 5 ? 'F' : letterFor(gpaR);
      res.innerHTML = `
        <div class="cg-ring" style="--p:${Math.max(0, Math.min(100, shown / max * 100))}"><div><b>${shown.toFixed(2)}</b><small>out of ${max.toFixed(2)}</small></div></div>
        <div class="cg-detail">
          <div class="cg-head">${cum !== null ? 'Cumulative CGPA' : st.scale === 5 ? 'GPA' : 'GPA (this term)'} <span class="cg-letter ${letter === 'F' ? 'f' : ''}">${letter}</span></div>
          <div class="st-cards">
            <div class="stc ${cum === null ? 'hi' : ''}"><span>This term GPA</span><b>${gpaR.toFixed(2)}</b></div>
            ${cum !== null ? `<div class="stc hi"><span>New CGPA</span><b>${cum.toFixed(2)}</b></div><div class="stc"><span>Total credits</span><b>${nf(pr + mainCr, 2)}</b></div>` : ''}
            <div class="stc"><span>${st.scale === 5 ? 'Subjects counted' : 'Credits this term'}</span><b>${nf(mainCr, 2)}</b></div>
            <div class="stc"><span>Grade points</span><b>${nf(sp + bonus, 3)}</b></div>
            ${st.scale === 5 ? `<div class="stc"><span>4th subject bonus</span><b>+${nf(bonus, 2)}</b></div>` : ''}
            <div class="stc"><span>Percentage of max</span><b>${nf(shown / max * 100, 2)}%</b></div>
          </div>
          ${fail ? `<p class="warn">${st.scale === 5 ? 'F in a main subject — the board result is GPA 0.00 (fail).' : 'An F is counted as 0.00 grade points; you will need to retake that course.'}</p>` : ''}
          ${missing ? `<p class="note">${missing} row(s) have no grade or marks and were skipped.</p>` : ''}
        </div>`;
      summary = `${st.scale === 5 ? 'GPA' : 'GPA'}: ${gpaR.toFixed(2)} / ${max.toFixed(2)} (${letter})` + (cum !== null ? `, CGPA: ${cum.toFixed(2)}` : '') + '\n' +
        R.filter((r) => rowGrade(r)).map((r, i) => `${i + 1}. ${r.sub || 'Subject'}${r.code ? ' [' + r.code + ']' : ''} — ${rowGrade(r)} (${gpOf(rowGrade(r)).toFixed(2)})${st.scale === 4 ? ', ' + (num(r.credit) > 0 ? num(r.credit) : S().credit) + ' cr' : ''}${r.opt && st.scale === 5 ? ' (4th)' : ''}`).join('\n');
      res.dataset.gpa = gpaR.toFixed(2); res.dataset.cum = cum ?? '';
    }

    tbl.addEventListener('input', (e) => {
      const tr = e.target.closest('tr[data-i]'); if (!tr) return; const r = rows()[+tr.dataset.i], f = e.target.dataset.f;
      if (f === 'opt') { rows().forEach((x) => (x.opt = false)); r.opt = e.target.checked; tbl.querySelectorAll('[data-f="opt"]').forEach((c) => { if (c !== e.target) c.checked = false; }); }
      else r[f] = e.target.value;
      if (f === 'marks' && r.grade) { r.grade = ''; tr.querySelector('[data-f="grade"]').value = ''; }
      save(); calc();
    });
    tbl.addEventListener('change', (e) => { if (e.target.dataset.f === 'grade') { const r = rows()[+e.target.closest('tr').dataset.i]; r.grade = e.target.value; save(); calc(); } });
    tbl.addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (!b) return; rows().splice(+b.dataset.del, 1); save(); renderTable(); });
    tbl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return; e.preventDefault();
      const ins = [...tbl.querySelectorAll('input.tl-in, select')]; const k = ins.indexOf(e.target);
      if (k === ins.length - 1 || k < 0) { rows().push({ sub: '', code: '', credit: '', marks: '', grade: '', opt: false }); save(); renderTable(); const n = tbl.querySelectorAll('input.tl-in'); n[n.length - 4] && n[n.length - 4].focus(); }
      else ins[k + 1].focus();
    });
    host.querySelector('.cg-prev').addEventListener('input', (e) => { st.prev[st.scale][e.target.dataset.prev] = e.target.value; save(); calc(); });
    host.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || tbl.contains(b)) return;
      if (b.dataset.scale) { st.scale = +b.dataset.scale; save(); renderTable(); return; }
      const a = b.dataset.act;
      if (a === 'add') { rows().push({ sub: '', code: '', credit: '', marks: '', grade: '', opt: false }); save(); renderTable(); const n = tbl.querySelectorAll('[data-f="sub"]'); n[n.length - 1].focus(); }
      if (a === 'sample') { st.rows[st.scale] = sampleRows(st.scale); save(); renderTable(); }
      if (a === 'clear') { st.rows[st.scale] = [0, 1, 2, 3].map(() => ({ sub: '', code: '', credit: '', marks: '', grade: '', opt: false })); st.prev[st.scale] = { cg: '', cr: '' }; save(); renderTable(); }
      if (a === 'copy' && summary) hooks.copy && hooks.copy(summary);
      if (a === 'hist' && summary) hooks.history && hooks.history({ expr: `${rows().filter((r) => rowGrade(r)).length} subjects · ${st.scale === 4 ? '4.00' : '5.00'} scale`, html: `${st.scale === 5 ? 'GPA' : 'GPA'} ${res.dataset.gpa}${res.dataset.cum ? ' · CGPA ' + res.dataset.cum : ''}`, dec: summary, model: 'CGPA' });
    });
    renderTable();
    return {};
  }

  G.TISTools = { createCharts, createDate, createCGPA, _date: { ymd, addYMD, parseD, weekdaysBetween } };
})(window);
