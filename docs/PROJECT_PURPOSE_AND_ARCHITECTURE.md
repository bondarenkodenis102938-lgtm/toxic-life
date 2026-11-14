# Project Purpose & Product Notes

## Why this project exists

This website is a shared digital notebook for a group of five people learning Danish together.

We want one convenient place that is always at hand where everyone can write down and preserve what the group learns:
- Danish words and expressions;
- translations, meanings, examples and usage notes;
- grammar explanations and patterns;
- confusing or easily mixed-up words;
- sentences, corrections and learning observations;
- articles, longer notes and other useful study material.

The site is not meant to force the group into a rigid course, lesson sequence or one prescribed learning method. It should work like a flexible shared notebook: easy to add information, easy to find it later, and useful as the collection grows.

## How the group and access work

There are five people in the group.

- **Owner / Main administrator:** the project owner. Has full administrative control.
- **Co-hosts:** friends invited by the Owner. They can contribute to and manage shared learning materials, but do not have the Owner's administrative powers.

There is no public self-registration. The Owner invites friends using an invitation link. A person who joins through the Owner's invitation becomes a Co-host.

The invitation system and role permissions are part of the product's core design, not an optional social feature.

## Product principles

1. **The notebook comes first.** The site should make capturing knowledge quick and comfortable.
2. **Flexible content.** People should be able to save both small items (like a word) and large pieces (like a complete article or explanation).
3. **Useful structure, not bureaucracy.** Categories, tags, search and links should help people organize information without making every entry difficult to create.
4. **Reuse information.** When the same word or note is useful in several places, the site should make it possible to reference the existing entry instead of copying it and creating inconsistent duplicates.
5. **Independent sections, connected knowledge.** Sections can have their own purpose and interface while being able to reference shared notebook content where useful.
6. **Built for a small trusted group.** Prioritize clarity, reliability and ease of use for these five people rather than public-community features or large-scale social networking.

## Main areas of the notebook

The site has or is developing separate areas for different kinds of learning material, including:

- **Dictionary:** a place to collect and maintain vocabulary entries.
- **Similar words / lexical connections:** a tool for comparing and grouping words by relationships such as similar spelling, pronunciation or meaning.
- **Grammar:** explanations, rules and examples.
- **Study materials / editor:** a flexible space for writing longer notes and structured learning materials.

These areas should remain distinct in purpose. In particular, the Dictionary is not the same thing as Similar Words. The dictionary stores vocabulary; the similar-words area helps explain relationships between vocabulary items. In the future, other areas may be able to reuse or link to dictionary entries.

This is a product direction, not permission to make an unreviewed database redesign. Preserve existing data and behavior when implementing it.

## Interface language

The website interface should support **Ukrainian and English**. Russian is used for communication with the assistant during development, not as a website interface language. Learning content itself may contain Danish, Ukrainian, English or other languages as needed.

## Purpose of this development chat

This chat is the working space for planning, improving and maintaining the shared Danish-learning notebook.

Use it to:
- discuss product ideas and user workflows before implementation;
- understand the existing code and architecture before changing them;
- record agreed decisions and new features;
- improve the interface and make the tools easier to use;
- implement changes carefully without breaking existing functionality.

Work collaboratively: explain the proposal first and get agreement on significant product, data-model or migration decisions. Do not assume that a feature should be redesigned just because a different architecture seems cleaner. The goal is to serve the group's real notebook workflow.

## Change notes

Add dated entries here when a feature, product decision or important behavior is agreed or implemented. Distinguish clearly between **proposed**, **agreed** and **implemented** changes. Do not mark a proposal as implemented until the code actually contains it.


## Current implementation snapshot (reviewed from code)

This section describes what is present in the `v2-foundation` branch, not a promise that every behavior has been fully browser-tested.

### Runtime and shared storage

- The deployed V2 entry point configured in `wrangler.toml` is `src/worker-v2.js`.
- The frontend is plain HTML, CSS and JavaScript in `public/`.
- Cloudflare Worker serves the site and its API; Cloudflare D1 is the shared database.
- The current D1 binding is named `DB`; static assets are served through the `ASSETS` binding.
- `preview-server.cjs` serves static files from `public/` on localhost only. It does not emulate the Worker, authentication, API or D1. A static preview therefore cannot verify the real shared-site workflows.
- `migrations/0001_initial.sql` is the V2 schema source. The root `schema.sql` and `src/worker.js` belong to the older Lenivec-style application and must not be mistaken for the V2 database/API.

### Current notebook sections and stored content

The current study interface has an overview plus three main content areas:
- **Dictionary:** word/expression entries with Danish form, translation, short summary and rich notes.
- **Rules:** grammar notes with a title, summary and rich content.
- **Similar words:** comparison cards grouped by relationship category, with a title, topic, summary, notes, sources and ordered word entries.

The rich editor supports formatted text, headings, lists, quotes, text highlighting/color, reorderable text sections and reusable callout blocks. Built-in callouts include warning, important and interesting; users can also create custom callout types with a label, icon and colors.

The interface currently has Ukrainian and English translations, with the selected UI language stored in browser localStorage. Learning content itself is not restricted to those languages.

### Account and invitation behavior in code

- The first Owner is created through the one-time setup flow using the `BOOTSTRAP_SECRET` environment secret.
- Public self-registration is not provided. A friend needs an invitation token to create a Co-host account.
- Owner can create Co-host invitations valid for 24 hours, 72 hours or 7 days. The token is generated randomly, only its SHA-256 hash is stored, and the invitation is single-use.
- A joining user chooses a display name, username and password. The current UI and Worker require a password of at least 12 characters.
- Owner can view the member list and remove Co-host accounts. Co-hosts cannot access the member-management API.
- Co-hosts can create, edit and delete shared learning entries and custom callouts.
- Removing a Co-host deletes that user's account and sessions; authored learning entries are not deleted because their author references are configured to become NULL.
- Passwords are derived with PBKDF2-HMAC-SHA-256 (100,000 iterations and a per-password random salt). Session tokens are random, only their hashes are stored, and the cookie is HttpOnly, Secure and SameSite=Strict. The current session lifetime is 14 days.
- Login throttling currently allows up to 10 failed attempts from an IP within a 15-minute window before temporarily rejecting further attempts.

### How shared data reaches the browser

- After login, `study.html` requests the current user and shared notebook data from `/api/me` and `/api/data`.
- The Worker returns the shared words, rules, comparison cards and callout definitions from D1.
- The browser also keeps localStorage copies/cache and contains legacy seed data for initial/legacy fallback behavior. The intended shared source is D1, not a separate private notebook per browser.
- The current save flow compares browser-side snapshots and sends changed entries to the API; this is a lightweight synchronization approach, not a full multi-user conflict-resolution system.

### Existing data model

- `users`, `sessions`, `invitations` implement access and identity.
- `words` stores vocabulary records.
- `rules` stores grammar notes.
- `similar_cards` stores comparison groups.
- `similar_card_words` links comparison cards to words and preserves order.
- `custom_callouts` stores custom note-block styles.
- `audit_log` records create/update/delete actions and member removal.

The schema already expresses an important intended relationship: a comparison card can refer to a dictionary word by ID, and a word may be referenced by multiple cards. However, the current card editor/API still accepts word text rather than selecting a dictionary record by ID; the Worker looks up a word by Danish spelling and creates one if it cannot find it. The link table also stores optional card-specific translation/usage/example overrides. These are current implementation details to review before changing the data model.

## Code-review observations and items to verify

These are observations from reading the current source. They are not all confirmed runtime defects; test them before deciding what to change.

1. **Legacy similar-word fields remain in the dictionary editor.** `words` still has `legacy_family` and `legacy_family_note`; `study.html` still contains the old family fields and old family-group rendering/training functions. The newer `similar-cards.js` module is also loaded. The older family-based path should be treated as legacy and cleaned up only after its data has been accounted for.
2. **The similar-card editor does not yet choose canonical dictionary entries directly.** It accepts word text and per-card details. The Worker resolves by Danish spelling or creates a new dictionary record. A future dictionary picker should use stable word IDs and make the intended source-of-truth behavior explicit.
3. **Some vocabulary information can be duplicated.** `similar_card_words` contains card-specific translation, usage and example fields in addition to the canonical fields in `words`. Decide whether these should be removed, treated as intentional context-specific overrides, or redesigned.
4. **Browser localStorage still matters.** It stores the selected interface language, cached/legacy words and rules, and custom callout definitions. The code attempts to synchronize content with D1, but the UI has a local fallback path when the API cannot be reached. The interface should make it unmistakable when edits are only local and have not reached the shared database.
5. **Concurrent editing has no explicit conflict resolution.** The current snapshot-based sync is suitable as a simple starting point, but two people editing the same entry at once may overwrite each other's changes. This matters more as all five people begin using the notebook regularly.
6. **Audit events are written, but there is no visible activity-history screen or read endpoint in the current V2 API.** The log is therefore an internal record at present.
7. **Legacy application files are still present.** `public/index.html`, `admin.html`, `viewer.html`, `chat.html`, and `src/worker.js` contain the older Lenivec application. The V2 Wrangler configuration points to `worker-v2.js`; do not assume those legacy pages are part of the current notebook experience.
8. **Documentation and code status should be kept aligned.** The README checklist and descriptions should be rechecked whenever a feature is changed, especially claims about the similar-words redesign and synchronization.

## Suggested future product capabilities (not yet confirmed as implemented)

For a shared notebook, useful candidates to discuss include:
- a universal search across words, grammar notes, comparison cards and longer materials;
- tags and flexible categories that do not make saving a note cumbersome;
- links/references between a word and a grammar note, example or comparison card;
- a quick-capture flow for saving an observation before deciding where it belongs;
- author and last-edited information on entries;
- clear save/sync status and recovery from failed saves;
- an activity history or recently changed list;
- conflict warnings when two people edit the same entry;
- export/backup of the group's notebook.

These are ideas for discussion, not requirements to implement all at once.


### Additional finding: home-page recent entries block

Reviewed the `renderHome()` implementation in `public/study.html`.

The current "recent entries" block has several functional limitations:
- It merges only dictionary words and grammar rules; comparison cards and custom callouts are excluded.
- It sorts by extracting the first digit sequence from each record ID (`_order`), not by `created_at` or `updated_at`. This is not a reliable recency rule and does not move an edited record to the top.
- It takes only five results.
- It applies the global search query to this block, so a search can make recent entries disappear even though they still exist.
- It renders plain `div` rows without a detail action, so the recent entries are not directly openable from this list.
- The API currently returns word/rule/card data without creation or update timestamps, so a correct cross-section recent-activity feed needs a deliberate timestamp and sorting design.

**Status:** confirmed by source inspection; no code fix has been made yet.

**Suggested direction:** make the recent block a real "recently created or updated" feed, sort by server timestamps, make each row open the corresponding entry, and decide which content types belong in it. Its contents should not silently change just because the user typed into the global search field.


### Agreed feature: recent changes feed and Owner activity log

**Status: agreed product behavior; not implemented yet.**

The current home-page recent-entries block is to become a compact **Recent changes** feed, while the complete activity history belongs in the Owner's admin panel.

#### Main page — Recent changes

- Visible to all signed-in group members.
- Shows only recent changes to shared learning content, including newly created and edited entries.
- Covers the notebook's content areas (Dictionary, Grammar, Similar words and longer study materials, where those are stored as entries).
- Each item should identify the affected entry, the kind of change (created or edited), who made the change, and when it happened.
- Selecting an item should open the corresponding entry.
- Order by the actual server-side change time, so editing an older entry moves it to the top.
- The feed must be independent of the global search field; searching the notebook must not hide or alter the recent-changes feed.
- The home page shows a short, compact preview rather than the complete activity history.

#### Admin panel — complete activity history

- The full activity log is available only to the Owner through the admin panel.
- It should include the complete set of recorded actions, not just learning-entry changes: for example create, update and delete events, as well as relevant member-management actions.
- The admin view should make it possible to identify who performed an action, what it affected, what kind of action occurred, and when it happened.
- Filtering and more detailed inspection belong in this Owner-only view.

#### Implementation notes

- The existing `audit_log` table already records create/update/delete actions and member removal, but the current V2 API has no visible read endpoint or activity-history screen.
- Before implementation, inspect the actual audit-log schema and all write paths to confirm event coverage and available metadata.
- The main-page feed should use reliable server-side timestamps and should not infer recency from record IDs.
- Do not expose the full audit log or administrative events to Co-hosts through the main-page feed.
- Design the API and UI around the agreed separation: a limited recent-content feed for signed-in members, and a complete audit-history view restricted to the Owner.
- No database migration or code change is authorized by this product decision alone. Inspect first, then propose any required schema/API changes for approval.

