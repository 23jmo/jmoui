# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`jmoui` is a **Claude Code skill specification**, not a runnable package. There is no `package.json`, build, or test runner — the deliverable is `SKILL.md`. Users install it via `npx skills add 23jmo/jmoui -a claude-code`, which pulls this repo from GitHub `main`.

Implication: pushing to `main` ships the skill. Treat edits to `SKILL.md` as publishing.

## Files

- `SKILL.md` — canonical skill source. Frontmatter + implementation flow Claude Code reads at runtime.
- `README.md` — user-facing overview for the GitHub landing page.
- `demo.mp4` — demo video (currently untracked in git).

## Editing SKILL.md

- **Frontmatter `description` is load-bearing.** Claude Code uses it to decide when to auto-invoke `/jmoui`. Edits to trigger phrases go there, not the body.
- **Keep code blocks runnable.** The JSX examples are references users may paste — they must stay syntactically valid and self-contained.
- **React-primary.** Don't rewrite examples for Vue/Svelte by default. The "adapt the primitives" note already covers other frameworks.
- **Match the existing voice.** Terse, declarative, no hype, no emoji. Use bold for emphasis sparingly.
- **Don't add unsolicited sections** (Troubleshooting, FAQ, etc.). Keep the doc tight.

## Testing changes

No local harness. To test: edit `SKILL.md`, push to `main`, re-run `npx skills add 23jmo/jmoui -a claude-code` in a target project, `/reload-plugins`, then invoke `/jmoui`.
