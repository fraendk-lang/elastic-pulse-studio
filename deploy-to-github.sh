#!/bin/bash

# Einfaches Script zum Deployen auf GitHub Pages
# Führe dieses Script aus, um die neue Version online zu bringen

echo "🚀 Starte Deployment auf GitHub Pages..."
echo ""

# 1. Stelle sicher, dass wir im richtigen Ordner sind
cd "$(dirname "$0")"

# 2. Stelle sicher, dass der Build aktuell ist
echo "📦 Erstelle neuen Build..."
npm run build

# 3. Kopiere alle Dateien aus dist/ ins Root (für GitHub Pages)
echo "📋 Kopiere Dateien ins Root-Verzeichnis..."

# Wichtig: Kopiere nur die Dateien, die GitHub Pages braucht
# Überschreibe bestehende Dateien
cp dist/index.html index.html 2>/dev/null || true
cp dist/app-screenshot.png app-screenshot.png 2>/dev/null || true
cp dist/datenschutz.html datenschutz.html 2>/dev/null || true
cp dist/impressum.html impressum.html 2>/dev/null || true

# Entferne altes assets-Verzeichnis und kopiere neu (verhindert verschachtelte assets/assets/)
rm -rf assets
cp -r dist/assets assets 2>/dev/null || true

cp dist/favicon.svg favicon.svg 2>/dev/null || true

echo ""
echo "✅ Dateien wurden kopiert!"
echo ""
echo "Jetzt musst du noch:"
echo "1. Die Änderungen mit Git committen:"
echo "   git add index.html app-screenshot.png datenschutz.html impressum.html assets/ favicon.svg"
echo "   git commit -m 'Update website with fixed image path'"
echo "   git push"
echo ""
echo "ODER:"
echo "2. Lade die Dateien über GitHub Website hoch:"
echo "   - Gehe zu: https://github.com/fraendk-lang/elastic-pulse-studio"
echo "   - Klicke auf die Dateien (index.html, app-screenshot.png, etc.)"
echo "   - Klicke auf 'Edit' (Stift-Icon)"
echo "   - Ersetze den Inhalt mit den Dateien aus dem dist/ Ordner"
echo "   - Klicke auf 'Commit changes'"
echo ""

