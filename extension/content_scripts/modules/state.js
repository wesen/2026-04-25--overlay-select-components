/**
 * Central reactive state store.
 * Single source of truth for all content-script state.
 */

const state = {
  isActive: false,
  hoveredEl: null,
  selectedEl: null,
  selections: [],
  drawnBoxes: new Map(), // id -> { box, label, selector, name }
  loadRetries: 0,
  drawTimeout: null,
  observer: null,
  overlayRoot: null,
  hoverBox: null,
  labelEl: null,
  nameDialog: null,
  toastEl: null,
  toastTimer: null,
};

const listeners = [];

export function getState() {
  return state;
}

export function setState(partial) {
  Object.assign(state, partial);
  notify(partial);
}

export function addListener(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notify(changed) {
  for (const fn of listeners) {
    try {
      fn(state, changed);
    } catch (e) {
      console.error('[PyxisExtractor] state listener error:', e);
    }
  }
}
