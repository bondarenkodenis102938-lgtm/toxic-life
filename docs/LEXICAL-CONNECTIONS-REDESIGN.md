# Lexical Connections — UX and product specification

**Status:** planned redesign; documentation only.  
**Target branch:** `v2-foundation`.  
**Important:** this document records product decisions and requirements. It does not claim that the UI, API, or database changes have been implemented.

## 1. Product direction

Rename the current **“Similar words”** area to **“Word connections”** (Ukrainian UI label: **«Зв’язки слів»**). The feature is broader than words that look or sound alike: it stores groups of words connected by form, meaning, topic, usage, grammar, or common learner mistakes.

Use friendly, plain-language labels as the primary category names. Linguistic terminology may appear only as optional secondary explanations; users must not need to know terms such as *paronym*, *homonym*, or *antonym* to use the feature.

## 2. Website interface languages — strict requirement

The website UI must support **Ukrainian and English only**.

- Ukrainian and English are the only selectable interface languages.
- Do not add Russian as a website locale, translation, fallback, or language option.
- All navigation labels, buttons, empty states, validation messages, tooltips, category names, editor labels, and system feedback must have Ukrainian and English translations.
- The language used in assistant conversations or development notes does not determine the website UI language.
- User-created learning content may contain any language needed for studying; this restriction applies to the interface, not to vocabulary, translations, examples, or notes.

## 3. Main section: discovery and navigation

The landing page should provide:

- A search field that can find records by words, translations, descriptions, notes, and hashtags.
- Category tiles or category rows with a short plain-language explanation and a record count.
- An **All records** view that shows every record regardless of category.
- A **Favorites** view containing records saved by the current user.
- Clear navigation back to categories and between records.

Selecting a category opens a dedicated record feed/list filtered to that category. Users can browse records sequentially (next/previous) as well as return to the list. Search and filters should remain available in the category view.

A record may belong to more than one category. Category selection is therefore multi-select, not a single exclusive classification.

## 4. Initial user-facing category groups

These are friendly labels, not mandatory linguistic terms. Final translations and wording should be reviewed in both supported interface languages.

1. **Similar in spelling or sound** — words that look or sound alike.
2. **Similar in meaning** — words with the same or close meanings, including usage nuances.
3. **Opposite meanings** — opposites and contrasting concepts.
4. **Connected by topic** — vocabulary belonging to a shared subject area, including broader/narrower concepts.
5. **Words I often confuse** — learner traps, grammar distinctions, and commonly mixed-up forms.
6. **Word families and forms** — shared roots, derived forms, prefixes, suffixes, compounds, and inflections.
7. **Expressions that go together** — collocations, fixed phrases, idioms, and common word combinations.
8. **Other connections** — a flexible place for less common or cross-language relationships.

Do not expose a long taxonomy of academic labels on the landing page. Each category needs a concise explanation and an example, available through a tooltip on desktop and a tap-to-open hint on touch devices.

## 5. Record cards and record browsing

A record card must communicate its contents without requiring the user to open it. Show, where available:

- Main title.
- One or more plain-language category labels.
- The words in the group and a translation/meaning beside each word.
- A short explanation or preview of the shared note.
- Hashtags.
- Counts for words and examples.
- A favorite control.

Do not show fake counts or placeholder sample data in production. If content is absent, omit that detail or show a useful empty state.

Inside a record, support:
- Multiple words per group.
- Multiple translations/senses per word.
- Part of speech and grammatical information where relevant.
- Examples and their translations.
- Notes specific to each word.
- A shared explanation/note for the whole group.
- Hashtags and favorite state.
- Optional comparison layouts appropriate to the connection type.

Different connection types may use different presentation patterns. For example, close-meaning words may show nuance comparisons, easily confused words may show a side-by-side distinction, and topic groups may show a hierarchy. Avoid forcing every record into one generic template.

## 6. Editor: clear, separated blocks

The editing experience must be distinct from the learner-facing record display. Use a guided editor with clearly separated, collapsible sections:

1. **Basic information** — title and short summary.
2. **Connection types** — multi-select categories, with plain-language explanations.
3. **Words** — repeatable word entries; each entry has its own translations/senses, part of speech, examples, and word-specific notes.
4. **Shared explanation and notes** — rich text for the whole group (headings, emphasis, lists, links).
5. **Hashtags** — add existing tags or create new ones.
6. **Additional details** — related records and future optional metadata.

Each word entry should be visually distinct, with an obvious “Add another word” action. Reordering words should be possible. Keep the editor uncluttered: show essential fields first and collapse optional sections rather than placing every field in one long undifferentiated form.

## 7. Hashtags and favorites

Hashtags are flexible labels, not substitutes for categories.

- A category describes the relationship between words.
- A hashtag describes a topic, learning level, context, or personal grouping (examples: `#DU3`, `#grammar`, `#common-mistakes`, `#spoken-language`).
- Reuse existing tags through autocomplete to reduce duplicates caused by spelling/plural variations.
- Allow authorized editors to create and apply tags.
- Tags should be searchable and usable as filters.
- Consider per-record tags first; per-word tags can be added if a concrete use case justifies the extra complexity.
- Favorites are independent of categories and tags. Favorite state should be per user, not a shared global property.

## 8. Visual and interaction direction

Aim for a modern, warm, calm, readable interface rather than stark white-on-black styling.

Suggested light palette:
- Background: `#F7F6F2`
- Cards: `#FFFFFF`
- Main text: `#283044`
- Form-related accent: `#E5EFFB`
- Meaning-related accent: `#E2F2E9`
- Topic accent: `#F2E9FC`
- Structure accent: `#FCEBDD`
- Confusion/error accent: `#FBE8EA`

Use color as a restrained category cue, not as a full-page fill. Prefer clear hierarchy, generous spacing, rounded cards, subtle borders/shadows, accessible contrast, and restrained motion. Design responsive layouts for desktop and mobile. A full dark theme may follow after the light theme and interaction model are validated.

Provide both a card layout and a compact list option if usability testing confirms value. On mobile, prioritize a single-column layout and touch-friendly controls.

## 9. Example records for prototype testing

Use clearly marked test fixtures, not production vocabulary claims:

- `ligge / lægge` — similar forms and commonly confused; explain the state/action distinction and validate Danish examples before publishing.
- `begynde / starte` — close meanings; demonstrate differences in usage and context.
- `frugt / æble / pære` — topic/semantic hierarchy (general category and examples).
- A carefully verified example of one spelling with distinct meanings, if needed to test multiple senses.

Any linguistic explanation or example sentence added to real learning content must be checked before being presented as authoritative.

## 10. Data model direction — not approved for migration yet

The current data model must be inspected before implementation. A possible normalized direction is:

- `clusters` — record/group title, summary, shared notes.
- `words` — reusable canonical word entries.
- `word_senses` — multiple meanings/translations for a word.
- `word_examples` — examples and translations.
- `cluster_words` — many-to-many membership, ordering, and cluster-specific notes.
- `categories` and `cluster_categories` — many-to-many category assignment.
- `tags` and `cluster_tags` — reusable hashtags.
- Per-user favorites table — user-to-record favorite relationship.

This is a design direction, not a final schema. Do not run a database migration, delete existing data, or replace the current editor until the current implementation has been inspected, a backup has been made, and the prototype has been tested.

## 11. Delivery plan and acceptance checks

1. Inspect the existing “Similar words” UI, API, and D1 schema on `v2-foundation`.
2. Build a visual/interactive prototype using test data only; do not modify production records or schema.
3. Test category navigation, All records, search, favorites, record browsing, multi-category assignment, hashtags, and editor block organization.
4. Test Ukrainian and English UI comprehensively; verify that no Russian interface strings or fallback locale are introduced.
5. Test desktop and mobile layouts, keyboard navigation, and accessible contrast.
6. Review the data model, back up D1, then prepare a versioned migration only after approval.
7. Integrate with existing Owner/Co-host permissions and test create, edit, delete, and authorization behavior.
8. Deploy only after regression testing and explicit review.

### Acceptance criteria

- Users can understand category choices without knowing academic linguistic terminology.
- Users can choose a category or browse all records.
- Users can search by words, translations, notes, and tags.
- Users can favorite/unfavorite records and view their own favorites.
- Record cards reveal useful contents at a glance.
- The editor separates group-level content from word-level content.
- Tags are reusable, searchable, and filterable.
- The website interface is available in Ukrainian and English only.
- Existing data is preserved until backup, migration review, and successful testing.
