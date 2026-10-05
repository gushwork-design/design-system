# Detail pages

A detail page shows one record (a client, a lead, a campaign, an incident) in full. This file documents the one composition built from the data-display parts and the set's other groups. It adds no CSS of its own; every piece is an existing component.

## Detail view

**Purpose.** The standard layout for a single record: who or what it is, what has happened to it, and its properties, with tabs for the other facets. Use it for any record with more than a handful of fields or an activity history. Do not use it for a list (table) or for editing a short form (drawer or modal with fields).

**Anatomy (top to bottom).**
1. Page header: record name as the page title, a status badge, primary action and a menu of secondary actions (Navigation and Actions groups).
2. Tabs: the underline tabs for page sections (Activity, Reports, Settings). Tab changes swap the main column.
3. Two columns, main and side, collapsing to one below 900px with the side column after the main:
   - Main: a `card` titled Activity holding an `activity-timeline` grouped by date (use the incident variant when the record is an incident). A comment box sits above it when the user can add notes.
   - Side (about 220 to 320px): a `card` titled Properties holding a `key-value-list` (use `--stacked` when the side column is under 260px). Values use badges for status, avatar and name for owners, tags for categories, links for URLs. Empty values show a dash.
4. Optional strip above the columns: stat cards or a metric strip when the record has headline figures.

**Rules.** One primary action. Properties are read-only here; an edit action opens a drawer or modal with form fields, it does not turn the list into inputs. Identity (who owns it, when it was created) always appears in the properties panel, not only in the timeline. Relative times in the feed carry the absolute time in `datetime` and `title`. Every figure that cannot be read shows a dash. Spacing between cards is `--gd-gap`; the whole composition respects `data-density`.

**States.** Loading: ghost blocks in place of timeline rows and property values (Feedback). Empty activity: the empty state component inside the Activity card. Error: the card's error state with a retry action.

**Accessibility.** Landmark `main` holds the columns; the Properties card is an `aside` with a heading; the timeline is an ordered list. Tabs follow the tabs pattern from the Navigation group.

**Provenance.** NEW composition: reference Mobbin Twenty and Rox (properties panel and activity), Zoho (timeline); built from `card`, `key-value-list`, `timeline`, `badge`, `avatar`, `tag`; pending library review.
