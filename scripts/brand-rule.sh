#!/usr/bin/env bash
#
# SessionStart hook — hands Claude the one rule that must hold whether or not any skill triggers.
#
# WHY THIS IS A HOOK. Skills load when Claude matches the request to a skill's description, and the
# four surface skills (web, dashboard, slides, lead-magnet) each describe a specific deliverable.
# "A Corner Watch game with the Gushwork logo" is none of them, so nothing loaded, and the result
# had the name and the blue and none of the tokens, the fonts or the real logo (30 Sep 2026). A rule
# that depends on a description matching is a rule that sometimes does not run. This one runs at
# the start of every session, so it does not depend on the request at all.
#
# It is deliberately SHORT. It states the floor and points at the skill that holds the detail; it
# does not restate the detail, because a second copy of the rules is a copy that drifts.
#
# It is its own script, not a line in check-update.sh, for the reason hooks.json gives: one hook
# emits one JSON envelope, and a broken update check must not be able to silence this.
#
# HARD RULES, same as the other hooks — this runs on someone else's machine before they can type:
#   · always exit 0      · never block      · no network      · say it once, plainly
#
# Test it by hand:   bash scripts/brand-rule.sh | python3 -m json.tool

python3 - <<'PY' 2>/dev/null || true
import json
rule = (
    "Gushwork design-system plugin — standing rule. Anything you build that shows the Gushwork name, "
    "logo or brand blue — a page, tool, game, animation, poster, banner, email or one-off, however small "
    "or playful — must use the plugin's own tokens (foundation/tokens.css), its two typefaces (Vert "
    "Grotesk Display for headings, Inter for the rest) and the real logo files (assets/logo/), never "
    "an approximation, a redrawn logo, a near-match blue or a third typeface. Use the matching surface "
    "skill when there is one (gushwork-web, gushwork-dashboard, gushwork-slides, gushwork-lead-magnet). "
    "For everything else that carries the brand, invoke the gushwork-brand skill BEFORE writing any "
    "code or markup. If the user explicitly asks for an off-brand look, do it and say in one line that "
    "it is off-system."
)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": rule}}))
PY
exit 0
