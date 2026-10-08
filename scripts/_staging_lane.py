#!/usr/bin/env python3
"""The staging lane check. Called by scripts/check-staging-lane.sh and by the PR workflow.

A teammate may add or change a page under web/internal/staging/<name>/ with no review from the
owner, because .github/CODEOWNERS leaves that folder unowned. That is only safe if the folder is
as boring as the rules say, so this is where the rules are enforced. A PR can talk a person out
of a rule; a check that fails the merge button cannot be talked out of it.

A "lane folder" is one that is new on the base branch, or that already carries a staging.json
there. Every other folder under web/internal/staging/ is a legacy page: it is listed by name in
CODEOWNERS, stays the owner's, and is not validated here.

What a lane folder must satisfy (each is a real way this has gone, or would go, wrong):
  - slug is lowercase kebab-case, so the route and the folder agree
  - staging.json names the page (title, blurb, owner) — the Staging index is built from it
  - index.html exists, carries <base href="/internal/staging/<slug>/"> (cleanUrls drops the
    trailing slash, so relative assets would resolve one level up) and a noindex robots tag
  - only static file types; no vercel.json, middleware, dotfiles or scripts that would run server-side
  - nothing deleted or renamed: removing things is the owner's call
  - no file over 8 MB, folder under 30 MB
  - no token-shaped secrets
  - no reference to the hub's /api/ or /admin/: a page here runs on design.gushwork.ai with the
    viewer's session, so a page calling those would act as whoever opens it
  - fonts pass the same check the publish runs, so one bad page cannot turn every deploy red

Exit: 0 clean (verdict printed) · 1 a lane folder breaks a rule · 2 usage error
"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STAGING = "web/internal/staging"
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
RESERVED = {"new", "api", "admin", "assets", "internal", "template", "templates", "index"}
OK_EXT = {".html", ".css", ".js", ".mjs", ".json", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif",
          ".avif", ".ico", ".mp4", ".webm", ".woff", ".woff2", ".ttf", ".txt"}
TEXT_EXT = {".html", ".css", ".js", ".mjs", ".json", ".svg", ".txt"}
BAD_NAMES = re.compile(r"^(vercel\.json|middleware\.(js|mjs|ts)|package(-lock)?\.json)$")
SECRET = re.compile(
    r"sk-ant-[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{32,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}"
    r"|xox[abprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----")
HUB_CALL = re.compile(r"""(["'`(=\s])/(api|admin)(/|["'`)\s?])""")
MAX_FILE, MAX_DIR = 8 * 1024 * 1024, 30 * 1024 * 1024


def git(*a):
    return subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True)


def main():
    base = "origin/main"
    args = sys.argv[1:]
    if args and args[0] == "--base":
        base = args[1]
    elif args:
        print(__doc__); sys.exit(2)
    if git("rev-parse", "--verify", "-q", base).returncode:
        print(f"cannot find {base}: git fetch origin first", file=sys.stderr); sys.exit(2)

    problems, notes = [], []

    # ---- 0. who owns what, from CODEOWNERS --------------------------------------------------
    co = os.path.join(ROOT, ".github/CODEOWNERS")
    owned = set()
    if os.path.exists(co):
        for line in open(co):
            parts = line.split("#")[0].split()
            if len(parts) >= 2 and parts[0].startswith(f"/{STAGING}/"):
                owned.add(parts[0][len(f"/{STAGING}/"):].rstrip("/"))
    owned_early = owned

    # ---- 1. what the PR touches ------------------------------------------------------------
    d = git("diff", "--name-status", "--no-renames", f"{base}...HEAD")
    if d.returncode:
        d = git("diff", "--name-status", "--no-renames", base)   # a merge-base-less checkout
    changes = [l.split("\t", 1) for l in d.stdout.splitlines() if "\t" in l]
    outside, folders = [], {}
    for st, p in changes:
        m = re.match(rf"^{STAGING}/([^/]+)/", p)
        if m:
            folders.setdefault(m.group(1), []).append((st, p))
        elif re.match(rf"^{STAGING}/[^/]+$", p) and os.path.basename(p) not in owned_early:
            problems.append(f"{p} is a loose file; a page goes in its own folder, {STAGING}/<name>/")
        else:
            outside.append(p)

    # ---- 2. every legacy page must be the owner's in CODEOWNERS -----------------------------
    tree = git("ls-tree", "--name-only", f"{base}:{STAGING}").stdout.split()
    lane_on_base = set()
    for name in tree:
        if git("cat-file", "-e", f"{base}:{STAGING}/{name}/staging.json").returncode == 0:
            lane_on_base.add(name)
    for name in tree:
        if name not in lane_on_base and name not in owned:
            problems.append(f"{STAGING}/{name} exists but is neither a lane page (no staging.json) nor listed "
                            f"in .github/CODEOWNERS — anyone could change it without review")

    # ---- 3. validate each lane folder the PR touches ---------------------------------------
    lane, owner_review = [], list(outside)
    for slug, files in sorted(folders.items()):
        is_new = slug not in tree
        if not is_new and slug not in lane_on_base:
            owner_review += [p for _, p in files]
            notes.append(f"`{slug}` is a legacy page, so it stays the owner's to change")
            continue
        lane.append(slug)
        rel = f"{STAGING}/{slug}"
        P = lambda msg: problems.append(f"{slug}: {msg}")
        if not SLUG.match(slug) or len(slug) > 40 or slug in RESERVED:
            P("the folder name must be lowercase-kebab-case, up to 40 characters, and not a reserved word")
        gone = [p for st, p in files if st in ("D", "T")]
        if gone:
            P("a lane PR may not delete or move files (ask the owner): " + ", ".join(gone))
        folder = os.path.join(ROOT, rel)
        present = [p for st, p in files if st != "D"]
        if not os.path.isdir(folder):
            continue

        mf = os.path.join(folder, "staging.json")
        try:
            m = json.load(open(mf))
            for k, mx in (("title", 60), ("blurb", 220), ("owner", 40)):
                v = m.get(k)
                if not isinstance(v, str) or not v.strip() or len(v) > mx:
                    P(f"staging.json needs a {k} (1 to {mx} characters)")
        except FileNotFoundError:
            P('staging.json is missing — it names the page on the Staging index: {"title","blurb","owner"}')
        except ValueError as e:
            P(f"staging.json is not valid JSON ({e})")

        ix = os.path.join(folder, "index.html")
        if not os.path.exists(ix):
            P("index.html is missing")
        else:
            h = open(ix, errors="replace").read()
            if f'<base href="/{STAGING[4:]}/{slug}/">' not in h:
                P(f'index.html needs <base href="/{STAGING[4:]}/{slug}/"> (relative assets break without it)')
            if not re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', h, re.I):
                P('index.html needs <meta name="robots" content="noindex, nofollow">')

        total = 0
        for dp, dn, fn in os.walk(folder):
            for f in fn:
                fp = os.path.join(dp, f)
                r = os.path.relpath(fp, ROOT)
                size = os.path.getsize(fp); total += size
                ext = os.path.splitext(f)[1].lower()
                if f.startswith(".") or BAD_NAMES.match(f):
                    P(f"{r[len(rel)+1:]} is not allowed here (dotfiles, vercel.json, middleware and package files are the owner's)")
                elif ext not in OK_EXT:
                    P(f"{r[len(rel)+1:]}: a {ext or 'file without an extension'} is not an allowed type")
                if size > MAX_FILE:
                    P(f"{r[len(rel)+1:]} is {size // 1048576} MB; the limit is 8 MB per file")
                if ext in TEXT_EXT:
                    t = open(fp, errors="replace").read()
                    if SECRET.search(t):
                        P(f"{r[len(rel)+1:]} contains something shaped like a secret key — remove it and rotate the key")
                    if ext != ".json" and HUB_CALL.search(t):
                        P(f"{r[len(rel)+1:]} refers to /api/ or /admin/: a page here may not call the hub's own endpoints")
        if total > MAX_DIR:
            P(f"the folder is {total // 1048576} MB; the limit is 30 MB")

        fc = subprocess.run(["bash", "scripts/check-fonts.sh", rel + "/", "--target", "hosted"],
                            cwd=ROOT, capture_output=True, text=True)
        if fc.returncode:
            P("fails the font check the publish runs:\n    " + "\n    ".join((fc.stdout + fc.stderr).strip().splitlines()[-6:]))

    # ---- 4. verdict ------------------------------------------------------------------------
    out = ["### Staging lane", ""]
    if problems:
        out += ["**Blocked.** Fix these and push again:", ""] + [f"- {x}" for x in problems]
    elif lane and not owner_review:
        out += [f"Clean. This PR only touches {', '.join('`'+s+'`' for s in lane)} under `{STAGING}/`, "
                "so it needs no review and can be merged."]
    elif lane or owner_review:
        out += ["Clean, but it needs the owner's review before it can merge. These files are outside the lane:", ""]
        out += [f"- `{p}`" for p in owner_review[:20]] + (["- …"] if len(owner_review) > 20 else [])
    else:
        out += ["No staging pages in this PR."]
    out += [""] + [f"- {n}" for n in notes]
    text = "\n".join(out)
    print(text)
    s = os.environ.get("GITHUB_STEP_SUMMARY")
    if s:
        open(s, "a").write(text + "\n")
    sys.exit(1 if problems else 0)


main()
