# Icon Setup für Electron App

## Aktueller Status

Das Icon-System ist eingerichtet. `electron-builder` kann direkt mit PNG-Dateien arbeiten.

## Icon-Datei

- **`build/icon.png`** - SVG-basiertes Icon (512x512px)
  - Wird automatisch von electron-builder verwendet
  - Funktioniert für beide Plattformen (macOS & Windows)

## Optional: Native Icons erstellen

Für optimale Darstellung können Sie native Icons erstellen:

### macOS (.icns)

**Option 1: Mit sips (macOS eingebaut)**
```bash
cd build
mkdir icon.iconset
# Erstellen Sie verschiedene Größen (16, 32, 64, 128, 256, 512, 1024)
# Dann:
iconutil -c icns icon.iconset -o icon.icns
```

**Option 2: Online Tool**
- Gehen Sie zu https://cloudconvert.com/png-to-icns
- Laden Sie `icon.png` hoch
- Laden Sie `icon.icns` herunter und speichern Sie es in `build/`

### Windows (.ico)

**Option 1: Mit ImageMagick**
```bash
brew install imagemagick  # macOS
convert build/icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

**Option 2: Online Tool**
- Gehen Sie zu https://cloudconvert.com/png-to-ico
- Laden Sie `icon.png` hoch
- Laden Sie `icon.ico` herunter und speichern Sie es in `build/`

## Automatische Konvertierung

Falls Sie `create-icons.sh` ausführen möchten:
```bash
cd build
./create-icons.sh
```

**Hinweis:** Die PNG-Datei funktioniert auch ohne Konvertierung! electron-builder konvertiert sie automatisch.

