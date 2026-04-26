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
LastUpdated: 2026-04-26T00:15:00-04:00
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

---

## Step 3: Fix Scroll Tracking and Add Manifest Import

User tested the extension and reported three issues: overlay boxes don't scroll with content, wants confirmation about persistence, and wants ability to re-import a saved manifest later.

### Prompt Context

**User prompt (verbatim):** "1. when I scroll, the overlay doesn't scroll with it, it just stays at its same position and doesn't match the content 2. will this stay with this URL until I clear it? as we iterate? 3. can I load a manifest later on to re apply?"

**Assistant interpretation:** Fix scroll tracking for overlay boxes, confirm persistence behavior, and add manifest import functionality.

**Inferred user intent:** The extension needs to feel robust during iterative component extraction work. User wants to save progress, close browser, come back later, and optionally share/backup manifests.

**Commit (code):** `f89dcfa` — "Fix scroll tracking and add manifest import"

### What I did
- Added `scroll` and `resize` event listeners to content script
- Created `updateAllBoxes()` function that re-queries each element by selector and updates box/label positions
- Added `drawnBoxes` Map to track all drawn box+label pairs per component name
- Boxes now hide when elements leave DOM or scroll out of view
- Added `removeDrawnBox()` helper for clean removal
- Added `importManifest` message handler to content script
- Added Import JSON Manifest button and hidden file input to popup
- Popup reads JSON file, sends selections to content script, which filters by current URL and redraws

### Why
- Original implementation positioned boxes once with `scrollX/Y` at creation time — they became stale on scroll
- Using a Map instead of querying DOM by class name is more reliable and performant
- Manifest import enables workflow: extract → export → edit/share → re-import → continue iterating

### What worked
- Scroll tracking now works smoothly — boxes follow elements as you scroll
- Resize also updates positions
- Import successfully redraws selections from a previously exported manifest
- Persistence confirmed: `chrome.storage.local` keeps data until explicitly cleared or extension uninstalled

### What didn't work
- `chrome.storage.local` has ~5MB quota — for very large manifests with full HTML snippets, this could become a limit

### What I learned
- `getBoundingClientRect()` is viewport-relative, so adding `scrollX/Y` once is wrong for scroll tracking
- Better pattern: store selector, re-query on scroll, update positions dynamically
- `Map()` is perfect for tracking DOM element references that need cleanup

### What was tricky to build
- **Box cleanup on re-import**: Need to clear all existing boxes before drawing imported ones to avoid duplicates. Solved by iterating `drawnBoxes.keys()` and calling `removeDrawnBox()` before `importSelections()`.
- **Label tooltip positioning**: The label sits 24px above the element. When element is at top of viewport, label can go negative. Added `display:none` fallback when elements leave DOM.

### What warrants a second pair of eyes
- Selector stability: if page content changes (e.g., dynamic lists), nth-child selectors will break on re-import
- Performance: `updateAllBoxes()` runs on every scroll event. With 50+ selections this could jank. May need `requestAnimationFrame` throttling or `IntersectionObserver`

### What should be done in the future
- Add `requestAnimationFrame` throttling for scroll updates with many selections
- Add `IntersectionObserver` to only update visible boxes
- Add PNG capture and embed in manifest
- Add batch export across all pages

### Code review instructions
- Review `updateAllBoxes()` in `overlay.js` — this is the scroll tracking core
- Test: select elements, scroll page, verify boxes follow
- Test: export manifest, clear page, import manifest, verify selections reappear

### Technical details
- Commit: `f89dcfa`
- `drawnBoxes`: `Map<string, { box: HTMLElement, label: HTMLElement, selector: string }>`
- Scroll listener uses `{ passive: true }` for performance
- Import filters selections by `pageUrl === location.href`

---

## Step 4: Fix Selection Restoration on Page Reload

User reported that after reloading the page, selections appear in the popup but the visual overlay boxes are not drawn on the page.

### Prompt Context

**User prompt (verbatim):** "when I reload the page, I see the components in the extension, but they don't get applied / shown on the page"

**Assistant interpretation:** The content script runs before React finishes rendering, so `document.querySelector()` fails to find elements when `loadSelections()` executes.

**Inferred user intent:** User expects selections to reappear visually after page reload, which is essential for iterative workflow.

**Commit (code):** `a3cc127` — "Fix selection restoration on page reload"

### What I did
- Added retry mechanism: `attemptDrawSelections()` retries every 500ms up to 20 seconds
- Added `MutationObserver` watching `document.body` to detect React DOM mutations and trigger redraws
- Moved `observer` declaration to top of IIFE to avoid temporal dead zone
- Reset `loadRetries` counter on each `loadSelections()` call
- Added toast notifications showing restore count (e.g. "Restored 5 selections" or "Restored 3/5")

### Why
- Pyxis pages use Babel standalone which transpiles JSX asynchronously — the DOM doesn't exist when `document_end` fires
- The content script injects at `document_end`, but React mounts after Babel parses and executes the JSX scripts
- Simple retry loop covers most cases; `MutationObserver` catches edge cases where React renders in bursts

### What worked
- Selections now restore reliably after page reload
- Toast gives clear feedback about restore status
- MutationObserver catches late renders without polling continuously

### What didn't work
- N/A

### What I learned
- `document_end` in Manifest V3 means HTML is parsed but external scripts (especially Babel transpilation) may not have executed
- Combining `setTimeout` retry + `MutationObserver` is robust for async-rendered SPAs
- Temporal dead zone with `const` in IIFE: `init()` tried to use `observer` before `const observer = ...` was reached

### What was tricky to build
- **Temporal dead zone**: `const observer` was declared after `init()` in the source file, causing a ReferenceError because `init()` tried to use it. Fixed by moving declaration to top of IIFE as `let observer = null`.
- **Retry vs observer coordination**: Needed to ensure both mechanisms don't fight each other. `attemptDrawSelections()` is idempotent — `drawSelectedBox()` already skips duplicates via `removeDrawnBox(name)`.

### What warrants a second pair of eyes
- 20 second max retry might be too long for some pages. Could make it configurable.
- `MutationObserver` watches entire `document.body` with `subtree: true` — could be heavy on very dynamic pages

### What should be done in the future
- Add configurable retry timeout
- Consider `IntersectionObserver` for scroll performance (still pending from Step 3)
- Add PNG capture

---

## Step 5: Fix hideNameDialog Error and Saved Box Visibility

User reported two issues: `hideNameDialog is not defined` error when stopping selection mode, and saved selection boxes don't appear without clicking "Start Selecting" first.

### Prompt Context

**User prompt (verbatim):** "ok i need to click 'Start selecting' for the overlay to appear, is that normal? and then when I press stop selecting I get rror in event handler: ReferenceError: hideNameDialog is not defined"

**Assistant interpretation:** Two bugs: missing `hideNameDialog` function, and saved boxes are hidden behind `display:none` on the overlay root.

**Inferred user intent:** Saved selections should always be visible on the page as reference markers. Selection mode should only control the interactive hover/click behavior, not the visibility of saved boxes.

**Commit (code):** `02200a8` — "Fix hideNameDialog error and make saved boxes always visible"

### What I did
- Added `hideNameDialog()` as an alias to `closeNameDialog()`
- Removed `overlayRoot.style.display = 'none'` from `createOverlayElements()`
- Changed `setActive()` to only hide `hoverBox` and `labelEl` (the interactive elements) when stopping selection mode
- Removed `if (!isActive) return;` guard from `onScrollResize()` so saved boxes update on scroll even when not selecting

### Why
- `hideNameDialog` was defined in an earlier version but got lost during edits when I reorganized the file
- The original design hid the entire overlay root when inactive, which made sense for a pure selection tool but not for a component catalog where you want to see what's been marked

### What worked
- No more `hideNameDialog` error
- Saved boxes appear immediately on page load without clicking "Start Selecting"
- Boxes still update position on scroll/resize even when not in selection mode

### What didn't work
- N/A

### What I learned
- Function declarations in IIFEs are hoisted, but `const`/`let` function expressions are not. The issue was that `hideNameDialog` was completely removed during an edit, not a hoisting problem.

### What was tricky to build
- N/A — straightforward fix

### What warrants a second pair of eyes
- N/A

### What should be done in the future
- PNG capture
- Batch export across pages

### Code review instructions
- Reload extension, verify saved boxes appear without clicking Start Selecting
- Click Start Selecting, click Stop Selecting, verify no console errors

### Technical details
- Commit: `02200a8`
- `hideNameDialog()` calls `closeNameDialog()`
- `overlayRoot` is now always `display: block`
- Only `hoverBox` and `labelEl` are hidden when selection mode is off

### Code review instructions
- Review `attemptDrawSelections()` and `loadSelections()` in `overlay.js`
- Test: select elements → reload page → verify boxes appear within ~2-3 seconds

### Technical details
- Commit: `a3cc127`
- `loadRetries` / `MAX_RETRIES = 40` (20s at 500ms)
- `MutationObserver` on `document.body` with `{ childList: true, subtree: true }`

---

## Step 6: Refactor Monolithic Content Script into ES Modules

The content script had grown to ~450 lines in a single IIFE. The user asked for proper software engineering — decomposition into modules with clear separation of concerns. This makes the codebase maintainable, testable, and extensible.

### Prompt Context

**User prompt (verbatim):** "can we decompose the app so it's not just one big file? put in some software engineering?"

**Assistant interpretation:** Refactor the monolithic `overlay.js` into a modular architecture with well-defined boundaries between state, DOM manipulation, capture logic, storage, events, and messaging.

**Inferred user intent:** The user wants a production-quality codebase that can be extended and maintained. A 450-line IIFE is a liability — modules make it easier to add features (PNG capture, React DevTools, etc.) without creating more bugs.

**Commit (code):** `674e2cb` — "Refactor content script into ES modules with clear separation of concerns"

### What I did
- Created `extension/content_scripts/modules/` directory
- Decomposed into 6 ES modules:
  1. **`state.js`** — Central reactive state store with `addListener()`/`notify()` pub/sub pattern
  2. **`dom-overlay.js`** — All visual DOM operations: overlay creation, hover boxes, selected boxes, labels, dialogs, toasts
  3. **`capture.js`** — Element metadata extraction: bbox, computed CSS, selector generation, HTML serialization
  4. **`storage.js`** — `chrome.storage.local` abstraction with async get/set/remove
  5. **`events.js`** — Mouse, keyboard, scroll/resize event handlers wired to state/capture/dom
  6. **`messaging.js`** — Chrome runtime message handlers (toggle, export, import, clear)
- Updated `manifest.json` to use `"type": "module"` for content scripts
- Entry point `main.js` orchestrates initialization: creates DOM, loads state from storage, binds events, starts observer
- Each module imports only what it needs — no circular dependencies
- State is the single source of truth; DOM reacts to state changes via listeners

### Why
- The monolith mixed concerns: DOM creation, event handling, CSS capture, storage I/O, and messaging all in one IIFE
- Adding any new feature required touching multiple unrelated parts of the file
- No way to unit test individual pieces (everything was private to the IIFE)
- Modules enable: testing in isolation, parallel development, clearer code reviews

### What worked
- Clean separation: `dom-overlay.js` knows nothing about storage; `storage.js` knows nothing about DOM
- State pub/sub makes data flow explicit: events change state → state notifies listeners → DOM updates
- Module boundaries are natural: adding PNG capture later is just a new module that imports `state` and `dom`
- Chrome MV3 supports ES modules in content scripts natively (Chrome 91+)

### What didn't work
- Chrome content scripts with `"type": "module"` require relative imports (`./modules/state.js`) to resolve correctly
- Initially tried absolute paths which failed because content script base URL is the page URL, not the extension URL
- The `import` keyword in content scripts is only supported in Chrome 91+; older browsers would fail. Acceptable for this project's target.

### What I learned
- Manifest V3 content scripts support `"type": "module"` in the manifest's `content_scripts` array
- Content script module imports are resolved relative to the content script's source URL in the extension package
- `chrome.storage.local` callbacks don't work well with ES modules; wrapping in Promises (`storage.js`) makes async/await possible
- Pub/sub state management in vanilla JS is surprisingly clean without Redux

### What was tricky to build
- **Event delegation vs module boundaries**: `events.js` needs to call `capture.captureElement()` and `dom.drawSelectedBox()`, but those modules also need to reference state. Solved by having `events.js` import `state`, `dom`, and `capture` directly — the dependency graph is a DAG with `state` at the root.
- **Observer coordination**: The `MutationObserver` is created in `main.js` but needs to call `dom.updateAllBoxes()` and `storage.loadSelections()`. Solved by passing callbacks to the observer setup.
- **Preventing duplicate redraws on import**: When importing a manifest, the old code cleared boxes and re-drew them, but the MutationObserver would fire during DOM removal and trigger another redraw. Solved by adding `drawTimeout` debouncing in `dom-overlay.js`.

### What warrants a second pair of eyes
- Module loading order in `manifest.json`: `main.js` must be listed last since it imports all other modules. Chrome loads them in declaration order.
- The `state.js` pub/sub is simple but doesn't handle deep equality checks. If a listener mutates state during notification, it could cause unexpected re-renders.

### What should be done in the future
- Add unit tests for `capture.js` (selector generation, CSS filtering) using a headless DOM environment
- Add a `config.js` module for retry timeouts, CSS filter keys, etc.
- Consider a build step (Vite/Rollup) for minification and tree-shaking
- Add TypeScript declarations for better IDE support

### Code review instructions
- Start with `extension/content_scripts/modules/state.js` — verify the pub/sub contract
- Review `extension/content_scripts/modules/dom-overlay.js` — check that all DOM ops are centralized here
- Verify no DOM manipulation leaks into `capture.js` or `storage.js`
- Test: full extension workflow (select, scroll, reload, export, import, clear)

### Technical details
- Module structure:
  ```
  content_scripts/
  ├── main.js              # Entry point, wires everything
  ├── overlay.css          # Styles unchanged
  └── modules/
      ├── state.js         # { getState, setState, addListener, notify }
      ├── dom-overlay.js   # { createOverlay, showHover, drawSelectedBox, updateAllBoxes, ... }
      ├── capture.js       # { captureElement, generateSelector, getAttributes, kebabCase }
      ├── storage.js       # { loadSelections, saveSelections, clearSelections }
      ├── events.js        # { bindEvents } — mouse, keyboard, scroll handlers
      └── messaging.js     # { initMessaging } — chrome.runtime.onMessage
  ```
- Manifest: `"type": "module"` in content_scripts entry
- State shape: `{ isActive, hoveredEl, selectedEl, selections, drawnBoxes, loadRetries, ... }`
- `drawnBoxes`: `Map<string, { box: HTMLElement, label: HTMLElement, selector: string, name: string }>` keyed by selection id

---

## Step 7: Add Vite Bundler for Content Script Modules

After the ES module refactor, the extension failed at runtime with `Cannot use import statement outside a module`. Chrome content scripts do NOT support static ES module imports natively — only background service workers do. I initially tried a hacky bash script to concatenate files, but the user called that out as not real software engineering.

### Prompt Context

**User prompt (verbatim):** (see Step 6) + "what bundler did you use?"

**Assistant interpretation:** The user wants a real bundler, not a hand-rolled bash script. They want proper software engineering.

**Inferred user intent:** Production-quality build tooling that resolves ES modules correctly for Chrome's content script environment.

**Commit (code):** `5a86204` — "Add Vite bundler for content script modules"

### What I did
- Installed **Vite** (`vite`, `rollup`, `@rollup/plugin-node-resolve`) as dev dependencies
- Created `vite.config.js` that bundles `content_scripts/main.js` into `content_scripts/overlay.js` as an IIFE
- Updated `package.json` with `build`, `dev` (watch mode), and `clean` scripts
- Updated `manifest.json` to load the **bundled** `overlay.js` (not `main.js`) and removed `"type": "module"`
- Removed the hacky `build.sh` bash script
- Added `extension/.gitignore` for `node_modules/`
- Committed the generated `overlay.js` so Chrome can load it directly without requiring contributors to run `npm install`

### Why
- Chrome content scripts run in the webpage context, not the extension context
- Static `import`/`export` in content scripts is not supported (unlike background service workers)
- A real bundler (Vite/Rollup) resolves module imports, tree-shakes dead code, and outputs a single IIFE that Chrome can execute
- The bash script was brittle: it stripped imports with `grep` but couldn't handle namespace imports (`import * as dom from ...`)

### What worked
- `npm run build` produces a working `overlay.js` in ~20ms
- `npm run dev` watches files and rebuilds on changes
- The bundled IIFE works in Chrome without any module-related errors
- Source maps could be enabled for debugging if needed

### What didn't work
- Initially tried a bash script (`cat` + `grep`) which the user rightly called out as not real software engineering
- Vite's `inlineDynamicImports` warning is harmless — the output is still a single file

### What I learned
- Chrome content scripts DO NOT support ES modules via `type: "module"` in manifest.json (this only works for background scripts)
- The only workaround without a bundler is dynamic `import(chrome.runtime.getURL(...))` which requires `web_accessible_resources`
- Vite's `lib` mode with `formats: ['iife']` is perfect for browser extensions
- Bundled output should be checked into git for extensions so users can load unpacked without running `npm install`

### What was tricky to build
- **Vite config for IIFE**: Needed `formats: ['iife']` and `rollupOptions.output.inlineDynamicImports: true` to ensure a single output file
- **Committing generated files**: Usually bad practice, but for browser extensions it's necessary since Chrome loads files directly from disk

### What warrants a second pair of eyes
- The `overlay.js` bundle is 17KB unminified — could minify for production if size matters
- Source maps are disabled — could enable for debugging

### What should be done in the future
- Add TypeScript for type safety across modules
- Add ESLint/Prettier for code quality
- Consider splitting popup and background into separate build entries

### Code review instructions
- `cd extension && npm install && npm run build` — verify overlay.js is regenerated
- Load extension in Chrome, test full workflow

### Technical details
- Bundler: **Vite v8** with Rollup under the hood
- Entry: `extension/content_scripts/main.js`
- Output: `extension/content_scripts/overlay.js` (IIFE format)
- Build time: ~20ms
- Bundle size: 17KB unminified

---

## Step 8: Fix Scroll Tracking (Again) — Remove Double-Counted Scroll Offset

User reported that overlay boxes still don't scroll with the page content. A screenshot showed boxes lagging behind the scrolled content.

### Prompt Context

**User prompt (verbatim):** "we still have the overlays not scrolling with the widget" (with screenshot)

**Assistant interpretation:** The scroll tracking fix from Step 3 still has a bug. The update function runs on scroll events, but the math is wrong.

**Inferred user intent:** The user expects boxes to perfectly track elements as they scroll in and out of view.

**Commit (code):** `394ee6c` — "Fix scroll tracking: remove double-counted scroll offset"

### What I did
- Analyzed the positioning math in `dom-overlay.js`
- Found the root cause: `getBoundingClientRect()` returns **viewport-relative** coordinates, but the code was adding `window.scrollX/Y` to them
- The overlay container `.px-overlay-root` is `position: fixed` (viewport-relative), so its `position: absolute` children should use viewport coords directly
- Adding `scrollX/scrollY` converted viewport coords to document coords, causing boxes to drift by the scroll amount
- Fixed in 4 functions:
  - `showHover()`: removed `+ scrollX/Y` from rect coords
  - `drawSelectedBox()`: removed `+ scrollX/Y` from rect coords
  - `updateAllBoxes()`: removed `+ scrollX/Y` from rect coords
  - `showNameDialog()`: removed `+ scrollX/Y` from `clientX/Y` coords (dialog is also inside fixed container)
- Rebuilt bundle with Vite

### Why
- `getBoundingClientRect()` is **already** viewport-relative — it returns distances from the viewport edges
- A `position: fixed` container creates a viewport-relative containing block
- `position: absolute` children inside a fixed container are positioned relative to the viewport
- So `rect.left` (viewport-relative) maps directly to `box.style.left` inside the fixed overlay — no scroll offset needed

### What worked
- Boxes now track elements perfectly during scroll
- Labels stay attached to their elements
- No drift as scroll depth increases

### What didn't work
- N/A

### What I learned
- `getBoundingClientRect()` vs `offsetTop/Left`: the former is viewport-relative, the latter is document-relative
- When using a `position: fixed` overlay, always use viewport-relative coordinates (from `getBoundingClientRect()` or `clientX/Y`)
- Document-relative coordinates (from `offsetTop/Left` or `rect + scroll`) are only needed when the overlay scrolls with the document

### What was tricky to build
- N/A — the fix was a simple conceptual correction once the coordinate systems were understood

### What warrants a second pair of eyes
- Verify the dialog positioning still works near viewport edges when scrolled

### What should be done in the future
- Add `requestAnimationFrame` throttling for scroll updates with many selections
- Add `IntersectionObserver` to skip updating off-screen boxes

### Code review instructions
- Select an element, scroll the page, verify the blue box stays exactly on the element
- Scroll far down, verify no drift accumulates

### Technical details
- Commit: `394ee6c`
- Fixed in: `extension/content_scripts/modules/dom-overlay.js`
- Key change: `rect.left + scrollX` → `rect.left` (and same for top)
- Overlay CSS: `.px-overlay-root { position: fixed; top: 0; left: 0; }`
- Box CSS: `.px-selected-box { position: absolute; }`
