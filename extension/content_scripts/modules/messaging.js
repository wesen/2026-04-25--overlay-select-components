/**
 * Chrome runtime message handlers.
 */

import { getState, setState } from './state.js';
import * as dom from './dom-overlay.js';
import * as capture from './capture.js';
import * as storage from './storage.js';

export function initMessaging() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const s = getState();

    if (msg.action === 'toggle') {
      const newActive = !s.isActive;
      setState({ isActive: newActive });
      if (!newActive) {
        dom.hideHover();
        dom.closeNameDialog();
      }
      dom.showToast(newActive ? 'Selection mode ON — hover and click to select' : 'Selection mode OFF');
      sendResponse({ active: newActive, count: s.selections.length });
    }

    if (msg.action === 'getState') {
      sendResponse({
        active: s.isActive,
        count: s.selections.length,
        url: location.href,
        title: document.title
      });
    }

    if (msg.action === 'getSelections') {
      sendResponse({ selections: s.selections });
    }

    if (msg.action === 'clearPage') {
      dom.clearAllBoxes();
      setState({ selections: [] });
      storage.clearSelections();
      sendResponse({ cleared: true });
    }

    if (msg.action === 'exportManifest') {
      const manifest = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        source: { project: 'pyxis', url: location.href, title: document.title },
        selections: s.selections
      };
      sendResponse({ manifest });
    }

    if (msg.action === 'exportSimple') {
      const simple = s.selections.map(sel => ({
        name: sel.componentName,
        selector: sel.selector,
        tag: sel.tagName,
        note: sel.note || ''
      }));
      sendResponse({ components: simple });
    }

    if (msg.action === 'importManifest') {
      importManifest(msg).then(result => sendResponse(result));
      return true; // async
    }
  });
}

async function importManifest(msg) {
  // Full format: { selections: [...] }
  if (msg.selections && Array.isArray(msg.selections)) {
    await importSelections(msg.selections);
    return { imported: getState().selections.length };
  }

  // Simple LLM format: { components: [{ name, selector, note? }] }
  if (msg.components && Array.isArray(msg.components)) {
    const s = getState();
    dom.clearAllBoxes();
    const newSelections = [];
    let foundCount = 0;
    let missingCount = 0;

    for (const comp of msg.components) {
      const selector = comp.selector;
      const name = comp.name || comp.componentName || 'Unnamed';
      try {
        const el = document.querySelector(selector);
        if (el) {
          const data = capture.captureElement(el, name);
          data.note = comp.note || '';
          newSelections.push(data);
          foundCount++;
        } else {
          missingCount++;
        }
      } catch (e) {
        missingCount++;
      }
    }

    setState({ selections: newSelections, loadRetries: 0 });
    await storage.saveSelections(newSelections);
    attemptDrawSelections();

    return {
      imported: newSelections.length,
      found: foundCount,
      missing: missingCount
    };
  }

  return { error: 'Invalid format. Expected { selections: [...] } or { components: [...] }' };
}

async function importSelections(newSelections) {
  dom.clearAllBoxes();
  const filtered = newSelections.filter(sel => sel.pageUrl === location.href);
  setState({ selections: filtered, loadRetries: 0 });
  await storage.saveSelections(filtered);
  attemptDrawSelections();
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
