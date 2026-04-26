/**
 * All visual DOM operations: overlay creation, hover boxes, selected boxes, labels, dialogs, toasts.
 */

import { getState, setState } from './state.js';

const Z_OVERLAY = 2147483646;
const Z_TOOLTIP = 2147483647;

export function createOverlay() {
  const s = getState();

  s.overlayRoot = document.createElement('div');
  s.overlayRoot.className = 'px-overlay-root';

  s.hoverBox = document.createElement('div');
  s.hoverBox.className = 'px-hover-box';
  s.overlayRoot.appendChild(s.hoverBox);

  s.labelEl = document.createElement('div');
  s.labelEl.className = 'px-label';
  s.overlayRoot.appendChild(s.labelEl);

  s.toastEl = document.createElement('div');
  s.toastEl.className = 'px-toast';
  s.overlayRoot.appendChild(s.toastEl);

  document.body.appendChild(s.overlayRoot);
}

export function showHover(el) {
  const s = getState();
  const rect = el.getBoundingClientRect();

  s.hoverBox.style.left = rect.left + 'px';
  s.hoverBox.style.top = rect.top + 'px';
  s.hoverBox.style.width = rect.width + 'px';
  s.hoverBox.style.height = rect.height + 'px';
  s.hoverBox.style.display = 'block';

  const tag = el.tagName.toLowerCase();
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.split(/\s+/).filter(Boolean).join('.')
    : '';
  const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;

  s.labelEl.innerHTML = `<span class="px-label-tag">${tag}</span><span class="px-label-class">${cls}</span> <span class="px-label-dim">${dims}</span>`;
  s.labelEl.style.left = rect.left + 'px';
  s.labelEl.style.top = (rect.top - 24) + 'px';
  s.labelEl.style.display = 'block';
}

export function hideHover() {
  const s = getState();
  s.hoverBox.style.display = 'none';
  s.labelEl.style.display = 'none';
  setState({ hoveredEl: null });
}

export function drawSelectedBox(el, id, name, selector) {
  const s = getState();
  removeDrawnBox(id);

  const rect = el.getBoundingClientRect();

  const box = document.createElement('div');
  box.className = 'px-selected-box';
  box.style.left = rect.left + 'px';
  box.style.top = rect.top + 'px';
  box.style.width = rect.width + 'px';
  box.style.height = rect.height + 'px';

  const label = document.createElement('div');
  label.className = 'px-label';
  label.innerHTML = `<span class="px-label-tag">${escapeHtml(name)}</span>`;
  label.style.left = rect.left + 'px';
  label.style.top = (rect.top - 24) + 'px';
  label.style.pointerEvents = 'auto';
  label.title = 'Click to remove';
  label.addEventListener('click', (e) => {
    e.stopPropagation();
    removeSelectionById(id);
  });

  s.overlayRoot.appendChild(box);
  s.overlayRoot.appendChild(label);

  s.drawnBoxes.set(id, { box, label, selector, name });
}

export function removeDrawnBox(id) {
  const s = getState();
  const drawn = s.drawnBoxes.get(id);
  if (drawn) {
    drawn.box.remove();
    drawn.label.remove();
    s.drawnBoxes.delete(id);
  }
}

export function removeSelectionById(id) {
  const s = getState();
  const sel = s.selections.find(sel => sel.id === id);
  if (!sel) return;

  const newSelections = s.selections.filter(sel => sel.id !== id);
  setState({ selections: newSelections });
  removeDrawnBox(id);
  showToast(`Removed "${sel.componentName}"`);
}

export function updateAllBoxes() {
  const s = getState();
  for (const drawn of s.drawnBoxes.values()) {
    try {
      const el = document.querySelector(drawn.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        drawn.box.style.display = 'block';
        drawn.label.style.display = 'block';
        drawn.box.style.left = rect.left + 'px';
        drawn.box.style.top = rect.top + 'px';
        drawn.box.style.width = rect.width + 'px';
        drawn.box.style.height = rect.height + 'px';
        drawn.label.style.left = rect.left + 'px';
        drawn.label.style.top = (rect.top - 24) + 'px';
      } else {
        drawn.box.style.display = 'none';
        drawn.label.style.display = 'none';
      }
    } catch (e) {
      drawn.box.style.display = 'none';
      drawn.label.style.display = 'none';
    }
  }
}

export function clearAllBoxes() {
  const s = getState();
  for (const drawn of s.drawnBoxes.values()) {
    drawn.box.remove();
    drawn.label.remove();
  }
  s.drawnBoxes.clear();
}

export function showNameDialog(el, clientX, clientY, onSave) {
  const s = getState();
  setState({ selectedEl: el });
  hideHover();

  const tag = el.tagName.toLowerCase();
  const cls = el.className && typeof el.className === 'string'
    ? el.className.split(/\s+/).filter(Boolean).join(' ')
    : '';
  const rect = el.getBoundingClientRect();

  const dialog = document.createElement('div');
  dialog.className = 'px-name-dialog';
  dialog.innerHTML = `
    <h4>Name this component</h4>
    <div class="px-info">${tag}${cls ? ' .' + cls : ''} · ${Math.round(rect.width)}×${Math.round(rect.height)}</div>
    <input type="text" placeholder="e.g. ShowCard, NavBar, Button..." autocomplete="off" />
    <div class="px-buttons">
      <button class="px-cancel">Cancel</button>
      <button class="px-save">Save</button>
    </div>
  `;

  const input = dialog.querySelector('input');
  const saveBtn = dialog.querySelector('.px-save');
  const cancelBtn = dialog.querySelector('.px-cancel');

  const close = () => {
    dialog.remove();
    setState({ nameDialog: null });
  };

  saveBtn.addEventListener('click', () => {
    const name = input.value.trim();
    if (name) {
      onSave(name);
      close();
    } else {
      showToast('Please enter a component name');
    }
  });
  cancelBtn.addEventListener('click', close);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      const name = input.value.trim();
      if (name) {
        onSave(name);
        close();
      }
    }
    if (ev.key === 'Escape') close();
  });

  const dialogW = 260;
  const dialogH = 140;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  let left = clientX;
  let top = clientY + 16;
  if (left + dialogW > vpW) left = vpW - dialogW - 10;
  if (top + dialogH > vpH) top = clientY - dialogH - 10;

  dialog.style.left = left + 'px';
  dialog.style.top = top + 'px';

  s.overlayRoot.appendChild(dialog);
  setState({ nameDialog: dialog });
  input.focus();
}

export function closeNameDialog() {
  const s = getState();
  if (s.nameDialog) {
    s.nameDialog.remove();
    setState({ nameDialog: null, selectedEl: null });
  }
}

export function showToast(msg) {
  const s = getState();
  s.toastEl.textContent = msg;
  s.toastEl.classList.add('visible');
  clearTimeout(s.toastTimer);
  s.toastTimer = setTimeout(() => s.toastEl.classList.remove('visible'), 2500);
}

export function isOverlayElement(el) {
  return el.closest && el.closest('.px-overlay-root');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
