# Pyxis Component Extractor

Browser extension for visually selecting and extracting UI components from Pyxis standalone pages (and any webpage).

## Install

1. Open Chrome → Extensions → Developer mode ON
2. Click "Load unpacked" → select this `extension/` folder
3. Pin the extension to your toolbar

## Usage

1. Open any standalone page (e.g. `http://localhost:8080/standalone/public/shows.html`)
2. Click the extension icon → "Start Selecting"
3. Hover over elements to see bounding box + tag/class info
4. Click to select — enter a component name in the dialog
5. **Shift+Click** to select the parent element instead
6. **Escape** to cancel or stop selection mode
7. Click extension icon again to see saved selections, copy selectors, or export JSON

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

## File Structure

```
extension/
├── manifest.json              # Manifest V3
├── background/
│   └── background.js          # Service worker
├── content_scripts/
│   ├── overlay.js             # Main selection logic
│   └── overlay.css            # Overlay styles
├── popup/
│   ├── popup.html             # Extension popup UI
│   └── popup.js               # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```
