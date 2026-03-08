#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-install.sh — One-command health check for Nerve after pnpm migration
# Usage:  bash verify-install.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

pass=0
fail=0
warn=0

ok()   { pass=$((pass + 1)); echo -e "  ${GREEN}✓${NC} $1"; }
fail() { fail=$((fail + 1)); echo -e "  ${RED}✗${NC} $1"; }
skip() { warn=$((warn + 1)); echo -e "  ${YELLOW}⚠${NC} $1"; }
header() { echo -e "\n${BOLD}${CYAN}[$1]${NC}"; }

# ── 1. Prerequisites ─────────────────────────────────────────────────────────
header 'Prerequisites'

if command -v pnpm &>/dev/null; then
  ok "pnpm $(pnpm --version)"
else
  fail 'pnpm not found — install with: npm install -g pnpm'
  echo -e "\n${RED}Cannot continue without pnpm.${NC}"
  exit 1
fi

if command -v node &>/dev/null; then
  NODE_VER=$(node --version | sed 's/^v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 22 ]; then
    ok "Node.js v${NODE_VER}"
  else
    fail "Node.js v${NODE_VER} — requires ≥ 22"
  fi
else
  fail 'Node.js not found'
fi

# ── 2. Package Scripts ───────────────────────────────────────────────────────
header 'Package Scripts (npm → pnpm check)'

check_script() {
  local key="$1" expect="$2"
  local actual
  actual=$(node -e "const p=require('./package.json'); console.log(p.scripts?.['$key'] || '')" 2>/dev/null)
  if [[ "$actual" == *"$expect"* ]]; then
    ok "\"$key\" uses pnpm"
  else
    fail "\"$key\" still references npm or is missing — got: $actual"
  fi
}

check_script 'build' 'pnpm run build:server'
check_script 'prod'  'pnpm run build'

POSTINSTALL=$(node -e "const p=require('./package.json'); console.log(p.scripts?.postinstall || '')" 2>/dev/null)
if echo "$POSTINSTALL" | grep -q 'pnpm run setup'; then
  ok '"postinstall" references pnpm'
elif echo "$POSTINSTALL" | grep -q 'npm run setup'; then
  fail '"postinstall" still references npm'
else
  skip '"postinstall" — no npm/pnpm reference found'
fi

# ── 3. Lockfile ──────────────────────────────────────────────────────────────
header 'Lockfile'

if [ -f pnpm-lock.yaml ]; then
  ok 'pnpm-lock.yaml exists'
else
  fail 'pnpm-lock.yaml missing — run: pnpm install'
fi

if [ -f package-lock.json ]; then
  fail 'package-lock.json still present — remove it: rm package-lock.json'
else
  ok 'No package-lock.json (clean)'
fi

# ── 4. Dependencies ──────────────────────────────────────────────────────────
header 'Dependencies'

if [ -d node_modules ]; then
  ok 'node_modules exists'
else
  fail 'node_modules missing — run: pnpm install'
fi

for pkg in '@lezer/highlight' '@codemirror/lang-css' '@codemirror/lang-html'; do
  if [ -d "node_modules/.pnpm" ] && pnpm list "$pkg" --depth=0 &>/dev/null 2>&1; then
    ok "$pkg installed"
  elif [ -d "node_modules/$pkg" ]; then
    ok "$pkg installed"
  else
    fail "$pkg missing — run: pnpm add $pkg"
  fi
done

# ── 5. Security Audit ────────────────────────────────────────────────────────
header 'Security Audit'

AUDIT_OUT=$(pnpm audit 2>&1 || true)
if echo "$AUDIT_OUT" | grep -qi 'no known vulnerabilities'; then
  ok 'No known vulnerabilities'
elif echo "$AUDIT_OUT" | grep -qi 'found 0 vulnerabilities'; then
  ok 'No known vulnerabilities'
else
  VULN_COUNT=$(echo "$AUDIT_OUT" | grep -oP '\d+ vulnerabilities' | head -1 || echo 'unknown')
  skip "Audit: $VULN_COUNT — review with: pnpm audit"
fi

# ── 6. Build & TypeScript Check (single pass) ────────────────────────────────
header 'Build & TypeScript'

BUILD_LOG=$(pnpm run build 2>&1)
BUILD_EXIT=$?

TS_ERRORS=$(echo "$BUILD_LOG" | grep -c 'error TS' || true)
if [ "$TS_ERRORS" -eq 0 ]; then
  ok 'TypeScript — zero errors'
else
  fail "TypeScript — $TS_ERRORS error(s)"
  echo "$BUILD_LOG" | grep 'error TS' | head -10 | while IFS= read -r line; do
    echo -e "    ${RED}→${NC} $line"
  done
fi

if [ "$BUILD_EXIT" -eq 0 ]; then
  ok 'pnpm run build — success'
else
  if [ "$TS_ERRORS" -eq 0 ]; then
    fail 'pnpm run build — failed (non-TypeScript error)'
  else
    fail 'pnpm run build — failed (see TypeScript errors above)'
  fi
fi

# ── 8. Production Smoke Test ─────────────────────────────────────────────────
header 'Production Smoke Test'

if [ -f server-dist/index.js ]; then
  ok 'server-dist/index.js exists'
  # Start server, wait for it to bind, then kill
  timeout 10 node server-dist/index.js &>/dev/null &
  SERVER_PID=$!
  sleep 3
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    ok 'Server process started and is running'
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  else
    skip 'Server exited quickly — may need .env configuration (run: pnpm run setup)'
  fi
else
  fail 'server-dist/index.js not found — build may have failed'
fi

# ── 9. Stale npm References ──────────────────────────────────────────────────
header 'Stale npm References (source files only)'

# Check key source files for leftover npm commands (not comments about npm ecosystem)
STALE=$(grep -rn '\bnpm run \|\bnpm install\b\|\bnpm ci\b\|\bnpm start\b\|\bnpm test\b' \
  --include='*.ts' --include='*.tsx' --include='*.json' \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude='pnpm-lock.yaml' --exclude='package-lock.json' \
  --exclude='*.test.*' \
  . 2>/dev/null | \
  grep -v 'npm install -g' | \
  grep -v 'npm-global' | \
  grep -v 'no npm dependency' | \
  grep -v 'cmd.includes' | \
  head -20 || true)

if [ -z "$STALE" ]; then
  ok 'No stale npm command references in source'
else
  COUNT=$(echo "$STALE" | wc -l)
  skip "$COUNT possible stale npm reference(s):"
  echo "$STALE" | while IFS= read -r line; do
    echo -e "    ${YELLOW}→${NC} $line"
  done
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ''
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}✓ $pass passed${NC}  ${RED}✗ $fail failed${NC}  ${YELLOW}⚠ $warn warnings${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$fail" -gt 0 ]; then
  echo -e "\n${RED}${BOLD}FAILED${NC} — fix the issues above, then re-run this script."
  exit 1
else
  echo -e "\n${GREEN}${BOLD}ALL CLEAR${NC} — Nerve is ready. Start with: ${CYAN}pnpm run prod${NC}"
  exit 0
fi