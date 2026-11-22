#!/usr/bin/env bash
# TTC Sim launcher (same pattern as ion-LRT / nig-drives play.sh). Close this window or Ctrl-C to stop the server.
# Builds dist/ if it is missing or older than the sources, then serves the built game with `vite preview`.
# PLAY_NO_BROWSER=1 skips opening the browser (used for headless checks).
cd "$(dirname "$(readlink -f "$0")")/.." || exit 1
PORT="${TTC_SIM_PORT:-5185}"
URL="http://127.0.0.1:$PORT/"
up() { curl -s -o /dev/null -m 2 "$URL"; }
openb() { [ -n "${PLAY_NO_BROWSER:-}" ] || xdg-open "$URL" >/dev/null 2>&1 & }
if up; then echo "TTC Sim already running at $URL"; openb; sleep 2; exit 0; fi
if [ ! -d node_modules ]; then echo "Installing dependencies..."; npm install || { read -rp "npm install failed. Enter to close"; exit 1; }; fi
if [ ! -f dist/index.html ] || [ -n "$(find src public index.html package.json vite.config.ts -newer dist/index.html -print -quit 2>/dev/null)" ]; then
  echo "Building..."; npm run build || { read -rp "Build failed. Enter to close"; exit 1; }
fi
[ -d public/imagery ] || echo "Note: no aerial imagery cached (public/imagery). Run 'npm run bake:imagery' for photo terrain."
echo "Starting TTC Sim on $URL  (close this window or Ctrl-C to stop)"
npx --no-install vite preview --port "$PORT" --strictPort --host 127.0.0.1 &
SP=$!
trap 'kill $SP 2>/dev/null; pkill -P $SP 2>/dev/null; exit' INT TERM HUP
for i in $(seq 1 120); do up && break; kill -0 $SP 2>/dev/null || break; sleep 0.5; done
if up; then openb; else echo "Server did not come up."; fi
wait $SP
