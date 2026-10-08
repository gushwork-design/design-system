#!/usr/bin/env bash
#
# Publish a page into your team's staging lane. Run by Claude from the design plugin; you can run it too.
#
#   bash publish-staging.sh <lane> <page> <folder>            publish ./<folder> to /internal/staging/<lane>/<page>
#   bash publish-staging.sh --check <lane> <page> <folder>    run the checks, publish nothing
#   bash publish-staging.sh login                             connect this computer (done for you the first time)
#   bash publish-staging.sh logout                            disconnect this computer
#
# FIRST TIME. There is nothing to set up. If this computer is not connected, the script prints a code and opens
# design.gushwork.ai/internal/staging/connect. You sign in as yourself, type the code, and press Connect. The script
# then keeps a personal token in ~/.config/gushwork/publish-token (90 days; `logout` revokes it). Claude should run
# `login` with a long timeout (up to 10 minutes) or in the background, and tell you to approve in the browser.
#
# WHO MAY PUBLISH WHERE is Access Control, Staging lanes, checked live on every call.
#
# The folder needs index.html and staging.json {"title","blurb","owner"}; new-staging-page.sh makes both. Up to 3 MB.
# The page is live a minute or two after it says "Committed".
set -euo pipefail

HOST="${GW_HUB:-https://design.gushwork.ai}"
TOKEN_FILE="${GW_PUBLISH_TOKEN_FILE:-$HOME/.config/gushwork/publish-token}"

usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }

CMD="publish"
case "${1:-}" in
  login|logout) CMD="$1"; shift ;;
  --check) CMD="check"; shift ;;
  -h|--help|"") usage ;;
esac

python3 - "$CMD" "$HOST" "$TOKEN_FILE" "$@" <<'PY'
import base64, json, os, subprocess, sys, time, urllib.request, urllib.error

cmd, host, token_file, *args = sys.argv[1:]

def call(op, body=None, token=None):
    headers = {"content-type": "application/json"}
    if token:
        headers["authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{host}/api/publish?op={op}", method="POST" if body is not None else "GET",
                                 data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except ValueError:
            return e.code, {"error": f"HTTP {e.code}"}
    except urllib.error.URLError as e:
        sys.exit(f"Could not reach {host}: {e.reason}")

def saved():
    try:
        return open(token_file).read().strip()
    except OSError:
        return ""

def login():
    st, d = call("device-start", {})
    if st != 200:
        sys.exit(d.get("error") or "Could not start connecting.")
    url = d["verifyUrl"]
    print(f"\nTo connect this computer, open  {url}\nsign in as yourself, and type this code:\n\n    {d['userCode']}\n")
    sys.stdout.flush()
    try:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.Popen([opener, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError:
        pass
    print("Waiting for you to approve it in the browser...", flush=True)
    deadline = time.time() + d.get("expiresIn", 600)
    while time.time() < deadline:
        time.sleep(d.get("interval", 3))
        st, p = call("device-poll", {"deviceCode": d["deviceCode"]})
        if st == 200 and p.get("status") == "approved":
            os.makedirs(os.path.dirname(token_file), exist_ok=True)
            fd = os.open(token_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w") as f:
                f.write(p["token"] + "\n")
            lanes = ", ".join(p.get("lanes", [])) or "none yet"
            print(f"\n✔ Connected as {p['email']}. You can publish to: {lanes}.")
            return p["token"]
        if st == 410:
            sys.exit("That code expired. Run it again.")
        if st >= 400 and st != 429:
            sys.exit(p.get("error") or "Connecting failed.")
    sys.exit("Timed out waiting for approval. Run it again.")

if cmd == "login":
    login(); sys.exit(0)

if cmd == "logout":
    t = saved()
    if t:
        call("logout", {}, t)
        try: os.remove(token_file)
        except OSError: pass
    print("✔ Disconnected. This computer can no longer publish."); sys.exit(0)

if len(args) != 3 or not os.path.isdir(args[2]):
    sys.exit("Usage: publish-staging.sh [--check] <lane> <page> <folder>")
lane, page, root = args
try:
    meta = json.load(open(os.path.join(root, "staging.json")))
except (OSError, ValueError):
    sys.exit('staging.json is missing or not valid JSON: {"title","blurb","owner"}')

token = saved() or login()
files = []
for dp, dn, fn in os.walk(root):
    dn[:] = [d for d in dn if d != "__pycache__"]
    for f in sorted(fn):
        if f in ("staging.json", ".DS_Store"):
            continue
        full = os.path.join(dp, f)
        files.append({"path": os.path.relpath(full, root).replace(os.sep, "/"), "b64": base64.b64encode(open(full, "rb").read()).decode()})
body = {"lane": lane, "page": page, "title": meta.get("title"), "blurb": meta.get("blurb"), "owner": meta.get("owner"), "files": files}
if len(json.dumps(body)) > 4_300_000:
    sys.exit("That is too big once encoded. The limit is about 3 MB of files. Ask the owner for anything bigger.")

op = "check" if cmd == "check" else "publish"
st, out = call(op, body, token)
if st == 401:                                   # the token was revoked or has lapsed: connect again, once
    token = login()
    st, out = call(op, body, token)
for p in out.get("problems", []):
    print(f"  ✘ {p}")
if st >= 400 or out.get("ok") is False:
    if out.get("error"): print(out["error"])
    sys.exit(1)
if op == "check":
    print(f"✔ Passes: {len(out.get('files', []))} files. Nothing was published.")
else:
    print(f"✔ {out.get('note', 'Published.')}\n  {host}{out.get('path', '')}" + (f"\n  {out['url']}" if out.get("url") else ""))
PY
