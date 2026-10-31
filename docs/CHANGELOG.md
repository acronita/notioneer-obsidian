# Changelog

Living log of significant changes to the project. This is **not** optional bookkeeping — every significant change (new feature, format change, dependency change, removed feature, policy change) gets an entry here at the time it's made. See the documentation policy in [.claude/CLAUDE.md](../.claude/CLAUDE.md).

Format: `YYYY-MM-DD — short description. Why (if not obvious). Files touched.`

## 2026-10-31 (proposed 2.1.0)

- **Changing a property's type to a list works, and keeps the value** ([#2](https://github.com/is-cout/notioneer-obsidian/issues/2)).
  The **Change property type** menu offered no list at all, and any type change reset the value
  to the new type's default. Now:
  - **Option** (the list type) is offered in the menu. A list stays a list when the new type has
    a multiple form.
  - Changing the type **converts the value**: text `a, b` ⇄ list `a`, `b`; `link` ⇄ `link-multi`
    keep their links (several links never collapse into one). A value the new type cannot hold (`foo` as a number or date, `a, b` as a
    boolean) is left unchanged; an empty value becomes the target's default.
  - A **Multiple** entry in the property menu toggles between the single and list form.
  - Properties Obsidian itself declares as lists (`multitext`) stay lists even when empty, a bare
    string or a single `[[link]]`.
  - **Option** starts as an empty list, like the other list types (it used to get an example
    value). `0` and `false` survive a type change.
  - Tags still cannot change type.
  - MINOR because the type menu gains entries and the conversion is new; no data format change.
  - Files: `src/properties/fieldTypes.ts`, `src/properties/parsers.ts`,
    `src/ui/properties/propertyMenu.ts`, `src/ui/header/api.ts`, `src/ui/header/HeaderProperties.tsx`,
    `README.md`, `docs/ARCHITECTURE.md`, `docs/FAQ.md`.

## 2026-10-12 (2.0.0)

- **The header is now a port of make.md's, not make.md itself.** The 1.0.3 scan still rated
  the review "Risks" on ~3,000 warnings, almost all in make.md code the header only needed for
  its `Superstate` index. The header's React components were copied into `src/ui/` nearly
  line for line — same JSX, DOM, class names and make.md stylesheets, so it looks and behaves
  the same — and now run on a small typed layer over Obsidian's API (`src/ui/header/api.ts`)
  instead of the Superstate. Everything else of make.md is deleted: 379 → 75 source files
  (53 TypeScript, 22 stylesheets), bundle 3.4 MB → 380 KB, `styles.css` 151 KB → 33 KB, typed
  lint ~2,900 → 1 finding (settings search needs Obsidian 1.13's API).
  See [ARCHITECTURE.md](ARCHITECTURE.md#history-from-fork-to-port).
- **MAJOR** because documented behaviour around the edges changed, even though the header
  itself is the same: the right-click menus on property-link chips and on their icons, and
  the "icon" entries of the phone "…" menu, are gone (they led into removed make.md
  features); property rows can no longer be dragged (dropping did nothing); there is no index
  cache any more, and the 1.0.3 `superstate-cache.json`/`file-cache.json` are deleted on
  start. Kept on purpose, as make.md does it: the date picker opens on today, "Special →
  Repeat" has no label, option colours reset on save. Fixed instead of kept: deleting a field
  in one item of an object list no longer clears the other items.
- **CSS pruned and de-`!important`-ed.** Rules that can only match make.md DOM Notioneer no
  longer renders were dropped (1,489 → 273 rules, `!important` 221 → 0, `:has` 14 → 0).
  Important declarations moved to `:root:root:root:root`-prefixed copies, which match the same
  elements with higher specificity. make.md's tweaks to Obsidian's own UI are kept.
- **Dependencies:** 70 packages removed (approved); none bumped. Runtime: `react`,
  `react-dom`, `react-day-picker`, `react-transition-group`, `vaul`, `fuse.js`, `date-fns`,
  `classnames`. See [DEPENDENCIES.md](DEPENDENCIES.md).
- `data.json` keeps working: settings use make.md's key names and defaults, and keys this
  version no longer reads are preserved on save.
- Files: all of `src/` (new `src/ui/`, `src/properties/`, `src/settings.ts`,
  `src/settingsTab.ts`; make.md's `src/adapters`, `src/core`, `src/shared`, `src/schemas`,
  `src/basics`, `src/utils`, `src/notioneer-header` removed), `src/css/`,
  `esbuild.config.mjs`, `tsconfig.json`, `scripts/` (`debarrel.mjs` removed),
  `package.json`, `package-lock.json`, `manifest.json`, `versions.json`, `README.md`,
  `docs/*.md`.

## 2026-10-12 (1.0.3)

- **No WASM, no Node `fs`, no network code left in the bundle.** The 1.0.2 scan (3,135
  findings, still "Risks") disclosed WASM blobs, a `.wasm` file, Node `fs` access, base64 and
  network calls. All of it came from libraries make.md used for things Notioneer does not:
  - **Index cache is now JSON.** make.md persisted the Superstate index and file cache as
    zipped SQLite (sql.js + jszip) under the vault's `.makemd/` folder. They now live as
    `superstate-cache.json` and `file-cache.json` in the plugin folder. The first start after
    updating rebuilds the index once; the old `.makemd/*.mdc` files are no longer read and
    can be deleted (see [FAQ](FAQ.md)). Files: `src/adapters/obsidian/jsonCachePersister.ts`,
    `src/main.ts`, `src/adapters/obsidian/filesystem/filesystem.ts`.
  - **`.mdb` files are no longer read.** They hold make.md space data (context tables,
    frames, commands) that Notioneer never shows. The adapter is now a stub that answers as if
    the file were missing, so the Superstate still initializes. Installing a space kit skips
    its frames/context tables. Files: `src/adapters/mdb/mdbAdapter.ts`,
    `src/adapters/obsidian/ui/kit/kits.ts`.
  - **Image thumbnails** (off by default) scale with canvas instead of `pica`. File:
    `src/adapters/image/imageAdapter.ts`.
  - A dead, never-called `XMLHttpRequest` image embedder removed from
    `src/core/export/treeToAst/treeToHast.ts`.
  - 11 files left unreachable deleted via `scripts/unreachable.mjs`, plus sql.js's
    `sql-wasm.js`/`sql-wasm.wasm`.
- **Dependencies removed** (approved): `sql.js`, `jszip`, `pica`, `@types/sql.js`,
  `@types/pica`, `esbuild-plugin-wat`. `esbuild.config.mjs` drops the wat plugin and the jszip
  patch from 1.0.2, which no longer has anything to patch. Bundle 4.4 MB → 3.4 MB.
- Files: see above, plus `manifest.json`, `package.json`, `package-lock.json`,
  `versions.json`, `docs/ARCHITECTURE.md`, `docs/DEPENDENCIES.md`, `docs/FAQ.md`.

## 2026-10-12 (1.0.2)

- **Community scorecard cleanup.** The Obsidian scorecard rated the review "Risks" (12,193
  findings on 1.0.0). Most of that count (~8.5k) comes from the scanner linting without
  dependencies installed, so every imported type is `any` — see
  [DEVELOPMENT.md](DEVELOPMENT.md#community-scorecard). What was actually fixable:
  - **No dynamic code execution.** make.md's frame engine and "script" commands used
    `new Function`; frame values are now limited to literals and script commands report an
    error. jszip's dead `setImmediate` fallback is patched at build time, so the bundle has no
    `Function` constructor at all. Files: `src/core/utils/frames/executable.ts`,
    `src/core/utils/frames/runner.ts` and its three callers, `esbuild.config.mjs`.
  - **No `fetch`.** The never-used remote `.mdb` branch is gone and web space kits are no
    longer downloaded. Files: `src/adapters/mdb/db/db.ts`, `src/adapters/mdb/utils/mdb.ts`,
    `src/core/spaceManager/webAdapter/webCache.ts`.
  - `alert` → in-app notice; `console.log` removed or turned into `console.error`; `btoa`
    → Obsidian's `arrayBufferToBase64`; `substr` → `slice`.
  - Mechanical lint fixes across ~100 files (typed lint: 3,477 → 2,919 findings): floating
    promises marked `void`, unused catch bindings/imports, empty blocks, useless regex
    escapes, redundant type assertions, `window.*` timers, `TFile`/`TFolder` casts →
    `instanceof`, `createEl`/`createDiv`. The `await-thenable` findings were left alone on
    purpose: several make.md methods are typed `void` but return a promise, so dropping the
    `await` would change execution order.
  - 13 duplicate CSS declarations that were already overridden in the same rule removed.
  - Manifest description ends with a period.
- **Tooling (no runtime effect).** Removed dev dependencies the scanner bans —
  `builtin-modules`, `dotenv`, `find-cache-dir`, `eslint-plugin-react` — replaced in
  `esbuild.config.mjs` by Node built-ins (approved). Release workflow now publishes build
  provenance attestations. Added `CONTRIBUTING.md`.
- Not addressed: `sql.js`/WASM (and the `fs` access inside it), ~2.6k `any`/`no-unsafe-*`
  findings in make.md code, `!important`/`:has` in make.md CSS, `FileManager.trashFile`
  (needs `minAppVersion` 1.6.6).
- Files: see above, plus `manifest.json`, `package.json`, `package-lock.json`,
  `versions.json`, `.github/workflows/release.yml`, `CONTRIBUTING.md`, `docs/*.md`.

## 2026-10-12 (1.0.1)

- **Native inline title hidden reliably under the header** ([#1](https://github.com/is-cout/notioneer-obsidian/issues/1)).
  make.md's rule hid it only in live preview and without `!important`, so a theme or snippet
  styling `.inline-title` brought it back and notes showed two titles — and after the editor
  re-rendered (e.g. inserting a callout) the native one jumped above the header. The new rule
  matches the native properties one: `!important`, also in source mode, and only in editors
  where the header is mounted.
- **Header title survives "Show inline title" being off.** The header's title reuses the
  `inline-title` class, so Obsidian's `body:not(.show-inline-title) .inline-title` hid it too
  — turning the setting off to get rid of the duplicate left no title at all. Now it only
  affects the native one.
- Files: `src/css/notioneer.css`, `docs/FAQ.md`.

## 2026-07-28 (1.0.0)

- **First stable release.** The plugin's data format, settings and public behaviour are
  declared stable, so the version leaves the pre-1.0 range — from here breaking changes take a
  MAJOR bump instead of a MINOR one. This is also the version submitted to the Obsidian
  community plugin directory, which is what the compliance fixes below are for.
- **Obsidian community-plugin review fixes.** No behaviour change — every item below is an
  API-compliance swap the submission scanner flags as an error:
  - Thumbnail rendering no longer assigns to `innerHTML`; the exported note/space HTML goes
    through Obsidian's `sanitizeHTMLToDom()` before being appended into the SVG
    `foreignObject`. Files: `src/adapters/obsidian/filetypes/markdownAdapter.ts`.
  - Direct `element.style.*` writes replaced with `setCssStyles()` (menu positioning, drag
    cursors, flow editor sizing). Files: `src/adapters/obsidian/ui/WindowManager.tsx`,
    `src/core/react/components/UI/Menus/menu.tsx`,
    `src/core/react/components/UI/Menus/properties/colorPickerMenu.tsx`,
    `src/shared/FlowEditor.tsx`.
  - The three `eslint-disable-next-line` directives now carry `-- reason` descriptions. Files:
    `src/core/react/components/MarkdownEditor/BannerView.tsx`,
    `src/core/superstate/superstate.ts`.
- **No dynamic `<script>` elements in the bundle.** `jszip` (used for the zipped local cache)
  ships a prebundled browserify build whose `immediate`/`setimmediate` polyfills sniff for the
  IE8 `script.onreadystatechange` trick and inject `<script>` elements when it is present. The
  branch is already dead on every engine Obsidian runs on, but its four
  `createElement("script")` calls tripped the scanner. A new esbuild `onLoad` plugin renames
  the probed element so the sniff can never match — it throws if the pattern ever stops
  matching, so a jszip upgrade can't silently reintroduce it. No dependency or runtime change.
  Files: `esbuild.config.mjs`.

## 2026-07-27 (0.8.7)

- **Folder chip hover really gone.** Removing our own hover rule was not enough: make.md’s
  `.mk-props-contexts-space-name:hover` sets `opacity: 1 !important`, which undid the fade on
  hover. Ours now matches that weight, and the cursor stays an arrow.
- **Selection toolbar restyled after make.md’s inline menu** (`css/Menus/InlineMenu.css`):
  one bordered container, 28px marks with no background of their own — only on hover — and
  16px icons. Our buttons are `<button>` elements, so Obsidian’s default button background had
  to be reset explicitly; that is what made them look like chips inside a box.
- Files: `src/css/notioneer.css`.

## 2026-07-27 (0.8.6)

- **Folder chips: subtler fade, no hover.** The immediate parent goes from 60% to 80% opacity,
  and the hover state and pointer cursor are gone — the chips read as a label rather than a
  control. Clicking one still reveals the folder. Files: `src/css/notioneer.css`.

## 2026-07-27 (0.8.5)

- **Folder chips vary in weight**: the top-level folder keeps the full tag colour, the
  immediate parent renders at 60% opacity (full on hover), so the two read as a hierarchy
  rather than as two equal chips. Files: `src/notioneer-header/FolderCrumb.tsx`,
  `src/css/notioneer.css`.

## 2026-07-27 (0.8.4)

- **Folder chip matches make.md’s.** It now reuses their `mk-props-contexts-space-name` class
  — pill shape, `--tag-background`/`--tag-color` — instead of the lookalike written for 0.8.3,
  which used muted greys and a square radius.
- **Shows two levels**: the top-level folder and the note’s immediate parent, deduplicated when
  they are the same, and nothing at all for a note at the vault root.
- Files: `src/notioneer-header/FolderCrumb.tsx`, `src/css/notioneer.css`.

## 2026-07-27 (0.8.3)

- **Obsidian’s native properties panel no longer renders below the header’s.** The rule hiding
  it was too weak to beat Obsidian’s own styling of `.metadata-container`; it now carries
  `body` and `!important`. Two identical property lists stacked is the worst failure mode
  here, so this one is worth the `!important`.
- **Property values use the theme’s own tag and pill colours.** make.md renders every
  multi-value cell as a neutral grey chip (`rgba(var(--mono-rgb-100), .025)`); inside the
  header they now use `--tag-*` and `--pill-*`, so they match the native properties panel.
- **Added the folder chip** under the title (`src/notioneer-header/FolderCrumb.tsx`), in place
  of make.md’s spaces chips: shows the note’s folder and reveals it in the file explorer.
- Files: `src/css/notioneer.css`, `src/notioneer-header/FolderCrumb.tsx` (new),
  `src/core/react/components/SpaceView/Contexts/SpaceEditor/HeaderPropertiesView.tsx`.

## 2026-07-27 (0.8.2)

- **Fixed the header rendering unstyled** (title with a stray icon button, an empty square and
  a stray "Spaces" chip). `scripts/unreachable.mjs` treated stylesheets like source and deleted
  every CSS file `main.ts` did not import — but make.md’s header borrows classes from
  stylesheets its own entry point imports globally (buttons, menus, inline context). All 42
  stylesheets restored and imported as upstream does; the script now never deletes CSS.
- **Hid the spaces chips in the header.** `HeaderPropertiesView` rendered the "spaces this note
  belongs to" row unconditionally; it is now gated on `spacesEnabled`, which is off.
- Files: `src/css/` (restored), `src/main.ts`, `scripts/unreachable.mjs`,
  `src/core/react/components/SpaceView/Contexts/SpaceEditor/HeaderPropertiesView.tsx`.

## 2026-07-27 (0.8.1)

- **Fixed the note header rendering nothing after 0.8.0.** The header reads from
  `superstate.pathsIndex`, and `ObsidianFileSystem.loadCacheFromObsidianCache()` is what fills
  the file cache the indexer consumes, registers the vault listeners that keep it current, and
  calls `superstate.initialize()`. Upstream only calls it when spaces are enabled, so the
  rewritten entry point skipped it — leaving the index empty, `pathState` null and the header
  (title, cover and properties) blank. It is not a spaces concern and is now always called.
  Files: `src/main.ts`.
- **Bumped `lodash` 4.17.21 -> 4.18.1**, clearing the high-severity advisory recorded in 0.7.0.
  Approved by the owner. `npm audit --omit=dev` is clean. Files: `package.json`,
  `package-lock.json`, `docs/DEPENDENCIES.md`.

## 2026-07-27 (0.8.0)

- **Stripped the fork down to the header (stage 2).** `src/main.ts` rewritten to wire up only
  the note header, then everything the entry point could no longer reach was deleted:
  619 -> 305 source files, `main.js` 5.7 -> 4.4 MB, `styles.css` 149 -> 58 KB. Gone: navigator,
  space views and space editor, frames and frame editor, context/table views, Blink, inline
  backlinks, D3 visualizations, `.mdb`/`.mkit`/`.html` editors, kit install, export, dataview
  adapter, tab stickers, and make.md’s settings tab (replaced by a small one with only the
  settings that still do something).
- Four import edges were keeping the whole tree alive and had to be cut first: the
  `makemd-core` barrel (205 importers, now rewritten to direct imports and deleted), a
  four-string union type `BannerView` imported from the frame editor, the `CellEditMode` enum
  and cell prop types living inside `TableView` (moved to `shared/types/cellEditMode.ts`), and
  `PropertyField` living inside the context-list editor (moved out; freed 132 files at once).
  Details in `docs/ARCHITECTURE.md`.
- Added `scripts/unreachable.mjs` (reachability from the entry, with `--delete` and `--why`)
  and `scripts/debarrel.mjs`. The first is how stage 4 will be done too.
- **Restored the Markdown slash commands and selection toolbar (stage 3).** Back from
  `legacy/` into `src/notioneer-slash/` and `src/notioneer-toolbar/`, with
  `notioneerSlashCommands` / `notioneerSelectionToolbar` settings. `/table` inserts a real
  Markdown table again — make.md’s own slash commands went out with `basics`.
- Files: `src/main.ts`, `src/adapters/obsidian/notioneerSettings.ts` (new), `src/notioneer-slash/`,
  `src/notioneer-toolbar/`, `src/css/notioneer.css`, `src/shared/types/cellEditMode.ts` (new),
  `scripts/`, `docs/ARCHITECTURE.md`, `docs/FAQ.md`, `README.md`, plus 300+ deletions.

## 2026-07-27 (0.7.0)

- **Became a fork of make.md** (stage 1 of 3). Reimplementing the header from their source
  kept landing visibly different from the real thing, so the approach changed: the upstream
  tree is imported wholesale and will be trimmed down instead. What this stage does:
  - Upstream `src/` (619 files) imported; builds under the Notioneer identity. `main.js` goes
    from 21 KB to 5.4 MB, `styles.css` to 149 KB — both now gitignored as generated output.
  - 55 runtime + 42 dev dependencies added (939 packages). Upstream ships 94 of 97 as ranges;
    all resolved to exact pins per the dependency policy. Approved explicitly by the owner.
    One open high-severity `lodash` advisory is recorded, not fixed — see `docs/DEPENDENCIES.md`.
  - Spaces-related settings default to off (`spacesEnabled`, `navigatorEnabled`,
    `spaceViewEnabled`, `contextEnabled`, `enableFolderNote`, `spacesStickers`, `sidebarTabs`,
    `showRibbon`, `vaultSelector`, `blinkEnabled`). The header settings stay on.
  - Fixed upstream paths that were hardcoded to `plugins/make-md/` (`Spaces.mdb`, `data.json`)
    and would resolve to a folder that does not exist under our plugin id — now `manifest.dir`.
  - Fixed upstream's build: `target` `es6` -> `es2020` (their own `textCacher.ts` does not
    compile at `es6`), and esbuild output goes to the repo root instead of `process.env.buildDir`,
    which is unset upstream and produced a literal `undefined/` directory.
  - The 0.1.0–0.6.0 vanilla implementation moved to `legacy/`, out of the build, to be restored
    in stage 3 (Markdown slash commands, selection toolbar).
- Files: everything. `LICENSE-makemd` added (MIT notice, required to redistribute their code).

## 2026-07-27 (0.6.0)

- **Note header ported from make.md instead of re-derived.** `src/styles/header.css` is now
  make.md's CSS copied verbatim (`FileContext.css`, `FlowEditor.css`, the `--mk-ui-*` aliases
  from `DefaultVibe.css`) and the DOM uses their class names and element order, so the rules
  apply as written. Why: 0.5.0 reimplemented the layout from reading their source and got two
  things wrong that made it look nothing like make.md — the header was constrained to
  `--file-line-width` a second time (`.cm-sizer` already does it) and the banner sat in the
  flow instead of `position: absolute` + `.mk-spacer`.
- **Fixed the cover buttons doing nothing.** CodeMirror disables pointer events on what is
  injected into `.cm-sizer`, so the click never reached the handler and no `cover` key was
  ever written — the image was never the problem. make.md has the same `pointer-events: all`
  rule for its reading-mode header.
- CSS is split into per-feature partials imported by `index.css`.
- Files: `src/styles/header.css` (new), `src/styles/index.css`, `src/header/noteHeader.ts`,
  `docs/ARCHITECTURE.md`, `docs/FAQ.md`, `package.json`, `manifest.json`, `versions.json`.

## 2026-07-27 (0.5.0)

- **Note header rebuilt to match make.md.** The 0.4.0 header was an approximation written
  without reading make.md; this one ports its actual layout and CSS (`MarkdownHeaderView.tsx`,
  `BannerView.tsx`, `FileContext.css` — MIT, credited in `docs/ARCHITECTURE.md`): full-width
  banner, title overlapping its bottom edge, property rows below. Property rows are now part
  of the header (add, edit, right-click to delete) and Obsidian's native properties panel is
  hidden in the editor so nothing renders twice. Colours use Obsidian's theme variables and
  the title reuses the native `inline-title` class, so themes apply automatically.
  Fixes the cover never appearing: it is an `<img>` now, not a CSS `background-image` whose
  `url()` broke on resource paths. Files: `src/header/noteHeader.ts`,
  `src/header/newPropertyModal.ts` (new), `src/styles/index.css`, `README.md`,
  `docs/ARCHITECTURE.md`, `docs/FAQ.md`, `package.json`, `manifest.json`, `versions.json`.

## 2026-07-27 (0.4.0)

- **Note header.** Cover image and editable title at the top of every Markdown editor. The
  cover is a plain `cover` frontmatter key (vault path or external URL); the title renames the
  file through `fileManager.renameFile` so links follow. Properties are deliberately left to
  Obsidian's native panel, which renders in the same container just below. Added a
  `Note header` setting. Files: `src/header/noteHeader.ts`, `src/header/coverPicker.ts`,
  `src/main.ts`, `src/styles/index.css`, `docs/ARCHITECTURE.md`, `docs/FAQ.md`, `README.md`,
  `package.json`, `manifest.json`, `versions.json`.

## 2026-07-27 (0.3.0)

- **Selection toolbar.** Selecting text in the editor pops up a floating toolbar for bold,
  italic, strikethrough, highlight, inline code and link. Toggling removes existing markers
  instead of stacking them. Built on the browser selection + Obsidian's `Editor` API so no
  CodeMirror dependency is needed. Added a `Selection toolbar` setting. Files:
  `src/toolbar/format.ts`, `src/toolbar/selectionToolbar.ts`, `src/editorUtils.ts` (new shared
  position helper, also used by the slash suggester), `src/main.ts`, `src/styles/index.css`,
  `docs/ARCHITECTURE.md`, `docs/FAQ.md`, `package.json`, `manifest.json`, `versions.json`.

## 2026-07-27 (0.2.0)

- **Slash commands.** Typing `/` at the start of a line (or after whitespace) opens a menu of
  block commands that insert plain Markdown — a real Markdown table, not a plugin block, which
  is the whole reason this plugin exists rather than using make.md. Added a `Slash commands`
  setting to turn it off. Files: `src/slash/commands.ts`, `src/slash/suggest.ts`, `src/main.ts`,
  `src/styles/index.css`, `README.md`, `docs/ARCHITECTURE.md`, `docs/FAQ.md`, `package.json`,
  `manifest.json`, `versions.json`.

## 2026-07-27 (0.1.0)

- **Initial scaffold** from the Obsidian plugin bootstrap template. Files: all.
