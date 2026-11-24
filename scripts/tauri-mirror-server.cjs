/**
 * Local HTTP mirror server for Tauri's NSIS bundle downloads.
 * Serves pre-downloaded GitHub release files from local disk.
 * 
 * Set env var before running tauri build:
 *   TAURI_BUNDLER_TOOLS_GITHUB_MIRROR_TEMPLATE=http://localhost:7331/{owner}/{repo}/releases/download/{version}/{asset}
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const PORT = 7331;
const TEMP = os.tmpdir();

// Map of GitHub asset URLs to local file paths
// We already downloaded nsis-3.13.zip to TEMP
const FILES = {
  // owner/repo/releases/download/tag/asset
  'tauri-apps/binary-releases/releases/download/nsis-3.13/nsis-3.13.zip': path.join(TEMP, 'nsis-3.13.zip'),
  'tauri-apps/binary-releases/releases/download/nsis-plugins-v0/NSIS-ApplicationID.zip': path.join(TEMP, 'NSIS-ApplicationID.zip'),
  'tauri-apps/nsis-tauri-utils/releases/download/nsis_tauri_utils-v0.4.1/nsis_tauri_utils.dll': path.join(TEMP, 'nsis_tauri_utils.dll'),
};

// Copy dll to temp if needed
const utilsDll = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'tauri', 'NSIS', 'Plugins', 'x86-unicode', 'nsis_tauri_utils.dll');
if (fs.existsSync(utilsDll)) {
  const dst = path.join(TEMP, 'nsis_tauri_utils.dll');
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(utilsDll, dst);
    console.log('Copied nsis_tauri_utils.dll to temp');
  }
}

// Also check for ApplicationID zip in temp
const appIdSrc = path.join(TEMP, 'NSIS-ApplicationID.zip');
if (!fs.existsSync(appIdSrc)) {
  console.log('Note: NSIS-ApplicationID.zip not in temp - will need to download it');
  // Try downloading it
  try {
    execSync(`powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/tauri-apps/binary-releases/releases/download/nsis-plugins-v0/NSIS-ApplicationID.zip' -OutFile '${appIdSrc}' -TimeoutSec 60 -UseBasicParsing"`, { timeout: 70000 });
    console.log('Downloaded NSIS-ApplicationID.zip');
  } catch(e) {
    console.log('Warning: Could not download NSIS-ApplicationID.zip:', e.message);
  }
}

const server = http.createServer((req, res) => {
  // URL format: /{owner}/{repo}/releases/download/{version}/{asset}
  const urlPath = req.url.replace(/^\//, '');
  console.log(`[mirror] Request: ${urlPath}`);
  
  // Find matching file
  let filePath = null;
  for (const [key, fp] of Object.entries(FILES)) {
    if (urlPath === key || urlPath.endsWith(key)) {
      filePath = fp;
      break;
    }
  }
  
  // Also try matching by just the asset filename
  if (!filePath) {
    const asset = path.basename(urlPath);
    const tempFile = path.join(TEMP, asset);
    if (fs.existsSync(tempFile)) {
      filePath = tempFile;
    }
  }
  
  if (filePath && fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    console.log(`[mirror] Serving: ${filePath} (${stat.size} bytes)`);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    console.log(`[mirror] NOT FOUND: ${urlPath}`);
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mirror] Local Tauri mirror server running on http://localhost:${PORT}`);
  console.log(`[mirror] Serving ${Object.keys(FILES).length} files from local cache`);
  console.log('');
  console.log('Set this env var before running tauri build:');
  console.log(`  TAURI_BUNDLER_TOOLS_GITHUB_MIRROR_TEMPLATE=http://localhost:${PORT}/{owner}/{repo}/releases/download/{version}/{asset}`);
});

server.on('error', (e) => {
  console.error('[mirror] Server error:', e.message);
  process.exit(1);
});
