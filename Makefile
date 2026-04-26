# Pyxis Component Extractor — Makefile
# Build, package, and publish the Chrome extension

.PHONY: help build dev clean package crx check install

EXTENSION_DIR = extension
DIST_DIR = dist
DIST_ZIP = pyxis-component-extractor.zip
CRX = pyxis-component-extractor.crx

help:
	@echo "Pyxis Component Extractor — Build & Package"
	@echo ""
	@echo "  make build       — Build the extension bundle with Vite"
	@echo "  make dev         — Watch mode: rebuild on file changes"
	@echo "  make clean       — Remove generated bundle"
	@echo "  make package     — Create distributable zip (no dev files)"
	@echo "  make dist        — Create clean folder for Chrome Pack extension"
	@echo "  make crx         — Instructions for packing as .crx"
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
	@rm -rf $(DIST_DIR)
	@rm -f $(DIST_ZIP)
	@echo "Cleaned generated files"

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

dist: build
	@echo "Creating clean dist folder for publishing..."
	@rm -rf $(DIST_DIR)
	@mkdir -p $(DIST_DIR)
	@cp $(EXTENSION_DIR)/manifest.json $(DIST_DIR)/
	@cp $(EXTENSION_DIR)/content_scripts/overlay.js $(DIST_DIR)/
	@cp $(EXTENSION_DIR)/content_scripts/overlay.css $(DIST_DIR)/
	@cp -r $(EXTENSION_DIR)/popup $(DIST_DIR)/
	@cp -r $(EXTENSION_DIR)/background $(DIST_DIR)/
	@cp -r $(EXTENSION_DIR)/icons $(DIST_DIR)/
	@cp $(EXTENSION_DIR)/README.md $(DIST_DIR)/ 2>/dev/null || true
	@echo "Done: $(DIST_DIR)/ ($$(du -sh $(DIST_DIR) | cut -f1))"
	@echo ""
	@echo "Use this folder for Chrome 'Pack extension' — no node_modules included."

crx: dist
	@echo ""
	@echo "To create a .crx file:"
	@echo "  1. Open Chrome → chrome://extensions/"
	@echo "  2. Toggle Developer mode ON"
	@echo "  3. Click 'Pack extension'"
	@echo "  4. Select the $(DIST_DIR)/ folder (NOT $(EXTENSION_DIR)/)"
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
	@echo "Option 3 — Pack as .crx for distribution:"
	@echo "  make crx"
	@echo "  Chrome → Pack extension → select $$(pwd)/$(DIST_DIR)/"
	@echo ""
