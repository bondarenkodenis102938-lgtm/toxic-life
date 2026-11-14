# Lexical Connections — interactive UX prototype

This is an isolated, browser-only prototype for the planned **Word connections / Зв’язки слів** section.

## Open it

Open `index.html` directly in a modern desktop or mobile browser. No build step or dependencies are required.

## What to test

- Switch the interface between Ukrainian and English (the only supported UI languages).
- Browse the category tiles, All records, and Favorites.
- Search Danish words, translations, examples, notes, and hashtags.
- Open a record and move to the previous/next record.
- Add a record, select multiple categories, add words and examples, write shared notes, and add hashtags.
- Edit, delete, and favorite records.
- Switch between light and dark appearance; try a narrow/mobile viewport.

## Important limitations

- This prototype uses sample data and browser `localStorage` only.
- It is **not connected to Cloudflare Worker or D1**. Changes stay in the browser where the prototype is opened.
- It does not modify the live site, production database, authentication, or existing study records.
- The prototype is for validating the information architecture and editing experience. The final production UI/API/data model will be designed after feedback and a database backup.

## Current sample groups

The initial sample records illustrate commonly confused verbs, near-synonyms, opinion verbs, and a topic/meaning hierarchy. They are demonstration content, not a migrated dataset.
