const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release');
const tempDir = path.join(releaseDir, 'LIFE-OS-v1.0.0-Portable');
const zipFile = path.join(releaseDir, 'LIFE-OS-Portable.zip');

if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
if (fs.existsSync(zipFile)) fs.rmSync(zipFile, { force: true });

fs.mkdirSync(tempDir, { recursive: true });
fs.copyFileSync(path.join(root, 'src-tauri', 'target', 'release', 'life-os.exe'), path.join(tempDir, 'LIFE-OS.exe'));
fs.copyFileSync(path.join(root, 'src-tauri', 'target', 'release', 'WebView2Loader.dll'), path.join(tempDir, 'WebView2Loader.dll'));

// Use tar to create zip archive
execSync(`tar -a -cf "${zipFile}" -C "${tempDir}" .`);
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('[package-portable] LIFE-OS-Portable.zip created successfully!');
const files = fs.readdirSync(releaseDir);
for (const f of files) {
  const stat = fs.statSync(path.join(releaseDir, f));
  console.log(`[package-portable] ${f} - ${stat.size} bytes`);
}
