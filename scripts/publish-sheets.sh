#!/usr/bin/env bash
# Publish the site to https://gushwork-design.vercel.app
#
#   bash scripts/publish-sheets.sh              # deploy to production
#   bash scripts/publish-sheets.sh --preview    # deploy to a preview URL
#   bash scripts/publish-sheets.sh --dry-run    # assemble and print the tree, deploy nothing
#
# WHAT THIS IS FOR
# ----------------
# The sheets only work if you clone the repo. Hosting them turns preview/ into
# a URL anyone at Gushwork can open, which is the distribution half of the
# mandate. It is for READING and REVIEWING — the plugin is still how you build.
#
# WHAT CHANGED (Aug 2026)
# -----------------------
# This used to deploy four loose HTML files behind a card-list index. It now
# deploys a site: a shared topbar and sidebar from web/, the Overview page
# built from the Figma, and a real Google auth gate over the internal pages.
#
#   /                       Overview            public
#   /style-guide            holding page        public
#   /downloads              holding page        public
#   /internal/claude-plugin  = install.html     @gushwork.ai
#   /internal/mini-tools     holding page       @gushwork.ai
#   /internal/changelog      = changelog-sheet  @gushwork.ai
#   /admin/review-sheet      = review-sheet     ADMIN_EMAILS only
#   /admin/catalogue         = catalogue        ADMIN_EMAILS only
#
# THE SHEETS ARE STILL NEVER EDITED. They are generated, and release-log.sh
# --check compares what is committed against what the generator produces.
# The shell tags are injected into the STAGED COPIES by scripts/_add_shell.py,
# so the repo's own files stay byte-identical to their generator output.
#
# WHY THE VERCEL MCP CANNOT DO THIS. `deploy_to_vercel` takes files inline in
# the tool call. This tree is ~2.4 MB — three font TTFs plus a 664 KB review
# sheet — so the CLI is the only path. If `vercel whoami` fails, run
# `vercel login`; never pass a token on the command line.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=prod
case "${1:-}" in
  --dry-run) MODE=dry ;;
  --preview) MODE=preview ;;
  "")        MODE=prod ;;
  *) echo "unknown flag: $1" >&2; exit 2 ;;
esac

# Sheets that go up, and where they land. "<repo path>|<staged path>".
# The staged paths are one directory deep, exactly like preview/ was, so the
# sheets' own ../foundation/tokens.css links keep resolving.
SHEETS=(
  "preview/install.html|internal/claude-plugin.html"
  "preview/changelog-sheet.html|internal/changelog.html"
  "preview/review-sheet.html|admin/review-sheet.html"
  "preview/catalogue.html|admin/catalogue.html"
)

# Social card images. A page's og:image must be an absolute URL for crawlers
# to resolve it, so it never matches the ../assets/ grep further down. List it
# here or the card 404s and the link unfurls blank.
SOCIAL=(
  assets/og/install.png
)

# The changelog sheet is generated, so a publish must not ship a stale one.
bash scripts/release-log.sh --check

# And the version fields must agree before anything goes out, because version.json below
# becomes the number every machine compares itself against. v1.40.0 shipped with
# plugin.json at 1.40.0 and marketplace.json still at 1.39.0 — stamp-release.sh writes
# both, so it had not been run — and the live install page advertised 1.39.0 for ten days.
# This is the gate that catches it.
bash scripts/version-json.sh --check

command -v vercel >/dev/null || { echo "vercel CLI not installed — brew install vercel" >&2; exit 1; }
if [ "$MODE" != dry ] && ! vercel whoami >/dev/null 2>&1; then
  echo "Vercel CLI is not authenticated. Run:  vercel login" >&2
  exit 1
fi

# The directory name becomes the project name on first deploy, and the project
# name becomes the URL. It must be `gushwork-design`.
STAGE="$(mktemp -d)/gushwork-design"
trap 'rm -rf "$(dirname "$STAGE")"' EXIT
mkdir -p "$STAGE"

# ---------------------------------------------------------------------------
# 1. The site itself — pages, shell, auth functions, middleware, vercel.json.
#    web/ mirrors the deploy root one-for-one, so this is a straight copy.
# ---------------------------------------------------------------------------
cp -R web/. "$STAGE/"
# README-auth.md is documentation for us, not a page. Don't serve it.
rm -f "$STAGE/README-auth.md"

for required in index.html shell.css shell.js middleware.js vercel.json \
                api/_session.js api/auth/login.js api/auth/callback.js \
                api/auth/logout.js api/auth/me.js api/auth/password.js; do
  [ -f "$STAGE/$required" ] || { echo "  MISSING from web/: $required" >&2; exit 1; }
done

# ---------------------------------------------------------------------------
# 2. The generated sheets, renamed into their gated homes and given the shell.
# ---------------------------------------------------------------------------
echo "Staging sheets:"
for pair in "${SHEETS[@]}"; do
  src="${pair%%|*}"; dst="${pair##*|}"
  [ -f "$src" ] || { echo "  MISSING sheet: $src" >&2; exit 1; }
  mkdir -p "$STAGE/$(dirname "$dst")"
  cp "$src" "$STAGE/$dst"
done
python3 scripts/_add_shell.py $(for p in "${SHEETS[@]}"; do echo "$STAGE/${p##*|}"; done)

# install.html's social card still points at the old /preview/install.html.
# Rewrite it in the staged copy so the unfurl lands on the live page. The old
# URL still works — vercel.json redirects it — but a canonical og:url that
# 302s is a smell, and some crawlers won't follow it.
python3 - "$STAGE/internal/claude-plugin.html" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
before = s
s = s.replace("https://gushwork-design.vercel.app/preview/install.html",
              "https://gushwork-design.vercel.app/internal/claude-plugin")
open(p, "w", encoding="utf-8").write(s)
print("  rewrote og:url in claude-plugin.html" if s != before
      else "  og:url in claude-plugin.html already current")
PY

# ---------------------------------------------------------------------------
# 3. Shared assets.
# ---------------------------------------------------------------------------
mkdir -p "$STAGE/foundation" "$STAGE/fonts"

# The component registry goes up too, and it is the ONE file here that is not
# for reading. Every dashboard the skill builds fetches it on load to see
# whether the components it was built from have moved on, and shows its owner
# a notice if they have. That check has to keep working after the repo goes
# private, which is exactly why it points at this public deploy and not at
# raw.githubusercontent.com. Deploying without it does not break a dashboard —
# the fetch fails silently — it just means nobody is ever told.
#
# IT MUST STAY UNGATED. middleware.js only matches /internal/* and /admin/*,
# so it is public today. Widening that matcher would silently break every
# dashboard's drift check.
# One per surface now, plus the shared one every surface merges in. A registry that is not
# deployed is a surface whose builds check against nothing and are told nothing — silently, since
# the fetch fails quietly by design. Missing or malformed stops the publish rather than shipping
# a deploy that half-answers.
for surface in shared dashboard web lead-magnet; do
  src="exports/$surface/component-registry.json"
  [ -f "$src" ] || { echo "  MISSING registry: $src" >&2; exit 1; }
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$src" \
    || { echo "  $src is not valid JSON — fix it before publishing" >&2; exit 1; }
  mkdir -p "$STAGE/exports/$surface"
  cp "$src" "$STAGE/exports/$surface/"
  echo "  registry -> exports/$surface/component-registry.json"
done

# version.json — the other file here that is not for reading. The SessionStart hook in
# hooks/hooks.json fetches it to find out whether the copy someone is running has been
# superseded, and which components broke on the way. It sits at the ROOT of the deploy, so
# the URL stays https://gushwork-design.vercel.app/version.json for good. Generated, never
# committed; scripts/version-json.sh is the only thing that writes it.
#
# UNGATED, for the same reason as the registry above: middleware.js matches only
# /internal/* and /admin/*, and the root is outside both. A machine that is behind must be
# able to find that out without the access being behind might have cost it.
bash scripts/version-json.sh > "$STAGE/version.json"
python3 - "$STAGE/version.json" <<'VJ'
import json, sys
d = json.load(open(sys.argv[1]))
v, n = d["version"], len(d["components"])
print(f"  version.json -> v{v}, {n} components")
VJ

# search-index.json — what the topbar's palette searches. Built from the STAGED copies, after
# the shell has been injected and the sheets renamed to their routes, so every result links to
# a URL that exists on this deploy. Building it from the repo instead would index files whose
# routes do not exist, miss the renames, and drift the first time a route changed.
python3 scripts/_search_index.py "$STAGE" > "$STAGE/search-index.json"

cp foundation/tokens.css "$STAGE/foundation/"
cp fonts/*.ttf "$STAGE/fonts/"

for a in "${SOCIAL[@]}"; do
  [ -f "$a" ] || { echo "  MISSING social image: $a" >&2; exit 1; }
  mkdir -p "$STAGE/$(dirname "$a")" && cp "$a" "$STAGE/$a"
done

# Any page that links tokens.css needs the real fonts; review-sheet and
# catalogue inline their own. Copy whatever else the pages reference, so a new
# sheet with assets just works. Both ../assets/ (from a one-deep page) and
# /assets/ (from the shell) are picked up.
{
  for pair in "${SHEETS[@]}"; do
    grep -ohE '(href|src)="(\.\./|/)assets/[^"]+"' "$STAGE/${pair##*|}" 2>/dev/null || true
  done
  grep -rohE '(href|src)="/assets/[^"]+"' "$STAGE"/*.html "$STAGE"/internal/*.html 2>/dev/null || true
  # CSS url() too — the style guide masks the logo through -webkit-mask to draw
  # the "don't" panel, and those references carry no href= or src= to match.
  grep -rohE "url\(['\"]?/assets/[^)'\"]+" "$STAGE"/*.html "$STAGE"/internal/*.html 2>/dev/null \
    | sed "s|^url(['\"]\{0,1\}|src=\"|;s|$|\"|" || true
} | sed 's/.*="//;s/"$//;s|^\.\./||;s|^/||' | sort -u | while read -r a; do
  [ -n "$a" ] || continue
  [ -f "$a" ] || { echo "  MISSING asset referenced by a page: $a" >&2; continue; }
  mkdir -p "$STAGE/$(dirname "$a")" && cp "$a" "$STAGE/$a"
done

# ---------------------------------------------------------------------------
# 4. Report and deploy.
# ---------------------------------------------------------------------------
echo
echo "Staged $(find "$STAGE" -type f | wc -l | tr -d ' ') files · $(du -sh "$STAGE" | cut -f1)"
find "$STAGE" -type f | sed "s|$STAGE/||" | sort | sed 's/^/  /'

# Say which door is open, because the answer changes what gets deployed.
#
# There is no compiled-in password any more — sitePassword() reads SITE_PASSWORD and nothing
# else, because this repo is public and a committed default is a credential on the open
# internet. So "neither is set" stopped being a soft fallback and became a hard outage:
# middleware.js fails closed and serves 503 on every gated page, to everyone, including you.
# A real deploy refuses rather than shipping that.
#
# `vercel env ls` prints names, never values, so a SITE_PASSWORD that exists but is empty —
# the documented way to CLOSE the password door — is indistinguishable here from one that is
# set. Anything below that turns on its presence says so rather than pretending to know.
echo
# The gate can be switched off in code, in which case none of the environment variables below
# decide anything and asking about them only sends someone looking for a problem they do not
# have. web/api/_session.js is the single source of truth for both the middleware and
# /api/auth/me, so it is the honest thing to read.
if grep -q "^export const GATE_ENABLED = false" web/api/_session.js; then
  echo "  NOTE: the sign-in gate is OFF (web/api/_session.js). /internal/* and /admin/* deploy"
  echo "        PUBLIC, and no environment variable changes that. Every page behind it is"
  echo "        already tracked in this public repo, which is why that is not an exposure —"
  echo "        but do not add a genuinely private page without turning it back on first."
  ENV_LS=""; HAS_GOOGLE=0; HAS_PW=0
else
ENV_LS="$(vercel env ls production 2>/dev/null || true)"
HAS_GOOGLE=0; HAS_PW=0
printf '%s' "$ENV_LS" | grep -q GOOGLE_CLIENT_ID && HAS_GOOGLE=1
printf '%s' "$ENV_LS" | grep -q SITE_PASSWORD    && HAS_PW=1

if [ -z "$ENV_LS" ]; then
  echo "  NOTE: this project's environment variables could not be read, so the state of"
  echo "        the sign-in gate is unknown. Confirm it before trusting this deploy."
elif [ "$HAS_GOOGLE" = 0 ] && [ "$HAS_PW" = 0 ]; then
  echo "  ✘ NEITHER door is configured — no GOOGLE_CLIENT_ID, no SITE_PASSWORD." >&2
  echo "    /internal/* and /admin/* would go up dead: the middleware fails closed and" >&2
  echo "    serves 503 to everyone. Set one on the Vercel project first." >&2
  echo "    See web/README-auth.md." >&2
  [ "$MODE" = dry ] || exit 1
elif [ "$HAS_GOOGLE" = 0 ]; then
  echo "  NOTE: Google sign-in is not configured, so the internal and admin pages are"
  echo "        behind the SHARED PASSWORD. One key for everyone, and it grants admin —"
  echo "        it cannot tell an admin from anyone else. Set the Google variables, then"
  echo "        blank SITE_PASSWORD. See web/README-auth.md."
elif [ "$HAS_PW" = 1 ]; then
  echo "  NOTE: Google sign-in is configured AND SITE_PASSWORD exists. If it holds a real"
  echo "        value the shared password is accepted alongside Google, and it grants"
  echo "        admin. Set it to an empty string to close that door — this cannot tell"
  echo "        the two apart, because env values are not readable from here."
fi
fi

if [ "$MODE" = dry ]; then
  echo
  echo "Dry run — nothing deployed."
  exit 0
fi

echo
cd "$STAGE"
if [ "$MODE" = preview ]; then
  vercel deploy --yes
else
  DEPLOY_URL="$(vercel deploy --prod --yes)"
  echo "$DEPLOY_URL"
  # `vercel deploy --prod` promotes this deployment as Production, but does not
  # by itself repoint gushwork-design.vercel.app — that domain is not in this
  # team's Domains list (`vercel domains ls` shows 0), so it never picks up a
  # CLI-triggered deploy automatically the way a Git-branch deploy would. Every
  # publish before this one needed a manual `vercel alias set` afterward to make
  # the short URL match what was just shipped. Do it here so that step can't be
  # forgotten.
  vercel alias set "$DEPLOY_URL" gushwork-design.vercel.app
fi
