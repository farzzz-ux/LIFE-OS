/**
 * Sets up Tauri's NSIS cache with all required files:
 * 1. Extracts nsis-3.13.zip flat into %LOCALAPPDATA%\tauri\NSIS\
 * 2. Downloads NSIS-ApplicationID.dll plugin
 * 3. Downloads nsis_tauri_utils.dll plugin
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');
const https = require('https');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const nsisDir = path.join(localAppData, 'tauri', 'NSIS');
const pluginsDir = path.join(nsisDir, 'Plugins', 'x86-unicode');

console.log('[setup-nsis] Target NSIS dir:', nsisDir);

// Create directories
fs.mkdirSync(pluginsDir, { recursive: true });
console.log('[setup-nsis] Created plugin dir:', pluginsDir);

// Step 1: Extract nsis-3.13.zip flat into nsisDir
const zipPath = path.join(os.tmpdir(), 'nsis-3.13.zip');
if (fs.existsSync(zipPath)) {
  console.log('[setup-nsis] Extracting', zipPath, '...');
  // Use PowerShell to extract, stripping first folder component
  const extractScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, '\\\\')}')
foreach ($entry in $zip.Entries) {
  # Strip first folder component (e.g. "nsis-3.13/makensis.exe" -> "makensis.exe")
  $parts = $entry.FullName -split '/'
  if ($parts.Count -gt 1) {
    $relative = ($parts[1..($parts.Count-1)] -join '\\\\')
  } else {
    $relative = $entry.FullName
  }
  if ($relative -eq '' -or $relative -eq '\\\\') { continue }
  $dest = Join-Path '${nsisDir.replace(/\\/g, '\\\\')}' $relative
  $destDir = Split-Path $dest -Parent
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  if (-not $entry.FullName.EndsWith('/')) {
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
  }
}
$zip.Dispose()
Write-Host 'Extraction complete'
`;
  const psFile = path.join(os.tmpdir(), 'extract-nsis.ps1');
  fs.writeFileSync(psFile, extractScript);
  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { encoding: 'utf8' });
  if (result.stdout) console.log('[setup-nsis] PS:', result.stdout.trim());
  if (result.stderr) console.error('[setup-nsis] PS stderr:', result.stderr.trim());
  if (result.status === 0) {
    console.log('[setup-nsis] NSIS extracted successfully');
  } else {
    console.error('[setup-nsis] Extraction failed with code', result.status);
    process.exit(1);
  }
} else {
  console.error('[setup-nsis] ERROR: nsis-3.13.zip not found at', zipPath);
  process.exit(1);
}

// Verify makensis.exe
const makensis = path.join(nsisDir, 'makensis.exe');
if (fs.existsSync(makensis)) {
  const stat = fs.statSync(makensis);
  console.log('[setup-nsis] makensis.exe found:', stat.size, 'bytes');
} else {
  console.error('[setup-nsis] ERROR: makensis.exe not found after extraction!');
  // List what IS there
  const items = fs.readdirSync(nsisDir);
  console.log('[setup-nsis] Contents:', items);
}

// Step 2: Download NSIS plugins from tauri binary-releases
function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log('[setup-nsis] Already exists:', path.basename(dest));
      return resolve();
    }
    console.log('[setup-nsis] Downloading:', url);
    const file = fs.createWriteStream(dest);
    function get(u) {
      https.get(u, { timeout: 60000 }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.destroy();
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
      }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
    }
    get(url);
  });
}

async function main() {
  // Download NSIS ApplicationID plugin
  const appIdUrl = 'https://github.com/tauri-apps/binary-releases/releases/download/nsis-plugins-v0/NSIS-ApplicationID.zip';
  const appIdZip = path.join(os.tmpdir(), 'NSIS-ApplicationID.zip');
  
  // Download nsis-tauri-utils.dll  
  // Check latest release - v0.4.1 is known to work with Tauri 2.x
  const utilsUrl = 'https://github.com/tauri-apps/nsis-tauri-utils/releases/download/nsis_tauri_utils-v0.4.1/nsis_tauri_utils.dll';
  const utilsDst = path.join(pluginsDir, 'nsis_tauri_utils.dll');

  try {
    await download(utilsUrl, utilsDst);
    const stat = fs.statSync(utilsDst);
    console.log('[setup-nsis] nsis_tauri_utils.dll:', stat.size, 'bytes');
  } catch(e) {
    console.error('[setup-nsis] Failed to download nsis_tauri_utils.dll:', e.message);
  }

  try {
    await download(appIdUrl, appIdZip);
    // Extract ApplicationID.dll from the zip
    const extractScript2 = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('${appIdZip.replace(/\\/g, '\\\\')}')
foreach ($entry in $zip.Entries) {
  if ($entry.FullName -match 'ApplicationID\\.dll') {
    $dest = '${path.join(pluginsDir, 'ApplicationID.dll').replace(/\\/g, '\\\\')}'
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
    Write-Host "Extracted ApplicationID.dll"
    break
  }
}
$zip.Dispose()
`;
    const psFile2 = path.join(os.tmpdir(), 'extract-appid.ps1');
    fs.writeFileSync(psFile2, extractScript2);
    const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile2], { encoding: 'utf8' });
    if (r.stdout) console.log('[setup-nsis] PS:', r.stdout.trim());
    if (r.stderr && r.stderr.trim()) console.error('[setup-nsis] PS stderr:', r.stderr.trim());
  } catch(e) {
    console.error('[setup-nsis] Failed to download/extract ApplicationID.dll:', e.message);
  }

  // Final verification
  console.log('\n[setup-nsis] Final NSIS cache structure:');
  const listDir = (d, prefix = '') => {
    if (!fs.existsSync(d)) return;
    fs.readdirSync(d).forEach(f => {
      const fp = path.join(d, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        console.log(prefix + f + '/');
        listDir(fp, prefix + '  ');
      } else {
        console.log(prefix + f, '(' + stat.size + ' bytes)');
      }
    });
  };
  listDir(nsisDir);
}

main().catch(e => {
  console.error('[setup-nsis] Fatal:', e);
  process.exit(1);
});
