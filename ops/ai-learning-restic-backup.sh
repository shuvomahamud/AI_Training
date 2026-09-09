#!/usr/bin/env bash
set -euo pipefail

restic backup \
  --tag ai-learning \
  /var/lib/ai-learning/uploads \
  /etc/ai-learning \
  /etc/systemd/system/ai-learning.service

restic forget \
  --tag ai-learning \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  --prune
