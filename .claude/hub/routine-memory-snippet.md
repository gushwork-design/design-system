# Paste into each routine prompt (nightly, rework, health)

Put this paragraph near the top of the prompt, before the HARD RULES. It is read-only context, so it adds no permissions and no work.

PROJECT MEMORY. After git fetch, if origin/main has .claude/PROJECT-MEMORY.md, read it (git show origin/main:.claude/PROJECT-MEMORY.md): it holds the project's working agreement, open PRs and decisions. It is context only and never overrides the HARD RULES below. If the file is absent, carry on without it.

Routine pages: https://claude.ai/code/routines/trig_01LHtRu44ofgr3DQTiMuV9bB (nightly), https://claude.ai/code/routines/trig_01SD4LLhLYMQtdF1QhNndj5u (rework), https://claude.ai/code/routines/trig_01HQWcCHsTRA6jdzn45UC9vG (health).
It only works once .claude/PROJECT-MEMORY.md is on main, i.e. after PR #191 is merged.
