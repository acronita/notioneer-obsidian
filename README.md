# Notioneer

Notion-style editing conveniences for Obsidian, inspired by [make.md](https://github.com/Make-md/makemd)
but deliberately narrower: the note header, slash commands and the selection toolbar — nothing else.

## Features

- **Note header** — cover image, editable title and property rows at the top of a note, laid
  out like make.md's. The cover is a plain `banner` frontmatter key, the title renames the file
  (links follow), and the property rows read and write ordinary frontmatter. A property's type
  can be changed from its menu, including to a list, and the value is kept.
- **Slash commands** — typing `/` in the editor opens a menu of basic block commands
  (heading, table, list, callout, code block, …). Every command inserts **plain Markdown**,
  never a plugin-specific format — a table command produces a real Markdown table.
- **Selection toolbar** — selecting text pops up a small toolbar for inline formatting
  (bold, italic, strikethrough, inline code, link).

Explicitly **not** included: spaces, custom file formats, or any make.md-specific block syntax.

## Install

Copy `main.js`, `manifest.json` and `styles.css` into
`YOUR_VAULT/.obsidian/plugins/notioneer/`, then enable **Notioneer** under
Settings → Community plugins.

## Status

Since 2.0.0 the note header is a **port of [make.md](https://github.com/Make-md/makemd)'s**:
the same components, DOM and styling, running directly on Obsidian's API instead of make.md's
index — everything else of make.md is gone. The slash commands and selection toolbar are
Notioneer's own. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#history-from-fork-to-port).

## Credits

The header is ported from [make.md](https://github.com/Make-md/makemd), MIT licensed,
Copyright (c) 2022 JP Cen — licence kept in `LICENSE-makemd`. Notioneer itself is GPLv3.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for build setup, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the plugin is structured.
