const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'src-tauri', 'target', 'release');

const filesToCopy = [
  { src: path.join(releaseDir, 'life-os.exe'), dest: path.join(root, 'LIFE-OS.exe') },
  { src: path.join(releaseDir, 'WebView2Loader.dll'), dest: path.join(root, 'WebView2Loader.dll') }
];

for (const { src, dest } of filesToCopy) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[copy-release] Copied ${path.basename(src)} -> ${path.relative(root, dest)}`);
  } else {
    console.warn(`[copy-release] Warning: ${src} not found.`);
  }
}
