<p align="center">
  <img src="assets/logo.svg" width="110" alt="TIS SmartCalc logo">
</p>

<h1 align="center">TIS SmartCalc</h1>
<p align="center"><b>Smart Calculator Emulator Suite for Online Math Classes</b><br>
by <b>তারিকুল ইসলাম (সুমন)</b> — MSc Mathematics · <a href="https://www.youtube.com/@tis.academy24">TIS Academy</a></p>

<p align="center">
  <a href="https://tariqulislam4015.github.io/tis-smartcalc-repo/"><b>🚀 Live Demo</b></a> ·
  <a href="https://github.com/tariqulislam4015/tis-smartcalc-repo/releases/latest/download/TIS-SmartCalc.apk"><b>📱 Download APK</b></a>
</p>

---

## ✨ Models

| Model | Type | Highlights |
|---|---|---|
| **SX-Pro** | Scientific (classic 2-line LCD) | SHIFT/ALPHA layers, exact answers (fraction, √, π), S⇔D, ENG, DMS, ∫dx, d/dx, Σ, ∏, nPr, nCr, Pol/Rec, GCD/LCM, variables A–F X Y M, STO/RCL, M+/M−, CALC, SOLVE, replay pad |
| | Modes | **COMP · STAT** (1-VAR, A+BX) **· EQN** (2×2, 3×3, quadratic with exact surd/complex roots + vertex, cubic) **· MATRIX** (det, inverse, transpose, A², trace) **· TABLE · BASE-N** |
| **B-12** | Basic desk calculator | Live preview, GT, memory, paper tape |
| **G-Plot** | Graphing | 4 functions, pan / zoom / pinch, trace, roots, min/max, intersections, shaded ∫ area, value table |
| **ST-Data** | Statistics | Mean, median, mode, σ, s, quartiles, frequency data, linear regression with r, histogram + box plot, scatter + line |
| **PX-Base** | Programmer | HEX/DEC/OCT/BIN at once, AND OR XOR XNOR NOT Neg, shifts, 32-bit |

### 🎓 Online-class tools
- **Keys** – pressed keys appear big on screen, so students can follow along during screen-share
- **Present** – calculator-only full screen mode
- **Zoom 70–200 %** – for projectors and recordings
- **History** – every answer saved; tap to copy, "Copy all" for notes
- Light / dark theme, key sound + vibration, full keyboard support
- Works **offline** (PWA) and installs as an app

---

## 🚀 Put it on GitHub (one time)

### Option A — from the GitHub website (no software needed)
1. Go to <https://github.com/new>, Repository name **`tis-smartcalc-repo`**, Public → **Create repository**.
2. Click **"uploading an existing file"**, drag **all files and folders** from this project (including the `.github` folder) → **Commit changes**.
   > Windows hides folders starting with a dot. If `.github` does not upload, open the repo → **Add file → Create new file**, type the name `.github/workflows/build-apk.yml` and paste that file's content.

### Option B — with Git
```bash
cd tis-smartcalc-repo
git init
git add .
git commit -m "TIS SmartCalc v1.0"
git branch -M main
git remote add origin https://github.com/tariqulislam4015/tis-smartcalc-repo.git
git push -u origin main
```

## 🌐 Turn on the Live Demo (GitHub Pages)
Repo → **Settings → Pages** → *Source:* **Deploy from a branch** → Branch **main**, folder **/(root)** → **Save**.
After 1–2 minutes the site is live at:
**https://tariqulislam4015.github.io/tis-smartcalc-repo/**

## 📱 The APK (built automatically)
Every push to `main` runs **Actions → Build Android APK** (≈5 min). It:
1. wraps the site in an Android app with Capacitor,
2. sets the TIS SmartCalc launcher icon,
3. publishes **TIS-SmartCalc.apk** in **Releases → latest**.

Direct download link (used by the "Download APK" button in the app):
`https://github.com/tariqulislam4015/tis-smartcalc-repo/releases/latest/download/TIS-SmartCalc.apk`

On the phone: open the link → install → allow **"Install unknown apps"** for the browser.
If the Action shows a permissions error: **Settings → Actions → General → Workflow permissions → Read and write** → Save, then **Actions → Build Android APK → Run workflow**.

> Using a different repo name? Change the two links at the top of `js/app.js` (the `CONFIG` block) and in this README.

---

## ⌨️ Keyboard (SX-Pro)
`0–9 + − * / ^ ( ) .` · `Enter` = · `Backspace` DEL · `Esc` AC · `s c t` sin cos tan · `l` log · `n` ln · `r` √ · `q` x² · `p` π · `x` X · `!` x! · `%` · arrows

## 🗂 Project structure
```
index.html            app shell + profile card
css/style.css         all styling & animations
js/engine.js          parser, exact-form formatter, calculus, solvers
js/scientific.js      SX-Pro scientific model
js/models.js          B-12, G-Plot, ST-Data, PX-Base
js/app.js             model switching, class tools, history, PWA
sw.js, manifest.webmanifest   offline + install
.github/workflows/build-apk.yml   APK build
```

## 👤 Author
**তারিকুল ইসলাম (সুমন)** — MSc Mathematics
[YouTube · TIS Academy](https://www.youtube.com/@tis.academy24) ·
[Facebook](https://www.facebook.com/tariqul.islam.422531/) ·
[WhatsApp](https://wa.me/8801755489719) ·
[GitHub](https://github.com/tariqulislam4015)

TIS SmartCalc is an original design. It is not affiliated with or endorsed by any calculator manufacturer.

MIT License © TIS Academy
