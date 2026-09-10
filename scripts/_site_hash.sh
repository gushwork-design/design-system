#!/usr/bin/env bash
# Shared site-content hash. Source this; do not run it.
#
#   . scripts/_site_hash.sh
#   site_hash                # prints one sha256, deterministic over web/ + preview/
#
# WHY THIS EXISTS
# ----------------
# publish-sheets.sh deploys the CURRENT WORKING TREE's web/ (plus preview/ rendered into
# sheets), not a commit — there is no tag, no "last published sha" recorded anywhere. So "is
# the live site current" cannot be answered from git history alone; it has to hash the same
# files a publish would actually stage. Both publish-sheets.sh (to stamp what it just shipped,
# into version.json's siteHash) and check-site.sh (to ask whether anything has moved since)
# call this, so they can never define "changed" two different ways.
#
# Deliberately over web/ + preview/ only, not the full $STAGE a publish builds. $STAGE also
# contains copied fonts, registries and a generated search index that change for reasons that
# have nothing to do with someone editing a page — hashing those would make this cry wolf.
set -uo pipefail

site_hash() {
  find web preview -type f \
    -not -path '*/__pycache__/*' \
    -print0 2>/dev/null \
  | sort -z \
  | xargs -0 shasum -a 256 \
  | shasum -a 256 \
  | awk '{print $1}'
}
