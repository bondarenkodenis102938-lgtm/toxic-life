# Editor Playground

Standalone UX laboratory for the universal learning-content editor.

## Current direction

This is **not** a word processor and not a document-first editor. It is a flexible tool for creating Danish-learning materials: from a short vocabulary note to a structured lesson.

### Visual principles
- Calm, restrained interface with a neutral surface palette.
- Color is reserved for semantic emphasis (for example: attention, important rule, interesting fact), not applied to every block.
- Readable typography, clear spacing, responsive layout, light and dark themes.

### Editing principles
- Templates are editable starting structures, never locked layouts.
- Users can mix, add, remove, duplicate, and reorder blocks freely.
- Available block concepts: heading, text, word, example, table, callout, list, note, image.
- Keep the editor flexible; do not make block availability depend on the selected category.

### Library-card requirements
A material must render a useful, predictable library card. Required metadata for publication:
1. Title.
2. Short description.
3. Main category.
4. At least one meaningful content block.

Optional metadata:
- Level.
- Tags.
- Image and other supplementary information.

Block-level validation:
- Word block: at least the Danish headword.
- Example block: Danish sentence.
- Callout: explanatory body.
- Text, heading, and note blocks: non-empty content.
- Optional translations and secondary fields may remain empty.

Drafts may be incomplete and saved. Publication validation must explain what is missing. The library-card preview updates while editing.

## Prototype v0.2
- Live library-card preview and required-field validation.
- Editable starter templates.
- Add, reorder, duplicate, and delete content blocks.
- Local draft save and restore in this browser.
- Light/dark theme.
- Responsive layout.

## Limitations
- This is a local UX prototype only.
- No API, Worker, D1, authentication, or production assets.
- “Publish” is a validation demo; it does not publish anything.
- Image block is a placeholder; actual upload is not implemented.
- UI is Ukrainian in this prototype; product UI target languages remain Ukrainian and English.
