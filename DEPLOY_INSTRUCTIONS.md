# Einfache Anleitung: Neue Version auf GitHub Pages hochladen

## Schritt-für-Schritt Anleitung

### Option 1: Über GitHub Website (EINFACHSTE Methode)

1. **Öffne dein Repository im Browser:**
   - Gehe zu: https://github.com/fraendk-lang/elastic-pulse-studio
   - Klicke oben auf "Code" → dann auf den grünen Button "Code" → "Download ZIP" (nur zum Verständnis, nicht wirklich machen)

2. **Lade die neuen Dateien hoch:**
   - Gehe zu: https://github.com/fraendk-lang/elastic-pulse-studio/upload/main
   - ODER: Klicke auf "Add file" → "Upload files"
   - Ziehe ALLE Dateien aus dem Ordner `dist/` in den Browser
   - Klicke auf "Commit changes"

3. **Warte 1-2 Minuten** - GitHub Pages aktualisiert sich automatisch!

### Option 2: Über Terminal (Wenn du Git verwendest)

Führe diese Befehle nacheinander im Terminal aus:

```bash
# 1. Gehe in den Projektordner
cd "/Users/frankkrumsdorf/Downloads/elastic-pulse-studio-imac (1)"

# 2. Stelle sicher, dass der Build aktuell ist
npm run build

# 3. Kopiere alle Dateien aus dist/ in einen docs/ Ordner
# (GitHub Pages kann aus docs/ servieren)
cp -r dist/* docs/ 2>/dev/null || mkdir docs && cp -r dist/* docs/

# 4. Committe die Änderungen
git add docs/
git commit -m "Update website with fixed image path"
git push
```

**WICHTIG:** Falls du noch keine `docs/` Ordner hast oder GitHub Pages aus einem anderen Ordner serviert, musst du die Dateien in den richtigen Ordner kopieren!

## Wo finde ich den richtigen Ordner?

1. Gehe zu: https://github.com/fraendk-lang/elastic-pulse-studio/settings/pages
2. Schaue unter "Source" - dort steht, aus welchem Ordner/Branch GitHub Pages serviert
3. Kopiere die Dateien aus `dist/` in diesen Ordner/Branch

## Wenn nichts funktioniert:

Schreibe mir einfach, ich helfe dir weiter! 😊

