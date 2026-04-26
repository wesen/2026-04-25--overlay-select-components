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
LastUpdated: 2026-04-25T22:15:00-04:00
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
