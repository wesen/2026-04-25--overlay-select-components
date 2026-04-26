# Changelog

## 2026-04-25

- Initial workspace created


## 2026-04-25

Created ticket, design doc, and investigation diary for CDP overlay component extraction browser extension

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/standalone/index.html — Initial exploration of standalone pages structure


## 2026-04-25

Uploaded design doc to reMarkable at /ai/2026/04/25/CDP-OVERLAY-SELECT

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/ttmp/2026/04/25/CDP-OVERLAY-SELECT--cdp-overlay-component-extraction-tool-for-standalone-pages/design-doc/01-design-cdp-overlay-component-extraction-browser-extension.md — Design doc uploaded to reMarkable


## 2026-04-25

Built MVP browser extension with overlay selection, metadata capture, storage, popup UI, and JSON export (commit f2f24f0)

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/extension/content_scripts/overlay.js — Core overlay selection logic


## 2026-04-25

Copied lib/ and screens/ from pyxis project to fix standalone page rendering

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/lib/components.jsx — Copied from pyxis project to enable page rendering


## 2026-04-25

Fixed scroll tracking for overlay boxes and added manifest import (commit f89dcfa)

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/extension/content_scripts/overlay.js — Scroll tracking and manifest import


## 2026-04-25

Fixed selection boxes not restoring on page reload — added retry loop + MutationObserver for React async rendering (commit a3cc127)

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/extension/content_scripts/overlay.js — Retry mechanism and MutationObserver for async DOM restoration


## 2026-04-25

Fixed hideNameDialog error and made saved selection boxes always visible (commit 02200a8)

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/extension/content_scripts/overlay.js — Fixed hideNameDialog and overlay visibility


## 2026-04-25

Refactored monolithic overlay.js into 6 ES modules with clear separation of concerns (commit 674e2cb)

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/extension/content_scripts/main.js — Entry point wiring state


## 2026-04-25

Fixed scroll tracking by removing double-counted scroll offset (commit 394ee6c)

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/extension/content_scripts/modules/dom-overlay.js — Fixed viewport-relative coordinate math


## 2026-04-25

Added PNG capture with html2canvas and popup download (commit 70a9725)

### Related Files

- /home/manuel/code/wesen/2026-04-25--overlay-select-components/extension/content_scripts/modules/capture-png.js — PNG capture module using html2canvas

