# Pyxis Component Extractor

> A Chrome extension for visually selecting, naming, and extracting UI components from web pages — with PNG capture, CSS extraction, and LLM-friendly import/export.

[![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue)](extension/manifest.json)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?logo=vite)](extension/vite.config.js)
[![License](https://img.shields.io/badge/License-MIT-green)]()

---

## What It Does

Walk through any web page, visually select UI components, name them, and extract everything you need to rebuild them in React — or any other framework.

| Feature | Description |
|---------|-------------|
| **Visual Selection** | Hover and click to select any DOM element. Cyan border on hover, blue border when saved. |
| **Smart Naming** | Type component names like `ShowCard`, `NavBar`, `ButtonGroup` — saved per page. |
| **PNG Capture** | Auto-captures a retina PNG of every selected component using `html2canvas`. |
| **Bounding Box + CSS** | Records exact geometry and computed styles for each selection. |
| **Smart Selectors** | Generates stable CSS selectors (`data-*` -> `id` -> class -> `nth-child`). |
| **Import / Export** | Export full manifests or a simple LLM-friendly format. Import back later. |
| **LLM Loop** | Let an LLM suggest components, import them, visually validate, keep or discard. |
| **Persistent** | Selections survive page reloads and browser restarts via `chrome.storage.local`. |
| **Keyboard Shortcuts** | `Ctrl+Shift+Y` toggles selection mode. `Escape` cancels. `Shift+Click` selects parent. |

---

## Quick Start

### 1. Install the Extension

```bash
# Clone or navigate to this repo
cd extension
npm install
npm run build        # Generates content_scripts/overlay.js
```

Then in Chrome:
1. Open `chrome://extensions/`
2. Toggle **Developer mode** ON
3. Click **"Load unpacked"**
4. Select the `extension/` folder
5. Pin the extension icon to your toolbar

### 2. Serve the Standalone Pages

```bash
# From repo root
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/standalone/ to browse the Pyxis prototype pages.

### 3. Start Selecting

1. Open any standalone page (e.g. `/standalone/public/shows.html`)
2. Wait for React to render (~2-3 seconds)
3. Click the extension icon -> **"Start Selecting"**
4. Hover over elements -> see **cyan border + label**
5. **Click** to select -> type a name -> **Save**
6. Click the extension icon again to see thumbnails, export, or download PNGs

---

## Demo Workflow

```
Page loads -> React renders
       |
       v
  Click "Start Selecting"
       |
       v
  Hover -> see tag/class/dimensions label
       |
       v
  Click -> "Name this component" dialog
       |
       v
  Type "ShowCard" -> Save -> PNG auto-captures
       |
       v
  Blue box appears -> scrolls with element
       |
       v
  Repeat for all components
       |
       v
  Export manifest + download PNGs -> feed to design system
```

---

## Export Formats

### Full Manifest

Complete metadata for archival and interchange:

```json
{
  "version": "1.0",
  "generatedAt": "2026-04-25T22:00:00Z",
  "source": { "project": "pyxis", "url": "...", "title": "..." },
  "selections": [
    {
      "id": "uuid",
      "componentName": "ShowCard",
      "selector": ".show-card",
      "boundingBox": { "x": 120, "y": 340, "width": 280, "height": 180 },
      "computedCSS": { "display": "flex", "gap": "12px" },
      "outerHTML": "<div class='show-card'>...</div>",
      "pngDataUrl": "data:image/png;base64,..."
    }
  ]
}
```

### Simple Format (LLM-Friendly)

Minimal format for generation and suggestion:

```json
{
  "components": [
    { "name": "ShowCard", "selector": ".show-card", "note": "Contains title, date, image" },
    { "name": "NavBar", "selector": "nav.main-nav", "note": "Top navigation" }
  ]
}
```

Import simple format -> extension validates each selector against the live DOM -> shows `Imported 5 (5 found, 2 missing)`.

---

## Architecture

The extension is built as ES modules bundled by **Vite** into a single IIFE content script.

```
extension/
├── manifest.json              # Chrome Manifest V3
├── content_scripts/
│   ├── main.js                # Entry point — wires modules
│   ├── overlay.css            # Overlay styles
│   ├── overlay.js             # BUNDLED output (Vite)
│   └── modules/
│       ├── state.js           # Central state store (pub/sub)
│       ├── dom-overlay.js     # Visual DOM: boxes, labels, dialogs
│       ├── capture.js         # Metadata: bbox, CSS, selectors
│       ├── capture-png.js     # DOM-to-PNG via html2canvas
│       ├── storage.js         # chrome.storage.local wrapper
│       ├── events.js          # Mouse, keyboard, scroll handlers
│       └── messaging.js       # Chrome runtime message handlers
├── popup/
│   ├── popup.html             # Extension popup UI
│   └── popup.js               # Popup logic
├── background/
│   └── background.js          # Service worker (keyboard shortcut)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── package.json               # npm scripts + dependencies
├── vite.config.js             # Vite bundler config
└── README.md                  # This file
```

### Data Flow

```
User input -> events.js -> state.update() -> listeners notify
                                              |
                                              v
                                        dom.render() + storage.save()
```

### Key Design Decisions

| Decision | Why |
|----------|-----|
| **Browser extension** | Only extensions can overlay the real DOM interactively |
| **Fixed-position overlay** | Viewport-relative, no scroll clipping, direct `getBoundingClientRect()` coords |
| **Vite bundler** | Chrome content scripts don't support ES module imports natively |
| **html2canvas** | Captures individual elements with CSS (shadows, radii, text) — native APIs can't |
| **Pub/sub state** | Simple, testable, no Redux overhead for this scale |
| **UUID keys for selections** | Prevents infinite loops when multiple elements share the same name |

---

## Development

```bash
cd extension

# Install dependencies
npm install

# Build once
npm run build

# Watch mode — rebuilds on file changes
npm run dev

# Clean generated bundle
npm run clean
```

After editing files in `content_scripts/modules/`, run `npm run build` and reload the extension in `chrome://extensions/`.

---

## Standalone Pages

This repo includes Pyxis prototype pages for testing the extension:

```
standalone/
├── index.html              # Navigation hub
├── public/                 # Public site pages (920px)
│   ├── shows.html          # Shows listing
│   ├── detail.html         # Show detail
│   ├── archive.html        # Archive
│   ├── book.html           # Book us
│   └── about.html          # About
├── full-app/               # Full app screens (1240px)
│   ├── dashboard.html      # Dashboard
│   ├── shows.html          # Shows management
│   ├── bookings.html       # Bookings queue
│   └── ...
├── mobile/                 # Mobile screens (390px)
│   ├── home.html           # Home
│   ├── shows.html          # Shows
│   └── ...
└── foundations/            # Design system foundations
    └── system.html         # System page
```

Each page loads React + Babel standalone from CDN and renders a specific screen component.

---

## LLM Integration Workflow

1. **Generate**: Ask an LLM to suggest component names and selectors from a page description
2. **Import**: Save the JSON and import via the popup's **Import JSON** button
3. **Validate**: The extension resolves each selector against the live DOM — found ones get blue boxes, missing ones are reported
4. **Refine**: Update names, remove bad suggestions, add missed components interactively
5. **Export**: Download the full manifest + PNGs for your design system

---

## Known Limitations

- **Bundle size**: `html2canvas` adds ~365KB. The extension is ~383KB total. Acceptable for a dev tool.
- **Storage quota**: `chrome.storage.local` has a ~5MB limit. Many high-res PNGs can fill it. Export periodically.
- **CSS support**: `html2canvas` handles most CSS but some features (CSS Grid, certain transforms) may not render perfectly.
- **File URLs**: For `file://` pages, enable "Allow access to file URLs" in the extension details.

---

## License

MIT

---

Built for extracting design systems from real web pages.
