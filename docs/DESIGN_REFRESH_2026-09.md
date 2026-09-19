# September styling refresh

Reference review used Mobbin MCP searches and inspected the returned screenshots:

- [Linktree link management](https://mobbin.com/screens/aa28e968-6be1-4860-af72-d1ffff38408e): quiet navigation, white editing surfaces, and a clear distinction between management tools and the creator's page.
- [Linktree contextual link tools](https://mobbin.com/screens/e28a6deb-2917-42f7-8598-269df326bab6): compact secondary actions that don't compete with the link itself.
- [Zellerfeld creator section](https://mobbin.com/sites/sections/39619bde-cfdc-4531-ae23-5a260a64a3c5) and [Air creator section](https://mobbin.com/sites/sections/23410744-59d9-46b3-8c06-14a32d2bc833) were reviewed as marketing references. The final direction uses LinkSpace's own product preview and restrained editorial type rather than copying either composition.

## Design rules

Use the shared background, card, border, input, and accent tokens for application chrome. Primary actions use dark green; selected navigation uses pale green. Keep destructive actions red. Cards use a single thin border and soft shadow, without offset black shadows or hover movement. Creator-selected theme colors, backgrounds, fonts, and button shapes remain controlled by the profile.

The dashboard uses distinct icons for each destination and more room for link management on desktop. Auth, onboarding, loading states, dialogs, forms, analytics, health, audience, and domain settings share the same surfaces. The mobile dock remains fixed above the safe area. Search retains 16px mobile inputs, visual-viewport positioning, and background scroll locking.

Public cards retain compact spacing, keyboard-accessible bookmarks, and visible touch targets. Section labels are simple left-aligned dividers. Marketing uses sentence-case typography, softened product framing, and a refreshed 3× screenshot of a fictional local profile. The existing captioned product-tour recording is preserved; it was recorded before this visual refresh.

## Verification

Run type checking, the source check, unit tests, production build, and the full browser suite. Manually inspect dashboard, design studio, public profile, marketing, auth, mobile navigation, and search at desktop/mobile widths. Check custom themes, overflow, focus visibility, reduced motion, and touch controls. Existing browser tests exercise editing, publishing, imports/exports, bookmarks, search, menus, scroll locking, and security boundaries.
