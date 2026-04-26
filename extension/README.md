# Pyxis Component Extractor

Browser extension for visually selecting and extracting UI components from Pyxis standalone pages (and any webpage).

## Install

1. Open Chrome → Extensions → Developer mode ON
2. Click "Load unpacked" → select this `extension/` folder
3. Pin the extension to your toolbar

## Usage

1. Open any standalone page (e.g. `http://localhost:8765/standalone/public/shows.html`)
2. Wait for React to render (~2-3 seconds, loads from CDN)
3. Click the extension icon → **"Start Selecting"**
4. Hover over elements → see **cyan border + label** with tag/class/dimensions
5. **Click** to select → type a component name → **Save**
6. **Shift+Click** to select the **parent** element
7. **Escape** to cancel or stop
8. Click extension icon again to see saved selections, copy selectors, **export JSON**, or **import JSON**

### Scroll Behavior

Selection boxes **follow elements as you scroll** and **hide when elements leave the viewport**.

### Persistence

Selections are saved per-URL in `chrome.storage.local`. They persist across:
- Page reloads
- Browser restarts
- New sessions

Use **Clear** to remove all selections on the current page.

### Import / Export

- **Export**: Downloads a JSON manifest with all metadata for the current page
- **Import**: Load a previously exported manifest to restore selections

This lets you backup progress, share manifests, or resume work later.

## Export Format

The JSON manifest contains:
- `version` + `generatedAt` timestamps
- `source` (project, URL, title)
- `selections[]` with:
  - `componentName`, `selector`, `tagName`, `classList`
  - `boundingBox` (x, y, width, height)
  - `computedCSS` (filtered meaningful styles)
  - `outerHTML`, `innerHTML`, `textContent`
  - `attributes`, `viewport`, `timestamp`

## Keyboard Shortcut

- **Ctrl+Shift+Y** (mac: Cmd+Shift+Y) — toggle selection overlay

## Architecture

The content script is built as ES modules with clear separation of concerns:

```
extension/
├── manifest.json              # Manifest V3
├── background/
│   └── background.js          # Service worker
├── content_scripts/
│   ├── main.js                # Entry point — wires modules together
│   ├── overlay.css            # Overlay styles
│   └── modules/
│       ├── state.js           # Central reactive state store (pub/sub)
│       ├── dom-overlay.js     # Visual DOM: boxes, labels, dialogs, toasts
│       ├── capture.js         # Element metadata: bbox, CSS, selectors
│       ├── storage.js         # chrome.storage.local abstraction
│       ├── events.js          # Mouse, keyboard, scroll handlers
│       └── messaging.js       # Chrome runtime message handlers
├── popup/
│   ├── popup.html             # Extension popup UI
│   └── popup.js               # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Module Responsibilities

| Module | Exports | Role |
|--------|---------|------|
| `state.js` | `getState, setState, addListener` | Single source of truth with pub/sub |
| `dom-overlay.js` | `createOverlay, showHover, drawSelectedBox, ...` | All visual DOM operations |
| `capture.js` | `captureElement, generateSelector, ...` | Extract element metadata |
| `storage.js` | `loadSelections, saveSelections, clearSelections` | Persistence layer |
| `events.js` | `bindEvents` | User input handlers |
| `messaging.js` | `initMessaging` | Chrome extension messaging |

### Data Flow

```
User input → events.js → state.js (update) → listeners → dom-overlay.js (render)
                                              ↓
                                        storage.js (persist)
```

State is the single source of truth. DOM modules react to state changes via listeners. Storage syncs automatically on selection changes.
