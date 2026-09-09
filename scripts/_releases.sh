#!/usr/bin/env bash
# Shared release derivation. Source this; do not run it.
#
#   . scripts/_releases.sh
#   releases | while IFS=$'\x1f' read -r version sha date summary session; do ... done
#
# WHY THIS EXISTS
# ---------------
# `changelog.sh` derives releases from the commit SUBJECT — a row for every commit whose
# subject starts `vX.Y.Z`. That convention only began at v1.19.0, so the first eighteen
# releases were never listed, and **v1.20.0 (the login screen) is missing** because its
# commit was titled "Add dashboard-login-screen — …" instead. Eleven rows for
# thirty-three releases.
#
# The version field in `.claude-plugin/plugin.json` is what `plugin update` actually
# compares. It is the ground truth for "did this ship", and a subject line is not. So a
# release here is **a commit where that field changed** — nothing else counts, and nothing
# that shipped can be left out by writing a commit message the wrong way.
#
# Records are newest-first, one per line, fields split on US (0x1f).
set -euo pipefail

REPO="https://github.com/gushwork-design/design-system"
MANIFEST=".claude-plugin/plugin.json"

# Releases that predate the Session: trailer. Attribution is FIRST-HAND ONLY — transcript
# greps are unreliable, because forked sessions duplicate each other's history and a mention
# reads as authorship. Anything not listed stays blank, including every release before
# v1.19.0 and v1.20.0 itself. A blank cell means nobody could vouch for it; it does not mean
# the work had no session.
backfill() {
  case "$1" in
    1.21.0|1.22.0|1.23.0|1.24.0|1.24.1|1.27.0)
      echo "5a7c696b-5bbf-4aee-adf8-603e744f9018 Gushwork Design System plugin" ;;
    1.19.0|1.25.0|1.26.0)
      echo "5eeaa384-81a5-460f-8fff-20a987090035 Website performance dashboard" ;;
    *) echo "" ;;
  esac
}

# Read the version field out of the manifest as it stood at a given commit.
version_at() {
  git show "$1:$MANIFEST" 2>/dev/null \
    | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    | head -1
}

# The commit body, newlines encoded as RS (0x1e) so a record stays one line. The `Session:`
# trailer is dropped — it already has its own field, and it is metadata, not a change.
# Never widen this to `%B`: chat CONTENT must not reach a public repo, and the body is the
# one field an author writes freely.
# Trailing RS is left on; the consumer strips it. `\036` is octal — BSD tr does NOT
# understand `\x1e` and would silently translate the literal characters `e`, `x` and `1`
# instead, which shredded every body the first time this was written.
body_at() {
  git log -1 --format='%b' "$1" \
    | sed '/^Session:[[:space:]]/d' \
    | tr '\n' '\036'
}

# Oldest-first, so each version can be compared against the one before it, then reversed.
releases_asc() {
  git log --reverse --format='%H%x1f%ad%x1f%s%x1f%(trailers:key=Session,valueonly,separator=%x2c)' \
          --date=format:'%d %b %Y %H:%M' -- "$MANIFEST" \
  | {
      prev=""
      while IFS=$'\x1f' read -r sha date subject session; do
        [ -z "${sha:-}" ] && continue
        version="$(version_at "$sha")"
        # The manifest also changes for description and keyword edits. Only a moved
        # version field is a release.
        [ -z "$version" ] && continue
        [ "$version" = "$prev" ] && continue
        prev="$version"

        # `v1.27.0 — what changed` -> `what changed`. Untitled releases keep the whole
        # subject, which is the only summary they have.
        summary="${subject#v$version — }"
        [ "$summary" = "$subject" ] && summary="${subject#v$version }"

        # The trailer wins when it carries a uuid; otherwise fall back to the table.
        case "${session:-}" in
          [0-9a-f]*-[0-9a-f]*-*) ;;
          *) session="$(backfill "$version")" ;;
        esac

        printf '%s\x1f%s\x1f%s\x1f%s\x1f%s\x1f%s\n' \
          "$version" "$sha" "$date" "$summary" "$session" "$(body_at "$sha")"
      done
    }
}

# Newest-first. `sed '1!G;h;$!d'` is the portable line reverser — `tac` is GNU-only and
# `tail -r` is BSD-only, and this repo is built on both.
releases() { releases_asc | sed '1!G;h;$!d'; }
