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

Copy the target component to N siblings alongside the original:

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

Create two files under `src/_uipicker/` (underscore prefix signals it's scaffolding, not production code):

**`src/_uipicker/UIPickerContext.jsx`** — React context that holds the selected variant, persisted to `localStorage`:

```jsx
import { createContext, useContext, useState, useCallback } from 'react';

const UIPickerContext = createContext(null);

export function UIPickerProvider({ children, storageKey = 'ui-picker', defaultVariant = 'a' }) {
  const [selected, setSelectedState] = useState(() => {
    if (typeof window === 'undefined') return defaultVariant;
    return localStorage.getItem(storageKey) || defaultVariant;
  });

  const setSelected = useCallback((v) => {
    setSelectedState(v);
    try { localStorage.setItem(storageKey, v); } catch {}
  }, [storageKey]);

  return (
    <UIPickerContext.Provider value={{ selected, setSelected }}>
      {children}
    </UIPickerContext.Provider>
  );
}

export function useUIPicker() {
  const ctx = useContext(UIPickerContext);
  if (!ctx) throw new Error('useUIPicker must be used inside UIPickerProvider');
  return ctx;
}
```

**`src/_uipicker/UIPickerOverlay.jsx`** — fixed floating panel at the bottom center of the viewport. No anchoring logic, no ref tracking, no observers. Always visible in dev. Keyboard shortcuts: **Option/Alt + ←/→** to cycle variants, **Option/Alt + 1..9** to jump directly. Shortcuts are suppressed when the user is typing in an input/textarea/contenteditable so they don't hijack native word-jump behavior:

```jsx
import { useEffect } from 'react';
import { useUIPicker } from './UIPickerContext.jsx';

function isTypingContext(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function UIPickerOverlay({ variants, label }) {
  const { selected, setSelected } = useUIPicker();

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e) => {
      if (!e.altKey) return;
      if (isTypingContext(e.target)) return;

      const idx = variants.indexOf(selected);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelected(variants[(idx + 1) % variants.length]);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelected(variants[(idx - 1 + variants.length) % variants.length]);
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (n < variants.length) {
          e.preventDefault();
          setSelected(variants[n]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variants, selected, setSelected]);

  if (!import.meta.env.DEV) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: 'rgba(17, 17, 17, 0.92)',
        color: '#fff',
        borderRadius: 999,
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <span style={{ opacity: 0.6, letterSpacing: 0.3 }}>{label}</span>
      {variants.map((v, i) => (
        <button
          key={v}
          onClick={() => setSelected(v)}
          title={`⌥${i + 1}`}
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            border: selected === v ? '1px solid #818cf8' : '1px solid transparent',
            cursor: 'pointer',
            background: selected === v ? '#4f46e5' : 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontWeight: selected === v ? 600 : 400,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {v}
        </button>
      ))}
      <span style={{ opacity: 0.4, fontSize: 10, marginLeft: 4 }}>⌥ ←/→</span>
    </div>
  );
}
```

### Step 5 — Rewrite the original as a dispatcher

The original file (`FormRow.jsx`) becomes a thin shim that reads the selected variant from context and renders it. No refs, no effects, no overlay inside — the overlay is mounted globally at the app root (next step):

```jsx
import { useUIPicker } from '../../_uipicker/UIPickerContext.jsx';
import FormRowA from './FormRow.variant-a.jsx';
import FormRowB from './FormRow.variant-b.jsx';
import FormRowC from './FormRow.variant-c.jsx';

const VARIANTS = { a: FormRowA, b: FormRowB, c: FormRowC };

export default function FormRow(props) {
  const { selected } = useUIPicker();
  const Component = VARIANTS[selected] || FormRowA;
  return <Component {...props} />;
}
```

Preserve the original file's named exports if it had any (e.g., `export const FormRowHeader = ...`). Re-export them from whichever variant the user is most likely to iterate them in, or from variant A by default. If the original was a named export rather than default, flip the export pattern accordingly.

**Mount the provider AND the overlay at the app root.** Edit `src/main.jsx` (or the app's root file). The overlay lives next to the app tree — it doesn't wrap it — so it renders regardless of the current route, modal state, or whether the target component is even mounted:

```jsx
import { UIPickerProvider } from './_uipicker/UIPickerContext.jsx';
import { UIPickerOverlay } from './_uipicker/UIPickerOverlay.jsx';

// …inside the root render:
<UIPickerProvider storageKey="ui-picker-FormRow">
  <App />
  <UIPickerOverlay variants={['a', 'b', 'c']} label="FormRow" />
</UIPickerProvider>
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

1. **Overwrite the original file** with the winning variant's contents (or the new merged component). Remove the dispatcher shim, the `useUIPicker`/overlay imports, and the wrapper div.
2. **Delete** all `*.variant-*.jsx` sibling files.
3. **Remove** the `src/_uipicker/` directory.
4. **Revert** the provider wrap in `main.jsx` (restore original structure).
5. **Clean up localStorage key** — tell the user they can run `localStorage.removeItem('ui-picker-...')` in devtools, or add a one-liner to the cleanup (e.g., inject a `<script>` that clears it once — but usually not worth it).
6. Confirm all variant files and scaffolding are gone with `Glob` for `**/*.variant-*.*` and `**/UIPicker*.jsx`.

Report back: "Applied variant X. Cleaned up scaffolding. Diff: [list of files changed]."

## Principles

- **Visual distinctness > polish.** Three nearly-identical variants waste the user's time. Push the range.
- **Keep the public API stable.** Nothing downstream should break regardless of which variant wins.
- **Scaffolding must vanish.** After cleanup, the diff should look like a normal focused edit to one component file — no trace of the picker machinery.
- **No surrounding refactors.** If you notice adjacent code smells, note them to the user but don't touch them. This skill changes one element at a time.
- **Respect existing tokens.** If the project has a design system, every variant uses it. Don't invent a new palette for the exercise.
