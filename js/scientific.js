/* =========================================================
   TIS SmartCalc — SX-Pro scientific model (classic 2-line LCD,
   SHIFT / ALPHA layers, COMP · STAT · EQN · MATRIX · TABLE modes)
   ========================================================= */
(function (G) {
  'use strict';
  const E = G.TISEngine;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---- key map:  id: [main, shift, alpha] — each [label, action] ----
     action: 'i:display|internal'  inserts a token,  otherwise a command  */
  const KEYS = {
    shift: [['SHIFT', 'SHIFT']], alpha: [['ALPHA', 'ALPHA']],
    mode: [['MODE', 'MODE'], ['SETUP', 'SETUP']], on: [['ON', 'ON']],
    calc: [['CALC', 'CALC'], ['SOLVE', 'SOLVE'], ['=', 'i:=|=']],
    integ: [['∫▭dx', 'i:∫(|integ('], ['d/dx', 'i:d/dx(|deriv(']],
    inv: [['x⁻¹', 'i:⁻¹|~'], ['x!', 'i:!|!']],
    logab: [['logₐb', 'i:logₐ(|log('], ['Σ', 'i:Σ(|sum(']],
    frac: [['▭⁄▭', 'i:⌟|¦'], ['∏', 'i:∏(|prod(']],
    sqrt: [['√▭', 'i:√(|sqrt('], ['∛▭', 'i:∛(|cbrt(']],
    sq: [['x²', 'i:²|²'], ['x³', 'i:³|³']],
    pow: [['x^▭', 'i:^(|^('], ['ˣ√▭', 'i:ˣ√|ʳ']],
    log: [['log', 'i:log(|log('], ['10^▭', 'i:10^(|10^(']],
    ln: [['ln', 'i:ln(|ln('], ['e^▭', 'i:e^(|e^(']],
    neg: [['(−)', 'i:−|-'], ['GCD', 'i:GCD(|GCD('], ['A', 'i:A|A']],
    dms: [["°'\"", 'i:°|°'], ['←°\'"', 'DMS'], ['B', 'i:B|B']],
    hyp: [['hyp', 'HYP'], ['Abs', 'i:Abs(|Abs('], ['C', 'i:C|C']],
    sin: [['sin', 'i:sin(|sin('], ['sin⁻¹', 'i:sin⁻¹(|asin('], ['D', 'i:D|D']],
    cos: [['cos', 'i:cos(|cos('], ['cos⁻¹', 'i:cos⁻¹(|acos('], ['E', 'i:E|E']],
    tan: [['tan', 'i:tan(|tan('], ['tan⁻¹', 'i:tan⁻¹(|atan('], ['F', 'i:F|F']],
    rcl: [['RCL', 'RCL'], ['STO', 'STO']],
    eng: [['ENG', 'ENG'], ['←ENG', 'ENGL']],
    lp: [['(', 'i:(|('], ['%', 'i:%|%']],
    rp: [[')', 'i:)|)'], [',', 'i:,|,'], ['X', 'i:X|X']],
    sd: [['S⇔D', 'SD'], ['a b/c', 'MIXED'], ['Y', 'i:Y|Y']],
    mplus: [['M+', 'MPLUS'], ['M−', 'MMINUS'], ['M', 'i:M|M']],
    7: [['7', 'i:7|7'], ['LCM', 'i:LCM(|LCM(']], 8: [['8', 'i:8|8'], ['Int', 'i:Int(|Int(']], 9: [['9', 'i:9|9'], ['CLR', 'CLR']],
    4: [['4', 'i:4|4']], 5: [['5', 'i:5|5']], 6: [['6', 'i:6|6']],
    1: [['1', 'i:1|1']], 2: [['2', 'i:2|2']], 3: [['3', 'i:3|3']],
    0: [['0', 'i:0|0'], ['Rnd', 'i:Rnd(|Rnd(']],
    dot: [['.', 'i:.|.'], ['Ran#', 'i:Ran#|Ran#'], ['RInt', 'i:RanInt(|RanInt(']],
    exp: [['×10ˣ', 'i:ᴇ|ᴇ'], ['π', 'i:π|π'], ['e', 'i:e|e']],
    ans: [['Ans', 'i:Ans|Ans'], ['PreAns', 'i:PreAns|PreAns']],
    del: [['DEL', 'DEL']], ac: [['AC', 'AC'], ['OFF', 'OFF']],
    mul: [['×', 'i:×|*'], ['nPr', 'i:P|℗']], div: [['÷', 'i:÷|/'], ['nCr', 'i:C|ℂ']],
    plus: [['+', 'i:+|+'], ['Pol', 'i:Pol(|Pol(']], minus: [['−', 'i:−|-'], ['Rec', 'i:Rec(|Rec(']],
    eq: [['=', 'EQ'], ['≈', 'APPROX']],
    up: [['▲', 'UP']], down: [['▼', 'DOWN']], left: [['◀', 'LEFT']], right: [['▶', 'RIGHT']],
  };
  const OPERATOR_START = new Set(['+', '-', '*', '/', '¦', '^(', '²', '³', '~', '!', '%', '℗', 'ℂ', 'ʳ']);
  const VARS = ['A', 'B', 'C', 'D', 'E', 'F', 'X', 'Y', 'M'];

  function createScientific(host, hooks = {}) {
    const st = {
      on: true, shift: false, alpha: false, sto: false,
      mode: 'COMP', screen: 'calc',
      tokens: [], cursor: 0, justEval: false,
      result: null, view: 'exact', engShift: 0,
      ans: 0, preAns: 0, vars: Object.fromEntries(VARS.map((v) => [v, 0])),
      hist: [], histIdx: -1,
      set: { angle: 'DEG', disp: 'Norm', digits: 10, mathio: true },
      menu: null, form: null, res: null, data: null, err: null, back: null,
    };

    /* ---------------- DOM ---------------- */
    host.innerHTML = `
      <div class="sx">
        <div class="sx-top">
          <div class="sx-brand"><img src="assets/logo.svg" alt=""><div><b>TIS</b> SmartCalc<small>SX-Pro · Smart Natural Display</small></div></div>
          <div class="sx-solar"><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="lcd" aria-live="polite"><div class="lcd-status"></div><div class="lcd-body"></div></div>
        <div class="sx-model">SX-Pro <span>Scientific · 2nd edition</span></div>
        <div class="sx-keys sx-fn"></div>
        <div class="sx-keys sx-num"></div>
      </div>`;
    const lcdStatus = host.querySelector('.lcd-status');
    const lcdBody = host.querySelector('.lcd-body');
    const root = host.querySelector('.sx');

    function keyBtn(id, cls = '') {
      const k = KEYS[id];
      const b = document.createElement('button');
      b.className = 'k ' + cls; b.dataset.k = id; b.type = 'button';
      b.setAttribute('aria-label', k[0][0]);
      b.innerHTML = `<span class="kl">${k[1] ? `<em class="ks">${esc(k[1][0])}</em>` : '<em></em>'}${k[2] ? `<em class="ka">${esc(k[2][0])}</em>` : '<em></em>'}</span><span class="km">${esc(k[0][0])}</span>`;
      return b;
    }
    const fn = host.querySelector('.sx-fn');
    // rows 1–2 with the round replay pad in the middle
    const pad = document.createElement('div'); pad.className = 'pad';
    pad.innerHTML = '<button type="button" class="pd up" data-k="up" aria-label="up">▲</button><button type="button" class="pd left" data-k="left" aria-label="left">◀</button><button type="button" class="pd right" data-k="right" aria-label="right">▶</button><button type="button" class="pd down" data-k="down" aria-label="down">▼</button><span class="pd-c">REPLAY</span>';
    [['shift', 'k-shift'], ['alpha', 'k-alpha']].forEach(([id, c]) => fn.appendChild(keyBtn(id, c)));
    fn.appendChild(pad);
    [['mode', 'k-sm'], ['on', 'k-sm']].forEach(([id, c]) => fn.appendChild(keyBtn(id, c)));
    ['calc', 'integ', 'inv', 'logab'].forEach((id) => fn.appendChild(keyBtn(id)));
    ['frac', 'sqrt', 'sq', 'pow', 'log', 'ln', 'neg', 'dms', 'hyp', 'sin', 'cos', 'tan', 'rcl', 'eng', 'lp', 'rp', 'sd', 'mplus']
      .forEach((id) => fn.appendChild(keyBtn(id)));
    const num = host.querySelector('.sx-num');
    ['7', '8', '9', 'del', 'ac', '4', '5', '6', 'mul', 'div', '1', '2', '3', 'plus', 'minus', '0', 'dot', 'exp', 'ans', 'eq']
      .forEach((id) => num.appendChild(keyBtn(id, id === 'del' || id === 'ac' ? 'k-del' : /^\d$|dot|exp|ans/.test(id) ? 'k-digit' : id === 'eq' ? 'k-eq k-digit' : 'k-op')));

    root.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      e.preventDefault(); b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 140);
      press(b.dataset.k);
    });

    /* ---------------- helpers ---------------- */
    const envObj = () => ({ vars: st.vars, Ans: st.ans, PreAns: st.preAns });
    const src = (toks = st.tokens) => toks.map((t) => t.v).join('');
    const fmt = (v, prefer = 'exact') => E.format(v, st.set, prefer);
    function syncAngle() { E.S.angle = st.set.angle; }

    function clearEdit() { st.tokens = []; st.cursor = 0; st.justEval = false; st.result = null; }
    function insert(d, v) {
      if (st.screen === 'calc' && st.justEval) {
        if (OPERATOR_START.has(v)) { st.tokens = [{ d: 'Ans', v: 'Ans' }]; st.cursor = 1; }
        else { st.tokens = []; st.cursor = 0; }
        st.justEval = false; st.result = null;
      }
      if (st.tokens.length >= 199) return;
      st.tokens.splice(st.cursor, 0, { d, v }); st.cursor++;
    }
    function showError(type, back) { st.err = type; st.back = back || st.screen; st.screen = 'error'; }

    function evaluateCalc(prefer) {
      if (!st.tokens.length) return;
      syncAngle();
      let s = src(), target = null;
      if (s.includes('=')) {
        const [l, r] = s.split('=');
        if (!VARS.includes(l) || r === undefined || r.includes('=')) return showError('Syntax', 'calc');
        target = l; s = r;
      }
      const env = envObj();
      try {
        const v = E.run(s, env);
        st.preAns = st.ans; st.ans = v;
        if (target) st.vars[target] = v;
        st.result = v; st.view = prefer || 'exact'; st.engShift = 0; st.justEval = true;
        const exprText = st.tokens.map((t) => t.d).join('');
        st.hist.push(st.tokens.slice()); if (st.hist.length > 50) st.hist.shift(); st.histIdx = st.hist.length;
        hooks.history && hooks.history({ expr: exprText, html: resultHtml(), dec: fmt(v, 'dec').text, value: v, model: 'SX-Pro' });
        if (env.twin) {
          openResults(exprText, env.twin.map(([n, val]) => [n + '=', fmt(val).html]), () => { st.screen = 'calc'; });
        }
      } catch (e) { showError(e.type || 'Math', 'calc'); }
    }

    function resultHtml() {
      const v = st.result; if (v === null || v === undefined) return '';
      switch (st.view) {
        case 'dec': return fmt(v, 'dec').html;
        case 'eng': return E.engForm(v, st.engShift).html;
        case 'mixed': return (E.mixedForm(v) || fmt(v)).html;
        case 'dms': return E.dmsForm(v).html;
        default: return fmt(v, 'exact').html;
      }
    }

    /* ---------------- screens ---------------- */
    function openMenu(title, items, pick, back) {
      st.menu = { title, items, pick, back: back || (() => { st.screen = 'calc'; }) };
      st.screen = 'menu';
    }
    function openResults(title, lines, back, cls) {
      st.res = { title, lines, top: 0, back: back || (() => { st.screen = 'calc'; }), cls };
      st.screen = 'results';
    }
    function openForm(title, fields, done, back) {
      st.form = { title, fields, idx: 0, done, back };
      st.screen = 'form'; loadField();
    }
    function loadField() {
      const f = st.form.fields[st.form.idx];
      st.tokens = []; st.cursor = 0; st.justEval = false;
      if (f.type === 'expr' && f.tokens) { st.tokens = f.tokens.slice(); st.cursor = st.tokens.length; }
    }
    function commitField() {
      const f = st.form.fields[st.form.idx];
      syncAngle();
      if (f.type === 'expr') {
        if (!st.tokens.length) { if (!f.tokens || !f.tokens.length) return; }
        else { f.tokens = st.tokens.slice(); }
        try { E.parse(src(f.tokens)); } catch (e) { return showError('Syntax', 'form'); }
      } else if (st.tokens.length) {
        try { f.value = E.run(src(), envObj()); } catch (e) { return showError(e.type || 'Math', 'form'); }
      }
      if (st.form.idx < st.form.fields.length - 1) { st.form.idx++; loadField(); }
      else st.form.done(st.form.fields);
    }

    /* ---- modes ---- */
    const MODES = ['COMP', 'STAT', 'EQN', 'MATRIX', 'TABLE', 'BASE-N'];
    function modeMenu() {
      const prev = st.screen;
      openMenu('MODE', MODES.map((m, i) => `${i + 1}:${m}`), (i) => setMode(MODES[i]), () => { st.screen = prev === 'menu' ? 'calc' : prev; });
    }
    function setMode(m) {
      st.shift = st.alpha = false;
      if (m === 'BASE-N') { hooks.switchModel && hooks.switchModel('programmer'); st.screen = 'calc'; return; }
      st.mode = m; clearEdit();
      if (m === 'COMP') { st.screen = 'calc'; return; }
      if (m === 'STAT') return statMenu();
      if (m === 'EQN') return eqnMenu();
      if (m === 'MATRIX') return matMenu();
      if (m === 'TABLE') return tableForm();
    }

    /* EQN */
    let eqnFields = {};
    function eqnMenu() {
      openMenu('EQN', ['1:aX+bY=c', '2:aX+bY+cZ=d', '3:aX²+bX+c=0', '4:aX³+bX²+cX+d=0'], (i) => eqnForm(i), () => { st.mode = 'COMP'; st.screen = 'calc'; });
    }
    function eqnForm(type) {
      const defs = [
        ['a₁', 'b₁', 'c₁', 'a₂', 'b₂', 'c₂'],
        ['a₁', 'b₁', 'c₁', 'd₁', 'a₂', 'b₂', 'c₂', 'd₂', 'a₃', 'b₃', 'c₃', 'd₃'],
        ['a', 'b', 'c'], ['a', 'b', 'c', 'd'],
      ][type];
      const titles = ['aX+bY=c', 'aX+bY+cZ=d', 'aX²+bX+c=0', 'aX³+bX²+cX+d=0'];
      const fields = eqnFields[type] || (eqnFields[type] = defs.map((l) => ({ label: l, type: 'num', value: 0 })));
      openForm(titles[type], fields, (fs) => solveEqn(type, fs.map((f) => f.value)), eqnMenu);
    }
    function solveEqn(type, c) {
      const back = () => eqnForm(type);
      const lines = []; const steps = [];
      try {
        if (type <= 1) {
          const n = type === 0 ? 2 : 3;
          const M = []; for (let r = 0; r < n; r++) M.push(c.slice(r * (n + 1), r * (n + 1) + n + 1));
          const sol = E.solveLinear(M);
          if (!sol) { openResults('EQN', [['', 'Infinite Sol / No Solution']], back); return; }
          ['X', 'Y', 'Z'].slice(0, n).forEach((v, i) => { lines.push([v + '=', fmt(sol[i]).html]); if (v !== 'Z') st.vars[v] = sol[i]; });
          const D = E.det(M.map((r) => r.slice(0, n)));
          lines.push(['Δ=', fmt(D).html]);
        } else {
          if (c[0] === 0) return showError('Math', 'form');
          if (type === 2) {
            const [a, b, cc] = c; const D = b * b - 4 * a * cc;
            const ex = E.quadExact(a, b, cc);
            if (ex) { lines.push(['X₁=', ex[0]], ['X₂=', ex[1]]); }
            else {
              const r = E.polyRoots([a, b, cc]);
              r.forEach((z, i) => lines.push([`X${'₁₂'[i]}=`, E.complexHtml(z, st.set)]));
            }
            lines.push(['Δ=b²−4ac=', fmt(D).html]);
            const h = -b / (2 * a), k = cc - b * b / (4 * a);
            lines.push([a > 0 ? 'X-Value Min=' : 'X-Value Max=', fmt(h).html], [a > 0 ? 'Y-Value Min=' : 'Y-Value Max=', fmt(k).html]);
            steps.push(`Δ = ${b}² − 4·${a}·${cc} = ${fmt(D).text}`);
          } else {
            const r = E.polyRoots(c);
            r.forEach((z, i) => lines.push([`X${'₁₂₃'[i]}=`, E.complexHtml(z, st.set)]));
          }
        }
      } catch (e) { return showError(e.type || 'Math', 'form'); }
      openResults('EQN · ' + ['aX+bY=c', 'aX+bY+cZ=d', 'aX²+bX+c=0', 'aX³+…=0'][type], lines, back);
      hooks.history && hooks.history({ expr: 'EQN ' + ['2×2', '3×3', 'Quadratic', 'Cubic'][type] + ' [' + c.map((v) => fmt(v, 'dec').text).join(', ') + ']', html: lines.map((l) => `${l[0]} ${l[1]}`).join('<br>'), model: 'SX-Pro', steps });
    }

    /* MATRIX */
    let matFields = {};
    function matMenu() {
      openMenu('MATRIX  MatA', ['1:2×2', '2:3×3'], (i) => matForm(i + 2), () => { st.mode = 'COMP'; st.screen = 'calc'; });
    }
    function matForm(n) {
      const fields = matFields[n] || (matFields[n] = Array.from({ length: n * n }, (_, k) => ({ label: `a${'₁₂₃'[Math.floor(k / n)]}${'₁₂₃'[k % n]}`, type: 'num', value: k % (n + 1) === 0 ? 1 : 0 })));
      openForm(`MatA (${n}×${n})`, fields, (fs) => {
        const A = []; for (let r = 0; r < n; r++) A.push(fs.slice(r * n, r * n + n).map((f) => f.value));
        const row = (r) => '[ ' + r.map((v) => fmt(v).html).join('&nbsp;&nbsp;') + ' ]';
        const lines = [['det(A)=', fmt(E.det(A)).html]];
        const inv = E.inverse(A);
        lines.push(['A⁻¹', inv ? '' : 'Math ERROR']); if (inv) inv.forEach((r) => lines.push(['', row(r)]));
        lines.push(['Aᵀ', '']); E.transpose(A).forEach((r) => lines.push(['', row(r)]));
        lines.push(['A²', '']); E.matMul(A, A).forEach((r) => lines.push(['', row(r)]));
        lines.push(['trace(A)=', fmt(A.reduce((s, r, i) => s + r[i], 0)).html]);
        openResults('MATRIX', lines, () => matForm(n), 'mat');
      }, matMenu);
    }

    /* TABLE */
    let tableFields = null;
    function tableForm() {
      tableFields = tableFields || [
        { label: 'f(X)', type: 'expr', tokens: [{ d: 'X', v: 'X' }, { d: '²', v: '²' }] },
        { label: 'Start', type: 'num', value: 1 }, { label: 'End', type: 'num', value: 5 }, { label: 'Step', type: 'num', value: 1 },
      ];
      openForm('TABLE  (ALPHA ) = X)', tableFields, (fs) => {
        const [f, a, b, s] = [fs[0], fs[1].value, fs[2].value, fs[3].value];
        if (s <= 0 || (b - a) / s > 45 || b < a) return showError('Range', 'form');
        let tree; try { tree = E.parse(src(f.tokens)); } catch (e) { return showError('Syntax', 'form'); }
        const lines = [['X', 'f(X)']];
        for (let x = a, k = 0; x <= b + 1e-9 && k < 46; x = a + (++k) * s) {
          const env = envObj(); env.vars = Object.assign({}, st.vars, { X: x });
          let y; try { y = fmt(E.evaluate(tree, env), 'dec').html; } catch (e) { y = 'ERROR'; }
          lines.push([fmt(Number(x.toPrecision(12)), 'dec').html, y]);
        }
        openResults('f(X)=' + f.tokens.map((t) => t.d).join(''), lines, tableForm, 'tbl');
      }, () => { st.mode = 'COMP'; st.screen = 'calc'; });
    }

    /* STAT */
    function statMenu() {
      openMenu('STAT', ['1:1-VAR', '2:A+BX (Linear Reg)'], (i) => {
        st.data = { two: i === 1, rows: (st.data && st.data.two === (i === 1)) ? st.data.rows : [], col: 0, pend: null };
        st.screen = 'data'; clearEdit();
      }, () => { st.mode = 'COMP'; st.screen = 'calc'; });
    }
    function statCommit() {
      const d = st.data;
      if (!st.tokens.length) { // empty "=" → compute
        if (d.col === 0) return statResults();
        return;
      }
      let v; try { syncAngle(); v = E.run(src(), envObj()); } catch (e) { return showError(e.type || 'Math', 'data'); }
      if (!d.two) d.rows.push([v]);
      else if (d.col === 0) { d.pend = v; d.col = 1; }
      else { d.rows.push([d.pend, v]); d.pend = null; d.col = 0; }
      clearEdit();
    }
    function statResults() {
      const d = st.data; if (!d.rows.length) return showError('Math', 'data');
      const xs = d.rows.map((r) => r[0]), ys = d.two ? d.rows.map((r) => r[1]) : null;
      const s = E.stats(xs, ys);
      const F = (v) => (isFinite(v) ? fmt(v, 'dec').html : '—');
      const lines = [['n=', F(s.n)], ['x̄=', F(s.mean)], ['Σx=', F(s.sum)], ['Σx²=', F(s.sum2)], ['σx=', F(s.sdp)], ['sx=', F(s.sds)],
        ['minX=', F(s.min)], ['Q₁=', F(s.q1)], ['Med=', F(s.med)], ['Q₃=', F(s.q3)], ['maxX=', F(s.max)]];
      if (d.two) lines.push(['ȳ=', F(s.meanY)], ['Σy=', F(s.sumY)], ['Σxy=', F(s.sumXY)], ['σy=', F(s.sdpY)], ['A=', F(s.A)], ['B=', F(s.B)], ['r=', F(s.r)], ['ŷ=', `${F(s.A)} + ${F(s.B)}x`]);
      openResults('STAT ' + (d.two ? 'A+BX' : '1-VAR'), lines, () => { st.screen = 'data'; clearEdit(); });
      hooks.history && hooks.history({ expr: `STAT n=${s.n}`, html: `x̄=${F(s.mean)}, σx=${F(s.sdp)}` + (d.two ? `, ŷ=${F(s.A)}+${F(s.B)}x, r=${F(s.r)}` : ''), model: 'SX-Pro' });
    }

    /* SETUP */
    function setupMenu() {
      const prev = st.screen === 'menu' ? 'calc' : st.screen;
      openMenu('SETUP', ['1:MathO (exact)', '2:LineO (decimal)', '3:Deg', '4:Rad', '5:Gra', '6:Fix', '7:Sci', '8:Norm'], (i) => {
        const s = st.set; st.screen = prev;
        if (i === 0) s.mathio = true; else if (i === 1) s.mathio = false;
        else if (i <= 4) s.angle = ['DEG', 'RAD', 'GRA'][i - 2];
        else if (i === 5) openMenu('Fix  0~9?', ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => n), (k) => { s.disp = 'Fix'; s.digits = k; st.screen = prev; }, () => (st.screen = prev), true);
        else if (i === 6) openMenu('Sci  1~10? (0=10)', ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], (k) => { s.disp = 'Sci'; s.digits = k === 0 ? 10 : k; st.screen = prev; }, () => (st.screen = prev), true);
        else s.disp = 'Norm';
        hooks.settings && hooks.settings(s);
      }, () => (st.screen = prev));
    }

    /* ---------------- key dispatcher ---------------- */
    function press(id, forcedLayer) {
      const k = KEYS[id]; if (!k) return;
      let layer = forcedLayer ?? (st.shift && k[1] ? 1 : st.alpha && k[2] ? 2 : 0);
      if (st.sto && k[2] && k[2][1].startsWith('i:') && VARS.includes(k[2][1].split('|')[1])) layer = 2;
      const [label, action] = k[layer] || k[0];
      if (id !== 'shift' && id !== 'alpha') { st.shift = false; st.alpha = false; }
      hooks.key && hooks.key(layer === 1 ? 'SHIFT ' + label : layer === 2 ? 'ALPHA ' + label : label, layer);
      hooks.sound && hooks.sound();

      if (!st.on) { if (action === 'ON') { st.on = true; clearEdit(); st.screen = 'calc'; st.mode = 'COMP'; } render(); return; }
      if (action === 'SHIFT') { st.shift = !st.shift; st.alpha = false; render(); return; }
      if (action === 'ALPHA') { st.alpha = !st.alpha; st.shift = false; render(); return; }
      if (action === 'ON') { st.sto = false; clearEdit(); st.screen = st.mode === 'COMP' ? 'calc' : st.screen; if (st.mode !== 'COMP') setMode(st.mode); render(); return; }
      if (action === 'OFF') { st.on = false; render(); return; }
      if (action === 'MODE') { modeMenu(); render(); return; }
      if (action === 'SETUP') { setupMenu(); render(); return; }

      // STO pending: next variable key stores
      if (st.sto) {
        st.sto = false;
        if (action.startsWith('i:')) {
          const v = action.split('|')[1];
          if (VARS.includes(v)) {
            if (st.tokens.length && !st.justEval) { evaluateCalc(); if (st.screen === 'error') { render(); return; } }
            st.vars[v] = st.ans;
            st.tokens = [{ d: 'Ans→' + v, v: 'Ans' }]; st.cursor = 1; st.result = st.ans; st.view = 'exact'; st.justEval = true; st.screen = 'calc';
            render(); return;
          }
        }
        render(); return;
      }

      const scr = st.screen;
      if (scr === 'error') {
        if (action === 'AC') { const b = st.back; st.screen = b === 'error' ? 'calc' : b; if (b === 'calc') clearEdit(); else { st.tokens = []; st.cursor = 0; } }
        else if (action === 'LEFT' || action === 'RIGHT') { st.screen = st.back === 'error' ? 'calc' : st.back; st.justEval = false; st.cursor = st.tokens.length; }
        render(); return;
      }
      if (scr === 'menu') {
        const m = st.menu;
        if (/^\d$/.test(id)) {
          const n = parseInt(id, 10);
          const idx = m.items.length === 10 ? n : n - 1;
          if (idx >= 0 && idx < m.items.length) m.pick(idx);
        } else if (action === 'AC' || action === 'DEL') m.back();
        render(); return;
      }
      if (scr === 'results') {
        const r = st.res;
        if (action === 'UP') r.top = Math.max(0, r.top - 1);
        else if (action === 'DOWN') r.top = Math.min(Math.max(0, r.lines.length - 4), r.top + 1);
        else if (action === 'AC' || action === 'EQ' || action === 'DEL') r.back();
        else if (action === 'SD' || action === 'LEFT' || action === 'RIGHT') { /* ignore */ }
        render(); return;
      }

      // ---- editors: calc / form / data ----
      if (action.startsWith('i:')) {
        const [d, v] = action.slice(2).split('|');
        if (v === '=' && scr !== 'calc') { render(); return; }
        insert(d, v); render(); return;
      }
      switch (action) {
        case 'HYP': {
          openMenu('hyp', ['1:sinh', '2:cosh', '3:tanh', '4:sinh⁻¹', '5:cosh⁻¹', '6:tanh⁻¹'], (i) => {
            st.screen = scr; const n = ['sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh'][i];
            insert(['sinh(', 'cosh(', 'tanh(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹('][i], n + '(');
          }, () => (st.screen = scr));
          break;
        }
        case 'DEL':
          if (scr === 'calc' && st.justEval) { st.justEval = false; st.cursor = st.tokens.length; }
          if (scr === 'data' && !st.tokens.length) {
            if (st.data.col === 1) { st.data.col = 0; st.data.pend = null; } else st.data.rows.pop();
            break;
          }
          if (st.cursor > 0) { st.tokens.splice(st.cursor - 1, 1); st.cursor--; }
          break;
        case 'AC':
          if (scr === 'form' && !st.tokens.length && st.form.back) { st.form.back(); break; }
          clearEdit(); break;
        case 'LEFT':
          if (scr === 'calc' && st.justEval) { st.justEval = false; st.cursor = st.tokens.length; break; }
          st.cursor = st.cursor > 0 ? st.cursor - 1 : st.tokens.length; break;
        case 'RIGHT':
          if (scr === 'calc' && st.justEval) { st.justEval = false; st.cursor = 0; break; }
          st.cursor = st.cursor < st.tokens.length ? st.cursor + 1 : 0; break;
        case 'UP':
          if (scr === 'calc' && st.hist.length) {
            st.histIdx = Math.max(0, (st.histIdx < 0 ? st.hist.length : st.histIdx) - 1);
            st.tokens = st.hist[st.histIdx].slice(); st.cursor = st.tokens.length; st.justEval = false; st.result = null;
          } else if (scr === 'form' && st.form.idx > 0) { st.form.idx--; loadField(); }
          break;
        case 'DOWN':
          if (scr === 'calc' && st.hist.length && st.histIdx < st.hist.length - 1) {
            st.histIdx++; st.tokens = st.hist[st.histIdx].slice(); st.cursor = st.tokens.length; st.justEval = false; st.result = null;
          } else if (scr === 'form' && st.form.idx < st.form.fields.length - 1) { if (st.tokens.length) commitField(); else { st.form.idx++; loadField(); } }
          break;
        case 'EQ':
          if (scr === 'calc') {
            if (st.justEval && st.tokens.length) { evaluateCalc(); }
            else evaluateCalc();
          } else if (scr === 'form') commitField();
          else if (scr === 'data') statCommit();
          break;
        case 'APPROX': if (scr === 'calc') evaluateCalc('dec'); else if (scr === 'form') commitField(); break;
        case 'SD': if (scr === 'calc' && st.justEval) st.view = st.view === 'exact' ? 'dec' : 'exact'; break;
        case 'MIXED': if (scr === 'calc' && st.justEval) st.view = st.view === 'mixed' ? 'exact' : 'mixed'; break;
        case 'DMS': if (scr === 'calc' && st.justEval) st.view = st.view === 'dms' ? 'dec' : 'dms'; break;
        case 'ENG': if (scr === 'calc' && st.justEval) { st.engShift = st.view === 'eng' ? st.engShift + 1 : 0; st.view = 'eng'; } break;
        case 'ENGL': if (scr === 'calc' && st.justEval) { st.engShift = st.view === 'eng' ? st.engShift - 1 : 0; st.view = 'eng'; } break;
        case 'STO': st.sto = true; break;
        case 'RCL':
          openResults('RCL · Variables', VARS.map((v) => [v + '=', fmt(st.vars[v], 'dec').html]).concat([['Ans=', fmt(st.ans, 'dec').html]]), () => (st.screen = scr));
          break;
        case 'MPLUS': case 'MMINUS': {
          if (scr !== 'calc') break;
          if (!st.justEval) { evaluateCalc(); if (st.screen !== 'calc') break; }
          st.vars.M += action === 'MPLUS' ? st.ans : -st.ans;
          st.tokens = st.tokens.concat([{ d: action === 'MPLUS' ? ' M+' : ' M−', v: '' }]);
          break;
        }
        case 'CALC': {
          if (scr !== 'calc' || !st.tokens.length) break;
          const s = src(); const used = VARS.filter((v) => new RegExp(v + '(?![a-z])').test(s.replace(/Ans|PreAns|Abs|Pol|Rec|Rnd|RanInt|GCD|LCM|Int|E(?=[0-9])/g, '')));
          const lhs = s.includes('=') ? s.split('=')[0] : null;
          const ask = used.filter((v) => v !== lhs);
          const toks = st.tokens.slice();
          const run = () => { st.screen = 'calc'; st.tokens = toks.slice(); st.cursor = toks.length; st.justEval = false; evaluateCalc(); };
          if (!ask.length) { run(); break; }
          openForm('CALC', ask.map((v) => ({ label: v + '?', type: 'num', value: st.vars[v], v })), (fs) => { fs.forEach((f) => (st.vars[f.v] = f.value)); run(); }, () => { st.screen = 'calc'; st.tokens = toks; st.cursor = toks.length; });
          break;
        }
        case 'SOLVE': {
          if (scr !== 'calc' || !st.tokens.length) break;
          const s = src(); const toks = st.tokens.slice();
          const [l, r] = s.includes('=') ? s.split('=') : [s, '0'];
          let tl, tr; try { tl = E.parse(l); tr = E.parse(r || '0'); } catch (e) { showError('Syntax', 'calc'); break; }
          openForm('SOLVE  for X', [{ label: 'X?', type: 'num', value: st.vars.X }], (fs) => {
            syncAngle();
            const f = (x) => { const env = envObj(); env.vars = Object.assign({}, st.vars, { X: x }); return E.evaluate(tl, env) - E.evaluate(tr, env); };
            try {
              const x = E.solveRoot(f, fs[0].value);
              st.vars.X = x; st.ans = x;
              let lr; try { lr = f(x); } catch (e) { lr = 0; }
              openResults(toks.map((t) => t.d).join(''), [['X=', fmt(x).html], ['', fmt(x, 'dec').html], ['L−R=', fmt(Math.abs(lr) < 1e-12 ? 0 : lr, 'dec').html]], () => { st.screen = 'calc'; st.tokens = toks; st.cursor = toks.length; });
              hooks.history && hooks.history({ expr: 'SOLVE ' + toks.map((t) => t.d).join(''), html: 'X = ' + fmt(x).html, model: 'SX-Pro' });
            } catch (e) { st.tokens = toks; showError(e.type || 'Math', 'calc'); }
          }, () => { st.screen = 'calc'; st.tokens = toks; st.cursor = toks.length; });
          break;
        }
        case 'CLR':
          openMenu('CLR', ['1:Setup', '2:Memory', '3:All'], (i) => {
            if (i !== 1) Object.assign(st.set, { angle: 'DEG', disp: 'Norm', digits: 10, mathio: true });
            if (i !== 0) { VARS.forEach((v) => (st.vars[v] = 0)); st.ans = st.preAns = 0; }
            st.mode = 'COMP'; clearEdit(); st.screen = 'calc';
            openResults('CLR', [['', i === 0 ? 'Clear Setup?  Done' : i === 1 ? 'Clear Memory?  Done' : 'Reset All?  Done']], () => (st.screen = 'calc'));
          }, () => (st.screen = scr));
          break;
      }
      render();
    }

    /* ---------------- renderer ---------------- */
    function editorHtml(showCursor = true) {
      const parts = st.tokens.map((t) => `<span>${esc(t.d)}</span>`);
      if (showCursor) parts.splice(st.cursor, 0, '<i class="cur"></i>');
      return parts.join('');
    }
    function fixScroll() {
      const box = lcdBody.querySelector('.lcd-in'); const cur = box && box.querySelector('.cur');
      if (!box) return;
      if (!cur) { box.scrollLeft = 0; return; }
      const x = cur.offsetLeft;
      if (x > box.scrollLeft + box.clientWidth - 14) box.scrollLeft = x - box.clientWidth + 24;
      else if (x < box.scrollLeft + 6) box.scrollLeft = Math.max(0, x - 24);
    }
    function render() {
      root.classList.toggle('is-shift', st.shift);
      root.classList.toggle('is-alpha', st.alpha || st.sto);
      root.classList.toggle('is-off', !st.on);
      if (!st.on) { lcdStatus.innerHTML = ''; lcdBody.innerHTML = ''; return; }
      const s = st.set;
      const ind = [
        st.shift ? '<b class="on s">S</b>' : '<b>S</b>',
        st.alpha ? '<b class="on a">A</b>' : '<b>A</b>',
        st.vars.M ? '<b class="on">M</b>' : '<b>M</b>',
        st.sto ? '<b class="on">STO</b>' : '',
        st.mode !== 'COMP' ? `<b class="on md">${st.mode === 'MATRIX' ? 'MAT' : st.mode}</b>` : '',
        `<b class="on">${s.angle[0]}</b>`,
        s.disp !== 'Norm' ? `<b class="on">${s.disp.toUpperCase()}${s.disp === 'Fix' ? s.digits : ''}</b>` : '',
        s.mathio ? '<b class="on">Math</b>' : '<b>Line</b>',
        st.screen === 'results' && st.res.top > 0 ? '<b class="on">▲</b>' : '',
        st.screen === 'results' && st.res.top < st.res.lines.length - 4 ? '<b class="on">▼</b>' : '',
      ];
      lcdStatus.innerHTML = ind.join('');
      let h = '';
      switch (st.screen) {
        case 'calc':
          h = `<div class="lcd-in">${editorHtml(!st.justEval)}</div><div class="lcd-out">${st.justEval ? resultHtml() : ''}</div>`;
          break;
        case 'error':
          h = `<div class="lcd-err"><b>${esc(st.err)} ERROR</b><small>[AC] :Cancel<br>[◀][▶]:Goto</small></div>`;
          break;
        case 'menu': {
          const m = st.menu; const grid = m.items.length > 4;
          h = `<div class="lcd-title">${esc(m.title)}</div><div class="lcd-menu ${grid ? 'grid' : ''}">${m.items.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`;
          break;
        }
        case 'results': {
          const r = st.res; const vis = r.lines.slice(r.top, r.top + 4);
          h = `<div class="lcd-title">${esc(r.title)}</div><div class="lcd-res ${r.cls || ''}">${vis.map(([l, v]) => `<div><span>${esc(l)}</span><span>${v}</span></div>`).join('')}</div>`;
          break;
        }
        case 'form': {
          const f = st.form; const i = f.idx;
          const rows = f.fields.map((fl, k) => ({ fl, k })).slice(Math.max(0, i - 1), Math.max(0, i - 1) + 3);
          h = `<div class="lcd-title">${esc(f.title)} <em>${i + 1}/${f.fields.length}</em></div><div class="lcd-form">` + rows.map(({ fl, k }) => {
            if (k === i) return `<div class="act"><span>${esc(fl.label)}=</span><span class="lcd-in">${st.tokens.length ? editorHtml() : `<i class="phold">${fl.type === 'expr' ? esc((fl.tokens || []).map((t) => t.d).join('')) : fmt(fl.value ?? 0, 'dec').html}</i><i class="cur"></i>`}</span></div>`;
            return `<div><span>${esc(fl.label)}=</span><span>${fl.type === 'expr' ? esc((fl.tokens || []).map((t) => t.d).join('')) : fmt(fl.value ?? 0, 'dec').html}</span></div>`;
          }).join('') + '</div>';
          break;
        }
        case 'data': {
          const d = st.data; const last = d.rows.slice(-2);
          const n0 = d.rows.length - last.length;
          h = `<div class="lcd-title">STAT ${d.two ? 'A+BX' : '1-VAR'} <em>[=] on empty: Result</em></div><div class="lcd-data ${d.two ? 'two' : ''}"><div class="hd"><span></span><span>x</span>${d.two ? '<span>y</span>' : ''}</div>` +
            last.map((r, k) => `<div><span>${n0 + k + 1}</span>${r.map((v) => `<span>${fmt(v, 'dec').html}</span>`).join('')}</div>`).join('') +
            `<div class="act"><span>${d.rows.length + 1}</span>` + (d.two ? (d.col === 0 ? `<span class="lcd-in">${editorHtml()}</span><span></span>` : `<span>${fmt(d.pend, 'dec').html}</span><span class="lcd-in">${editorHtml()}</span>`) : `<span class="lcd-in">${editorHtml()}</span>`) + '</div></div>';
          break;
        }
      }
      lcdBody.innerHTML = h;
      lcdBody.dataset.screen = st.screen;
      fixScroll();
    }

    render();
    return {
      press, render, state: st,
      keyFor(e) { // physical keyboard → [keyId, layer]
        const k = e.key;
        const map = {
          Enter: ['eq'], '=': ['eq'], Backspace: ['del'], Delete: ['ac'], Escape: ['ac'], '+': ['plus'], '-': ['minus'], '*': ['mul'], '/': ['div'],
          '^': ['pow'], '(': ['lp'], ')': ['rp'], '.': ['dot'], ',': ['rp', 1], '%': ['lp', 1], '!': ['inv', 1],
          ArrowLeft: ['left'], ArrowRight: ['right'], ArrowUp: ['up'], ArrowDown: ['down'],
          s: ['sin'], c: ['cos'], t: ['tan'], l: ['log'], n: ['ln'], r: ['sqrt'], p: ['exp', 1], x: ['rp', 2], X: ['rp', 2], y: ['sd', 2], Y: ['sd', 2],
          a: ['ans'], e: ['exp', 2], q: ['sq'], i: ['inv'], f: ['frac'], m: ['mode'],
        };
        if (/^[0-9]$/.test(k)) return [k];
        return map[k] || null;
      },
    };
  }

  G.TISScientific = { create: createScientific };
})(window);
