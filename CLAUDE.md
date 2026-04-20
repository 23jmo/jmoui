# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`jmoui` is a **Claude Code skill specification**, not a runnable package. There is no `package.json`, build, or test runner — the deliverable is `SKILL.md`. Users install it via `npx skills add 23jmo/jmoui -a claude-code`, which pulls this repo from GitHub `main`.

Implication: pushing to `main` ships the skill. Treat edits to `SKILL.md` as publishing.

## Files

- `SKILL.md` — canonical skill source. Frontmatter + implementation flow Claude Code reads at runtime.
- `README.md` — user-facing overview for the GitHub landing page.
- `runtime/` — vendored picker runtime that SKILL.md tells agents to `curl` into target projects. Treated as a library: edits here flow to every new install.
  - `ui-picker.js` — framework-agnostic Web Component. Shadow DOM, drag, collapse, keyboard shortcuts, localStorage persistence.
  - `UIPickerContext.tsx` / `UIPickerContext.jsx` — React context (TS and JS versions kept in sync).
  - `UIPickerOverlay.tsx` / `UIPickerOverlay.jsx` — React wrapper around `<ui-picker>` (TS and JS versions kept in sync).
- `demo.mp4` — demo video (currently untracked in git).

## Editing SKILL.md

- **Frontmatter `description` is load-bearing.** Claude Code uses it to decide when to auto-invoke `/jmoui`. Edits to trigger phrases go there, not the body.
- **Keep code blocks runnable.** The JSX examples are references users may paste — they must stay syntactically valid and self-contained.
- **React-primary.** Don't rewrite examples for Vue/Svelte by default. The "adapt the primitives" note already covers other frameworks.
- **Match the existing voice.** Terse, declarative, no hype, no emoji. Use bold for emphasis sparingly.
- **Don't add unsolicited sections** (Troubleshooting, FAQ, etc.). Keep the doc tight.

## Editing the runtime

- **Agents must not hand-edit runtime files in target projects.** That rule lives in SKILL.md Step 4. If an agent has a tweak, it lands here and ships via the next push — this is how we guarantee every install gets the same UI.
- **Keep `.tsx` and `.jsx` pairs in sync.** `UIPickerContext.{tsx,jsx}` and `UIPickerOverlay.{tsx,jsx}` are identical logic with types stripped. If you change one, update the other in the same commit — we ship both so agents never translate types by hand.
- `ui-picker.js` is deliberately framework-agnostic and has no types to strip. Don't fork it per-framework.

## Testing changes

No local harness. To test: edit `SKILL.md` or `runtime/*`, push to `main`, re-run `npx skills add 23jmo/jmoui -a claude-code` in a target project, `/reload-plugins`, then invoke `/jmoui`. For faster runtime iteration, `cp runtime/ui-picker.js` into a local playground (e.g. `~/jmoui-playground/src/_uipicker/`) and reload the dev server — skips the push → reinstall loop.
