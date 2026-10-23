/**
 * LIFE OS — Automated Database Backup & Retention Policy Script
 * Performs an online, non-blocking atomic backup of the SQLite database
 * and rotates old snapshots according to BACKUP_RETENTION_COUNT.
 */

const fs = require('fs');
const path = require('path');
const { db } = require('../src/db/database.cjs');
const { BACKUP_RETENTION_COUNT } = require('../src/config/env.cjs');

async function runBackup() {
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `lifeos_backup_${timestamp}.db`);

  console.log(`[Backup] Initiating online atomic backup to: ${backupFile}`);

  try {
    // better-sqlite3 db.backup() creates a transactionally consistent online snapshot
    await db.backup(backupFile);
    const stats = fs.statSync(backupFile);
    console.log(`[Backup] Successfully created snapshot (${(stats.size / 1024).toFixed(2)} KB).`);

    // Retention Policy enforcement
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('lifeos_backup_') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time); // newest first

    console.log(`[Backup] Total existing backups: ${files.length}. Retention limit: ${BACKUP_RETENTION_COUNT}`);

    if (files.length > BACKUP_RETENTION_COUNT) {
      const toDelete = files.slice(BACKUP_RETENTION_COUNT);
      for (const item of toDelete) {
        fs.unlinkSync(item.path);
        console.log(`[Backup] Rotated out expired backup: ${item.name}`);
      }
    }

    console.log('[Backup] Backup and retention cycle completed cleanly.');
  } catch (err) {
    console.error('[Backup Error]:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runBackup().then(() => process.exit(0));
}

module.exports = {
  runBackup
};
