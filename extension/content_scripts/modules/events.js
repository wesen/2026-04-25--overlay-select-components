/**
 * Mouse, keyboard, scroll/resize event handlers.
 */

import { getState, setState } from './state.js';
import * as dom from './dom-overlay.js';
import * as capture from './capture.js';
import * as storage from './storage.js';

export function bindEvents() {
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('scroll', onScrollResize, { passive: true });
  window.addEventListener('resize', onScrollResize, { passive: true });
}

function onMouseMove(e) {
  const s = getState();
  if (!s.isActive || s.nameDialog) return;

  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === s.hoveredEl || dom.isOverlayElement(el)) return;

  setState({ hoveredEl: el });
  dom.showHover(el);
}

function onClick(e) {
  const s = getState();
  if (!s.isActive) return;
  if (s.nameDialog) return;
  if (dom.isOverlayElement(e.target)) return;

  e.preventDefault();
  e.stopPropagation();

  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || dom.isOverlayElement(el)) return;

  const targetEl = (e.shiftKey && el.parentElement && el.parentElement !== document.body)
    ? el.parentElement
    : el;

  dom.showNameDialog(targetEl, e.clientX, e.clientY, (name) => {
    const data = capture.captureElement(targetEl, name);
    const newSelections = [...s.selections, data];
    setState({ selections: newSelections });
    storage.saveSelections(newSelections);
    dom.drawSelectedBox(targetEl, data.id, name, data.selector);
    dom.showToast(`Saved "${name}" — ${newSelections.length} on this page`);
  });
}

function onKeyDown(e) {
  const s = getState();
  if (!s.isActive) return;
  if (e.key === 'Escape') {
    if (s.nameDialog) {
      dom.closeNameDialog();
    } else {
      setState({ isActive: false });
      dom.hideHover();
      dom.closeNameDialog();
    }
  }
}

function onScrollResize() {
  dom.updateAllBoxes();
}
