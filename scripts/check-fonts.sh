#!/usr/bin/env bash
#
# Is this build allowed to render in the face it renders in?
#
#   bash scripts/check-fonts.sh <file> --target repo|local|hosted|sandbox|slides
#   bash scripts/check-fonts.sh <dir>/ --target hosted        # every html/jsx beneath it
#
# WHY THIS EXISTS
# ---------------
# "It rendered in Inter" is the most-reported drift and the least useful report, because it is
# sometimes a defect and sometimes the only legal outcome — and until foundation/output-targets.md
# grew its per-target table, nothing said which. A rule that is right half the time gets followed
# at random. This is that table, executable.
#
# THE CHECK THAT MATTERS is not "which font is named". It is whether a build NAMES the display
# face and then never LOADS it. That combination renders in the fallback while looking correct in
# source, which is exactly how this ships unnoticed. Everything else here is bookkeeping.
#
# IT ALSO RESOLVES THE FILE. A declared @font-face whose .ttf was never committed is the worst
# version of this bug: correct in source, wrong on screen, forever, with nothing to notice it.
# Found exactly that in a live tool on 15 Sep 2026 — shipped for months in a fallback. Relative
# urls are checked against disk; absolute ones are assumed served by the deploy.
#
# WHAT IT STILL CANNOT DO. It reads source, not pixels, so a path that resolves on disk but 404s
# in production still passes. output-targets.md says to confirm by measuring rendered text width,
# and that remains the only real proof. This catches the cheap parts early.
#
# Exit: 0 every file allowed · 1 at least one violation · 2 usage error
set -uo pipefail

TARGET=""
PATHS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) PATHS+=("$1"); shift ;;
  esac
done

case "$TARGET" in
  repo|local|hosted|sandbox|slides) ;;
  "") echo "✘ --target is required. One of: repo local hosted sandbox slides" >&2
      echo "  See the table in foundation/output-targets.md." >&2; exit 2 ;;
  *)  echo "✘ unknown target '$TARGET'. One of: repo local hosted sandbox slides" >&2; exit 2 ;;
esac
[ "${#PATHS[@]}" -gt 0 ] || { echo "✘ give a file or directory to check" >&2; exit 2; }

command -v python3 >/dev/null 2>&1 || { echo "✘ python3 is required" >&2; exit 1; }

python3 - "$TARGET" "${PATHS[@]}" <<'PY'
import os, re, sys

target, paths = sys.argv[1], sys.argv[2:]

DISPLAY = "vert grotesk"
EXT = (".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".css")

def files(p):
    if os.path.isfile(p):
        return [p]
    out = []
    for dirpath, dirnames, filenames in os.walk(p):
        dirnames[:] = [d for d in dirnames
                       if d not in (".git", "node_modules", "dist", "build", "__pycache__")]
        out += [os.path.join(dirpath, f) for f in filenames if f.endswith(EXT)]
    return out

# A page routinely NAMES the face inline and LOADS it from a stylesheet it links. Judging the
# page alone calls that a violation, which is wrong and was caught by running this against a real
# tool rather than against this repo. So a document is judged on itself plus every local
# stylesheet it pulls in. Remote sheets are ignored: a Gushwork face never legitimately arrives
# from someone else's CDN.
LINK = re.compile(r'<link[^>]+href=["\']([^"\':]+\.css)(?:\?[^"\']*)?["\']', re.I)

def with_linked_css(path, text):
    if not path.lower().endswith((".html", ".htm")):
        return text
    base = os.path.dirname(path)
    extra = []
    for href in LINK.findall(text):
        if href.startswith("//"):
            continue
        cand = os.path.normpath(os.path.join(base, href.lstrip("/")))
        try:
            extra.append(open(cand, encoding="utf-8", errors="ignore").read())
        except OSError:
            pass
    return text + "\n".join(extra)


FACE_URL = re.compile(r"@font-face\s*{[^}]*?url\(['\"]?([^'\")]+)", re.S | re.I)

def missing_face_files(path, text):
    """Relative @font-face urls that point at nothing on disk. Absolute urls (/fonts/...) are
    served by the deploy rather than sitting beside the file, so they are out of scope here."""
    base = os.path.dirname(path)
    out = []
    for u in FACE_URL.findall(text):
        if u.startswith(("/", "http://", "https://", "data:")):
            continue
        if not os.path.exists(os.path.join(base, u)):
            out.append(u)
    return out


def look(text):
    low = text.lower()
    return {
        "names":   DISPLAY in low,
        # first in some font stack, i.e. actually asked for rather than merely mentioned
        "first":   bool(re.search(r'font-family\s*:\s*["\']?vert grotesk', low)) or
                   bool(re.search(r'--[a-z-]*(display|font)[a-z-]*\s*:\s*["\']?vert grotesk', low)),
        # any route by which the real file could arrive
        "loads":   bool(re.search(r'@font-face', low)) and "vert" in low
                   or "next/font/local" in low
                   or bool(re.search(r'src\s*:\s*url\([^)]*vert', low)),
        "google":  "fonts.googleapis.com" in low,
        "jakarta": "plus jakarta" in low,
        "systemui": bool(re.search(r'font-family\s*:\s*["\']?(system-ui|-apple-system)', low)),
        # The system's own idiom: name nothing inline, defer to the font tokens. A file doing
        # this is doing it right, and an earlier version of this check called it a violation —
        # which is how a checker earns the right to be ignored.
        "tokenref": bool(re.search(r'var\(--gw-font', low)),
        "tokencss": "tokens.css" in low,
        # A self-contained page may define the font tokens inline instead of linking the
        # sheet. That resolves just as well, and calling it a violation was the second false
        # positive this check produced before it was allowed anywhere near a build.
        "tokendef": bool(re.search(r'--gw-font[a-z-]*\s*:', low)),
    }

# One rule per row of the table in foundation/output-targets.md.
# `fragment` is anything that is not a document — a stylesheet, a component, a module. It cannot
# link a stylesheet, so whether the face resolves is a question about the page that includes it,
# never about the fragment itself. Judging fragments alone produced two separate false-positive
# classes before this existed, and a check that cries wolf is one that gets muted.
def verdict(t, f, fragment=False):
    if t in ("repo", "local", "hosted"):
        if f["tokenref"]:
            if fragment:
                return True, "a fragment that defers to the font tokens — resolved by its host page"
            if not (f["tokencss"] or f["tokendef"]):
                return False, ("uses the --gw-font tokens but neither links tokens.css nor "
                               "defines them, so each resolves to nothing and the page renders "
                               "unstyled")
            return True, "defers to the font tokens, and they resolve — the system's own idiom"
        if not f["names"]:
            return False, "does not name the display face at all — this target must use it"
        if not f["loads"]:
            if fragment:
                return True, ("a fragment naming the display face — loading it belongs to the "
                              "page that includes this")
            return False, ("names the display face but nothing it links ever loads it, so it "
                           "renders in the fallback while looking correct in source")
        return True, "names and loads the display face"
    if t == "sandbox":
        if f["loads"]:
            return False, ("tries to load a local face — a sandboxed page cannot fetch one, so "
                           "this fails silently. Name it in the stack and let Inter serve")
        if not f["first"]:
            return False, ("should still name the display face first in the stack so it resolves "
                           "on a machine that has it")
        if not f["google"]:
            return False, "no Google Fonts stylesheet — Inter will not load either"
        return True, "names the display face first, serves Inter — the only legal shape here"
    if t == "slides":
        if not f["names"]:
            return False, "does not name the display face"
        if not f["jakarta"]:
            return False, "no Plus Jakarta fallback — R21 requires it, every export substitutes"
        return True, "display face first with the Plus Jakarta fallback — R21"
    return True, ""

checked = bad = 0
for p in paths:
    for f in sorted(files(p)):
        try:
            text = open(f, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        # A file that never mentions type is inheriting it from somewhere else. That is not a
        # font decision and flagging it is noise, which is the fastest way to get a check muted.
        low = text.lower()
        if not any(k in low for k in
                   ("font-family", "var(--gw-font", "@font-face", "next/font")):
            continue
        checked += 1
        is_doc = f.lower().endswith((".html", ".htm"))
        gone = missing_face_files(f, text)
        if gone:
            bad += 1
            print(f"  ✘ {os.path.relpath(f)}\n      declares @font-face for a file that is not "
                  f"there: {', '.join(gone)} — renders in the fallback and always will")
            continue
        ok, why = verdict(target, look(with_linked_css(f, text)), fragment=not is_doc)
        rel = os.path.relpath(f)
        if ok:
            print(f"  ✔ {rel} — {why}")
        else:
            bad += 1
            print(f"  ✘ {rel}\n      {why}")

print()
if not checked:
    print("No files carrying a font declaration were found.")
    sys.exit(0)
if bad:
    print(f"{bad} of {checked} file(s) disagree with the '{target}' row of the table in")
    print("foundation/output-targets.md. Fix the build, or check it against the row it")
    print("really belongs to — do not relax the table.")
    sys.exit(1)
print(f"✔ {checked} file(s) all match the '{target}' row.")
PY
