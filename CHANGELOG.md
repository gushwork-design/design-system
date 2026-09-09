# Changelog

Every released version, newest first. **Generated from git history** by
`scripts/changelog.sh` — do not edit by hand, the next release will overwrite it.
`preview/changelog-sheet.html` is the same data rendered as a sheet; both come from
`scripts/_releases.sh`, so they cannot disagree.

A release is **a commit that moved the `version` field in `.claude-plugin/plugin.json`** —
the field `plugin update` compares. Not a commit subject: subjects are a convention that
started at v1.19.0, and deriving from them dropped 23 releases including v1.20.0.

`Session` is the chat the change came from — a `claude://resume/<uuid>` deep link that
reopens that conversation in the Claude desktop app, recorded as a `Session:` trailer on
the release commit.

**The link only resolves on the machine holding the transcript.** It is a pointer for the
maintainer, not something a teammate can follow — for everyone else the commit link is the
one that works. Entries before the trailer convention are backfilled from first-hand
knowledge only; an em dash means nobody could vouch for it.

To check what you are running: the skill announces its own version and date at the start of
every session. Trust that line over memory — it is stamped into the file, so **a stale copy
reports its own stale date.**

| Version | Date | What changed | Commit | Session |
|---|---|---|---|---|
| **v1.44.0** | 01 Sep 2026 19:53 | the plugin moves to design@gushwork.ai, and drift notices reach every surface | [`19e58c9`](https://github.com/gushwork-design/design-system/commit/19e58c95ae920d254f400ef7e749acf6449f99ef) | [Moving the plugin to design@gushwork.ai](claude://resume/5cf1ed9e-d859-496e-a0c8-0b4a15563507) |
| **v1.43.0** | 01 Sep 2026 14:55 | the lead-magnet skill, and a stamp that can see it | [`2aaed30`](https://github.com/gushwork-design/design-system/commit/2aaed30fc364ed536a23e2a6fefa032058795e6b) | [Can AI find your business — lead magnet PDF](claude://resume/3d40ae5b-83e5-4492-9851-6fa5fd6cd690) |
| **v1.42.0** | 28 Aug 2026 14:04 | the unavailable state, and a doc that pointed at nothing | [`6aadb8b`](https://github.com/gushwork-design/design-system/commit/6aadb8bf59783e607318cf349541eaa59c7beb34) | [Gushwork design plugin fails to load](claude://resume/59c33991-9d00-4350-80e6-a4ccfe4ff66b) |
| **v1.41.1** | 28 Aug 2026 10:43 | the plugin loads again: drop the duplicate hooks declaration | [`3d44b20`](https://github.com/gushwork-design/design-system/commit/3d44b207153d058832722cc146f30111d80100ff) | [Gushwork design plugin fails to load](claude://resume/59c33991-9d00-4350-80e6-a4ccfe4ff66b) |
| **v1.41.0** | 26 Aug 2026 13:20 | updates that find you, a public version manifest, and a one-line install | [`f194df8`](https://github.com/gushwork-design/design-system/commit/f194df864fa5b34c5eb37b0754fa2b43e2409aab) | [Learning from shadcn's install and update model](claude://resume/79ae8e54-cda3-4da9-9b12-c5875098cfcc) |
| **v1.40.0** | 26 Aug 2026 12:23 | responsive dashboards, the phone shell, and three live bugs | [`7d4b9d6`](https://github.com/gushwork-design/design-system/commit/7d4b9d63ba32067a4efd7db0a68c22cd707a58c9) | — |
| **v1.39.0** | 15 Aug 2026 19:29 | the Figma comment pass, three new components, and drift notices | [`cb4b177`](https://github.com/gushwork-design/design-system/commit/cb4b177e07a76e305df3798be3335d91ac863f0b) | [Gushwork dashboard component sheet and GTM build](claude://resume/1d76ea71-a078-4d02-a629-cbbfe1407b30) |
| **v1.38.0** | 14 Aug 2026 14:40 | dashboard v2 component set, measured from the shipped screens | [`3b880f1`](https://github.com/gushwork-design/design-system/commit/3b880f18a13f36db951026d1066710d654bb69a6) | — |
| **v1.37.0** | 11 Aug 2026 18:39 | the brand badge is the library badge, Small | [`30203b9`](https://github.com/gushwork-design/design-system/commit/30203b95ec01f739f1b93ca31b5b03d75dc869c2) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.36.0** | 11 Aug 2026 18:35 | the brand badge sits beside the title, not at the far edge | [`650fe02`](https://github.com/gushwork-design/design-system/commit/650fe02745e4768e5cc74802eba2dd072463bcdb) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.35.0** | 11 Aug 2026 18:31 | links that leave the page open in a new tab | [`f3635db`](https://github.com/gushwork-design/design-system/commit/f3635dbad93e3f2b5c6ede6d96d72afc77ccdd3e) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.34.0** | 11 Aug 2026 18:28 | the index has a scrollbar gutter, and the brand moves to a badge | [`57e8cdd`](https://github.com/gushwork-design/design-system/commit/57e8cddf90b71ff896fd15e8ece5b582d7448b89) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.33.0** | 11 Aug 2026 18:24 | the header says what this is, and the mark is the app icon | [`e1767bc`](https://github.com/gushwork-design/design-system/commit/e1767bceeb91bcaf7a699c9c0fdd5de79a1e3eca) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.32.0** | 11 Aug 2026 18:11 | the sheets carry the Gushwork mark, and the index follows the read | [`dbebdfc`](https://github.com/gushwork-design/design-system/commit/dbebdfc0f77b0e4ba8d87816ddf57c73ff3dd37b) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.31.0** | 11 Aug 2026 17:53 | the changelog sheet is a reading page, not a table | [`8023f6e`](https://github.com/gushwork-design/design-system/commit/8023f6e39a1e9e7c1372a129613be984664c7bbd) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.30.0** | 11 Aug 2026 13:21 | the sheets are hosted, and publishing is one command | [`bd1aef2`](https://github.com/gushwork-design/design-system/commit/bd1aef27385099265cd9ede90119adc5b1b2c9f1) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.29.1** | 11 Aug 2026 13:17 | the login screen's Continue arrow was a layer name, not a path | [`ab41ec7`](https://github.com/gushwork-design/design-system/commit/ab41ec739ea97b80fca63cb4cb361e5d94273082) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.29.0** | 08 Aug 2026 18:34 | the changelog is a sheet, and a release is a version bump | [`76ab96d`](https://github.com/gushwork-design/design-system/commit/76ab96d5ad81f1ec8aa79510fd6615b570b07310) | [Changelog sheet](claude://resume/bea0dbdb-01ec-4ba8-b87d-473775b0cec7) |
| **v1.28.1** | 08 Aug 2026 18:06 | fall back to the backfill table when a trailer has no uuid | [`5a8df70`](https://github.com/gushwork-design/design-system/commit/5a8df70cce32dde46da01cfdabdc9cbae07972b5) | [Gushwork Design System plugin](claude://resume/5a7c696b-5bbf-4aee-adf8-603e744f9018) |
| **v1.28.0** | 08 Aug 2026 18:05 | the Session column is a claude://resume deep link | [`6388221`](https://github.com/gushwork-design/design-system/commit/6388221e9e506db19c6281d1165ff0c41f24ad16) | [Gushwork Design System plugin](claude://resume/5a7c696b-5bbf-4aee-adf8-603e744f9018) |
| **v1.27.0** | 08 Aug 2026 17:59 | a derived changelog, so multi-chat releases stay traceable | [`732d4df`](https://github.com/gushwork-design/design-system/commit/732d4dff9b864016028460b97ae381bc268fd624) | [Gushwork Design System plugin](claude://resume/5a7c696b-5bbf-4aee-adf8-603e744f9018) |
| **v1.26.0** | 08 Aug 2026 17:50 | the creator stamp carries a time, and the login screen's build rules | [`499cdde`](https://github.com/gushwork-design/design-system/commit/499cdde30f8d32b21cbff129a906a42c775da22d) | [Website performance dashboard](claude://resume/5eeaa384-81a5-460f-8fff-20a987090035) |
| **v1.25.0** | 08 Aug 2026 17:40 | R12/R13: the login screen's text props have jobs, and the subtext is two lines | [`bdfa56a`](https://github.com/gushwork-design/design-system/commit/bdfa56ac2a1af971479edc8be9f7aacad18b0608) | [Website performance dashboard](claude://resume/5eeaa384-81a5-460f-8fff-20a987090035) |
| **v1.24.1** | 08 Aug 2026 17:08 | stamp the mirror-divergence guard so it actually propagates | [`d8c6bb8`](https://github.com/gushwork-design/design-system/commit/d8c6bb82267a94a5d8152ec7dd5935aa22fe4f80) | [Gushwork Design System plugin](claude://resume/5a7c696b-5bbf-4aee-adf8-603e744f9018) |
| **v1.24.0** | 08 Aug 2026 14:05 | the dashboard surface is fully measured | [`8a77366`](https://github.com/gushwork-design/design-system/commit/8a77366a9bb98c52220057109ee003f4af33154d) | [Gushwork Design System plugin](claude://resume/5a7c696b-5bbf-4aee-adf8-603e744f9018) |
| **v1.23.0** | 08 Aug 2026 13:59 | six more dashboard components measured; chart palette blocker resolved | [`281a606`](https://github.com/gushwork-design/design-system/commit/281a6062579a00f318e6e762df475e3acb18953a) | [Gushwork Design System plugin](claude://resume/5a7c696b-5bbf-4aee-adf8-603e744f9018) |
| **v1.22.0** | 08 Aug 2026 13:43 | lock in every open decision; promote the text field to a shared atom | [`49f980b`](https://github.com/gushwork-design/design-system/commit/49f980b5e265631985af7f908b3c92bdc206a4ba) | [Gushwork Design System plugin](claude://resume/5a7c696b-5bbf-4aee-adf8-603e744f9018) |
| **v1.21.0** | 08 Aug 2026 13:23 | re-measure the login screen, correct all three Button hover values | [`8de9b9b`](https://github.com/gushwork-design/design-system/commit/8de9b9b85cfef0c8579f18714ed454b3b8ba31c5) | [Gushwork Design System plugin](claude://resume/5a7c696b-5bbf-4aee-adf8-603e744f9018) |
| **v1.20.0** | 08 Aug 2026 12:48 | Add dashboard-login-screen — 3 variants, measured off all three symbols | [`5c2d3b4`](https://github.com/gushwork-design/design-system/commit/5c2d3b495e632043c791ee88fbc3da01b53a77e3) | — |
| **v1.19.0** | 07 Aug 2026 22:24 | lock in the rulings, fixes and components from the website-performance build | [`9af4649`](https://github.com/gushwork-design/design-system/commit/9af46490b7be124ec8c6bab69bb7fc70c02345f8) | [Website performance dashboard](claude://resume/5eeaa384-81a5-460f-8fff-20a987090035) |
| **v1.18.0** | 07 Aug 2026 20:47 | Put the measured traps in the skill — after correcting three of them | [`3eb5b21`](https://github.com/gushwork-design/design-system/commit/3eb5b219bee251e34cfdcea74109138cf9b514ba) | — |
| **v1.17.0** | 07 Aug 2026 20:38 | Measure section/header and re-verify the dashboard-build coordinates | [`d857ed4`](https://github.com/gushwork-design/design-system/commit/d857ed4173cc83e45d3b836f85e66e3e1c928b1b) | — |
| **v1.16.0** | 07 Aug 2026 20:32 | Re-measure dashboard Button, progress-bar and user-card — nine of nine wrong | [`c734e92`](https://github.com/gushwork-design/design-system/commit/c734e92300d3ddac07af908455e7eb7ff10fe7a5) | — |
| **v1.15.0** | 07 Aug 2026 20:28 | Re-measure six dashboard components off their sets — all six were wrong | [`ffe8a1e`](https://github.com/gushwork-design/design-system/commit/ffe8a1e9a3403c744c6e3c41842bdb04739413bf) | — |
| **v1.14.0** | 07 Aug 2026 20:13 | Measure the last four dashboard components, fix table-row columns | [`1ef99f5`](https://github.com/gushwork-design/design-system/commit/1ef99f5085111baa9c2260dc7faa6eb26a6dbf3c) | — |
| **v1.13.2** | 07 Aug 2026 20:07 | Fix toast: padding was inverted, error fill wrong, half the set missing | [`3ad6616`](https://github.com/gushwork-design/design-system/commit/3ad6616a232780becacb8f30613d56bfde8d732f) | — |
| **v1.13.1** | 07 Aug 2026 20:03 | Draw the admin avatar and all five Colors | [`cedf644`](https://github.com/gushwork-design/design-system/commit/cedf644b7086deaa0f3dc955b256c28b7820ba04) | — |
| **v1.13.0** | 07 Aug 2026 20:01 | Draw the whole dashboard surface — 20 components | [`5076463`](https://github.com/gushwork-design/design-system/commit/507646360627c715003b468bf3070a060bd4975f) | — |
| **v1.12.1** | 07 Aug 2026 18:37 | Fix list-item weights at the source, and use the real logo symbol | [`791d917`](https://github.com/gushwork-design/design-system/commit/791d9170c17a7ae78d6660310bd7cd57b0cec779) | — |
| **v1.12.0** | 07 Aug 2026 18:32 | Draw the remaining dashboard elements and a full sample screen | [`56f9360`](https://github.com/gushwork-design/design-system/commit/56f9360bdb5e2f6ed79e6f320b0188b2d7ce6a2e) | — |
| **v1.11.0** | 07 Aug 2026 18:11 | Draw the dashboard surface, and account for every remaining set | [`bc28d27`](https://github.com/gushwork-design/design-system/commit/bc28d27de275a4704cd20f51fbdecf45fcf076c4) | — |
| **v1.10.0** | 07 Aug 2026 17:50 | Organise the review sheet by Figma's hierarchy, add nav, require new work on it | [`aafdd7d`](https://github.com/gushwork-design/design-system/commit/aafdd7d9b602a30d8d76c734526cbf177b7449c3) | — |
| **v1.9.0** | 07 Aug 2026 16:36 | Measure badge and Button, and transcribe all ten sets of usage rules | [`e7c8ced`](https://github.com/gushwork-design/design-system/commit/e7c8cedff1d9dc8520795bc4d316d150c7bc4d6f) | — |
| **v1.8.0** | 07 Aug 2026 16:31 | Read web/ component-library for the first time — 23 sets, 525 variants | [`f2ddb53`](https://github.com/gushwork-design/design-system/commit/f2ddb538a60b4a4a81b1ac69341743aca0a21450) | — |
| **v1.7.0** | 07 Aug 2026 16:26 | Measure AI Agents and Hero — all 12 folds now done | [`dd2c723`](https://github.com/gushwork-design/design-system/commit/dd2c723af3e4a19fd4a92a870fa623463b07cd61) | — |
| **v1.6.0** | 07 Aug 2026 16:14 | Figma is authoritative: stop correcting measured values, and measure four more | [`5a274c2`](https://github.com/gushwork-design/design-system/commit/5a274c2a4b6af3c47a2e2e304f4e3d7260c8cf50) | — |
| **v1.5.0** | 07 Aug 2026 16:11 | Measure Testimonial and Timeline internals | [`d487605`](https://github.com/gushwork-design/design-system/commit/d487605cadcc23125b4e30d7186eee219bcb5890) | — |
| **v1.4.0** | 07 Aug 2026 16:07 | Measure all 12 folds, and correct what the annotations got wrong | [`94d9c7e`](https://github.com/gushwork-design/design-system/commit/94d9c7e102baa3d208056d8875d49cab3e2d36a8) | — |
| **v1.3.0** | 07 Aug 2026 16:02 | Measure the web pattern library, and fix letter-spacing system-wide | [`d7299f5`](https://github.com/gushwork-design/design-system/commit/d7299f58f631766bddcd4104eeb2346baca162be) | — |
| **v1.2.0** | 07 Aug 2026 15:52 | Make each skill report its own version and date | [`364eeb1`](https://github.com/gushwork-design/design-system/commit/364eeb13153cd5289e7353eeedcfdde0d3e278a7) | — |
| **v1.1.0** | 06 Aug 2026 17:57 | Make the plugin installable and shareable | [`bc46597`](https://github.com/gushwork-design/design-system/commit/bc465978ca515115a132bf4af2328d397b8f0979) | — |
| **v1.0.0** | 06 Aug 2026 09:35 | Add Gushwork design system as a Claude Code plugin | [`4a36d48`](https://github.com/gushwork-design/design-system/commit/4a36d4847d61cf5990f1ff28627a8308d5d3ecb2) | — |
