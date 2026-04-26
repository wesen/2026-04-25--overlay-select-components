/**
 * chrome.storage.local abstraction.
 */

const STORAGE_KEY = () => 'px_selections_' + location.href;

export async function loadSelections() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY()], (result) => {
      const saved = result[STORAGE_KEY()];
      resolve(saved && Array.isArray(saved) ? saved : []);
    });
  });
}

export async function saveSelections(selections) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY()]: selections }, resolve);
  });
}

export async function clearSelections() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(STORAGE_KEY(), resolve);
  });
}
