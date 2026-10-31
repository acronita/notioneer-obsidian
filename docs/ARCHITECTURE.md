# Architecture

Technical overview of how the Notioneer plugin is built. Read this before making non-trivial changes.

## Overview

Notioneer brings three Notion-like editing conveniences to Obsidian: a note header (title,
cover image, frontmatter properties) rendered at the top of a note, a `/` slash-command menu
for inserting blocks, and a formatting toolbar that appears on text selection.

Scope decisions:

- **No spaces / no vault-navigation features.** make.md's "spaces" concept is out of scope;
  Notioneer only touches the editor and the note it is open on.
- **Slash commands insert plain Markdown.** The reason this plugin exists rather than using
  make.md: its table command should produce a real Markdown table, not a plugin block.
- **Cover images and properties live in frontmatter**, so a note degrades to normal Markdown.
- **No network calls.**
- **The header looks and behaves exactly like make.md's.** It is a port, not a redesign.

## History: from fork to port

0.7.0–1.0.3 shipped make.md itself, trimmed: the header was make.md's React component reading
from make.md's `Superstate` index, so the Superstate, its space manager, filesystem middleware
and adapters all had to stay — ~300 modules, a 3–4 MB bundle and ~3k findings on the Obsidian
community scorecard, nearly all in make.md code Notioneer never ran.

2.0.0 replaces that with a **port**: the header's React components were copied into
`src/ui/` nearly line for line — same JSX, same DOM, same class names — and only what sat
underneath changed. Instead of the Superstate, components get a small typed `HeaderApi` over
Obsidian's API (`metadataCache`, `processFrontMatter`, `fileManager.renameFile`). Everything
else of make.md was deleted. Visual identity was the constraint: make.md's stylesheets are
still the styling, pruned to the rules the ported DOM can match.

## Source layout

| Path | Responsibility |
|---|---|
| `src/main.ts` | Plugin entry: settings, the header manager, slash commands, toolbar, settings tab. |
| `src/settings.ts` | `NotioneerSettings` — make.md's key names and defaults, so `data.json` carries over. |
| `src/settingsTab.ts` | The settings tab. |
| `src/ui/header/mount.tsx` | `HeaderManager`: mounts the header into each editor's `.cm-sizer` (live preview) and each reading view's `.mod-header`. |
| `src/ui/header/NoteContext.tsx` | The note's state (path, name, folder, frontmatter), kept current from Obsidian events. |
| `src/ui/header/api.ts` | `HeaderApi`: every vault write the header makes (frontmatter, rename, alias, cover). |
| `src/ui/header/` | The header: `MarkdownHeaderView`, `BannerView` (cover), `TitleComponent`, `HeaderProperties` (fold, folder chips, rows). |
| `src/ui/properties/` | Property rows (`PropertyRow.tsx`), one cell per type (`cells/`), the date picker and the property menus. |
| `src/ui/menus/`, `src/ui/modals/` | make.md's select menus, drawers, modals and pickers. |
| `src/ui/i18n.ts`, `src/ui/icons.ts` | The make.md strings and `ui//` SVG icons the UI uses — generated subsets, so wording and icons are identical. |
| `src/properties/` | Pure logic: type detection and value parsing (`parsers.ts`), field types, dates, tags. |
| `src/notioneer-slash/` | Slash commands that insert plain Markdown. No React. |
| `src/notioneer-toolbar/` | Selection formatting toolbar. No React. |
| `src/css/` | make.md's stylesheets (pruned) plus `notioneer.css`, bundled into `styles.css`. |

## How the header works

`HeaderManager` reacts to `layout-change`, `active-leaf-change` and `file-open`, walks every
Markdown leaf, and keeps one React root per editor in a `.mk-inline-context` element at the top
of `.cm-sizer`. Reading view is reached through a Markdown post-processor, as make.md did. Each
root renders `NoteProvider` → `MarkdownHeaderView`; the provider re-reads the note on
`metadataCache` `changed` and follows renames.

Frontmatter is read from `metadataCache` and written with `processFrontMatter`, with the same
values make.md wrote (`parseMDBStringValue`), so files come out the same. Renaming a property
re-adds it last, as make.md did. The tags row lists all of a note's tags, inline ones
included, lowercased with `#` — again make.md's behaviour.

**Declared types.** Obsidian keeps the type each property key was declared with (`multitext`,
etc.) in `metadataTypeManager`, which is not public API. `HeaderApi.isMultiTextProperty`
(`src/ui/header/api.ts`) reads it inside a `try`, and returns `false` when the field is missing,
so a future Obsidian without it only loses the "declared list" rule. `HeaderProperties` passes
the answer to `detectPropertyType`, which then treats an empty, bare-string or single-link value
of that key as a list.

**Changing a type** goes through `convertValueToType` (`src/properties/parsers.ts`) inside
`HeaderApi.updateProperty`: the current value is read live from the frontmatter within
`processFrontMatter` (key matched case-insensitively), converted, and written back; an
`undefined` result writes nothing. The conversion is pure; the property menu only chooses the
target (`src/ui/properties/propertyMenu.ts`). Tags are never converted.

Faithfulness notes, deliberate and listed so they are not "fixed" by accident:

- make.md quirks kept: the date picker opens on today rather than on the current value; the
  type menu's "Special → Repeat" entry has no label and creates a property named `undefined`;
  option colours picked in the menu last until the next save; `aliases` rows render no value.
- Not ported, because they only led into removed make.md features: the right-click menus on
  property-link chips and icons (path/sticker menus), and the "icon" entries of the mobile "…"
  menu (the icon is never shown in Notioneer's header). Property rows are no longer
  draggable — make.md's drag did nothing on drop.
- Fixed instead of kept: deleting a field of one item in a list of objects no longer clears
  the other items, and the cover picker's Enter key no longer writes an empty cover.

## Styling

`src/css/` is make.md's CSS, pruned in 2.0.0 by a one-off script: a selector was dropped when
it needs an `mk-*` class (or `mk-*` attribute value) that no Notioneer source can render.
Selectors without `mk-*` tokens — make.md's tweaks to Obsidian's own UI, such as tab-header
icons or `mark` styling — were kept, since Notioneer has always shipped them.

The Obsidian scanner flags `!important`, so make.md's important declarations were moved into
copies of their rules prefixed with `:root:root:root:root`. Every element is a descendant of
`:root`, so the copy matches exactly the same elements; the added (0,4,0) specificity makes it
outrank ordinary rules the way `!important` did. Use the same prefix for any new rule that has
to beat Obsidian or a theme.

## Build pipeline

- TypeScript (`tsconfig.json`) type-checks the tree (`tsc -noEmit -skipLibCheck`) — no `.js` is emitted by `tsc` itself.
- [esbuild](https://esbuild.github.io/) (`esbuild.config.mjs`) bundles `src/main.ts` into a single CommonJS `main.js` (~380 KB), externalizing `obsidian`, `electron`, part of CodeMirror and Node builtins.
- The same pass emits `main.css` from the CSS imported by the source; a rename plugin turns it into the root `styles.css` (~33 KB) that Obsidian loads. Both are generated and gitignored.
- `scripts/copy-to-vault.mjs` copies `main.js`, `manifest.json` and `styles.css` into the vault named in `.env.local`.
- `scripts/unreachable.mjs` lists (and with `--delete` removes) source files `src/main.ts` no longer reaches.
- `manifest.json` + `versions.json` follow the standard Obsidian plugin conventions (`minAppVersion` compatibility map).

See [DEVELOPMENT.md](DEVELOPMENT.md) for how to actually run the build.

## Credits

The header's components and stylesheets are ported from
[make.md](https://github.com/Make-md/makemd) — MIT licensed, Copyright (c) 2022 JP Cen — whose
licence is kept verbatim in `LICENSE-makemd`.

Notioneer itself is GPLv3 (`LICENSE`). MIT code may be combined into a GPLv3 work provided the
MIT notice is retained, which is what `LICENSE-makemd` is for.
