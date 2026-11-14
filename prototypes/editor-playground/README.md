# Editor Playground

Standalone UX laboratory for the universal Danish-learning material editor.

## Current baseline

The playground has been restored to the earlier v0.1 interface after the v0.2 redesign did not meet the usability target. This earlier version is the baseline for the next iteration.

## Design direction

- Preserve the earlier layout and visual style unless a change is specifically needed.
- Make ordinary writing comfortable first: users should be able to write and edit explanations without fighting the interface.
- Keep templates as optional, editable starting points.
- Keep blocks flexible: add, remove, duplicate, and reorder them without locking the material into a template.
- Use restrained color; reserve emphasis for meaningful callouts such as important rules or warnings.
- Keep the UI in Ukrainian and English only.

## Next improvements — not yet implemented

1. Improve the writing experience and text formatting without replacing the current layout.
2. Add a compact library-card preview.
3. Add required publication fields: title, short description, main category, and at least one meaningful content block.
4. Allow incomplete drafts; explain missing fields only when checking publication readiness.

## Prototype limitations

- Local UX prototype only; no API, Worker, D1, authentication, or production assets.
- Saving is local to this browser.
- Nothing is published to the production site.
