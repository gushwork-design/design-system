# drop-reference moved to the gushwork-design organisation

Found 9 Oct 2026. The private repo Studio reads and writes is now `gushwork-design/drop-reference`; it was
`gushwork-design-id/drop-reference`. A fine-grained token whose resource owner is the old owner gets 404 from the new
address, so Studio's requests and statuses fail until the token is replaced.

## Modified
`web/api/_drop-studio.js`: the default repo is now `gushwork-design/drop-reference` (`DROP_REFERENCE_REPO` still overrides it).
The phase 2 notice names the new repo. The webhook for push notifications, when added, goes on the new repo.

## To do outside the code
1. Create a fine-grained token with resource owner `gushwork-design`, only `drop-reference`, Contents and Issues read
   and write. Set it as `DROP_REFERENCE_TOKEN` in Vercel and redeploy.
2. Save a token for the ChatGPT task to `~/Documents/Codex/drop-secrets/gh-token` (the old one stops working) and point the
   task's clone at the new address.
