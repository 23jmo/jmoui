# jmoui

A Claude Code skill for live UI variant exploration.

Generate N visual variants of a component, toggle between them on your running dev server via a floating picker (with keyboard shortcuts), pick a winner, and apply it — losing variants and all scaffolding are cleaned up automatically.

## Install

Requires the [`skills`](https://github.com/vercel-labs/skills) CLI (bundled with npx, no install needed):

```sh
npx skills add 23jmo/jmoui -a claude-code
```

Then in Claude Code, run `/reload-plugins` (or restart the session) and `/jmoui` will be available.

## Use

When you're making a UI design decision and want to see a few options live in the app before committing, just ask Claude. Phrases that trigger `/jmoui`:

- "show me 3 variants of the form row"
- "I can't decide between layouts for the hero"
- "try some options for the picker button"

Or invoke directly: `/jmoui`.

## What happens

1. Claude asks a few clarifying questions (target element, design direction, variant count).
2. Copies the component to N sibling files (`Component.variant-a.jsx`, `.variant-b.jsx`, …) with distinct visual directions.
3. Scaffolds a dev-only picker component at the app root — a floating pill fixed to the bottom center of the viewport, with `⌥←/→` to cycle and `⌥1/⌥2/⌥3` to jump.
4. The original file becomes a thin dispatcher that renders the selected variant from context.
5. You toggle between variants in the browser, pick a winner (or combine parts of multiple).
6. Claude applies the winning variant, deletes the losers, and removes all picker scaffolding.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- A client-rendered React SPA with a dev server (Vite recommended — the dev-only gate uses `import.meta.env.DEV`)
- Other frameworks work but the skill's scaffolding examples are React-first — adapt to your stack

## Why

Design decisions are easier to make when you can see and interact with the alternatives, not just imagine them from code. This skill trades a few minutes of generation time for confidence in the direction you pick — and cleans up thoroughly so your diff looks like a single focused edit to one component file, not a mess of throwaway variants.

## License

MIT
