// Copies the static site into www/ for the Capacitor Android build.
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets']) {
  fs.cpSync(path.join(__dirname, '..', item), path.join(out, item), { recursive: true });
}
console.log('Web files copied to www/');
