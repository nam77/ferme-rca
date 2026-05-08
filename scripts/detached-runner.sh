#!/usr/bin/env bash
#
# detached-runner.sh — exécute un script bash complètement détaché.
#
# Usage : bash detached-runner.sh <script> <log_file> <pid_file>
#
# Pourquoi ce wrapper ?
#   PM2 utilise tree-kill qui descend récursivement par PPID quand il
#   reload/restart un worker. Or `spawn(..., { detached: true })` côté
#   Node.js ne change PAS le PPID du child : tant qu'Express vit, le bash
#   spawné reste listé comme son enfant. Quand pm2 reload arrive, il tue
#   donc aussi notre bash deploy-server.sh, ce qui interrompt le
#   déploiement et déclenche un rollback inutile.
#
#   On utilise donc un double fork classique pour que le bash réel devienne
#   orphelin (PPID = 1, init/systemd). Tree-kill ne peut plus le trouver
#   en partant d'Express, et le déploiement survit au reload.
#
# Mécanique :
#   - Premier subshell () & : devient un enfant temporaire
#   - À l'intérieur, setsid + bash en background : crée une nouvelle
#     session et lance le bash réel
#   - Le subshell quitte immédiatement
#   - Le bash réel se retrouve sans parent vivant (orphelin) → adopté par
#     init (PID 1)
#
# On écrit le PID du bash réel dans <pid_file> pour que le backend
# Express puisse le surveiller et l'annuler (kill au PG).

set -u

SCRIPT="${1:?script manquant}"
LOG_FILE="${2:?log_file manquant}"
PID_FILE="${3:?pid_file manquant}"

# Préparer le fichier log
: > "$LOG_FILE"

# Préparer le fichier PID (vide initialement, on y écrit après le fork)
: > "$PID_FILE"

# Double fork pour vraie détachement
(
  setsid bash "$SCRIPT" >> "$LOG_FILE" 2>&1 < /dev/null &
  PID_BASH=$!
  echo "$PID_BASH" > "$PID_FILE"
  # Le subshell quitte ici. Le bash réel est désormais orphelin
  # (son ex-parent — ce subshell — meurt) et adopté par init.
) &

# Notre wrapper attend brièvement que le PID soit écrit, puis quitte.
# Cela permet à Express de lire le PID juste après notre exit.
for i in 1 2 3 4 5 6 7 8 9 10; do
  if [ -s "$PID_FILE" ]; then
    exit 0
  fi
  sleep 0.05
done

# Si après 0.5s le PID n'est toujours pas écrit, on quitte quand même.
exit 0
