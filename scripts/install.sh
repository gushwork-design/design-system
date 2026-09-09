#!/usr/bin/env bash
#
# One-command setup for the Gushwork Design System.
#
# While the repo is PUBLIC:
#   curl -fsSL https://raw.githubusercontent.com/gushwork-design/design-system/main/scripts/install.sh | bash
#
# Works either way, public or PRIVATE (needs the GitHub CLI, authenticated):
#   gh api repos/gushwork-design/design-system/contents/scripts/install.sh \
#     -H "Accept: application/vnd.github.raw" | bash
#
# Adds the marketplace, installs the plugin, and turns on auto-update so new
# versions arrive on their own. Safe to re-run — every step is idempotent.

set -uo pipefail

REPO="gushwork-design/design-system"
MARKET="gushwork"
PLUGIN="gushwork-design@gushwork"
KNOWN="$HOME/.claude/plugins/known_marketplaces.json"

fail() { printf '\n✘ %s\n' "$1" >&2; exit 1; }

command -v claude >/dev/null 2>&1 || fail \
  "Claude Code isn't installed, or 'claude' isn't on your PATH.
  Install it first: https://claude.com/claude-code"

# --- 0. access ------------------------------------------------------------
# The marketplace is a git clone, so the only thing that matters is whether git can reach the
# repo. Checking it here turns the private-repo case into a sentence you can act on, instead of
# a bare "couldn't add the marketplace" three steps later.
if ! git ls-remote --exit-code "https://github.com/$REPO.git" HEAD >/dev/null 2>&1; then
  fail "git can't reach $REPO.

  The repo is private, so you need two things:
    1. access — ask Utsav to add you as a collaborator
    2. authenticated git on this machine — the simplest route is:
         gh auth login          (then: gh auth setup-git)

  Check it with:
    git ls-remote https://github.com/$REPO.git HEAD"
fi

# --- 1. marketplace -------------------------------------------------------
if python3 -c "
import json,os,sys
p=os.path.expanduser('$KNOWN')
sys.exit(0 if os.path.exists(p) and '$MARKET' in json.load(open(p)) else 1)
" 2>/dev/null; then
  echo "✔ marketplace '$MARKET' already added"
else
  echo "→ adding marketplace $REPO"
  claude plugin marketplace add "$REPO" >/dev/null 2>&1 \
    || fail "couldn't add the marketplace. Check your GitHub access, then try:
    claude plugin marketplace add $REPO"
  echo "✔ marketplace added"
fi

# --- 2. plugin ------------------------------------------------------------
if claude plugin list 2>/dev/null | grep -q "$PLUGIN"; then
  echo "✔ plugin already installed"
else
  echo "→ installing $PLUGIN"
  claude plugin install "$PLUGIN" >/dev/null 2>&1 \
    || fail "couldn't install the plugin. Try it directly to see why:
    claude plugin install $PLUGIN"
  echo "✔ plugin installed"
fi

# --- 3. auto-update -------------------------------------------------------
# Lives per-machine; a repo's .claude/settings.json cannot set it.
python3 - <<PY
import json, os, sys
p = os.path.expanduser("$KNOWN")
if not os.path.exists(p):
    print("… skipped auto-update: no marketplace config yet"); sys.exit(0)
try:
    d = json.load(open(p))
except json.JSONDecodeError:
    print("… skipped auto-update: known_marketplaces.json isn't valid JSON"); sys.exit(0)
e = d.get("$MARKET")
if e is None:
    print("… skipped auto-update: marketplace missing"); sys.exit(0)
if e.get("autoUpdate") is True:
    print("✔ auto-update already on"); sys.exit(0)
e["autoUpdate"] = True
open(p, "w").write(json.dumps(d, indent=2) + "\n")
print("✔ auto-update on")
PY

cat <<'EOF'

  Now restart Claude Code — it won't load the skills until you do.

  Then just describe what you want:
      "Build a dashboard for the sales team to see show-ups over the week"

  Guide: https://github.com/gushwork-design/design-system/blob/main/ONBOARDING.md
EOF
