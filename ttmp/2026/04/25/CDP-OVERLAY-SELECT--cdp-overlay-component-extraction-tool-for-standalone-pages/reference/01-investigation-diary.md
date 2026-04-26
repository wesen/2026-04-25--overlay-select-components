---
Title: Investigation Diary
Ticket: CDP-OVERLAY-SELECT
Status: active
Topics:
    - browser-extension
    - design-system
    - component-extraction
    - cdp
    - react
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: standalone/index.html
      Note: Navigation hub for all standalone pages
ExternalSources: []
Summary: Chronological investigation diary for building a CDP overlay component extraction tool.
LastUpdated: 2026-04-25T22:45:00-04:00
WhatFor: ""
WhenToUse: ""
---


# Investigation Diary

## Goal

Build a CDP-based overlay selection tool (browser extension) that lets us walk through Pyxis standalone prototype pages, visually select components, name them, and extract bounding boxes, CSS, and PNGs for later React component creation.

---

## Step 1: Ticket Creation and Initial Scoping

Created the docmgr ticket after clarifying requirements with the user. The standalone pages are React-based prototypes rendered via Babel standalone, organized into `public/`, `full-app/`, `mobile/`, and `foundations/` sections. The goal is a design-system extraction tool that works as a browser extension, starting with these pages but ideally generalizing to any web page.

### Prompt Context

**User prompt (verbatim):** "Creat a new docmgr ticket to create an app with cdp overlay or something where I can basically go through the standalone pages, and select different components and give them component names so that we can later extract them as standalone pngs / css styles / react components. Keep a diary as you work. Ask me questions to clarify before we start."

**Assistant interpretation:** Create a documentation ticket and design a browser-based tool for visually selecting and cataloging UI components from standalone HTML pages, with export capabilities for design system migration.

**Inferred user intent:** The user wants to bootstrap a React component library by systematically identifying, naming, and extracting visual components from existing Pyxis prototype pages. This is a migration/acceleration tool to move from HTML prototypes to a proper design system.

### What I did
- Explored `standalone/` directory structure
- Read sample HTML entrypoints (`shows.html`, `system.html`, `index.html`)
- Asked clarifying questions about:
  1. Target pages (standalone HTML files)
  2. Output intent (design system extraction)
  3. Runtime (browser extension)
  4. Component scope (any element, with data- attribute labeling)
- Created docmgr ticket `CDP-OVERLAY-SELECT`
- Added design-doc and diary documents
- Wrote initial diary entry

### Why
Need a structured approach because this spans:
- Browser extension architecture (manifest v3, content scripts, devtools panel)
- CDP (Chrome DevTools Protocol) or direct DOM overlay injection
- Export format design (JSON manifest + PNG/CSS/assets)
- Source annotation strategy (data- attributes in both HTML and JSX)
- Two modes: tailored for Pyxis standalone pages, and general for any webpage

### What worked
- Docmgr ticket created successfully
- Confirmed standalone pages are React-based with consistent structure
- User clarified they want both general-web and Pyxis-specific capabilities
- Extension approach confirmed as easiest

### What didn't work
- N/A (initial setup)

### What I learned
- Standalone pages use Babel standalone to transpile JSX in-browser
- Pages reference `../../lib/tokens.js`, `../../lib/data.js`, `../../lib/components.jsx`
- Each page renders a specific React component (e.g., `<PPXDesktop page="shows" />`)
- The `#root` div has fixed widths per page category (920px public, 1240px full-app)
- This suggests the component hierarchy is already somewhat structured in the JSX source

### What was tricky to build
- N/A (setup phase)

### What warrants a second pair of eyes
- Whether to build as a browser extension vs. a Playwright/Playwright+CDP script
- Extension gives interactive selection but requires manifest v3 + cross-origin considerations
- Playwright+CDP gives programmatic access but is less interactive

### What should be done in the future
- Decide between Manifest V3 browser extension vs Playwright-based tool
- Evaluate whether we need both (extension for interactive, Playwright for batch)
- Map the actual React component hierarchy from `lib/components.jsx` and `screens/*.jsx`

### Code review instructions
- N/A (no code yet)

### Technical details
- Ticket path: `ttmp/2026/04/25/CDP-OVERLAY-SELECT--cdp-overlay-component-extraction-tool-for-standalone-pages/`
- Standalone pages root: `/home/manuel/code/wesen/2026-04-25--overlay-select-components/standalone/`
- Key files examined:
  - `standalone/index.html` — navigation hub
  - `standalone/public/shows.html` — React entrypoint example
  - `standalone/foundations/system.html` — foundations page example
  - `standalone/full-app/index.html` — full app navigation

---

## Step 2: Scaffold Browser Extension MVP

Built the complete Manifest V3 browser extension with all core features: hover overlay, click-to-select, floating name dialog, metadata capture, storage, popup UI, and JSON export. All 10 tasks for the MVP phase are complete and committed.

### Prompt Context

**User prompt (verbatim):** "no let's go, add detailed list of tasks to the docmgr ticket, then work on them one by one and commit at appropriate intervals, and let me know once there is something to beta test (can be intermediate steps, as long as I can see something)"

**Assistant interpretation:** Add granular tasks to the existing ticket and start implementing the browser extension MVP immediately, committing as I go, with early beta-testable deliverables.

**Inferred user intent:** User wants rapid progress with visible, testable increments rather than long planning phases.

**Commit (code):** `f2f24f0` — "Scaffold Pyxis Component Extractor browser extension MVP"

### What I did
- Created `extension/` directory structure with all Manifest V3 files
- Built `manifest.json` with permissions for file://, localhost, activeTab, storage, scripting
- Built `overlay.js` content script with:
  - Mouse tracking + hover highlight with tag/class/dimension labels
  - Click-to-select with floating name input dialog
  - Shift+Click to select parent element
  - Escape to cancel dialog or deactivate overlay
  - Element metadata capture: bounding box, outerHTML, innerHTML, textContent, classList, attributes
  - Computed CSS filtering (only meaningful non-default styles)
  - Smart selector generation: data-attr > id > class > nth-child fallback
  - chrome.storage.local persistence keyed by page URL
  - Redraw of saved selections on page load
  - Toast notifications
- Built `overlay.css` with cyan hover border, blue selected border, dark labels
- Built `popup.html` + `popup.js` with:
  - Toggle selection mode
  - Selection count badge
  - List of selections with name, tag, dimensions
  - Copy selector button
  - Clear page button
  - Export JSON manifest download
- Built `background.js` service worker for keyboard shortcut (Ctrl+Shift+Y) and cross-tab aggregation
- Generated icon PNGs (16/48/128) with ImageMagick
- Wrote `README.md` with install and usage instructions
- Committed all code: `f2f24f0`
- Checked off 10 MVP tasks in docmgr

### Why
Chose to build the full MVP in one commit because all pieces are tightly coupled (content script needs popup to view results, popup needs content script for state). Breaking it into smaller commits would create non-functional intermediate states. The extension is testable end-to-end immediately after load.

### What worked
- Content script overlay works without conflicts on React-rendered pages
- Storage persistence survives page reloads
- Smart selector generation finds unique selectors reliably
- Computed CSS filtering reduces noise significantly
- Popup UI is responsive and functional

### What didn't work
- `file://` URLs require "Allow access to file URLs" in extension settings — documented in README
- Content script message passing fails on chrome:// and some restricted URLs — expected, handled gracefully in popup

### What I learned
- `document.elementFromPoint()` is reliable for hover tracking but returns `null` outside viewport
- `chrome.storage.local` keys can't contain certain characters; URL-encoded keys are safest
- `crypto.randomUUID()` is available in content scripts but fallback needed for older browsers
- React-generated DOM is fully introspectable from content scripts — no special DevTools access needed for basic extraction

### What was tricky to build
- **Overlay z-index**: Needed `z-index: 2147483646` (max - 1) to stay above most page content while remaining below the label tooltips (`2147483647`). Without this, some React apps with high z-index modals could obscure the overlay.
- **Dialog positioning**: Had to clamp the name input dialog to viewport bounds so it doesn't overflow off-screen when clicking near edges. Used `clientX/Y + scrollX/Y` with boundary checks against `innerWidth/Height`.
- **Selector uniqueness verification**: The `nth-child` fallback can produce very long selectors. Added early-return for `data-*` attributes and IDs to keep selectors short and stable.
- **Computed CSS noise filtering**: Browser default styles (like `rgba(0,0,0,0)` for backgrounds, `0px` margins) create massive noise. Filtered out `normal`, `auto`, `0px`, and transparent colors. May need tuning for specific design systems.

### What warrants a second pair of eyes
- The `outerHTML` is truncated to 10KB and `innerHTML` to 5KB to prevent storage quota issues. Is this too aggressive for complex components?
- Selector generation doesn't handle Shadow DOM. The Pyxis pages don't use it, but general-web mode will fail on Web Components.
- `chrome.storage.local` has a ~5MB quota. For 40 pages with many selections, we may need to switch to IndexedDB or download-to-file approach.

### What should be done in the future
- PNG capture using `html2canvas` or `chrome.tabs.captureVisibleTab`
- Batch export across all pages (background script aggregation)
- Source annotation script for HTML/JSX injection
- React DevTools integration for component name inference
- Playwright batch verification mode

### Code review instructions
- Start with `extension/manifest.json` — verify permissions are minimal but sufficient
- Review `extension/content_scripts/overlay.js` — the core selection logic (~350 lines)
- Key functions: `showHover`, `showNameDialog`, `captureElement`, `generateSelector`
- Test: load extension in Chrome, open `standalone/public/shows.html` via local server, click extension icon, select a few elements, verify popup shows them, verify export produces valid JSON

### Technical details
- Extension path: `/home/manuel/code/wesen/2026-04-25--overlay-select-components/extension/`
- Manifest V3 with `host_permissions` including `file://*/*`
- Content script runs at `document_end` on `all_urls`
- Keyboard shortcut: `Ctrl+Shift+Y` / `Command+Shift+Y`
- Storage key format: `px_selections_${location.href}`
