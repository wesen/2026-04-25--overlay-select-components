/**
 * Entry point — wires all modules together.
 */

import { getState, setState } from './modules/state.js';
import * as dom from './modules/dom-overlay.js';
import * as events from './modules/events.js';
import * as storage from './modules/storage.js';
import * as messaging from './modules/messaging.js';

async function init() {
  dom.createOverlay();
  events.bindEvents();
  messaging.initMessaging();

  // Load persisted selections
  const saved = await storage.loadSelections();
  if (saved.length > 0) {
    setState({ selections: saved });
    attemptDrawSelections();
  }

  // Watch for React DOM mutations
  const observer = new MutationObserver(() => {
    const s = getState();
    if (s.selections.length > 0 && s.drawnBoxes.size < s.selections.length && !s.drawTimeout) {
      attemptDrawSelections();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setState({ observer });
}

function attemptDrawSelections() {
  const s = getState();
  if (s.drawTimeout) clearTimeout(s.drawTimeout);

  let foundCount = 0;
  for (const sel of s.selections) {
    if (s.drawnBoxes.has(sel.id)) {
      foundCount++;
      continue;
    }
    try {
      const el = document.querySelector(sel.selector);
      if (el) {
        dom.drawSelectedBox(el, sel.id, sel.componentName, sel.selector);
        foundCount++;
      }
    } catch (e) {}
  }

  if (foundCount < s.selections.length && s.loadRetries < 40) {
    setState({ loadRetries: s.loadRetries + 1 });
    setState({ drawTimeout: setTimeout(attemptDrawSelections, 500) });
  } else if (foundCount === s.selections.length) {
    dom.showToast(`Restored ${foundCount} selections`);
  } else {
    dom.showToast(`Restored ${foundCount}/${s.selections.length} selections`);
  }
}

init();
