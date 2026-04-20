---
name: jmoui
description: Use when the user is making a UI design decision and wants to see multiple visual variants live in the running app before committing. Generates N sibling variant files for a target component, scaffolds a floating picker fixed at the bottom-center of the viewport, lets the user toggle between variants on the live dev server, collects their pick via AskUserQuestion, then applies the winner and cleans up the scaffolding. Triggers on phrases like "show me a few options for this", "I can't decide between", "try some variants of", "give me choices for", or any UI change where the user hasn't committed to a direction.
---

# jmoui — UI Variant Picker

Generate visual variants of a UI element, let the user toggle between them live on the running app via a globally-floating picker (fixed at the bottom center of the viewport), then apply the winner.

The picker is mounted once at the app root, so it stays visible regardless of whether the target element is currently rendered, conditionally hidden, or only appearing briefly (dropdowns, modals, route-specific views). That means the user can route around the app and compare variants in any context where the component shows up.

This skill is **React-primary**. For Vue/Svelte/other frameworks, adapt the primitives (Composition API / stores) but follow the same structure. If the project isn't a client-rendered SPA, stop and tell the user this skill assumes live toggling in a dev server.

## Flow

Use `TaskCreate` up front with the 7 steps below so the user can see progress.

### Step 1 — Gather requirements

Use `AskUserQuestion` to clarify anything not already obvious from the conversation. Ask one question with multiple sub-fields if possible, not a chain. Required info:

- **Target element** — which component/file? If the conversation already pinpoints one, confirm rather than re-ask.
- **Design direction** — what's the user exploring? ("more minimal", "denser", "playful", "match brand X"). A vague direction is fine — the point of this skill is exploration.
- **Constraints** — design tokens to respect, accessibility requirements, components to reuse, things to avoid.
- **Variant count** — default 3 (A/B/C). Offer 2, 3, 4, 5.

### Step 2 — Identify the target element and check the stack

```bash
# Confirm it's a Vite/React project (or equivalent)
cat package.json | grep -E '"(react|vue|svelte|next|vite)"' 2>/dev/null
```

Locate the target component file. If the user referenced it loosely ("the form row"), use `Glob`/`Grep` to find the exact path. Confirm the path before writing anything.

If the component is rendered in **many places**, that's fine — the picker attaches to the first rendered instance. Mention this to the user.

### Step 3 — Create sibling variant files

Copy the target component to N siblings alongside the original. **Use the host project's file extension** — `.tsx` for TypeScript projects, `.jsx` otherwise. Examples below show `.jsx`; translate as needed.

```
src/components/forms/FormRow.jsx             (will become the dispatcher)
src/components/forms/FormRow.variant-a.jsx   (new — first variant, usually closest to original)
src/components/forms/FormRow.variant-b.jsx   (new — distinct direction)
src/components/forms/FormRow.variant-c.jsx   (new — distinct direction)
```

**Rules for variant generation:**

- Keep the **public API identical** across all variants — same exports, same props, same prop shapes. Only the internal markup/styles change.
- Make variants **visually distinct**. If three variants only differ in margin values, you've failed — regenerate with real differences in layout, hierarchy, density, typography, or interaction affordances.
- Respect design tokens/the project's style system in every variant. Don't invent one-off hex values if the project uses a token file or Tailwind theme.
- Variant A can stay close to the original if the user wants a "safe baseline + explorations." Variants B and C should push further.

### Step 4 — Scaffold the picker

Don't hand-author the picker. Fetch the canonical runtime from the skill repo so every install gets the same UI.

**Pick the scaffold location before running `curl`:**

- Vite / CRA / anything with `src/`: put it at `src/_uipicker/`.
- Next.js App Router (default, no `src/`): put it at the **repo root** — e.g. `./_uipicker/` next to `app/` and `components/`. Do **not** let `mkdir -p src/_uipicker` create a phantom `src/` folder.

```bash
# adjust SCAFFOLD_DIR to match your project layout (src/_uipicker or _uipicker)
SCAFFOLD_DIR=src/_uipicker
# pick EXT=tsx for TypeScript projects, jsx for JavaScript
EXT=tsx
mkdir -p $SCAFFOLD_DIR
curl -fsSL https://raw.githubusercontent.com/23jmo/jmoui/main/runtime/ui-picker.js -o $SCAFFOLD_DIR/ui-picker.js
curl -fsSL https://raw.githubusercontent.com/23jmo/jmoui/main/runtime/UIPickerContext.$EXT -o $SCAFFOLD_DIR/UIPickerContext.$EXT
curl -fsSL https://raw.githubusercontent.com/23jmo/jmoui/main/runtime/UIPickerOverlay.$EXT -o $SCAFFOLD_DIR/UIPickerOverlay.$EXT
```

What's in the runtime:

- **`ui-picker.js`** — framework-agnostic Web Component (`<ui-picker>`) that owns the picker's visuals, selection state, localStorage persistence, and keyboard shortcuts. Registered lazily (SSR-safe — the class declaration is gated behind a `typeof window` check so Next.js/Remix server renders don't touch `HTMLElement`). Shadow DOM scopes the styles so nothing in the host app leaks in or out.
- **`UIPickerContext`** — React context holding the selected variant id plus the `storageKey`. Mirrors the Web Component's localStorage so React subtrees (the dispatcher shim) can re-render when the user cycles. Marked `'use client'` — harmless in Vite, required in Next.js App Router.
- **`UIPickerOverlay`** — thin React wrapper that renders `<ui-picker>`, forwards `variants` / `label` / `storageKey` as data attributes, listens for the `variant-change` CustomEvent, and pushes React state back onto the element imperatively. Dev-only — renders `null` when `process.env.NODE_ENV !== 'development'`, which both Vite and Next.js inject correctly.

Both `.tsx` and `.jsx` versions are pre-built in the skill repo — pick the matching extension for the target project. **Never hand-edit these files** or translate types yourself: treat them as vendored library code so every install ships the same UI. Tweaks belong in the skill repo.

### Step 5 — Rewrite the original as a dispatcher

The original file (`FormRow.jsx`) becomes a thin shim that reads the selected variant from context and renders it. No refs, no effects, no overlay inside — the overlay is mounted globally at the app root (next step):

```jsx
'use client'; // required in Next.js App Router; harmless in Vite / CRA
import { useUIPicker } from '../../_uipicker/UIPickerContext'; // adjust depth to match your component's location
import FormRowA from './FormRow.variant-a';
import FormRowB from './FormRow.variant-b';
import FormRowC from './FormRow.variant-c';

const VARIANTS = { a: FormRowA, b: FormRowB, c: FormRowC };

export default function FormRow(props) {
  const { selected } = useUIPicker();
  const Component = VARIANTS[selected] || FormRowA;
  return <Component {...props} />;
}
```

Preserve the original file's named exports if it had any (e.g., `export const FormRowHeader = ...`). Re-export them from whichever variant the user is most likely to iterate them in, or from variant A by default. If the original was a named export rather than default, flip the export pattern accordingly.

**Mount the provider and overlay at the app root.** Pass variants as `{ id, name }` pairs — the `name` is the short descriptive label (2–3 words) shown in the picker readout and jump menu:

```jsx
import { UIPickerProvider } from './_uipicker/UIPickerContext';
import { UIPickerOverlay } from './_uipicker/UIPickerOverlay';

// …inside the root render (e.g. src/main.jsx for Vite):
<UIPickerProvider storageKey="ui-picker-FormRow">
  <App />
  <UIPickerOverlay
    label="FormRow"
    variants={[
      { id: 'a', name: 'Stacked compact' },
      { id: 'b', name: 'Inline dense' },
      { id: 'c', name: 'Floating label' },
    ]}
  />
</UIPickerProvider>
```

Pick names that describe the *direction* of each variant, not just "Variant A". They show up in the picker readout — good names make cycling through options feel like a conversation with yourself.

**Next.js App Router variant.** `app/layout.tsx` is a server component (uses `metadata`, `next/font`, etc.) — don't mark it `'use client'`. Instead, create a client-boundary wrapper next to the other runtime files and render it inside `<body>`:

```tsx
// _uipicker/UIPickerRoot.tsx
'use client';
import type { ReactNode } from 'react';
import { UIPickerProvider } from './UIPickerContext';
import { UIPickerOverlay } from './UIPickerOverlay';

export function UIPickerRoot({ children }: { children: ReactNode }) {
  return (
    <UIPickerProvider storageKey="ui-picker-FormRow">
      {children}
      <UIPickerOverlay
        label="FormRow"
        variants={[
          { id: 'a', name: 'Stacked compact' },
          { id: 'b', name: 'Inline dense' },
          { id: 'c', name: 'Floating label' },
        ]}
      />
    </UIPickerProvider>
  );
}

// app/layout.tsx — wrap {children} inside <body>
// <body><UIPickerRoot>{children}</UIPickerRoot></body>
```

The overlay is `position: fixed` at the bottom-center of the viewport with a high `z-index`, so it floats above everything — including modals, popovers, and fullscreen layouts. It persists across route changes because it's mounted outside the routed tree.

### Step 6 — Collect the user's pick

Check if the dev server is running (`lsof -i :PORT` or check for an existing process); if not, start it in the background (`npm run dev` / `bun dev` / whatever `package.json` declares). Note the URL.

**Do not add a separate "let me know when you're done" message.** That creates two blocking waits stacked — one for the user's chat reply, another for `AskUserQuestion`. Fire `AskUserQuestion` immediately — the question itself is the blocking wait, and the user can take as long as they need to browse before picking an option.

Use `AskUserQuestion` with the URL, shortcuts, and options all packaged into one question:

> "Variants are live at http://localhost:PORT. Picker is fixed at the bottom center — click chips or use **⌥←/→** to cycle, **⌥1/⌥2/⌥3** to jump directly. It stays visible across routes, modals, and anywhere `<Component>` renders. Which direction wins?"

Options:
- A) Variant A — [one-line description of what makes it distinct]
- B) Variant B — [description]
- C) Variant C — [description]
- D) Combine — I'll ask which parts to merge
- E) None of these — regenerate with new direction

If D: ask a follow-up `AskUserQuestion` for specifics ("header from A, body from B, spacing from C") and write a fresh merged component.
If E: ask for a new direction and return to Step 3 (keep existing scaffolding, overwrite variant files).

### Step 7 — Apply the winner and clean up

Once the user picks (or the combination is written):

1. **Overwrite the original file** with the winning variant's contents (or the new merged component). Remove the dispatcher shim, the `useUIPicker`/overlay imports, and the `'use client'` directive if the original didn't have one.
2. **Delete** all `*.variant-*.{jsx,tsx}` sibling files.
3. **Remove** the scaffold directory (`src/_uipicker/` for Vite, `_uipicker/` for Next).
4. **Revert** the provider wrap: Vite — restore `src/main.{jsx,tsx}`; Next — delete `UIPickerRoot.tsx` and unwrap `{children}` inside `app/layout.tsx`.
5. **Clean up localStorage key** — tell the user they can run `localStorage.removeItem('ui-picker-...')` in devtools, or add a one-liner to the cleanup (e.g., inject a `<script>` that clears it once — but usually not worth it).
6. Confirm all variant files and scaffolding are gone with `Glob` for `**/*.variant-*.*` and `**/UIPicker*.{jsx,tsx}`.

Report back: "Applied variant X. Cleaned up scaffolding. Diff: [list of files changed]."

## Principles

- **Visual distinctness > polish.** Three nearly-identical variants waste the user's time. Push the range.
- **Keep the public API stable.** Nothing downstream should break regardless of which variant wins.
- **Scaffolding must vanish.** After cleanup, the diff should look like a normal focused edit to one component file — no trace of the picker machinery.
- **No surrounding refactors.** If you notice adjacent code smells, note them to the user but don't touch them. This skill changes one element at a time.
- **Respect existing tokens.** If the project has a design system, every variant uses it. Don't invent a new palette for the exercise.
