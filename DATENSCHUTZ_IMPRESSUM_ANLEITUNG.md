# Datenschutz & Impressum anpassen - Anleitung

## 📍 Wo findest du die Texte?

Die Datenschutz- und Impressum-Modals befinden sich in `index.tsx`:

### Datenschutz-Modal
**Zeile:** ~2700-2800 (suche nach `showPrivacy`)

### Impressum-Modal  
**Zeile:** ~2800-2900 (suche nach `showImprint`)

---

## ✏️ So passt du sie an:

### 1. Öffne `index.tsx`

### 2. Suche nach den Modals:

**Datenschutz:**
```typescript
{showPrivacy && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl">
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-4xl max-h-[80vh] overflow-y-auto">
      <h2 className="text-2xl font-black text-white uppercase mb-4">Datenschutz</h2>
      {/* HIER IST DER TEXT */}
      <p className="text-slate-400 mb-4">
        [Dein Datenschutz-Text hier]
      </p>
    </div>
  </div>
)}
```

**Impressum:**
```typescript
{showImprint && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl">
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-4xl max-h-[80vh] overflow-y-auto">
      <h2 className="text-2xl font-black text-white uppercase mb-4">Impressum</h2>
      {/* HIER IST DER TEXT */}
      <p className="text-slate-400 mb-4">
        [Dein Impressum-Text hier]
      </p>
    </div>
  </div>
)}
```

### 3. Ersetze die Platzhalter-Texte

Ersetze die `<p>` Tags mit deinen eigenen Texten. Du kannst auch mehrere `<p>` Tags verwenden für Absätze:

```typescript
<div className="space-y-4">
  <p className="text-slate-400">
    Absatz 1...
  </p>
  <p className="text-slate-400">
    Absatz 2...
  </p>
  <h3 className="text-xl font-black text-white uppercase mt-6 mb-2">Überschrift</h3>
  <p className="text-slate-400">
    Absatz 3...
  </p>
</div>
```

---

## 📋 Was gehört ins Impressum?

**Pflichtangaben (Deutschland):**
- Name/Unternehmen
- Anschrift (Straße, PLZ, Ort)
- Kontakt (E-Mail, Telefon)
- Bei Unternehmen: Geschäftsführer, Registergericht, Handelsregisternummer
- Bei Verantwortlichem für Inhalte: Name und Anschrift

**Beispiel:**
```
Impressum

Angaben gemäß § 5 TMG:

[Dein Name]
[Straße Hausnummer]
[PLZ Ort]

Kontakt:
E-Mail: [deine-email@example.com]
Telefon: [deine-telefonnummer]

Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:
[Dein Name]
[Anschrift]
```

---

## 📋 Was gehört in die Datenschutzerklärung?

**Pflichtangaben (DSGVO):**
- Wer ist verantwortlich (Name, Anschrift)
- Welche Daten werden erhoben
- Zu welchem Zweck
- Rechtsgrundlage
- Speicherdauer
- Rechte der Betroffenen (Auskunft, Löschung, etc.)
- Cookies/Tracking (falls verwendet)

**Wichtig für Elastic Pulse Studio:**
- Newsletter-Formular: Welche Daten werden gespeichert?
- Kontaktformular: Welche Daten werden gespeichert?
- Analytics (falls verwendet)
- Externe Services (z.B. Google Gemini API)

**Beispiel-Struktur:**
```
1. Verantwortlicher
2. Erhebung und Speicherung personenbezogener Daten
3. Zweck der Datenverarbeitung
4. Rechtsgrundlage
5. Speicherdauer
6. Ihre Rechte
7. Kontakt
```

---

## 🎨 Formatierung-Tipps

Du kannst HTML-Tags verwenden für Formatierung:

```typescript
<div className="space-y-4 text-slate-400">
  <h3 className="text-xl font-black text-white uppercase mt-6 mb-2">
    Überschrift
  </h3>
  <p>
    Normaler Text...
  </p>
  <ul className="list-disc list-inside space-y-2 ml-4">
    <li>Punkt 1</li>
    <li>Punkt 2</li>
  </ul>
  <p className="mt-4">
    <strong className="text-white">Wichtiger Text</strong>
  </p>
</div>
```

---

## ✅ Nach dem Anpassen

1. **Speichern** (`Cmd+S` / `Ctrl+S`)
2. **Testen:** App öffnen und Datenschutz/Impressum-Buttons klicken
3. **DMG neu erstellen** (siehe unten)

---

# DMG neu erstellen - Anleitung

## 🍎 Für macOS

### Schritt 1: Build erstellen

```bash
npm run build
```

### Schritt 2: Electron App bauen

```bash
npm run electron:build:mac
```

**Oder manuell:**
```bash
npm run build
electron-builder --mac
```

### Schritt 3: DMG finden

Die DMG-Datei findest du in:
```
release/
  └── Elastic Pulse Studio-32.11.0.dmg
```

### Schritt 4: DMG testen

1. Doppelklick auf die DMG-Datei
2. App sollte sich öffnen
3. App in den Applications-Ordner ziehen (falls gewünscht)

---

## 🔧 Falls Probleme auftreten

### Problem: "DMG wird nicht erstellt"

**Lösung:**
- Prüfe, ob `electron-builder` installiert ist: `npm list electron-builder`
- Prüfe `package.json` → `build` → `mac` Konfiguration

### Problem: "App startet nicht"

**Lösung:**
- Prüfe Console-Logs: `Console.app` öffnen
- Prüfe, ob `dist/` Ordner korrekt erstellt wurde
- Prüfe `electron/main.cjs` Pfade

### Problem: "Build dauert sehr lange"

**Lösung:**
- Normal beim ersten Build (dependencies werden heruntergeladen)
- Spätere Builds sind schneller

---

## 📦 Build-Konfiguration prüfen

Die Electron-Build-Konfiguration steht in `package.json`:

```json
{
  "build": {
    "appId": "com.elasticpulse.studio",
    "productName": "Elastic Pulse Studio",
    "mac": {
      "category": "public.app-category.entertainment",
      "target": "dmg"
    }
  }
}
```

---

## ✅ Checkliste für DMG-Erstellung

- [ ] `npm run build` erfolgreich
- [ ] `dist/` Ordner vorhanden
- [ ] Datenschutz/Impressum angepasst
- [ ] `npm run electron:build:mac` ausgeführt
- [ ] DMG in `release/` gefunden
- [ ] DMG getestet (öffnet sich, App startet)

---

## 🚀 Schnell-Befehl

**Alles in einem:**
```bash
npm run build && npm run electron:build:mac
```

**Dann DMG finden:**
```bash
open release/
```

---

## 📝 Wichtig

- **DMG-Name:** Wird automatisch aus `productName` und `version` in `package.json` generiert
- **Version ändern:** In `package.json` → `version` (z.B. `"32.11.1"`)
- **Nach Änderungen:** Immer neu builden!

---

**Viel Erfolg! 🎉**

