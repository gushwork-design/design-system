#!/usr/bin/env bash
#
# Post a new-component notice to the design-review Slack channel.
#
#   bash scripts/notify-slack.sh "Hi — built 1 new element while making the X lander. ..."
#   printf '%s\n' "$MSG" | bash scripts/notify-slack.sh
#
# This is the Tier 2 path described in foundation/new-component-notice.md: it removes the
# hand-relay step for anyone who is not themselves the reviewer. The Tier 1 path — the
# four-line block the person copies into Slack — stays the fallback and needs no setup.
#
# THREE THINGS THIS DELIBERATELY DOES NOT DO:
#
#   1. It never asks anyone for a webhook URL. The URL is a credential; this repo is PUBLIC,
#      so it lives in the environment and nowhere else. If GUSHWORK_SLACK_WEBHOOK is unset,
#      this exits 0 silently and the caller falls back to copy-and-paste. A missing webhook
#      is a normal state, not an error — most people running this plugin will never set one.
#
#   2. It does not decide whether sending is OK. Posting a message on someone's behalf needs
#      their explicit yes, once per session, asked by whoever is driving — not inferred by a
#      script because a variable happened to be set. The agent asks; this only delivers.
#
#   3. It never echoes the webhook URL, not even on failure. A URL in a terminal scrollback
#      is a URL in a screenshot in a Slack thread.
#
# Setup, one time, by whoever owns the Slack workspace:
#
#   1. Slack → your app (or create one) → Incoming Webhooks → Add New Webhook to Workspace
#   2. Pick the channel the design review actually happens in
#   3. export GUSHWORK_SLACK_WEBHOOK='https://hooks.slack.com/services/...'
#      (a shell profile, or the environment of whatever runs this — never a committed file)
#
# TWO WAYS TO POST, and the difference decides whether ✅ can work:
#
#   A. via api/post-notice.js  — needs GUSHWORK_NOTICE_TOKEN. The server posts with a bot
#      token and records `ts → component`, which is the ONLY way a later ✅ reaction can be
#      resolved back to what it approved. Pass --surface/--key to enable that.
#   B. via the Incoming Webhook — needs GUSHWORK_SLACK_WEBHOOK. Posts fine, returns no ts,
#      so a reaction on it cannot be matched to anything. Notification only.
#
# A is preferred when configured; B is the fallback; copy-and-paste is the fallback to that.
set -uo pipefail

SURFACE=""; KEY=""; FINGERPRINT=""; NOTICE=""; MSG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --surface)     SURFACE="${2:-}"; shift 2 ;;
    --key)         KEY="${2:-}"; shift 2 ;;
    --fingerprint) FINGERPRINT="${2:-}"; shift 2 ;;
    --notice)      NOTICE="${2:-}"; shift 2 ;;
    *)             MSG="$1"; shift ;;
  esac
done

if [ -z "$MSG" ] && [ ! -t 0 ]; then
  MSG="$(cat)"
fi

if [ -z "${MSG//[[:space:]]/}" ]; then
  echo "✘ nothing to post — pass the message as an argument or on stdin" >&2
  exit 1
fi

# ── A. the server path, which is what makes ✅ possible ─────────────────────────────────────
if [ -n "${GUSHWORK_NOTICE_TOKEN:-}" ]; then
  NOTICE_URL="${GW_NOTICE_URL:-https://gushwork-design.vercel.app/api/post-notice}"
  BODY="$(MSG="$MSG" SECRET="$GUSHWORK_NOTICE_TOKEN" SURFACE="$SURFACE" KEY="$KEY" \
          FP="$FINGERPRINT" NOTICE="$NOTICE" python3 -c '
import json, os
print(json.dumps({
    "secret":      os.environ["SECRET"],
    "text":        os.environ["MSG"],
    "surface":     os.environ.get("SURFACE", ""),
    "key":         os.environ.get("KEY", ""),
    "fingerprint": os.environ.get("FP", ""),
    "notice":      os.environ.get("NOTICE", ""),
}))' 2>/dev/null)"

  if [ -n "$BODY" ]; then
    OUT="$(printf '%s' "$BODY" | curl -sS --max-time 10 -X POST \
      -H 'content-type: application/json' --data-binary @- "$NOTICE_URL" 2>/dev/null)" || OUT=""
    case "$OUT" in
      *'"ok":true'*)
        if [ -n "$KEY" ]; then
          echo "✔ posted — react ✅ on it in Slack to approve $SURFACE/$KEY"
        else
          echo "✔ posted to the design-review channel"
        fi
        exit 0 ;;
      *)
        # Fall through to the webhook rather than failing: a notice that reaches the
        # reviewer without the ✅ shortcut beats no notice at all.
        echo "· post-notice unavailable, falling back to the webhook" >&2 ;;
    esac
  fi
fi

# ── B. the webhook path — posts, but no ts, so no ✅ ────────────────────────────────────────
if [ -z "${GUSHWORK_SLACK_WEBHOOK:-}" ]; then
  # Not an error: the overwhelmingly common case. The caller falls back to the copy block.
  echo "· GUSHWORK_SLACK_WEBHOOK not set — nothing posted, use the copy-and-paste block"
  exit 0
fi

# jq -Rn --arg does the JSON escaping, so a quote or newline in the notice cannot break the
# payload. Fall back to python3 where jq is not installed rather than hand-rolling escaping.
if command -v jq >/dev/null 2>&1; then
  PAYLOAD="$(jq -Rn --arg t "$MSG" '{text:$t}')"
elif command -v python3 >/dev/null 2>&1; then
  PAYLOAD="$(MSG="$MSG" python3 -c 'import json,os; print(json.dumps({"text": os.environ["MSG"]}))')"
else
  echo "✘ need jq or python3 to build the payload safely" >&2
  exit 1
fi

# --max-time so a hanging Slack never becomes a hanging session. -sS keeps it quiet on
# success but still prints a real transport error.
# curl's own -w writes 000 when it never got a response, so do NOT also echo a fallback on
# non-zero exit — that concatenates into "000000" and misroutes the case below.
HTTP="$(printf '%s' "$PAYLOAD" | curl -sS -o /dev/null -w '%{http_code}' \
  --max-time 10 -X POST -H 'Content-Type: application/json' \
  --data-binary @- "$GUSHWORK_SLACK_WEBHOOK" 2>/dev/null)" || true
[ -z "${HTTP//[[:space:]]/}" ] && HTTP="000"

case "$HTTP" in
  200) echo "✔ posted to the design-review channel" ;;
  000) echo "✘ could not reach Slack — use the copy-and-paste block instead" >&2; exit 1 ;;
  *)   echo "✘ Slack refused the post (HTTP $HTTP) — check the webhook is still live" >&2; exit 1 ;;
esac
