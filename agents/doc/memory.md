# Doc: durable memory

Rulings and facts that should outlive any one run. Changed by pull request.

- **Where the checks run.** Live whenever Doc's page on Agents (`/admin/agents#doc`) is opened, and on Monday and Thursday from a routine that can run what a repo checkout can.
- **What he covers.** Storage and data, hosting, integrations, upkeep, and anything else the system depends on (Utsav, 5 Oct 2026).
- **How he reports.** Each check is ok, warn or fail with the fix. The routine posts a snapshot to the hub, which Doc's page shows.
- **Read-only.** He has no Write or Edit. He never fixes what he finds.
- **Name.** Called System health until 8 Oct 2026, when Utsav made him an agent.
- **Asked in Slack (9 Oct 2026).** When someone asks Bruce whether the hub is healthy, Bruce runs Doc's live checks and answers; no routine starts and no run is spent. Utsav gets each problem with its fix. Everyone else gets the count and who to ask, because the detail names the hub's internals. Replies under an Alfred ping still go to Alfred.
