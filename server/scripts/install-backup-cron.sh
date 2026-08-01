#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_SCRIPT="$SERVER_ROOT/scripts/backup-manager.js"
LOG_FILE="/var/log/biathlon-backup.log"

if ! command -v crontab >/dev/null 2>&1; then
  echo "crontab wurde nicht gefunden. Bitte cron installieren."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node wurde nicht gefunden. Bitte Node.js installieren."
  exit 1
fi

MARKER="# biathlon-nightly-backup"
CRON_TZ_LINE="CRON_TZ=Europe/Berlin"
CRON_JOB_LINE="0 0 * * * /usr/bin/env node '$BACKUP_SCRIPT' create >> '$LOG_FILE' 2>&1"

EXISTING_CRON="$(crontab -l 2>/dev/null || true)"

if echo "$EXISTING_CRON" | grep -F "$MARKER" >/dev/null 2>&1; then
  echo "Backup-Cronjob ist bereits vorhanden."
  exit 0
fi

{
  if [ -n "$EXISTING_CRON" ]; then
    echo "$EXISTING_CRON"
  fi
  echo "$CRON_TZ_LINE"
  echo "$MARKER"
  echo "$CRON_JOB_LINE"
} | crontab -

echo "Backup-Cronjob installiert: taeglich 00:00 Europe/Berlin"
echo "Script: $BACKUP_SCRIPT"
echo "Log: $LOG_FILE"
