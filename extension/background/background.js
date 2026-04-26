/**
 * Pyxis Component Extractor - Background Service Worker
 * Handles cross-tab state and keyboard shortcut.
 */

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-overlay') {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle' }).catch(() => {
      // Content script may not be injected on this page
    });
  }
});

// Optional: aggregate all selections across pages for full project export
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getAllSelections') {
    chrome.storage.local.get(null, (items) => {
      const all = [];
      for (const [key, val] of Object.entries(items)) {
        if (key.startsWith('px_selections_') && Array.isArray(val)) {
          all.push(...val);
        }
      }
      sendResponse({ selections: all });
    });
    return true; // async
  }
});
