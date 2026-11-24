/* =========================================================
   TIS SmartCalc — Math Engine
   Expression parser, evaluator, exact (fraction / surd / π) formatter,
   numerical calculus and equation / matrix solvers.
   (c) Tariqul Islam (Sumon) · TIS Academy
   ========================================================= */
(function (G) {
  'use strict';

  /* ---------- errors ---------- */
  class CalcError extends Error {
    constructor(type, pos) { super(type + ' ERROR'); this.type = type; this.pos = pos; }
  }
  const SyntaxErr = (p) => new CalcError('Syntax', p);
  const MathErr = () => new CalcError('Math');

  /* ---------- settings ---------- */
  const S = { angle: 'DEG' };
  const toRad = (x) => S.angle === 'DEG' ? x * Math.PI / 180 : S.angle === 'GRA' ? x * Math.PI / 200 : x;
  const fromRad = (x) => S.angle === 'DEG' ? x * 180 / Math.PI : S.angle === 'GRA' ? x * 200 / Math.PI : x;
  const tidy = (v) => (Math.abs(v) < 1e-13 ? 0 : v);

  /* ---------- tokenizer ---------- */
  const NAMES = ['asinh', 'acosh', 'atanh', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'sin', 'cos', 'tan',
    'log', 'ln', 'sqrt', 'cbrt', 'Abs', 'abs', 'PreAns', 'Ans', 'integ', 'deriv', 'sum', 'prod', 'Rnd', 'Ran#',
    'RanInt', 'GCD', 'LCM', 'Int', 'Pol', 'Rec', 'π', 'e', 'A', 'B', 'C', 'D', 'E', 'F', 'X', 'Y', 'M', 'x', 'y']
    .sort((a, b) => b.length - a.length);
  const FUNCS = new Set(['asinh', 'acosh', 'atanh', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'sin', 'cos', 'tan',
    'log', 'ln', 'sqrt', 'cbrt', 'Abs', 'abs', 'integ', 'deriv', 'sum', 'prod', 'Rnd', 'RanInt', 'GCD', 'LCM', 'Int', 'Pol', 'Rec']);
  const OPS = '+-*/¦^ʳ(),!%²³~℗ℂ°=';

  function tokenize(src) {
    const t = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === ' ') { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        let j = i, dots = 0;
        while (j < src.length && /[0-9.]/.test(src[j])) { if (src[j] === '.') dots++; j++; }
        if (dots > 1) throw SyntaxErr(i);
        let s = src.slice(i, j);
        if (src[j] === 'ᴇ') {
          let k = j + 1;
          if (src[k] === '-' || src[k] === '+') k++;
          const st = k;
          while (k < src.length && /[0-9]/.test(src[k])) k++;
          if (k === st) throw SyntaxErr(j);
          s += 'e' + src.slice(j + 1, k);
          j = k;
        }
        if (s === '.') throw SyntaxErr(i);
        t.push({ k: 'num', v: parseFloat(s), p: i });
        i = j; continue;
      }
      if (ch === 'ᴇ') { // bare ᴇ means 1ᴇ…
        let k = i + 1; if (src[k] === '-' || src[k] === '+') k++;
        const st = k; while (k < src.length && /[0-9]/.test(src[k])) k++;
        if (k === st) throw SyntaxErr(i);
        t.push({ k: 'num', v: parseFloat('1e' + src.slice(i + 1, k)), p: i }); i = k; continue;
      }
      if (OPS.includes(ch)) { t.push({ k: 'op', v: ch, p: i }); i++; continue; }
      const nm = NAMES.find((n) => src.startsWith(n, i));
      if (nm) {
        let v = nm;
        if (v === 'x') v = 'X'; if (v === 'y') v = 'Y'; if (v === 'abs') v = 'Abs';
        t.push({ k: FUNCS.has(v) ? 'fn' : 'id', v, p: i }); i += nm.length; continue;
      }
      throw SyntaxErr(i);
    }
    return t;
  }

  /* ---------- parser (recursive descent, Casio-like priorities) ---------- */
  function parse(src) {
    const t = tokenize(src);
    let i = 0;
    const peek = () => t[i];
    const isOp = (v) => t[i] && t[i].k === 'op' && t[i].v === v;
    const eat = (v) => { if (isOp(v)) { i++; return true; } return false; };
    const startsPrimary = () => {
      const x = t[i]; if (!x) return false;
      return x.k === 'num' || x.k === 'id' || x.k === 'fn' || (x.k === 'op' && x.v === '(');
    };

    function expr() { return add(); }
    function add() {
      let a = mul();
      while (t[i] && t[i].k === 'op' && (t[i].v === '+' || t[i].v === '-')) {
        const op = t[i++].v; a = { t: 'bin', op, a, b: mul() };
      }
      return a;
    }
    function mul() {
      let a = perm();
      while (t[i] && t[i].k === 'op' && (t[i].v === '*' || t[i].v === '/')) {
        const op = t[i++].v; a = { t: 'bin', op, a, b: perm() };
      }
      return a;
    }
    function perm() {
      let a = neg();
      while (t[i] && t[i].k === 'op' && (t[i].v === '℗' || t[i].v === 'ℂ')) {
        const op = t[i++].v; a = { t: 'bin', op, a, b: neg() };
      }
      return a;
    }
    function neg() {
      if (eat('-')) return { t: 'neg', a: neg() };
      if (eat('+')) return neg();
      return imp();
    }
    function imp() { // implicit multiplication binds tighter than × ÷
      let a = frac();
      while (startsPrimary()) a = { t: 'bin', op: '*', a, b: frac() };
      return a;
    }
    function frac() {
      let a = pow();
      while (eat('¦')) a = { t: 'bin', op: '/', a, b: pow() };
      return a;
    }
    function powArg() { if (eat('-')) return { t: 'neg', a: powArg() }; if (eat('+')) return powArg(); return pow(); }
    function pow() {
      const a = postfix();
      if (eat('^')) return { t: 'bin', op: '^', a, b: powArg() };
      if (eat('ʳ')) return { t: 'bin', op: 'root', a, b: powArg() };
      return a;
    }
    function postfix() {
      let a = primary();
      for (;;) {
        if (eat('!')) a = { t: 'fact', a };
        else if (eat('%')) a = { t: 'bin', op: '/', a, b: { t: 'num', v: 100 } };
        else if (eat('²')) a = { t: 'bin', op: '^', a, b: { t: 'num', v: 2 } };
        else if (eat('³')) a = { t: 'bin', op: '^', a, b: { t: 'num', v: 3 } };
        else if (eat('~')) a = { t: 'inv', a };
        else break;
      }
      return a;
    }
    function closeParen() { if (!eat(')') && i < t.length) throw SyntaxErr(t[i].p); }
    function primary() {
      const x = t[i];
      if (!x) throw SyntaxErr(src.length);
      if (x.k === 'num') {
        i++;
        if (isOp('°')) { // degree-minute-second: a°b°c°
          i++; let v = x.v, div = 60;
          for (let n = 0; n < 2; n++) {
            if (t[i] && t[i].k === 'num' && t[i + 1] && t[i + 1].k === 'op' && t[i + 1].v === '°') {
              v += Math.sign(x.v || 1) * t[i].v / div; div *= 60; i += 2;
            } else break;
          }
          return { t: 'num', v };
        }
        return { t: 'num', v: x.v };
      }
      if (x.k === 'id') { i++; return { t: 'id', v: x.v }; }
      if (x.k === 'fn') {
        i++;
        if (!eat('(')) throw SyntaxErr(x.p);
        const args = [];
        if (!isOp(')') && i < t.length) {
          args.push(expr());
          while (eat(',')) args.push(expr());
        }
        closeParen();
        return { t: 'fn', v: x.v, args };
      }
      if (eat('(')) { const e = expr(); closeParen(); return { t: 'grp', a: e }; }
      throw SyntaxErr(x.p);
    }

    if (!t.length) throw SyntaxErr(0);
    const tree = expr();
    if (i < t.length) throw SyntaxErr(t[i].p);
    return tree;
  }

  /* ---------- numeric helpers ---------- */
  const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
  function factorial(n) {
    if (!isInt(n) || n < 0 || n > 170) throw MathErr();
    n = Math.round(n); let r = 1; for (let k = 2; k <= n; k++) r *= k; return r;
  }
  function gcd(a, b) { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) [a, b] = [b, a % b]; return a; }

  function integrate(f, a, b) {
    // adaptive Gauss–Kronrod (G7-K15)
    const xgk = [0.991455371120813, 0.949107912342759, 0.864864423359769, 0.741531185599394, 0.586087235467691, 0.405845151377397, 0.207784955007898, 0];
    const wgk = [0.022935322010529, 0.063092092629979, 0.104790010322250, 0.140653259715525, 0.169004726639267, 0.190350578064785, 0.204432940075298, 0.209482141084728];
    const wg = [0.129484966168870, 0.279705391489277, 0.381830050505119, 0.417959183673469];
    function gk(lo, hi) {
      const c = (lo + hi) / 2, h = (hi - lo) / 2;
      const fc = f(c);
      let rk = fc * wgk[7], rg = fc * wg[3];
      for (let j = 0; j < 7; j++) {
        const dx = h * xgk[j], f1 = f(c - dx), f2 = f(c + dx);
        rk += wgk[j] * (f1 + f2);
        if (j % 2 === 1) rg += wg[(j - 1) / 2] * (f1 + f2);
      }
      return [rk * h, Math.abs((rk - rg) * h)];
    }
    let total = 0, budget = 400;
    const stack = [[a, b, 0]];
    while (stack.length) {
      const [lo, hi, d] = stack.pop();
      const [r, e] = gk(lo, hi);
      if (e < 1e-11 * Math.max(1, Math.abs(r)) || d > 30 || --budget < 0) total += r;
      else { const m = (lo + hi) / 2; stack.push([lo, m, d + 1], [m, hi, d + 1]); }
    }
    if (!isFinite(total)) throw MathErr();
    return total;
  }
  function derivative(f, x) {
    const h0 = 1e-3 * Math.max(1, Math.abs(x));
    // Richardson extrapolation on central differences
    const D = (h) => (f(x + h) - f(x - h)) / (2 * h);
    const d1 = D(h0), d2 = D(h0 / 2), d3 = D(h0 / 4);
    const r1 = (4 * d2 - d1) / 3, r2 = (4 * d3 - d2) / 3;
    const r = (16 * r2 - r1) / 15;
    if (!isFinite(r)) throw MathErr();
    return r;
  }

  /* ---------- evaluator ---------- */
  function evaluate(node, env) {
    const ev = (n) => evaluate(n, env);
    switch (node.t) {
      case 'num': return node.v;
      case 'grp': return ev(node.a);
      case 'neg': return -ev(node.a);
      case 'inv': { const v = ev(node.a); if (v === 0) throw MathErr(); return 1 / v; }
      case 'fact': return factorial(ev(node.a));
      case 'id': {
        if (node.v === 'π') return Math.PI;
        if (node.v === 'e') return Math.E;
        if (node.v === 'Ans') return env.Ans ?? 0;
        if (node.v === 'PreAns') return env.PreAns ?? 0;
        const v = env.vars[node.v];
        return v === undefined ? 0 : v;
      }
      case 'bin': {
        const a = ev(node.a), b = ev(node.b);
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': if (b === 0) throw MathErr(); return a / b;
          case '^': {
            if (a < 0 && !isInt(b)) { // odd roots of negatives, e.g. (−8)^(1/3)
              const inv = 1 / b;
              if (isInt(inv) && Math.round(inv) % 2 !== 0) return -Math.pow(-a, b);
              throw MathErr();
            }
            if (a === 0 && b < 0) throw MathErr();
            return Math.pow(a, b);
          }
          case 'root': { // a x√ b
            if (a === 0) throw MathErr();
            if (b < 0) { if (isInt(a) && Math.round(a) % 2 !== 0) return -Math.pow(-b, 1 / a); throw MathErr(); }
            return Math.pow(b, 1 / a);
          }
          case '℗': if (!isInt(a) || !isInt(b) || b < 0 || a < b) throw MathErr(); return factorial(a) / factorial(a - b);
          case 'ℂ': {
            if (!isInt(a) || !isInt(b) || b < 0 || a < b) throw MathErr();
            let r = 1; const k = Math.min(b, a - b); for (let j = 1; j <= k; j++) r = r * (a - k + j) / j; return Math.round(r);
          }
        }
        throw SyntaxErr(0);
      }
      case 'fn': return callFn(node, env);
    }
    throw SyntaxErr(0);
  }

  function withX(env, node) {
    return (x) => {
      const old = env.vars.X; env.vars.X = x;
      try { return evaluate(node, env); } finally { env.vars.X = old; }
    };
  }

  function callFn(node, env) {
    const A = node.args, name = node.v;
    const need = (n) => { if (A.length < n) throw SyntaxErr(0); };
    const ev = (k) => evaluate(A[k], env);
    switch (name) {
      case 'integ': { need(3); return integrate(withX(env, A[0]), ev(1), ev(2)); }
      case 'deriv': { need(2); return derivative(withX(env, A[0]), ev(1)); }
      case 'sum': case 'prod': {
        need(3); const f = withX(env, A[0]); const a = ev(1), b = ev(2);
        if (!isInt(a) || !isInt(b) || b < a || b - a > 1e6) throw MathErr();
        let s = name === 'sum' ? 0 : 1;
        for (let k = Math.round(a); k <= Math.round(b); k++) s = name === 'sum' ? s + f(k) : s * f(k);
        return s;
      }
    }
    need(1);
    const x = ev(0);
    switch (name) {
      case 'sin': return tidy(Math.sin(toRad(x)));
      case 'cos': return tidy(Math.cos(toRad(x)));
      case 'tan': {
        const r = toRad(x);
        if (Math.abs(Math.cos(r)) < 1e-14) throw MathErr();
        if (S.angle === 'DEG' && isInt(x) && ((Math.round(x) % 180) + 180) % 180 === 90) throw MathErr();
        return tidy(Math.tan(r));
      }
      case 'asin': if (Math.abs(x) > 1) throw MathErr(); return fromRad(Math.asin(x));
      case 'acos': if (Math.abs(x) > 1) throw MathErr(); return fromRad(Math.acos(x));
      case 'atan': return fromRad(Math.atan(x));
      case 'sinh': return Math.sinh(x);
      case 'cosh': return Math.cosh(x);
      case 'tanh': return Math.tanh(x);
      case 'asinh': return Math.asinh(x);
      case 'acosh': if (x < 1) throw MathErr(); return Math.acosh(x);
      case 'atanh': if (Math.abs(x) >= 1) throw MathErr(); return Math.atanh(x);
      case 'log': {
        if (A.length >= 2) { // log_a(b)
          const b = ev(1);
          if (x <= 0 || x === 1 || b <= 0) throw MathErr();
          return Math.log(b) / Math.log(x);
        }
        if (x <= 0) throw MathErr(); return Math.log10(x);
      }
      case 'ln': if (x <= 0) throw MathErr(); return Math.log(x);
      case 'sqrt': if (x < 0) throw MathErr(); return Math.sqrt(x);
      case 'cbrt': return Math.cbrt(x);
      case 'Abs': return Math.abs(x);
      case 'Int': return Math.trunc(x);
      case 'Rnd': return Number(x.toPrecision(10));
      case 'RanInt': { need(2); const b = ev(1); if (!isInt(x) || !isInt(b) || b < x) throw MathErr(); return Math.round(x) + Math.floor(Math.random() * (Math.round(b) - Math.round(x) + 1)); }
      case 'GCD': { need(2); return gcd(x, ev(1)); }
      case 'LCM': { need(2); const b = ev(1); return Math.abs(Math.round(x) * Math.round(b)) / gcd(x, b); }
      case 'Pol': { // Pol(x,y) → r ; θ stored in Y, r in X
        need(2); const y = ev(1); const r = Math.hypot(x, y); const th = fromRad(Math.atan2(y, x));
        env.vars.X = r; env.vars.Y = th; env.twin = [['r', r], ['θ', th]]; return r;
      }
      case 'Rec': {
        need(2); const th = toRad(ev(1)); const xx = tidy(x * Math.cos(th)), yy = tidy(x * Math.sin(th));
        env.vars.X = xx; env.vars.Y = yy; env.twin = [['X', xx], ['Y', yy]]; return xx;
      }
    }
    throw SyntaxErr(0);
  }

  function run(src, env) {
    if (src.includes('Ran#')) src = src.split('Ran#').join('(' + (Math.floor(Math.random() * 1000) / 1000) + ')');
    const tree = parse(src);
    const v = evaluate(tree, env);
    if (typeof v !== 'number' || !isFinite(v) || isNaN(v)) throw MathErr();
    if (Math.abs(v) >= 1e100) throw MathErr();
    return v;
  }

  /* ---------- exact-form detection ---------- */
  function toFraction(v, maxDen = 10000) {
    if (!isFinite(v)) return null;
    const sign = v < 0 ? -1 : 1; let x = Math.abs(v);
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
    for (let n = 0; n < 40; n++) {
      const a = Math.floor(b);
      const h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(x - h1 / k1) < 1e-10 * Math.max(1, x)) return { n: sign * h1, d: k1 };
      if (b - a < 1e-15) break;
      b = 1 / (b - a);
    }
    return null;
  }
  function splitSquare(n) { // n = k² · m
    let k = 1, m = n;
    for (let f = 2; f * f <= m; f++) while (m % (f * f) === 0) { m /= f * f; k *= f; }
    return [k, m];
  }

  const H = {
    frac: (num, den) => `<span class="frac"><span class="fn">${num}</span><span class="fd">${den}</span></span>`,
    sq: (m) => `<span class="sq">√<span class="ov">${m}</span></span>`,
    sup: (b, e) => `${b}<sup>${e}</sup>`,
  };
  const minus = (s) => String(s).replace(/^-/, '−');

  /* exact: try rational, k√m/d, kπ/d */
  function exactForm(v) {
    if (v === 0) return { kind: 'int', html: '0', text: '0' };
    const r = Number(v.toPrecision(12));
    if (Math.abs(r) < 1e10 && isInt(r) && Math.abs(r - Math.round(r)) < 1e-12 * Math.max(1, Math.abs(r)))
      return { kind: 'int', html: minus(Math.round(r)), text: String(Math.round(r)) };
    if (Math.abs(r) < 1e10) {
      const f = toFraction(r);
      if (f && String(Math.abs(f.n)).length + String(f.d).length <= 10) {
        const s = f.n < 0 ? '−' : '';
        return { kind: 'frac', n: f.n, d: f.d, html: s + H.frac(Math.abs(f.n), f.d), text: `${f.n}/${f.d}` };
      }
      // surd  r = ±k√m / d
      const sq = toFraction(r * r, 1000);
      if (sq && sq.n > 0 && sq.n * sq.d < 1e7) {
        const [k0, m] = splitSquare(sq.n * sq.d);
        if (m > 1) {
          let k = k0, d = sq.d; const g = gcd(k, d); k /= g; d /= g;
          const s = r < 0 ? '−' : '';
          const top = (k === 1 ? '' : k) + H.sq(m);
          const txt = `${r < 0 ? '-' : ''}${k === 1 ? '' : k}√${m}${d === 1 ? '' : '/' + d}`;
          return { kind: 'surd', html: s + (d === 1 ? top : H.frac(top, d)), text: txt };
        }
      }
      // multiple of π
      const p = toFraction(r / Math.PI, 100);
      if (p && Math.abs(p.n) <= 1000) {
        const s = p.n < 0 ? '−' : '';
        const top = (Math.abs(p.n) === 1 ? '' : Math.abs(p.n)) + 'π';
        return { kind: 'pi', html: s + (p.d === 1 ? top : H.frac(top, p.d)), text: `${p.n}π/${p.d}` };
      }
    }
    return null;
  }

  function decimalForm(v, set = {}) {
    const mode = set.disp || 'Norm', digits = set.digits ?? 10;
    if (v === 0) return { html: '0', text: '0' };
    const sci = (val, sig) => {
      let [m, e] = val.toExponential(sig - 1).split('e');
      if (mode !== 'Sci') m = m.replace(/\.?0+$/, '');
      e = parseInt(e, 10);
      return { html: `${minus(m)}<span class="x10">×10<sup>${minus(e)}</sup></span>`, text: `${m}E${e}` };
    };
    if (mode === 'Fix' && Math.abs(v) < 1e10) {
      const s = v.toFixed(digits);
      return { html: minus(s), text: s };
    }
    if (mode === 'Sci') return sci(v, digits || 10);
    const a = Math.abs(v);
    if (a >= 1e10 || a < 1e-9) return sci(v, 10);
    let s = v.toPrecision(10);
    if (s.includes('e')) return sci(v, 10);
    if (s.includes('.')) s = s.replace(/\.?0+$/, '');
    return { html: minus(s), text: s };
  }

  function engForm(v, shift = 0) {
    if (v === 0) return { html: '0', text: '0' };
    let e = Math.floor(Math.log10(Math.abs(v)) / 3) * 3 + shift * 3;
    let m = v / Math.pow(10, e);
    let s = Number(m.toPrecision(10)).toString();
    return { html: `${minus(s)}<span class="x10">×10<sup>${minus(e)}</sup></span>`, text: `${s}E${e}` };
  }

  function mixedForm(v) {
    const f = toFraction(Number(v.toPrecision(12)));
    if (!f || f.d === 1 || Math.abs(f.n) < f.d) return null;
    const s = f.n < 0 ? '−' : ''; const n = Math.abs(f.n);
    const w = Math.floor(n / f.d), r = n % f.d;
    return { html: `${s}${w}${H.frac(r, f.d)}`, text: `${s}${w} ${r}/${f.d}` };
  }

  function dmsForm(v) {
    const s = v < 0 ? '−' : ''; let a = Math.abs(v);
    let d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), sec = (mf - m) * 60;
    sec = Math.round(sec * 100) / 100; if (sec >= 60) { sec -= 60; m++; } if (m >= 60) { m -= 60; d++; }
    return { html: `${s}${d}°${m}°${sec}°`, text: `${s}${d}°${m}'${sec}"` };
  }

  /* format(v, settings, prefer) — prefer: 'exact' | 'dec' */
  function format(v, set = {}, prefer = 'exact') {
    if (prefer === 'exact' && set.mathio !== false && set.disp !== 'Fix' && set.disp !== 'Sci') {
      const ex = exactForm(v);
      if (ex) return ex;
    }
    return Object.assign({ kind: 'dec' }, decimalForm(v, set));
  }

  /* ---------- solvers ---------- */
  function solveLinear(M) { // M: n×(n+1) augmented
    const n = M.length, a = M.map((r) => r.slice());
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < 1e-12) return null;
      [a[c], a[p]] = [a[p], a[c]];
      for (let r = 0; r < n; r++) if (r !== c) {
        const f = a[r][c] / a[c][c];
        for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k];
      }
    }
    return a.map((r, i) => tidy(r[n] / r[i]));
  }

  function det(A) {
    const n = A.length;
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    let d = 0;
    for (let c = 0; c < n; c++) {
      const sub = A.slice(1).map((r) => r.filter((_, j) => j !== c));
      d += (c % 2 ? -1 : 1) * A[0][c] * det(sub);
    }
    return d;
  }
  function inverse(A) {
    const n = A.length; const D = det(A);
    if (Math.abs(D) < 1e-12) return null;
    const aug = A.map((r, i) => r.concat(A.map((_, j) => (i === j ? 1 : 0))));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[p][c])) p = r;
      [aug[c], aug[p]] = [aug[p], aug[c]];
      const pv = aug[c][c]; for (let k = 0; k < 2 * n; k++) aug[c][k] /= pv;
      for (let r = 0; r < n; r++) if (r !== c) { const f = aug[r][c]; for (let k = 0; k < 2 * n; k++) aug[r][k] -= f * aug[c][k]; }
    }
    return aug.map((r) => r.slice(n).map(tidy));
  }
  const matMul = (A, B) => A.map((r) => B[0].map((_, j) => tidy(r.reduce((s, v, k) => s + v * B[k][j], 0))));
  const transpose = (A) => A[0].map((_, j) => A.map((r) => r[j]));

  // polynomial roots via Durand–Kerner, coeffs high→low
  function polyRoots(c) {
    const n = c.length - 1; const a = c.map((v) => v / c[0]);
    let z = []; for (let k = 0; k < n; k++) z.push([Math.cos(2 * Math.PI * k / n + 0.4) * 1.3, Math.sin(2 * Math.PI * k / n + 0.4) * 1.3]);
    const mul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
    const div = (p, q) => { const d = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d]; };
    for (let it = 0; it < 500; it++) {
      let delta = 0;
      z = z.map((zi, i) => {
        let num = [1, 0]; for (let k = 1; k <= n; k++) num = [num[0] * zi[0] - num[1] * zi[1] + a[k], num[0] * zi[1] + num[1] * zi[0]];
        let den = [1, 0]; z.forEach((zj, j) => { if (j !== i) den = mul(den, [zi[0] - zj[0], zi[1] - zj[1]]); });
        const q = div(num, den); delta = Math.max(delta, Math.hypot(q[0], q[1]));
        return [zi[0] - q[0], zi[1] - q[1]];
      });
      if (delta < 1e-14) break;
    }
    return z.map(([re, im]) => {
      // polish real roots with Newton
      if (Math.abs(im) < 1e-7) {
        let x = re; for (let k = 0; k < 30; k++) {
          let p = 0, d = 0; for (let j = 0; j <= n; j++) { d = d * x + p; p = p * x + a[j]; }
          if (d === 0) break; x -= p / d;
        }
        return [tidy(x), 0];
      }
      return [tidy(re), im];
    }).sort((p, q) => q[0] - p[0] || q[1] - p[1]);
  }

  /* exact quadratic roots (integer coefficients) */
  function quadExact(a, b, c) {
    if (![a, b, c].every((v) => Number.isInteger(v)) || a === 0) return null;
    const D = b * b - 4 * a * c;
    const out = [];
    const fr = (n, d) => { const g = gcd(n, d) || 1; n /= g; d /= g; if (d < 0) { n = -n; d = -d; } return [n, d]; };
    if (D >= 0) {
      const sD = Math.round(Math.sqrt(D));
      if (sD * sD === D) return null; // rational → normal formatter handles
      let [k, m] = splitSquare(D);
      let p = -b, q = 2 * a; if (q < 0) { p = -p; q = -q; }
      const g = gcd(gcd(p, k), q) || 1; p /= g; k /= g; q /= g;
      const sq = (k === 1 ? '' : k) + H.sq(m);
      for (const sgn of [1, -1]) {
        let top;
        if (p === 0) top = (sgn < 0 ? '−' : '') + sq;
        else top = minus(p) + (sgn < 0 ? ' − ' : ' + ') + sq;
        out.push(q === 1 ? top : H.frac(top, q));
      }
      return out;
    }
    // complex
    let [k, m] = splitSquare(-D);
    const [rn, rd] = fr(-b, 2 * a);
    let kk = k, dd = Math.abs(2 * a); const g = gcd(kk, dd); kk /= g; dd /= g;
    const re = rn === 0 ? '' : (rd === 1 ? minus(rn) : (rn < 0 ? '−' : '') + H.frac(Math.abs(rn), rd));
    const imBody = (kk === 1 ? '' : kk) + (m === 1 ? '' : H.sq(m));
    const im = dd === 1 ? (imBody || '1') : H.frac(imBody || '1', dd);
    for (const sgn of [1, -1]) out.push(`${re}${re ? (sgn > 0 ? ' + ' : ' − ') : (sgn > 0 ? '' : '−')}${im}<i class="ci">i</i>`);
    return out;
  }

  function complexHtml([re, im], set) {
    if (Math.abs(im) < 1e-9) return format(re, set).html;
    const r = Math.abs(re) < 1e-12 ? '' : format(re, set).html;
    const ia = format(Math.abs(im), set).html;
    return `${r}${r ? (im < 0 ? ' − ' : ' + ') : (im < 0 ? '−' : '')}${ia === '1' ? '' : ia}<i class="ci">i</i>`;
  }

  /* SOLVE: f(X)=0 by Newton with secant/bisection fallback */
  function solveRoot(f, x0) {
    let x = x0, fx = f(x);
    for (let it = 0; it < 200; it++) {
      if (Math.abs(fx) < 1e-14) return x;
      const h = 1e-6 * Math.max(1, Math.abs(x));
      const d = (f(x + h) - f(x - h)) / (2 * h);
      let nx = (d === 0 || !isFinite(d)) ? x + (Math.random() - 0.5) : x - fx / d;
      let nfx; try { nfx = f(nx); } catch (e) { nfx = NaN; }
      let lam = 1;
      while ((!isFinite(nfx) || Math.abs(nfx) > Math.abs(fx)) && lam > 1e-4) {
        lam /= 2; nx = x - lam * fx / d; try { nfx = f(nx); } catch (e) { nfx = NaN; }
      }
      if (!isFinite(nfx)) break;
      if (Math.abs(nx - x) < 1e-13 * Math.max(1, Math.abs(x))) { x = nx; fx = nfx; break; }
      x = nx; fx = nfx;
    }
    if (!isFinite(fx) || Math.abs(fx) > 1e-6 * Math.max(1, Math.abs(x))) {
      // scan for a sign change around x0
      for (let r = 1; r < 1e6; r *= 2) {
        for (const [lo, hi] of [[x0 - r, x0], [x0, x0 + r]]) {
          let flo, fhi; try { flo = f(lo); fhi = f(hi); } catch (e) { continue; }
          if (isFinite(flo) && isFinite(fhi) && flo * fhi <= 0) {
            let a = lo, b = hi;
            for (let k = 0; k < 200; k++) { const m = (a + b) / 2; const fm = f(m); if (flo * fm <= 0) b = m; else { a = m; flo = fm; } }
            return (a + b) / 2;
          }
        }
      }
      throw new CalcError("Can't Solve");
    }
    return x;
  }

  /* statistics */
  function stats(xs, ys) {
    const n = xs.length; if (!n) throw MathErr();
    const sum = (a) => a.reduce((s, v) => s + v, 0);
    const sx = sum(xs), sx2 = sum(xs.map((v) => v * v));
    const mean = sx / n;
    const varp = Math.max(0, sx2 / n - mean * mean);
    const sorted = xs.slice().sort((a, b) => a - b);
    const med = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const q = (p) => { const pos = (n - 1) * p, lo = Math.floor(pos); return sorted[lo] + (sorted[Math.min(lo + 1, n - 1)] - sorted[lo]) * (pos - lo); };
    const out = { n, sum: sx, sum2: sx2, mean, sdp: Math.sqrt(varp), sds: n > 1 ? Math.sqrt(varp * n / (n - 1)) : NaN, min: sorted[0], max: sorted[n - 1], med, q1: q(0.25), q3: q(0.75) };
    const freq = {}; xs.forEach((v) => (freq[v] = (freq[v] || 0) + 1));
    const mf = Math.max(...Object.values(freq)); out.mode = Object.keys(freq).filter((k) => freq[k] === mf).map(Number);
    if (ys) {
      const sy = sum(ys), sxy = sum(xs.map((v, i) => v * ys[i])), sy2 = sum(ys.map((v) => v * v));
      const my = sy / n;
      const Sxx = sx2 - n * mean * mean, Syy = sy2 - n * my * my, Sxy = sxy - n * mean * my;
      const B = Sxx === 0 ? NaN : Sxy / Sxx, A0 = my - B * mean;
      Object.assign(out, { sumY: sy, sumXY: sxy, sumY2: sy2, meanY: my, sdpY: Math.sqrt(Math.max(0, Syy / n)), A: A0, B, r: Sxy / Math.sqrt(Sxx * Syy) });
    }
    return out;
  }

  G.TISEngine = {
    S, CalcError, parse, evaluate, run, format, exactForm, decimalForm, engForm, mixedForm, dmsForm,
    solveLinear, det, inverse, matMul, transpose, polyRoots, quadExact, complexHtml, solveRoot, stats,
    integrate, derivative, gcd, H, minus,
  };
})(window);
