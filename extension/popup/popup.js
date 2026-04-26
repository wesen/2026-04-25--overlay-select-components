/**
 * Pyxis Component Extractor - Popup Script
 */
document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const exportSimpleBtn = document.getElementById('exportSimpleBtn');
  const exportPngsBtn = document.getElementById('exportPngsBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const countBadge = document.getElementById('countBadge');
  const pageInfo = document.getElementById('pageInfo');
  const selectionsList = document.getElementById('selectionsList');

  let activeTab = null;
  let isActive = false;
  let selections = [];

  // Get active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tabs[0];

  // Load state from content script
  async function refresh() {
    if (!activeTab) return;
    try {
      const state = await chrome.tabs.sendMessage(activeTab.id, { action: 'getState' });
      isActive = state.active;
      updateToggleButton();
      pageInfo.textContent = state.title || state.url || '—';
    } catch (e) {
      pageInfo.textContent = 'Extension not active on this page';
      toggleBtn.disabled = true;
      clearBtn.disabled = true;
    }

    try {
      const sel = await chrome.tabs.sendMessage(activeTab.id, { action: 'getSelections' });
      selections = sel.selections || [];
      renderSelections();
    } catch (e) {
      selections = [];
      renderSelections();
    }
  }

  function updateToggleButton() {
    toggleBtn.textContent = isActive ? '⏹ Stop Selecting' : '▶ Start Selecting';
    toggleBtn.classList.toggle('active', isActive);
  }

  function renderSelections() {
    countBadge.textContent = selections.length;
    if (selections.length === 0) {
      selectionsList.innerHTML = '<div class="empty">No selections yet. Click "Start Selecting" and click on page elements.</div>';
      return;
    }

    selectionsList.innerHTML = selections.map((s, idx) => `
      <div class="selection-item">
        ${s.pngDataUrl ? `<img class="png-thumb" src="${s.pngDataUrl}" title="${escapeHtml(s.componentName)}" />` : '<div class="png-thumb" style="background:#f5f5f5;"></div>'}
        <div style="flex:1;min-width:0;">
          <div class="selection-name">${escapeHtml(s.componentName)}</div>
          <div class="selection-meta">${s.tagName}${s.classList.length ? ' .' + s.classList.slice(0, 3).join('.') : ''} · ${s.boundingBox.width}×${s.boundingBox.height}</div>
        </div>
        <div class="selection-actions">
          ${s.pngDataUrl ? `<button class="icon-btn" title="Download PNG" data-idx="${idx}" data-action="png">🖼️</button>` : ''}
          <button class="icon-btn" title="Copy selector" data-idx="${idx}" data-action="copy">📋</button>
          <button class="icon-btn" title="Remove" data-idx="${idx}" data-action="remove">🗑</button>
        </div>
      </div>
    `).join('');

    selectionsList.querySelectorAll('.icon-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const action = btn.dataset.action;
        if (action === 'copy') {
          const sel = selections[idx].selector;
          await navigator.clipboard.writeText(sel);
          btn.textContent = '✓';
          setTimeout(() => btn.textContent = '📋', 1000);
        }
        if (action === 'png' && selections[idx].pngDataUrl) {
          downloadDataUrl(selections[idx].pngDataUrl, `${selections[idx].componentName}.png`);
        }
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Toggle selection mode
  toggleBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    try {
      const resp = await chrome.tabs.sendMessage(activeTab.id, { action: 'toggle' });
      isActive = resp.active;
      updateToggleButton();
      refresh();
    } catch (e) {
      pageInfo.textContent = 'Could not communicate with page. Reload and try again.';
    }
  });

  // Clear page selections
  clearBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    if (!confirm('Clear all selections on this page?')) return;
    try {
      await chrome.tabs.sendMessage(activeTab.id, { action: 'clearPage' });
      refresh();
    } catch (e) {}
  });

  // Import manifest
  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const manifest = JSON.parse(text);
      if (!activeTab) return;
      const resp = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'importManifest',
        selections: manifest.selections,
        components: manifest.components
      });
      if (resp.error) {
        alert('Import failed: ' + resp.error);
      } else if (resp.missing > 0) {
        showToast(`Imported ${resp.imported} (${resp.found} found, ${resp.missing} missing)`);
        refresh();
      } else {
        showToast(`Imported ${resp.imported} selections`);
        refresh();
      }
    } catch (e) {
      alert('Invalid JSON file: ' + e.message);
    }
    importFile.value = '';
  });

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;z-index:9999;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  // Export all PNGs
  exportPngsBtn.addEventListener('click', async () => {
    const pngs = selections.filter(s => s.pngDataUrl);
    if (pngs.length === 0) {
      showToast('No PNGs captured yet');
      return;
    }
    for (const s of pngs) {
      downloadDataUrl(s.pngDataUrl, `${s.componentName}.png`);
      await new Promise(r => setTimeout(r, 100)); // throttle downloads
    }
    showToast(`Downloaded ${pngs.length} PNGs`);
  });

  // Export full manifest
  exportBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    try {
      const resp = await chrome.tabs.sendMessage(activeTab.id, { action: 'exportManifest' });
      const manifest = resp.manifest;
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pyxis-components-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  });

  // Export simple LLM format
  exportSimpleBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    try {
      const resp = await chrome.tabs.sendMessage(activeTab.id, { action: 'exportSimple' });
      const simple = { components: resp.components };
      const blob = new Blob([JSON.stringify(simple, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pyxis-components-simple-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  });

  // Capture full page screenshot with overlay
  const captureFullPageBtn = document.getElementById('captureFullPageBtn');
  captureFullPageBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    showToast('Capturing full page... this may take a moment');
    try {
      const resp = await chrome.tabs.sendMessage(activeTab.id, { action: 'captureFullPage' });
      if (resp.dataUrl) {
        downloadDataUrl(resp.dataUrl, `pyxis-page-${new Date().toISOString().slice(0, 10)}.png`);
        showToast('Full page screenshot downloaded');
      } else {
        showToast('Capture failed');
      }
    } catch (e) {
      alert('Capture failed: ' + e.message);
    }
  });

  // Initial load
  refresh();
});
