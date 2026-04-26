#!/bin/bash
# Dev server for testing Pyxis standalone pages with the extension
# Serves from repo root so ../../lib/ and ../../screens/ paths resolve

cd "$(dirname "$0")/../.."
python3 -m http.server 8080 --bind 127.0.0.1
echo "Serving at http://127.0.0.1:8080/standalone/"
