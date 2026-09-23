#!/usr/bin/env python3
"""Check that what a skill CLAIMS still matches what the repo HOLDS.

THE GAP THIS CLOSES. check-drift.sh compares a built page against the registry. Nothing
compared the skills themselves against anything. A skill is prose, and prose restates
facts — node ids, token names, file paths, counts — every one of which is a second copy
of something stored elsewhere. Re-measure a component and the exports move; the skill
keeps saying whatever was typed the day it was written, silently, and every build reads
the skill.

WHAT IT CHECKS, and only these, because only these are mechanically decidable:

  token   every --gw-* named in a skill exists in foundation/tokens.css
  path    every exports/ foundation/ skills/ templates/ assets/ path resolves
  node    every Figma node id appears somewhere in exports/ (a registry, or a spec doc)
  name    every ad-page component named in a skill matches exports/ad-page/

WHAT IT DOES NOT CHECK, deliberately. Whether the advice is still good. "Prefer
Hero/Primary for a form hero" is a judgement, and a script that pretended to verify it
would be worse than no script — it would make an unchecked claim look checked. Only a
review pass covers that, which is what scripts/review-pass.sh is for.

A node id that appears nowhere in exports/ is reported as UNVERIFIABLE rather than wrong:
plenty of real ids live only in Figma, and the repo has never claimed to mirror them all.
The point is to show how much of a skill rests on something this repo cannot confirm.

Usage:  python3 scripts/_skill_drift.py [--strict]
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# A trailing * makes it a family, not a name: `--gw-text-*` is prose for "the type
# ramp" and there is no such property. Matching it reported a wrong claim on every
# skill that talks about a group of tokens, which is all of them.
TOKEN = re.compile(r"--gw-[a-z0-9-]+(?!\*)(?![a-z0-9-])")

# Not preceded by a digit or a dot, or every contrast ratio in the file reads as a node
# id — `1.23:1` yielded `23:1`, `1.00:1` yielded `00:1`. Both skills discuss contrast at
# length, so this was the single largest source of noise.
NODE = re.compile(r"(?<![\d.])\d{1,5}:\d{1,6}\b")

# `web/` is deliberately absent. Skills use it for Figma PAGE names — `↳ web/ads/og-image`,
# `↳ web/ pattern-library` — far more often than for a file in this repo, and a checker
# that reports a page name as a missing file is one nobody will keep running.
PATH = re.compile(r"\b(?:exports|foundation|skills|templates|scripts|assets)/"
                  r"[A-Za-z0-9._*/-]+")


def tokens_css():
    css = open(os.path.join(ROOT, "foundation", "tokens.css"), encoding="utf-8").read()
    return {m.group(1) for m in re.finditer(r"^\s*(--gw-[a-z0-9-]+)\s*:", css, re.M)}


def exports_blob():
    """Everything under exports/, concatenated. Node ids are looked up here rather than
    parsed per-file: an id is legitimate if the repo records it ANYWHERE, and which file
    it sits in is not the skill's claim."""
    out = []
    for dirpath, _, files in os.walk(os.path.join(ROOT, "exports")):
        for f in files:
            if f.endswith((".md", ".json")):
                out.append(open(os.path.join(dirpath, f), encoding="utf-8",
                                errors="ignore").read())
    return "\n".join(out)


def ad_page_names():
    names = set()
    for fn in ("folds.json", "built-here.json"):
        p = os.path.join(ROOT, "exports", "ad-page", fn)
        if os.path.isfile(p):
            for c in json.load(open(p, encoding="utf-8"))["components"]:
                names.add(c["name"])
                names.add(c["key"])
    return names


def check(path, toks, blob, adnames):
    src = open(path, encoding="utf-8").read()
    rel = os.path.relpath(path, ROOT)
    bad, warn = [], []

    for t in sorted(set(TOKEN.findall(src))):
        if t not in toks:
            bad.append(("token", t, "not in foundation/tokens.css"))

    # Resolved against the repo root AND the skill's own directory: a skill writes
    # `templates/case-study/` meaning its own templates/, which is correct and which a
    # root-only check calls missing.
    here = os.path.dirname(path)
    for p in sorted(set(PATH.findall(src))):
        clean = p.rstrip("/.,)")
        # A glob names a directory's contents, so check the directory. Stripping "/*"
        # textually turned `exports/dashboard/*.md` into `exports/dashboard.md` — a file
        # that has never existed — and reported the skill wrong for a correct claim.
        probe = os.path.dirname(clean) if "*" in os.path.basename(clean) else clean
        if any(os.path.exists(os.path.join(base, probe)) for base in (ROOT, here)):
            continue
        # Without an extension it may be a Figma page or a URL route rather than a file;
        # say so rather than asserting it is wrong.
        if os.path.splitext(probe)[1]:
            bad.append(("path", clean, "does not resolve"))
        else:
            warn.append(("path", clean, "no such file or directory — may be a Figma page"))

    for n in sorted(set(NODE.findall(src))):
        if n not in blob:
            warn.append(("node", n, "appears nowhere in exports/ — cannot be confirmed"))

    # Ad-page names are quoted in backticks in the skill; only those are checked, because
    # only that surface has a machine-readable name list.
    for m in re.finditer(r"`(Folds / [^`]+|Footers / [^`]+|Atoms / [^`]+)`", src):
        if m.group(1) not in adnames:
            bad.append(("name", m.group(1), "no such component in exports/ad-page/"))

    return rel, bad, warn


def main(argv):
    toks, blob, adnames = tokens_css(), exports_blob(), ad_page_names()
    skills = sorted(
        os.path.join(ROOT, "skills", d, "SKILL.md")
        for d in os.listdir(os.path.join(ROOT, "skills"))
        if os.path.isfile(os.path.join(ROOT, "skills", d, "SKILL.md")))

    n_bad = n_warn = 0
    for s in skills:
        rel, bad, warn = check(s, toks, blob, adnames)
        n_bad += len(bad); n_warn += len(warn)
        if not bad and not warn:
            print(f"✔ {rel} — every token, path and node it names checks out")
            continue
        print(f"\n{rel}")
        for kind, val, why in bad:
            print(f"  ✘ {kind:5} {val:44} {why}")
        for kind, val, why in warn:
            print(f"  ~ {kind:5} {val:44} {why}")

    print(f"\n{n_bad} wrong · {n_warn} unverifiable across {len(skills)} skills")
    if n_bad:
        print("A wrong claim is a skill telling every build something this repo contradicts.")
    if n_warn:
        print("Unverifiable is not wrong — it is a claim resting on Figma, which this repo")
        print("does not mirror. Worth knowing how much of a skill does.")
    return 1 if (n_bad and "--strict" in argv) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
