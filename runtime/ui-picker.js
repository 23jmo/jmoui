// <ui-picker> — framework-agnostic variant picker for jmoui.
// Mount anywhere in the DOM:
//   <ui-picker
//     data-variants='[{"id":"a","name":"Minimal"},{"id":"b","name":"Bold"}]'
//     data-label="HeroCTA"
//     data-storage-key="ui-picker-HeroCTA"
//   ></ui-picker>
//
// Reads/writes selection to localStorage under data-storage-key.
// Emits CustomEvent('variant-change', { detail: { id, variant } }) — bubbles, composed.
// Imperative: el.value = 'b' sets selection WITHOUT firing the event (for adapters).
// Keyboard: ⌥←/→ cycles, ⌥1..9 jumps, Escape closes the menu.

const CSS = `
:host {
  all: initial;
  color: #fff;
  font: 500 13px/1 system-ui, -apple-system, "SF Pro Text", sans-serif;
  letter-spacing: 0.01em;
}

[data-uip-root] {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: inline-flex;
  align-items: stretch;
  padding: 4px;
  user-select: none;
  border-radius: 999px;
  background: rgba(18, 18, 22, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.40),
    0 2px 8px rgba(0, 0, 0, 0.20),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.10);
  isolation: isolate;
}

[data-uip-btn] {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  transition:
    background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease,
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
  -webkit-tap-highlight-color: transparent;
}
[data-uip-btn]:hover { background: rgba(255, 255, 255, 0.07); }
[data-uip-btn]:active { background: rgba(255, 255, 255, 0.12); transform: scale(0.97); }
[data-uip-btn]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.55);
}

[data-uip-arrow] { padding: 8px 10px; opacity: 0.7; }
[data-uip-arrow]:hover { opacity: 1; }
[data-uip-arrow] svg { display: block; }

[data-uip-readout] { padding: 8px 14px; }

[data-uip-fraction] {
  opacity: 0.48;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  line-height: 1;
  letter-spacing: 0.02em;
}

[data-uip-name-stack] {
  display: inline-grid;
  grid-template-areas: "name";
  align-items: center;
  max-width: 200px;
}
[data-uip-name-slot] {
  grid-area: name;
  min-width: 0;
  max-width: 200px;
  opacity: 0;
  visibility: hidden;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    opacity 40ms linear,
    visibility 0s linear 40ms;
}
[data-uip-name-slot][data-active="true"] {
  opacity: 1;
  visibility: visible;
  transition:
    opacity 40ms linear,
    visibility 0s linear 0s;
}

[data-uip-caret] {
  display: inline-flex;
  opacity: 0.45;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease;
}
[data-uip-btn]:hover [data-uip-caret] { opacity: 0.8; }
[data-uip-caret][data-open="true"] { transform: rotate(180deg); }

[data-uip-menu] {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  min-width: 240px;
  padding: 0;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(18, 18, 22, 0.70);
  border: 1px solid rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  backdrop-filter: blur(28px) saturate(180%);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.50),
    0 4px 16px rgba(0, 0, 0, 0.25),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
  opacity: 0;
  transform: translate(-50%, 6px) scale(0.97);
  transform-origin: 50% 100%;
  pointer-events: none;
  transition:
    opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
[data-uip-menu][data-open="true"] {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
  pointer-events: auto;
}

[data-uip-option] {
  width: 100%;
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 0;
  background: transparent;
  color: #fff;
  font: 500 13px/1 system-ui, -apple-system, sans-serif;
  cursor: pointer;
  text-align: left;
  transition: background-color 140ms ease;
}
[data-uip-option]:hover { background: rgba(255, 255, 255, 0.06); }
[data-uip-option][data-active="true"] {
  background: linear-gradient(180deg, rgba(129, 140, 248, 0.24), rgba(99, 102, 241, 0.18));
}
[data-uip-option][data-active="true"]:hover {
  background: linear-gradient(180deg, rgba(129, 140, 248, 0.32), rgba(99, 102, 241, 0.24));
}
[data-uip-option-num] { opacity: 0.48; font-variant-numeric: tabular-nums; font-size: 13px; line-height: 1; }
[data-uip-option-hint] { opacity: 0.4; font-size: 13px; line-height: 1; font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  [data-uip-root] *, [data-uip-menu] { transition: none !important; animation: none !important; }
}
`;

const CHEVRON_LEFT = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 3.5L5.5 7L9 10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_RIGHT = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_UP = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.5 6L5 3.5L7.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function isTypingContext(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function defineUIPicker() {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('ui-picker')) return;

  class UIPickerElement extends HTMLElement {
  static get observedAttributes() {
    return ['data-variants', 'data-label', 'data-storage-key'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._variants = [];
    this._label = 'Picker';
    this._storageKey = 'ui-picker';
    this._selected = '';
    this._menuOpen = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._onDocMousedown = this._onDocMousedown.bind(this);
    this._onShadowClick = this._onShadowClick.bind(this);
  }

  connectedCallback() {
    this._syncFromAttributes();
    this._readStorage();
    if (!this._selected && this._variants[0]) {
      this._selected = this._variants[0].id;
    }
    this._render();
    window.addEventListener('keydown', this._onKeydown);
    window.addEventListener('mousedown', this._onDocMousedown);
    this.shadowRoot.addEventListener('click', this._onShadowClick);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKeydown);
    window.removeEventListener('mousedown', this._onDocMousedown);
    this.shadowRoot.removeEventListener('click', this._onShadowClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    this._syncFromAttributes();
    if (this._variants.length && !this._variants.some((v) => v.id === this._selected)) {
      this._selected = this._variants[0].id;
    }
    if (this.isConnected) this._render();
  }

  get value() {
    return this._selected;
  }

  set value(id) {
    if (typeof id !== 'string' || !this._variants.some((v) => v.id === id)) return;
    if (id === this._selected) return;
    this._selected = id;
    this._writeStorage();
    if (this.isConnected) this._render();
  }

  _syncFromAttributes() {
    try {
      const raw = this.dataset.variants;
      this._variants = raw ? JSON.parse(raw) : [];
    } catch {
      this._variants = [];
    }
    this._label = this.dataset.label || 'Picker';
    this._storageKey = this.dataset.storageKey || 'ui-picker';
  }

  _readStorage() {
    try {
      const stored = localStorage.getItem(this._storageKey);
      if (stored && this._variants.some((v) => v.id === stored)) {
        this._selected = stored;
      }
    } catch {}
  }

  _writeStorage() {
    try {
      localStorage.setItem(this._storageKey, this._selected);
    } catch {}
  }

  _setSelectedByUser(id) {
    if (!this._variants.some((v) => v.id === id)) return;
    if (id === this._selected) return;
    this._selected = id;
    this._writeStorage();
    this._render();
    this.dispatchEvent(
      new CustomEvent('variant-change', {
        detail: {
          id,
          variant: this._variants.find((v) => v.id === id),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  _goPrev() {
    if (!this._variants.length) return;
    const idx = Math.max(0, this._variants.findIndex((v) => v.id === this._selected));
    const next = (idx - 1 + this._variants.length) % this._variants.length;
    this._setSelectedByUser(this._variants[next].id);
  }

  _goNext() {
    if (!this._variants.length) return;
    const idx = Math.max(0, this._variants.findIndex((v) => v.id === this._selected));
    const next = (idx + 1) % this._variants.length;
    this._setSelectedByUser(this._variants[next].id);
  }

  _toggleMenu(force) {
    this._menuOpen = typeof force === 'boolean' ? force : !this._menuOpen;
    this._render();
  }

  _onKeydown(e) {
    if (e.key === 'Escape' && this._menuOpen) {
      e.preventDefault();
      this._toggleMenu(false);
      return;
    }
    if (!e.altKey) return;
    if (isTypingContext(e.target)) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this._goNext();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._goPrev();
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const n = parseInt(e.key, 10) - 1;
      if (n < this._variants.length) {
        e.preventDefault();
        this._setSelectedByUser(this._variants[n].id);
      }
    }
  }

  _onDocMousedown(e) {
    if (!this._menuOpen) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(this)) this._toggleMenu(false);
  }

  _onShadowClick(e) {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === 'prev') this._goPrev();
      else if (action === 'next') this._goNext();
      else if (action === 'toggle') this._toggleMenu();
      return;
    }
    const option = e.target.closest('[data-uip-option]');
    if (option && option.dataset.variantId) {
      this._setSelectedByUser(option.dataset.variantId);
    }
  }

  _render() {
    if (!this._variants.length) {
      this.shadowRoot.innerHTML = '';
      return;
    }
    const total = this._variants.length;
    const currentIdx = Math.max(0, this._variants.findIndex((v) => v.id === this._selected));
    const label = escapeHTML(this._label);

    const slots = this._variants
      .map((v) => {
        const active = v.id === this._selected;
        return `<span data-uip-name-slot data-active="${active}" aria-hidden="${!active}">${escapeHTML(v.name)}</span>`;
      })
      .join('');

    const options = this._variants
      .map((v, i) => {
        const active = v.id === this._selected;
        return `
          <button
            type="button"
            role="option"
            aria-selected="${active}"
            data-uip-option
            data-active="${active}"
            data-variant-id="${escapeHTML(v.id)}"
          >
            <span data-uip-option-num>${i + 1}/${total}</span>
            <span>${escapeHTML(v.name)}</span>
            <span data-uip-option-hint>\u2325${i + 1}</span>
          </button>
        `;
      })
      .join('');

    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div data-uip-root role="group" aria-label="${label}">
        <button type="button" data-uip-btn data-uip-arrow data-action="prev" title="Previous variant (\u2325 \u2190)" aria-label="Previous variant">${CHEVRON_LEFT}</button>
        <button
          type="button"
          data-uip-btn
          data-uip-readout
          data-action="toggle"
          aria-haspopup="listbox"
          aria-expanded="${this._menuOpen}"
          title="${label}"
        >
          <span data-uip-fraction>${currentIdx + 1}/${total}</span>
          <span data-uip-name-stack>${slots}</span>
          <span data-uip-caret data-open="${this._menuOpen}">${CHEVRON_UP}</span>
        </button>
        <button type="button" data-uip-btn data-uip-arrow data-action="next" title="Next variant (\u2325 \u2192)" aria-label="Next variant">${CHEVRON_RIGHT}</button>
        <div
          data-uip-menu
          data-open="${this._menuOpen}"
          role="listbox"
          aria-label="${label} variants"
        >${options}</div>
      </div>
    `;
  }
  }

  customElements.define('ui-picker', UIPickerElement);
}

defineUIPicker();

export {};
