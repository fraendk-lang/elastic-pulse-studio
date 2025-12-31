# Icon-Konvertierung

Das Icon wurde als SVG erstellt. Für electron-builder benötigen wir ein PNG.

## Schnelle Lösung:

**Option 1: Online-Konverter (Empfohlen)**
1. Öffnen Sie `build/icon.png` in einem Browser (es ist ein SVG)
2. Machen Sie einen Screenshot oder exportieren Sie es als PNG (512x512px)
3. Speichern Sie es als `build/icon.png` (überschreiben)

**Option 2: Mit macOS sips**
```bash
cd build
# Öffnen Sie icon.png in Preview und exportieren Sie als PNG
# Oder verwenden Sie ein Online-Tool
```

**Option 3: Electron-builder akzeptiert auch SVG**
- Die aktuelle Konfiguration sollte funktionieren
- electron-builder konvertiert SVG automatisch

## Für optimale Ergebnisse:

Erstellen Sie ein 512x512px PNG mit:
- Gelber Gradient (#ffdc5e bis #ffb800)
- Pulse/Waveform-Icon
- Dunkler Hintergrund (#0a0a0a)

Das aktuelle SVG-Icon kann als Vorlage verwendet werden.

