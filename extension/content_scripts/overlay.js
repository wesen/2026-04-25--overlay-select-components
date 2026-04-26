/**
 * Pyxis Component Extractor - Content Script
 * Provides overlay selection, capture, and storage of component metadata.
 */
(function() {
  'use strict';

  // --- State ---
  let isActive = false;
  let hoveredEl = null;
  let selectedEl = null;
  let selections = [];
  let overlayRoot = null;
  let hoverBox = null;
  let labelEl = null;
  let nameDialog = null;
  let toastEl = null;
  let drawnBoxes = new Map(); // name -> { box, label, selector }
  let loadRetries = 0;
  const MAX_RETRIES = 40; // 20 seconds total (500ms intervals)
  let observer = null;

  // --- Init ---
  function init() {
    createOverlayElements();
    bindEvents();
    loadSelections();
    // Watch for React DOM mutations to catch late-rendered elements
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function createOverlayElements() {
    overlayRoot = document.createElement('div');
    overlayRoot.className = 'px-overlay-root';
    overlayRoot.style.display = 'none';

    hoverBox = document.createElement('div');
    hoverBox.className = 'px-hover-box';
    overlayRoot.appendChild(hoverBox);

    labelEl = document.createElement('div');
    labelEl.className = 'px-label';
    overlayRoot.appendChild(labelEl);

    toastEl = document.createElement('div');
    toastEl.className = 'px-toast';
    overlayRoot.appendChild(toastEl);

    document.body.appendChild(overlayRoot);
  }

  // --- Event Binding ---
  function bindEvents() {
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScrollResize, { passive: true });
    window.addEventListener('resize', onScrollResize, { passive: true });
  }

  // --- Scroll / Resize ---
  function onScrollResize() {
    if (!isActive) return;
    updateAllBoxes();
  }

  function updateAllBoxes() {
    for (const [name, drawn] of drawnBoxes) {
      try {
        const el = document.querySelector(drawn.selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          drawn.box.style.display = 'block';
          drawn.label.style.display = 'block';
          drawn.box.style.left = (rect.left + scrollX) + 'px';
          drawn.box.style.top = (rect.top + scrollY) + 'px';
          drawn.box.style.width = rect.width + 'px';
          drawn.box.style.height = rect.height + 'px';
          drawn.label.style.left = (rect.left + scrollX) + 'px';
          drawn.label.style.top = (rect.top + scrollY - 24) + 'px';
        } else {
          // Element no longer in DOM, hide box
          drawn.box.style.display = 'none';
          drawn.label.style.display = 'none';
        }
      } catch (e) {
        drawn.box.style.display = 'none';
        drawn.label.style.display = 'none';
      }
    }
  }

  // --- Activation ---
  function setActive(active) {
    isActive = active;
    overlayRoot.style.display = active ? 'block' : 'none';
    if (!active) {
      hideHover();
      hideNameDialog();
    }
    showToast(active ? 'Selection mode ON — hover and click to select' : 'Selection mode OFF');
  }

  function toggle() {
    setActive(!isActive);
  }

  // --- Mouse Move / Hover ---
  function onMouseMove(e) {
    if (!isActive || nameDialog) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === hoveredEl || isOverlayElement(el)) return;

    hoveredEl = el;
    showHover(el);
  }

  function showHover(el) {
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    hoverBox.style.left = (rect.left + scrollX) + 'px';
    hoverBox.style.top = (rect.top + scrollY) + 'px';
    hoverBox.style.width = rect.width + 'px';
    hoverBox.style.height = rect.height + 'px';
    hoverBox.style.display = 'block';

    const tag = el.tagName.toLowerCase();
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.split(/\s+/).filter(Boolean).join('.')
      : '';
    const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;

    labelEl.innerHTML = `<span class="px-label-tag">${tag}</span><span class="px-label-class">${cls}</span> <span class="px-label-dim">${dims}</span>`;
    labelEl.style.left = (rect.left + scrollX) + 'px';
    labelEl.style.top = (rect.top + scrollY - 24) + 'px';
    labelEl.style.display = 'block';
  }

  function hideHover() {
    hoverBox.style.display = 'none';
    labelEl.style.display = 'none';
    hoveredEl = null;
  }

  // --- Click / Select ---
  function onClick(e) {
    if (!isActive) return;
    if (nameDialog) return;
    if (isOverlayElement(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOverlayElement(el)) return;

    if (e.shiftKey && el.parentElement && el.parentElement !== document.body) {
      showNameDialog(el.parentElement, e.clientX, e.clientY);
    } else {
      showNameDialog(el, e.clientX, e.clientY);
    }
  }

  // --- Name Dialog ---
  function showNameDialog(el, clientX, clientY) {
    selectedEl = el;
    hideHover();

    nameDialog = document.createElement('div');
    nameDialog.className = 'px-name-dialog';

    const tag = el.tagName.toLowerCase();
    const cls = el.className && typeof el.className === 'string'
      ? el.className.split(/\s+/).filter(Boolean).join(' ')
      : '';
    const rect = el.getBoundingClientRect();

    nameDialog.innerHTML = `
      <h4>Name this component</h4>
      <div class="px-info">${tag}${cls ? ' .' + cls : ''} · ${Math.round(rect.width)}×${Math.round(rect.height)}</div>
      <input type="text" placeholder="e.g. ShowCard, NavBar, Button..." autocomplete="off" />
      <div class="px-buttons">
        <button class="px-cancel">Cancel</button>
        <button class="px-save">Save</button>
      </div>
    `;

    const input = nameDialog.querySelector('input');
    const saveBtn = nameDialog.querySelector('.px-save');
    const cancelBtn = nameDialog.querySelector('.px-cancel');

    saveBtn.addEventListener('click', () => saveSelection(input.value.trim()));
    cancelBtn.addEventListener('click', closeNameDialog);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') saveSelection(input.value.trim());
      if (ev.key === 'Escape') closeNameDialog();
    });

    const dialogW = 260;
    const dialogH = 140;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    let left = clientX + window.scrollX;
    let top = clientY + window.scrollY + 16;
    if (left + dialogW > vpW + window.scrollX) left = vpW + window.scrollX - dialogW - 10;
    if (top + dialogH > vpH + window.scrollY) top = clientY + window.scrollY - dialogH - 10;

    nameDialog.style.left = left + 'px';
    nameDialog.style.top = top + 'px';

    overlayRoot.appendChild(nameDialog);
    input.focus();
  }

  function closeNameDialog() {
    if (nameDialog) {
      nameDialog.remove();
      nameDialog = null;
    }
    selectedEl = null;
  }

  // --- Save Selection ---
  function saveSelection(name) {
    if (!name) {
      showToast('Please enter a component name');
      return;
    }
    if (!selectedEl) return;

    const data = captureElement(selectedEl, name);
    selections.push(data);

    chrome.storage.local.set({ ['px_selections_' + location.href]: selections });
    drawSelectedBox(selectedEl, name, data.selector);

    closeNameDialog();
    showToast(`Saved "${name}" — ${selections.length} on this page`);
  }

  function drawSelectedBox(el, name, selector) {
    // Remove existing box for this name
    removeDrawnBox(name);

    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const box = document.createElement('div');
    box.className = 'px-selected-box';
    box.style.left = (rect.left + scrollX) + 'px';
    box.style.top = (rect.top + scrollY) + 'px';
    box.style.width = rect.width + 'px';
    box.style.height = rect.height + 'px';
    box.dataset.pxName = name;

    const label = document.createElement('div');
    label.className = 'px-label';
    label.innerHTML = `<span class="px-label-tag">${name}</span>`;
    label.style.left = (rect.left + scrollX) + 'px';
    label.style.top = (rect.top + scrollY - 24) + 'px';
    label.style.pointerEvents = 'auto';
    label.title = 'Click to remove';
    label.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSelection(name);
    });

    overlayRoot.appendChild(box);
    overlayRoot.appendChild(label);

    drawnBoxes.set(name, { box, label, selector });
  }

  function removeDrawnBox(name) {
    const drawn = drawnBoxes.get(name);
    if (drawn) {
      drawn.box.remove();
      drawn.label.remove();
      drawnBoxes.delete(name);
    }
  }

  function removeSelection(name) {
    selections = selections.filter(s => s.componentName !== name);
    chrome.storage.local.set({ ['px_selections_' + location.href]: selections });
    removeDrawnBox(name);
    showToast(`Removed "${name}"`);
  }

  // --- Capture ---
  function captureElement(el, name) {
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    const styles = {};

    const keys = [
      'display', 'position', 'flexDirection', 'justifyContent', 'alignItems',
      'gap', 'padding', 'margin', 'borderRadius', 'backgroundColor', 'color',
      'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign',
      'boxShadow', 'border', 'width', 'height', 'minWidth', 'minHeight',
      'maxWidth', 'maxHeight', 'overflow', 'cursor', 'zIndex'
    ];
    for (const k of keys) {
      const val = computed.getPropertyValue(k);
      if (val && val !== 'normal' && val !== 'auto' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
        styles[k] = val;
      }
    }

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      componentName: name,
      pageUrl: location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
      selector: generateSelector(el),
      tagName: el.tagName.toLowerCase(),
      classList: Array.from(el.classList || []),
      attributes: getAttributes(el),
      boundingBox: {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      outerHTML: el.outerHTML.slice(0, 10000),
      innerHTML: el.innerHTML.slice(0, 5000),
      textContent: el.textContent.trim().slice(0, 500),
      computedCSS: styles
    };
  }

  function getAttributes(el) {
    const attrs = {};
    for (const attr of el.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  function generateSelector(el) {
    if (el.dataset) {
      for (const key of Object.keys(el.dataset)) {
        return `[data-${kebabCase(key)}="${el.dataset[key]}"]`;
      }
    }
    if (el.id) return `#${el.id}`;
    const classes = Array.from(el.classList || []).filter(c => !c.startsWith('px-'));
    if (classes.length > 0) {
      const sel = el.tagName.toLowerCase() + '.' + classes.join('.');
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
      const index = siblings.indexOf(el) + 1;
      return generateSelector(parent) + ' > ' + el.tagName.toLowerCase() + ':nth-of-type(' + index + ')';
    }
    return el.tagName.toLowerCase();
  }

  function kebabCase(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  // --- Keyboard ---
  function onKeyDown(e) {
    if (!isActive) return;
    if (e.key === 'Escape') {
      if (nameDialog) {
        closeNameDialog();
      } else {
        setActive(false);
      }
    }
  }

  // --- Toast ---
  let toastTimeout;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('visible'), 2500);
  }

  // --- Overlay check ---
  function isOverlayElement(el) {
    return el.closest && el.closest('.px-overlay-root');
  }

  // --- Storage ---
  function loadSelections() {
    chrome.storage.local.get(['px_selections_' + location.href], (result) => {
      const saved = result['px_selections_' + location.href];
      if (!saved || !Array.isArray(saved) || saved.length === 0) return;

      selections = saved;
      loadRetries = 0;
      attemptDrawSelections();
    });
  }

  function attemptDrawSelections() {
    let foundCount = 0;
    for (const s of selections) {
      try {
        const el = document.querySelector(s.selector);
        if (el) {
          drawSelectedBox(el, s.componentName, s.selector);
          foundCount++;
        }
      } catch (e) {}
    }

    // Retry if not all elements found yet (React may still be rendering)
    if (foundCount < selections.length && loadRetries < MAX_RETRIES) {
      loadRetries++;
      setTimeout(attemptDrawSelections, 500);
    } else if (foundCount === selections.length) {
      showToast(`Restored ${foundCount} selections`);
    } else if (loadRetries >= MAX_RETRIES) {
      showToast(`Restored ${foundCount}/${selections.length} selections (some elements not found)`);
    }
  }

  // Watch for DOM mutations to trigger redraw attempts when React renders
  observer = new MutationObserver((mutations) => {
    if (selections.length > 0 && drawnBoxes.size < selections.length) {
      attemptDrawSelections();
    }
  });

  function importSelections(newSelections) {
    // Clear existing
    for (const name of drawnBoxes.keys()) {
      removeDrawnBox(name);
    }
    selections = newSelections.filter(s => s.pageUrl === location.href);
    chrome.storage.local.set({ ['px_selections_' + location.href]: selections });
    for (const s of selections) {
      try {
        const el = document.querySelector(s.selector);
        if (el) drawSelectedBox(el, s.componentName, s.selector);
      } catch (e) {}
    }
    showToast(`Imported ${selections.length} selections`);
  }

  // --- Message API ---
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'toggle') {
      toggle();
      sendResponse({ active: isActive, count: selections.length });
    }
    if (msg.action === 'getState') {
      sendResponse({ active: isActive, count: selections.length, url: location.href, title: document.title });
    }
    if (msg.action === 'getSelections') {
      sendResponse({ selections });
    }
    if (msg.action === 'clearPage') {
      for (const name of drawnBoxes.keys()) {
        removeDrawnBox(name);
      }
      selections = [];
      chrome.storage.local.remove('px_selections_' + location.href);
      sendResponse({ cleared: true });
    }
    if (msg.action === 'exportManifest') {
      const manifest = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        source: { project: 'pyxis', url: location.href, title: document.title },
        selections
      };
      sendResponse({ manifest });
    }
    if (msg.action === 'importManifest') {
      if (msg.selections && Array.isArray(msg.selections)) {
        importSelections(msg.selections);
        sendResponse({ imported: selections.length });
      } else {
        sendResponse({ error: 'Invalid selections array' });
      }
    }
  });

  // --- Start ---
  init();
})();
