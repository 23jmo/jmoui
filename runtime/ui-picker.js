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
// Keyboard: ⌥←/→ cycles, ⌥1..9 jumps, Escape closes the menu, ⌥Esc collapses.
// Drag: grab anywhere on the pill; after ~8px of movement it enters drag mode.
//   Position persists under `${storageKey}:state` alongside collapsed state.

const DRAG_THRESHOLD_PX = 8;
const COLLAPSED_SIZE_PX = 44;
const SPRING_EASE = 'cubic-bezier(0.34, 1.08, 0.64, 1)';
const EXPAND_MS = 140;
const PANE_FADE_MS = 100;

const CSS = `
:host {
  all: initial;
  color: #fff;
  font: 500 13px/1 system-ui, -apple-system, "SF Pro Text", sans-serif;
  letter-spacing: 0.01em;
}

[data-uip-host] {
  position: fixed;
  bottom: 22px;
  left: 50%;
  --uip-x: 0px;
  --uip-y: 0px;
  transform: translate(calc(${COLLAPSED_SIZE_PX / 2}px - 100% + var(--uip-x)), var(--uip-y));
  z-index: 2147483647;
  touch-action: none;
  cursor: grab;
}
[data-uip-host][data-dragging="true"],
[data-uip-host][data-dragging="true"] * { cursor: grabbing !important; }

[data-uip-root] {
  position: relative;
  display: inline-block;
  overflow: hidden;
  height: ${COLLAPSED_SIZE_PX}px;
  width: ${COLLAPSED_SIZE_PX}px;
  border-radius: 999px;
  background: rgba(22, 22, 28, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.10);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  backdrop-filter: blur(40px) saturate(200%);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.45),
    0 2px 8px rgba(0, 0, 0, 0.24),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.14);
  isolation: isolate;
  user-select: none;
  transition:
    width ${EXPAND_MS}ms ${SPRING_EASE},
    height ${EXPAND_MS}ms ${SPRING_EASE},
    background-color 200ms ease;
}

[data-uip-pane] {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  width: max-content;
  transition:
    opacity ${PANE_FADE_MS}ms ease,
    transform ${EXPAND_MS}ms ${SPRING_EASE};
  will-change: opacity, transform;
}

[data-uip-collapsed-pane] {
  width: ${COLLAPSED_SIZE_PX}px;
  height: ${COLLAPSED_SIZE_PX}px;
  justify-content: center;
  transform-origin: 50% 50%;
}
[data-uip-expanded-pane] {
  padding: 4px;
  white-space: nowrap;
  transform-origin: 100% 50%;
}

[data-uip-root][data-collapsed="true"] [data-uip-collapsed-pane] {
  opacity: 1;
  transform: scale(1);
  transition-delay: 20ms, 0ms;
}
[data-uip-root][data-collapsed="true"] [data-uip-expanded-pane] {
  opacity: 0;
  transform: scale(0.85);
  pointer-events: none;
}
[data-uip-root][data-collapsed="false"] [data-uip-collapsed-pane] {
  opacity: 0;
  transform: scale(0.85);
  pointer-events: none;
}
[data-uip-root][data-collapsed="false"] [data-uip-expanded-pane] {
  opacity: 1;
  transform: scale(1);
  transition-delay: 30ms, 0ms;
}

[data-uip-collapsed-face] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: 600 13px/1 system-ui, -apple-system, sans-serif;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  opacity: 0.92;
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

[data-uip-collapse] {
  padding: 8px 10px;
  opacity: 0.38;
  margin-left: 2px;
}
[data-uip-collapse]:hover { opacity: 0.85; }
[data-uip-collapse] svg { display: block; }

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
  background: rgba(22, 22, 28, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.10);
  -webkit-backdrop-filter: blur(44px) saturate(200%);
  backdrop-filter: blur(44px) saturate(200%);
  box-shadow:
    0 24px 72px rgba(0, 0, 0, 0.55),
    0 4px 16px rgba(0, 0, 0, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.12);
  opacity: 0;
  transform: translate(-50%, 6px) scale(0.97);
  transform-origin: 50% 100%;
  pointer-events: none;
  transition:
    opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 260ms ${SPRING_EASE};
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
  [data-uip-root], [data-uip-pane], [data-uip-menu], [data-uip-btn], [data-uip-caret] {
    transition: none !important;
    animation: none !important;
  }
}
`;

const CHEVRON_LEFT = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 3.5L5.5 7L9 10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_RIGHT = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_UP = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.5 6L5 3.5L7.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COLLAPSE_ICON = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

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

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
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
    this._collapsed = true;
    this._pos = { x: 0, y: 0 };

    this._drag = null;
    this._justFinishedDrag = false;
    this._shell = null;

    this._onKeydown = this._onKeydown.bind(this);
    this._onDocMousedown = this._onDocMousedown.bind(this);
    this._onShadowClick = this._onShadowClick.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWindowResize = this._onWindowResize.bind(this);
  }

  connectedCallback() {
    this._syncFromAttributes();
    this._readStorage();
    if (!this._selected && this._variants[0]) {
      this._selected = this._variants[0].id;
    }
    this._render();
    this._applyPosition();
    window.addEventListener('keydown', this._onKeydown);
    window.addEventListener('mousedown', this._onDocMousedown);
    window.addEventListener('resize', this._onWindowResize);
    this.shadowRoot.addEventListener('click', this._onShadowClick);
    this.shadowRoot.addEventListener('pointerdown', this._onPointerDown);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKeydown);
    window.removeEventListener('mousedown', this._onDocMousedown);
    window.removeEventListener('resize', this._onWindowResize);
    this.shadowRoot.removeEventListener('click', this._onShadowClick);
    this.shadowRoot.removeEventListener('pointerdown', this._onPointerDown);
    if (this._drag) {
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('pointercancel', this._onPointerUp);
      this._drag = null;
    }
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
    this._writeSelectedStorage();
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

  _stateKey() {
    return `${this._storageKey}:state`;
  }

  _readStorage() {
    try {
      const stored = localStorage.getItem(this._storageKey);
      if (stored && this._variants.some((v) => v.id === stored)) {
        this._selected = stored;
      }
    } catch {}
    try {
      const raw = localStorage.getItem(this._stateKey());
      if (raw) {
        const state = JSON.parse(raw);
        if (typeof state.collapsed === 'boolean') this._collapsed = state.collapsed;
        if (state.pos && typeof state.pos.x === 'number' && typeof state.pos.y === 'number') {
          this._pos = { x: state.pos.x, y: state.pos.y };
        }
      }
    } catch {}
  }

  _writeSelectedStorage() {
    try {
      localStorage.setItem(this._storageKey, this._selected);
    } catch {}
  }

  _writeStateStorage() {
    try {
      localStorage.setItem(
        this._stateKey(),
        JSON.stringify({ collapsed: this._collapsed, pos: this._pos }),
      );
    } catch {}
  }

  _setSelectedByUser(id) {
    if (!this._variants.some((v) => v.id === id)) return;
    if (id === this._selected) return;
    this._selected = id;
    this._writeSelectedStorage();
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

  _setCollapsed(next) {
    if (this._collapsed === next) return;
    this._collapsed = next;
    if (next) this._menuOpen = false;
    this._writeStateStorage();
    this._render();
  }

  _onKeydown(e) {
    if (e.altKey && e.key === 'Escape') {
      e.preventDefault();
      this._setCollapsed(true);
      return;
    }
    if (e.key === 'Escape' && this._menuOpen) {
      e.preventDefault();
      this._toggleMenu(false);
      return;
    }
    if (!e.altKey) return;
    if (isTypingContext(e.target)) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (this._collapsed) this._setCollapsed(false);
      this._goNext();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (this._collapsed) this._setCollapsed(false);
      this._goPrev();
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const n = parseInt(e.key, 10) - 1;
      if (n < this._variants.length) {
        e.preventDefault();
        if (this._collapsed) this._setCollapsed(false);
        this._setSelectedByUser(this._variants[n].id);
      }
    }
  }

  _onDocMousedown(e) {
    if (!this._menuOpen) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(this)) this._toggleMenu(false);
  }

  _onPointerDown(e) {
    if (e.button !== 0) return;
    const host = this._shell && this._shell.host;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    this._drag = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: this._pos.x,
      startY: this._pos.y,
      rectWidth: rect.width,
      rectHeight: rect.height,
      moved: false,
      captured: false,
    };
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
  }

  _onPointerMove(e) {
    if (!this._drag || e.pointerId !== this._drag.pointerId) return;
    if (!this._drag.moved) {
      const dx0 = e.clientX - this._drag.startClientX;
      const dy0 = e.clientY - this._drag.startClientY;
      if (Math.hypot(dx0, dy0) < DRAG_THRESHOLD_PX) return;
      this._drag.moved = true;
      this._drag.startClientX = e.clientX;
      this._drag.startClientY = e.clientY;
      this._drag.startX = this._pos.x;
      this._drag.startY = this._pos.y;
      const host = this._shell && this._shell.host;
      if (host) {
        host.setAttribute('data-dragging', 'true');
        try {
          host.setPointerCapture(this._drag.pointerId);
          this._drag.captured = true;
        } catch {}
      }
      if (this._menuOpen) this._toggleMenu(false);
      return;
    }
    const dx = e.clientX - this._drag.startClientX;
    const dy = e.clientY - this._drag.startClientY;
    const nextX = this._drag.startX + dx;
    const nextY = this._drag.startY + dy;
    this._pos = this._clampPos(nextX, nextY, this._drag.rectWidth, this._drag.rectHeight);
    this._applyPosition();
  }

  _onPointerUp(e) {
    if (!this._drag || e.pointerId !== this._drag.pointerId) return;
    const moved = this._drag.moved;
    const captured = this._drag.captured;
    const host = this._shell && this._shell.host;
    if (host) {
      if (captured) {
        try { host.releasePointerCapture(this._drag.pointerId); } catch {}
      }
      host.removeAttribute('data-dragging');
    }
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
    this._drag = null;
    if (moved) {
      this._writeStateStorage();
      this._justFinishedDrag = true;
      requestAnimationFrame(() => { this._justFinishedDrag = false; });
    }
  }

  _onWindowResize() {
    const host = this._shell && this._shell.host;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    this._pos = this._clampPos(this._pos.x, this._pos.y, rect.width, rect.height);
    this._applyPosition();
  }

  _clampPos(x, y, w, h) {
    if (typeof window === 'undefined') return { x, y };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const anchorOffset = COLLAPSED_SIZE_PX / 2;
    const minX = margin - vw / 2 + w - anchorOffset;
    const maxX = vw / 2 - margin - anchorOffset;
    const minY = -(vh - 22 - h - margin);
    const maxY = 22 - margin;
    return { x: clamp(x, minX, maxX), y: clamp(y, minY, maxY) };
  }

  _applyPosition() {
    const host = this._shell && this._shell.host;
    if (!host) return;
    host.style.setProperty('--uip-x', `${this._pos.x}px`);
    host.style.setProperty('--uip-y', `${this._pos.y}px`);
  }

  _onShadowClick(e) {
    if (this._justFinishedDrag) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === 'prev') this._goPrev();
      else if (action === 'next') this._goNext();
      else if (action === 'toggle') this._toggleMenu();
      else if (action === 'collapse') this._setCollapsed(true);
      else if (action === 'expand') this._setCollapsed(false);
      return;
    }
    const option = e.target.closest('[data-uip-option]');
    if (option && option.dataset.variantId) {
      this._setSelectedByUser(option.dataset.variantId);
    }
  }

  _mountShell() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div data-uip-host>
        <div data-uip-root role="group">
          <div data-uip-pane data-uip-collapsed-pane>
            <button type="button" data-uip-collapsed-face data-action="expand">
              <span data-uip-collapsed-fraction></span>
            </button>
          </div>
          <div data-uip-pane data-uip-expanded-pane>
            <button type="button" data-uip-btn data-uip-arrow data-action="prev" aria-label="Previous variant">${CHEVRON_LEFT}</button>
            <button type="button" data-uip-btn data-uip-readout data-action="toggle" aria-haspopup="listbox">
              <span data-uip-fraction></span>
              <span data-uip-name-stack></span>
              <span data-uip-caret>${CHEVRON_UP}</span>
            </button>
            <button type="button" data-uip-btn data-uip-arrow data-action="next" aria-label="Next variant">${CHEVRON_RIGHT}</button>
            <button type="button" data-uip-btn data-uip-collapse data-action="collapse" aria-label="Collapse picker">${COLLAPSE_ICON}</button>
          </div>
        </div>
        <div data-uip-menu role="listbox"></div>
      </div>
    `;
    this._shell = {
      host: this.shadowRoot.querySelector('[data-uip-host]'),
      root: this.shadowRoot.querySelector('[data-uip-root]'),
      collapsedPane: this.shadowRoot.querySelector('[data-uip-collapsed-pane]'),
      expandedPane: this.shadowRoot.querySelector('[data-uip-expanded-pane]'),
      collapsedFaceBtn: this.shadowRoot.querySelector('[data-uip-collapsed-face]'),
      collapsedFraction: this.shadowRoot.querySelector('[data-uip-collapsed-fraction]'),
      fraction: this.shadowRoot.querySelector('[data-uip-fraction]'),
      nameStack: this.shadowRoot.querySelector('[data-uip-name-stack]'),
      readout: this.shadowRoot.querySelector('[data-uip-readout]'),
      caret: this.shadowRoot.querySelector('[data-uip-caret]'),
      prevBtn: this.shadowRoot.querySelector('[data-action="prev"]'),
      nextBtn: this.shadowRoot.querySelector('[data-action="next"]'),
      collapseBtn: this.shadowRoot.querySelector('[data-uip-collapse]'),
      menu: this.shadowRoot.querySelector('[data-uip-menu]'),
    };
  }

  _render() {
    if (!this._variants.length) {
      this.shadowRoot.innerHTML = '';
      this._shell = null;
      return;
    }
    if (!this._shell) this._mountShell();
    const s = this._shell;
    const total = this._variants.length;
    const currentIdx = Math.max(0, this._variants.findIndex((v) => v.id === this._selected));
    const label = this._label;
    const fractionText = `${currentIdx + 1}/${total}`;

    s.root.setAttribute('data-collapsed', String(this._collapsed));
    s.root.setAttribute('aria-label', label);
    s.menu.setAttribute('data-open', String(this._menuOpen));
    s.menu.setAttribute('aria-label', `${label} variants`);
    s.caret.setAttribute('data-open', String(this._menuOpen));
    s.readout.setAttribute('aria-expanded', String(this._menuOpen));
    s.readout.setAttribute('title', label);
    s.prevBtn.setAttribute('title', `Previous variant (\u2325 \u2190)`);
    s.nextBtn.setAttribute('title', `Next variant (\u2325 \u2192)`);
    s.collapseBtn.setAttribute('title', `Collapse (\u2325 Esc)`);
    s.collapsedFaceBtn.setAttribute('title', `${label} — click to expand`);
    s.collapsedFaceBtn.setAttribute('aria-label', `Expand ${label} picker`);

    s.fraction.textContent = fractionText;
    s.collapsedFraction.textContent = fractionText;

    s.nameStack.innerHTML = this._variants
      .map((v) => {
        const active = v.id === this._selected;
        return `<span data-uip-name-slot data-active="${active}" aria-hidden="${!active}">${escapeHTML(v.name)}</span>`;
      })
      .join('');

    s.menu.innerHTML = this._variants
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

    this._updateSize();
    this._applyPosition();
  }

  _updateSize() {
    const s = this._shell;
    if (!s) return;
    if (this._collapsed) {
      s.root.style.width = `${COLLAPSED_SIZE_PX}px`;
      s.root.style.height = `${COLLAPSED_SIZE_PX}px`;
      return;
    }
    const w = s.expandedPane.scrollWidth;
    const h = s.expandedPane.scrollHeight;
    if (w > 0) s.root.style.width = `${w}px`;
    if (h > 0) s.root.style.height = `${h}px`;
  }
  }

  customElements.define('ui-picker', UIPickerElement);
}

defineUIPicker();

export {};
