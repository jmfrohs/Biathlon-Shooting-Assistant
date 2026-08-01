#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SERVER_ROOT = path.resolve(__dirname, '..');
const DB_DIR = path.join(SERVER_ROOT, 'db');
const DB_PATH = path.join(DB_DIR, 'biathlon.db');
const BACKUP_DIR = path.join(DB_DIR, 'backups');
const RETENTION_DAYS_DEFAULT = 7;

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function partsToObject(parts) {
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }
  return map;
}

function berlinTimestampForFilename(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const p = partsToObject(formatter.formatToParts(date));
  return `${p.year}-${p.month}-${p.day}_${p.hour}-${p.minute}-${p.second}`;
}

function berlinReadable(date = new Date()) {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function parseArgs(argv) {
  const args = {
    command: argv[2] || 'help',
    file: undefined,
    days: RETENTION_DAYS_DEFAULT,
    force: false,
    yes: false
  };

  for (let i = 3; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--file') {
      args.file = argv[i + 1];
      i += 1;
    } else if (token === '--days') {
      const parsed = Number(argv[i + 1]);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error('--days muss >= 1 sein.');
      }
      args.days = Math.floor(parsed);
      i += 1;
    } else if (token === '--force') {
      args.force = true;
    } else if (token === '--yes') {
      args.yes = true;
    }
  }

  return args;
}

function getBackupFilesSorted() {
  ensureBackupDir();
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith('.db'))
    .map((name) => {
      const filePath = path.join(BACKUP_DIR, name);
      const stat = fs.statSync(filePath);
      return {
        name,
        path: filePath,
        mtimeMs: stat.mtimeMs,
        size: stat.size
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files;
}

function prettySize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

async function createBackup() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Datenbank nicht gefunden: ${DB_PATH}`);
  }

  ensureBackupDir();
  const filename = `backup-${berlinTimestampForFilename()}.db`;
  const backupPath = path.join(BACKUP_DIR, filename);

  const sourceDb = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    await sourceDb.backup(backupPath);
  } finally {
    sourceDb.close();
  }

  console.log(`Backup erstellt: ${filename}`);
  console.log(`Pfad: ${backupPath}`);

  const removed = pruneBackups(RETENTION_DAYS_DEFAULT);
  if (removed.length > 0) {
    console.log(`Bereinigt: ${removed.length} alte Backups entfernt.`);
  }
}

function listBackups() {
  const files = getBackupFilesSorted();
  if (files.length === 0) {
    console.log('Keine Backups vorhanden.');
    return;
  }

  console.log(`Backups (${files.length}) in ${BACKUP_DIR}`);
  files.forEach((file) => {
    console.log(
      `- ${file.name} | ${prettySize(file.size)} | ${berlinReadable(new Date(file.mtimeMs))} (Europe/Berlin)`
    );
  });
}

function pruneBackups(days = RETENTION_DAYS_DEFAULT) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const files = getBackupFilesSorted();
  const removed = [];

  for (const file of files) {
    if (file.mtimeMs < cutoff) {
      fs.unlinkSync(file.path);
      removed.push(file.name);
    }
  }

  return removed;
}

function isDatabaseLikelyInUse() {
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;
  const now = Date.now();

  const recent = [walPath, shmPath]
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => fs.statSync(filePath).mtimeMs)
    .some((mtimeMs) => now - mtimeMs < 5 * 60 * 1000);

  return recent;
}

function resolveBackupPath(fileArg) {
  if (!fileArg) {
    throw new Error('Bitte --file <backup-datei> angeben.');
  }

  const isAbsolute = path.isAbsolute(fileArg);
  const fullPath = isAbsolute ? fileArg : path.join(BACKUP_DIR, fileArg);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Backup-Datei nicht gefunden: ${fullPath}`);
  }

  return fullPath;
}

async function restoreBackup(fileArg, force, yes) {
  if (!yes) {
    throw new Error('Restore ist kritisch. Bitte mit --yes bestaetigen.');
  }

  const backupPath = resolveBackupPath(fileArg);

  if (!force && isDatabaseLikelyInUse()) {
    throw new Error(
      'Datenbank wirkt aktiv (WAL/SHM aktuell). Bitte Server stoppen oder --force nutzen.'
    );
  }

  ensureBackupDir();

  if (fs.existsSync(DB_PATH)) {
    const safetyName = `pre-restore-${berlinTimestampForFilename()}.db`;
    const safetyPath = path.join(BACKUP_DIR, safetyName);
    const sourceDb = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    try {
      await sourceDb.backup(safetyPath);
      console.log(`Sicherheits-Backup vor Restore: ${safetyName}`);
    } finally {
      sourceDb.close();
    }
  }

  fs.copyFileSync(backupPath, DB_PATH);

  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  console.log(`Restore erfolgreich aus: ${backupPath}`);
  console.log('Hinweis: Falls der Server gestoppt war, jetzt neu starten.');
}

function printHelp() {
  console.log('Backup Manager - Befehle:');
  console.log('  create                 Erstellt ein Backup und bereinigt >7 Tage');
  console.log('  list                   Zeigt verfuegbare Backups');
  console.log('  prune [--days N]       Loescht Backups aelter als N Tage (Default 7)');
  console.log('  restore --file NAME --yes [--force]');
  console.log('                         Stellt ein Backup wieder her');
}

async function main() {
  try {
    const args = parseArgs(process.argv);

    switch (args.command) {
      case 'create':
        await createBackup();
        break;
      case 'list':
        listBackups();
        break;
      case 'prune': {
        const removed = pruneBackups(args.days);
        if (removed.length === 0) {
          console.log(`Keine Backups aelter als ${args.days} Tage gefunden.`);
        } else {
          console.log(`Entfernt (${removed.length}):`);
          removed.forEach((name) => console.log(`- ${name}`));
        }
        break;
      }
      case 'restore':
        await restoreBackup(args.file, args.force, args.yes);
        break;
      default:
        printHelp();
        process.exitCode = args.command === 'help' ? 0 : 1;
    }
  } catch (err) {
    console.error(`Fehler: ${err.message}`);
    process.exitCode = 1;
  }
}

main();
