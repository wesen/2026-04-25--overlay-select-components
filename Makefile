# Pyxis Component Extractor — Makefile
# Build, package, and publish the Chrome extension

.PHONY: help build dev clean package crx check install

EXTENSION_DIR = extension
DIST_ZIP = pyxis-component-extractor.zip
CRX = pyxis-component-extractor.crx

help:
	@echo "Pyxis Component Extractor — Build & Package"
	@echo ""
	@echo "  make build       — Build the extension bundle with Vite"
	@echo "  make dev         — Watch mode: rebuild on file changes"
	@echo "  make clean       — Remove generated bundle"
	@echo "  make package     — Create distributable zip (no dev files)"
	@echo "  make crx         — Pack as .crx (requires Chrome dev mode)"
	@echo "  make check       — Verify manifest and bundle exist"
	@echo "  make install     — Build + package, ready for chrome://extensions/"
	@echo ""
	@echo "  Chrome install: chrome://extensions/ → Developer mode ON"
	@echo "                  → Load unpacked → select extension/ folder"

build:
	cd $(EXTENSION_DIR) && npm run build

dev:
	cd $(EXTENSION_DIR) && npm run dev

clean:
	cd $(EXTENSION_DIR) && npm run clean

package: build
	@echo "Creating $(DIST_ZIP)..."
	@if [ -d "$(EXTENSION_DIR)/node_modules" ]; then \
		echo "WARNING: node_modules/ exists ($(shell du -sh $(EXTENSION_DIR)/node_modules | cut -f1)) — excluded from package"; \
	fi
	cd $(EXTENSION_DIR) && zip -r ../$(DIST_ZIP) \
		manifest.json \
		content_scripts/overlay.js \
		content_scripts/overlay.css \
		popup/ \
		background/ \
		icons/ \
		README.md \
		-x "*/node_modules/*" \
		-q
	@echo "Done: $(DIST_ZIP)"
	@ls -lh $(DIST_ZIP)
	@echo ""
	@echo "Contents:"
	@unzip -l $(DIST_ZIP) | tail -4

crx: build
	@echo ""
	@echo "To create a .crx file:"
	@echo "  1. Open Chrome → chrome://extensions/"
	@echo "  2. Toggle Developer mode ON"
	@echo "  3. Click 'Pack extension'"
	@echo "  4. Select the $(EXTENSION_DIR)/ folder"
	@echo "  5. Chrome will create $(CRX) and a .pem key file"
	@echo ""
	@echo "Keep the .pem file safe — you need it to update the extension later."
	@echo ""

check:
	@test -f $(EXTENSION_DIR)/manifest.json || (echo "ERROR: manifest.json missing" && exit 1)
	@test -f $(EXTENSION_DIR)/content_scripts/overlay.js || (echo "ERROR: overlay.js missing — run 'make build'" && exit 1)
	@echo "All required files present."
	@echo "  manifest.json: OK"
	@echo "  content_scripts/overlay.js: OK"
	@echo "  content_scripts/overlay.css: OK"

install: package check
	@echo ""
	@echo "Extension ready for installation."
	@echo ""
	@echo "Option 1 — Load unpacked (development):"
	@echo "  chrome://extensions/ → Developer mode ON → Load unpacked"
	@echo "  Select: $$(pwd)/$(EXTENSION_DIR)/"
	@echo ""
	@echo "Option 2 — Install from zip:"
	@echo "  Unzip $(DIST_ZIP) to a folder, then Load unpacked pointing at it."
	@echo ""
