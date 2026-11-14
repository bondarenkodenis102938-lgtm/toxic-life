# Editor Playground

A standalone UX sandbox for iterating on the universal article editor for Word Connections.

## Open locally
1. Download the `editor-playground` branch ZIP.
2. Extract it.
3. Open `prototypes/editor-playground/index.html` in a browser.

## Scope
- This is an isolated prototype page.
- Draft saving uses browser localStorage only.
- No API calls, Worker, D1 database, authentication, or production assets are connected.
- UI language is Ukrainian; the prototype is intended to support Ukrainian and English UI later.
- Templates are starting structures, not category-specific editor modes.

## Current interactions
- Edit text inline.
- Add headings, text, word, example, table, callout, list, note, and image-placeholder blocks.
- Reorder, duplicate, and delete blocks.
- Apply starter templates.
- Add tags.
- Toggle light/dark theme and preview mode.
- Save a local browser draft.
