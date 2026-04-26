---
Title: 'Design: CDP Overlay Component Extraction Browser Extension'
Ticket: CDP-OVERLAY-SELECT
Status: active
Topics:
    - browser-extension
    - design-system
    - component-extraction
    - cdp
    - react
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: extension/content_scripts/overlay.js
      Note: Content script with selection overlay logic
    - Path: extension/manifest.json
      Note: Extension manifest V3
    - Path: standalone/foundations/system.html
      Note: Foundations/system page example
    - Path: standalone/index.html
      Note: Navigation hub for all standalone pages
    - Path: standalone/public/shows.html
      Note: Example React entrypoint page (public shows)
ExternalSources: []
Summary: Architecture and implementation plan for a browser extension that overlays Pyxis standalone pages to visually select, name, and extract UI components for design system migration.
LastUpdated: 2026-04-25T22:15:00-04:00
WhatFor: ""
WhenToUse: ""
---






# Design: CDP Overlay Component Extraction Browser Extension

## Executive Summary

We need a browser-based tool that overlays Pyxis standalone prototype pages (and eventually any web page), allowing interactive selection of visual components, naming them, and extracting metadata (bounding boxes, CSS, PNGs) for design-system migration. The tool starts as a browser extension for interactivity, with a JSON/YAML manifest output that can feed downstream React component generation.

## Problem Statement

Pyxis has ~40 standalone HTML prototype pages across `public/`, `full-app/`, `mobile/`, and `foundations/`. These pages are rendered via React+Babel standalone and contain rich UI components. We want to:

1. Systematically identify reusable visual components
2. Name them semantically
3. Extract their visual representation (PNG), geometry (bounding box), styling (CSS), and DOM context (selectors)
4. Annotate the source HTML/JSX with `data-component-*` attributes for traceability
5. Produce a machine-readable manifest for downstream React component generation

The current approach (manual inspection) is slow, inconsistent, and doesn't produce structured output.

## Current-State Architecture

### Standalone Pages Structure

```
standalone/
├── index.html              # Navigation hub
├── public/                 # Public site pages (920px desktop, 390px mobile)
│   ├── index.html          # Shows, detail, archive, book, about
│   ├── shows.html          # Desktop shows list
│   ├── shows-mobile.html   # Mobile shows list
│   └── ... (10 pages total)
├── full-app/               # Full app screens (1240px)
│   ├── index.html          # App navigation
│   ├── dashboard.html      # Dashboard screen
│   ├── shows.html          # Shows management
│   └── ... (14 pages total)
├── mobile/                 # Mobile app screens
│   ├── index.html
│   ├── home.html
│   └── ... (10 pages total)
└── foundations/            # Design system foundations
    ├── index.html
    └── system.html         # System page / foundations
```

### Page Runtime

Each `.html` file:
1. Loads React 18 + ReactDOM + Babel standalone from CDN
2. Loads shared libraries: `../../lib/tokens.js`, `../../lib/data.js`
3. Loads shared components: `../../lib/components.jsx`
4. Loads page-specific screen: `../../screens/ppxis.jsx` or `../../screens/system.jsx`
5. Mounts a React component into `#root`

Example from `standalone/public/shows.html`:
```html
<div id="root"></div>
<script src="../../lib/tokens.js"></script>
<script src="../../lib/data.js"></script>
<script type="text/babel" src="../../lib/components.jsx"></script>
<script type="text/babel" src="../../screens/ppxis.jsx"></script>
<script type="text/babel" data-presets="react">
  ReactDOM.createRoot(document.getElementById("root")).render(<PPXDesktop page="shows" />);
</script>
```

This means:
- The rendered DOM is React-generated
- Components are defined in `lib/components.jsx` and `screens/*.jsx`
- The HTML is just a shell; the real component hierarchy lives in JSX

## Proposed Solution

### Architecture: Browser Extension (Manifest V3)

**Why extension over Playwright/CDP script:**
- Interactive selection requires user judgment (what is a "component")
- Real-time overlay and hover effects need DOM access
- User can navigate between pages and accumulate selections
- Can later add batch mode via Playwright that consumes the extension's output format

**Components:**
1. **Content Script** — Injected into each page, provides overlay UI (hover highlights, click-to-select, name input)
2. **Background Service Worker** — Manages state across page navigations, handles exports
3. **Popup/Panel** — Shows current selections, allows export, provides global controls
4. **Storage** — Extension storage (sync or local) for selections, indexed by page URL

### Selection Workflow

1. User opens a standalone page (e.g., `standalone/public/shows.html`)
2. Extension content script activates
3. User hovers over elements → overlay shows bounding box + computed tag/class info
4. User clicks → element is "selected", prompt for component name
5. Extension computes:
   - Bounding box (relative to viewport and page)
   - Computed CSS (filtered to non-default values)
   - Unique selector (prefer data-attributes, then classes, then nth-child)
   - Inner HTML / outer HTML
   - Parent context (up to 3 levels)
6. Selection saved to background worker with page URL as key
7. User can navigate to other pages and repeat
8. User clicks "Export" → JSON manifest generated

### Data Model (Selection)

```typescript
interface ComponentSelection {
  id: string;                    // UUID
  pageUrl: string;               // Source page
  pageCategory: string;          // public | full-app | mobile | foundations
  componentName: string;         // User-provided
  description?: string;          // Optional user note
  
  // DOM context
  selector: string;              // Unique CSS selector
  outerHTML: string;             // Serialized element
  innerHTML: string;
  textContent: string;           // Text only
  
  // Geometry
  boundingBox: {
    x: number; y: number;
    width: number; height: number;
  };
  viewport: { width: number; height: number };
  
  // Styling
  computedCSS: Record<string, string>;  // Non-default computed styles
  classList: string[];
  
  // Source annotation
  dataAttributes: Record<string, string>;  // Existing data-* attrs
  
  // Media
  pngDataUrl?: string;           // Base64 PNG of element
  fullPagePng?: string;          // Base64 PNG of full page (optional)
  
  // React-specific (when on Pyxis pages)
  reactComponentName?: string;   // If inferable from React DevTools
  sourceFile?: string;           // e.g., "lib/components.jsx"
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Export Format (JSON Manifest)

```json
{
  "version": "1.0",
  "generatedAt": "2026-04-25T22:00:00Z",
  "source": {
    "project": "pyxis",
    "basePath": "standalone/"
  },
  "pages": [
    {
      "url": "file:///.../standalone/public/shows.html",
      "category": "public",
      "viewport": { "width": 920, "height": 1460 },
      "selections": [
        {
          "id": "...",
          "componentName": "ShowCard",
          "selector": "...",
          "boundingBox": { ... },
          "computedCSS": { ... },
          "pngPath": "exports/shows/ShowCard.png",
          "htmlSnippet": "..."
        }
      ]
    }
  ],
  "components": {
    "ShowCard": {
      "count": 3,
      "pages": ["public/shows", "public/detail"],
      "variants": [...]
    }
  }
}
```

### Source Annotation Strategy

For Pyxis pages specifically, we can annotate both HTML and JSX:

**HTML annotation** (post-processing):
```html
<div data-component-id="ShowCard-abc123" data-component-name="ShowCard">
  ...
</div>
```

**JSX annotation** (requires AST parsing or regex):
```jsx
// In lib/components.jsx or screens/*.jsx
function ShowCard({ show }) {
  return (
    <div data-component-name="ShowCard">
      ...
    </div>
  );
}
```

The annotation could be done via:
1. A build-time Babel plugin (if we control the build)
2. A post-processing script that reads the manifest and injects attributes
3. Runtime injection via the extension itself

### Extension UI Mockup

```
┌─────────────────────────────────────┐
│ 🎯 Pyxis Component Extractor        │
├─────────────────────────────────────┤
│ Mode: [Select ▼] [Export] [Clear]   │
├─────────────────────────────────────┤
│ Current Page: public/shows.html     │
│ Selections: 12                      │
├─────────────────────────────────────┤
│ Selected Components:                │
│ ○ ShowCard (3 instances)            │
│ ○ ShowListHeader                    │
│ ○ FilterBar                         │
│   ...                               │
├─────────────────────────────────────┤
│ [Export Manifest] [Export PNGs]     │
└─────────────────────────────────────┘
```

### Overlay Visual Design

- **Hover**: Semi-transparent cyan border (`2px solid #00d4ff`, `background: rgba(0,212,255,0.1)`)
- **Selected**: Solid blue border (`2px solid #0066ff`, `background: rgba(0,102,255,0.15)`)
- **Label**: Small tooltip showing `tag.class` and dimensions
- **Name prompt**: Floating input on click, auto-focused

## Phased Implementation Plan

### Phase 1: MVP Browser Extension
1. Scaffold Manifest V3 extension (content script + popup)
2. Implement hover overlay and click-to-select
3. Capture bounding box + outerHTML + computed CSS
4. Store selections in extension local storage
5. Basic JSON export

### Phase 2: Enhanced Extraction
1. PNG capture using `html2canvas` or native `chrome.tabs.captureVisibleTab` + crop
2. Smart selector generation (data-attr > class > nth-child)
3. CSS filtering (only non-default styles)
4. Duplicate detection (same component on multiple pages)
5. React DevTools integration (infer component names from React fiber tree)

### Phase 3: Source Annotation + Batch
1. Script to inject `data-component-*` attributes into standalone HTML files
2. Script to inject annotations into JSX source (if AST parsing feasible)
3. Playwright batch mode that consumes manifest and verifies extractions
4. CSS variable/token extraction from `lib/tokens.js`

### Phase 4: Generalization
1. Make extension work on any webpage (not just Pyxis)
2. Configurable component detection heuristics
3. Integration with design tools (Figma, Storybook)

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Browser extension (Manifest V3) | Interactive selection requires user judgment; CDP/Playwright is batch-only |
| Capture method | DOM overlay + computed styles | Fast, works offline, no server needed |
| PNG generation | `html2canvas` or native capture + crop | `html2canvas` is pure JS; native capture is more accurate but requires permissions |
| Storage | Extension `chrome.storage.local` | Simple, persists across sessions, JSON-serializable |
| Selector strategy | Prefer `data-component-id` > `data-testid` > classes > nth-child | Stable selectors for later automation |
| Export format | JSON manifest + separate PNG files | Machine-readable, version-controllable, diffable |

## Alternatives Considered

1. **Playwright + CDP script only**
   - Pros: Programmatic, headless, CI-friendly
   - Cons: Not interactive, requires user to pre-define selectors
   - Verdict: Good for Phase 3 batch validation, not for initial discovery

2. **Chrome DevTools extension**
   - Pros: Full CDP access, can inspect React fibers directly
   - Cons: More complex, requires DevTools panel, steeper learning curve
   - Verdict: Consider for Phase 2 React integration

3. **Figma plugin**
   - Pros: Direct design tool integration
   - Cons: Requires pages to be in Figma first, doesn't solve extraction from HTML
   - Verdict: Out of scope for now

## Risks and Open Questions

1. **React fiber access**: Can we reliably map DOM elements back to React component names without React DevTools? (May need to bundle a React DevTools backend)
2. **Babel standalone**: Pages use in-browser JSX transpilation. The React component tree may not be easily introspectable without DevTools.
3. **Cross-origin**: If pages load CDN resources, extension content script should still work (same-origin to the file:// or localhost page)
4. **CSS extraction noise**: Computed styles include inherited and default browser styles. Need filtering logic to extract only "meaningful" styles.
5. **File:// protocol**: Extensions have limited permissions on `file://` URLs. User may need to enable "Allow access to file URLs" in extension settings.

## Testing Strategy

1. Manual testing on each standalone page category
2. Verify export manifest schema
3. Validate that exported PNGs match bounding boxes
4. Test selector uniqueness across page reloads
5. Verify extension works with "Allow access to file URLs" enabled

## References

### Key Files (Pyxis Standalone)

- `/home/manuel/code/wesen/2026-04-25--overlay-select-components/standalone/index.html` — Navigation hub
- `/home/manuel/code/wesen/2026-04-25--overlay-select-components/standalone/public/shows.html` — React entrypoint example (public)
- `/home/manuel/code/wesen/2026-04-25--overlay-select-components/standalone/foundations/system.html` — Foundations page example
- `/home/manuel/code/wesen/2026-04-25--overlay-select-components/standalone/full-app/index.html` — Full app navigation
- `/home/manuel/code/wesen/2026-04-25--overlay-select-components/lib/components.jsx` — Shared components (need to inspect)
- `/home/manuel/code/wesen/2026-04-25--overlay-select-components/screens/ppxis.jsx` — Public pages screen
- `/home/manuel/code/wesen/2026-04-25--overlay-select-components/screens/system.jsx` — System/foundations screen

### External References

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [html2canvas](https://html2canvas.hertzen.com/)
- [React DevTools](https://github.com/facebook/react/tree/main/packages/react-devtools)
