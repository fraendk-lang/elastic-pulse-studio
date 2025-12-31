# Elastic Pulse Studio - Hosting-Anleitung

## 🎯 Was ist Hosting?

**Hosting** bedeutet, deine App auf einem Server im Internet zu veröffentlichen, sodass sie von überall erreichbar ist. Statt nur lokal auf deinem Computer zu laufen, kann jeder die App über eine URL (z.B. `https://elastic-pulse-studio.vercel.app`) aufrufen.

---

## 📦 Was wird gehostet?

Nach dem Build-Prozess entsteht ein `dist/` Ordner mit allen Dateien, die für die App benötigt werden:
- HTML-Dateien
- JavaScript-Bundle
- CSS-Dateien
- Statische Assets (Bilder, Icons, etc.)

Diese Dateien werden auf einen Server hochgeladen und von dort aus bereitgestellt.

---

## 🚀 Hosting-Optionen

### Option 1: Vercel (Empfohlen für Anfänger) ⭐

**Warum Vercel?**
- ✅ Sehr einfach zu bedienen
- ✅ Automatisches Deployment
- ✅ Kostenlos für kleine Projekte
- ✅ Schnelle Performance (CDN)
- ✅ Automatische HTTPS (sicheres https://)

**Schritte:**

1. **Account erstellen**
   - Gehe zu [vercel.com](https://vercel.com)
   - Melde dich mit GitHub, Google oder E-Mail an

2. **Projekt hochladen**
   - Klicke auf "Add New Project"
   - Wähle dein GitHub-Repository ODER
   - Ziehe den `dist/` Ordner per Drag & Drop hoch

3. **Build-Konfiguration** (wenn über GitHub)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Environment-Variablen** (optional)
   - Gehe zu Project Settings → Environment Variables
   - Füge hinzu: `GEMINI_API_KEY` = dein API-Key
   - (Nur nötig, wenn AI-Shader-Generierung funktionieren soll)

5. **Deploy**
   - Klicke auf "Deploy"
   - Warte 1-2 Minuten
   - Fertig! Du erhältst eine URL wie `https://elastic-pulse-studio.xyz.vercel.app`

**Vorteile:**
- Automatisches Deployment bei jedem Git-Push
- Kostenlos
- Sehr schnell

---

### Option 2: Netlify (Alternative zu Vercel)

**Warum Netlify?**
- ✅ Ähnlich einfach wie Vercel
- ✅ Kostenlos
- ✅ Gute Performance

**Schritte:**

1. **Account erstellen**
   - Gehe zu [netlify.com](https://netlify.com)
   - Melde dich an

2. **Projekt hochladen**
   - Klicke auf "Add new site" → "Deploy manually"
   - Ziehe den `dist/` Ordner per Drag & Drop hoch

3. **Environment-Variablen** (optional)
   - Gehe zu Site settings → Environment variables
   - Füge `GEMINI_API_KEY` hinzu

4. **Fertig!**
   - Du erhältst eine URL wie `https://elastic-pulse-studio.netlify.app`

---

### Option 3: GitHub Pages (Kostenlos, aber manuell)

**Warum GitHub Pages?**
- ✅ Komplett kostenlos
- ✅ Keine Limits
- ⚠️ Manuelles Deployment nötig

**Schritte:**

1. **GitHub Repository erstellen**
   - Erstelle ein neues Repository auf GitHub
   - Lade deinen Code hoch

2. **Build lokal erstellen**
   ```bash
   npm run build
   ```

3. **dist/ Ordner deployen**
   - Option A: GitHub Actions (automatisch)
   - Option B: Manuell per Git (siehe unten)

4. **GitHub Pages aktivieren**
   - Gehe zu Repository Settings → Pages
   - Wähle Branch: `gh-pages` oder `main` (mit `/dist` als Root)
   - Speichern

**URL:** `https://dein-username.github.io/repository-name`

---

## 🔧 Lokaler Build-Prozess

Bevor du hostest, musst du einen Production-Build erstellen:

```bash
# 1. Dependencies installieren (falls noch nicht geschehen)
npm install

# 2. Production Build erstellen
npm run build
```

**Was passiert dabei?**
- TypeScript wird zu JavaScript kompiliert
- Code wird optimiert und minifiziert
- Assets werden optimiert
- Ein `dist/` Ordner wird erstellt

**Der `dist/` Ordner enthält:**
```
dist/
  ├── index.html          (Haupt-HTML-Datei)
  ├── assets/
  │   ├── index-[hash].js (JavaScript-Bundle)
  │   ├── index-[hash].css (CSS-Bundle)
  │   └── ...             (andere Assets)
  └── ...
```

---

## 🌐 Environment-Variablen

### Was sind Environment-Variablen?

Das sind geheime Werte (wie API-Keys), die nicht im Code gespeichert werden sollen.

### Für Elastic Pulse Studio:

**GEMINI_API_KEY** (optional)
- Wird für AI-Shader-Generierung benötigt
- Ohne Key: AI-Feature funktioniert nicht, Rest der App funktioniert normal
- Wo bekommt man den Key? [Google AI Studio](https://makersuite.google.com/app/apikey)

**Wie setzt man sie?**

**Vercel:**
1. Project Settings → Environment Variables
2. Name: `GEMINI_API_KEY`
3. Value: dein API-Key
4. Save

**Netlify:**
1. Site settings → Environment variables
2. Add variable
3. Key: `GEMINI_API_KEY`, Value: dein API-Key
4. Save

**GitHub Pages:**
- Über GitHub Actions Secrets (erweitert)

---

## 📝 Schritt-für-Schritt: Vercel (Empfohlen)

### Methode 1: Über GitHub (Automatisch)

1. **Code auf GitHub hochladen**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/dein-username/elastic-pulse-studio.git
   git push -u origin main
   ```

2. **Vercel verbinden**
   - Gehe zu vercel.com
   - "Import Project"
   - Wähle dein GitHub-Repository
   - Vercel erkennt automatisch die Einstellungen

3. **Build-Einstellungen prüfen**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy**
   - Klicke "Deploy"
   - Warte 1-2 Minuten
   - Fertig!

**Vorteil:** Bei jedem Git-Push wird automatisch neu deployed!

### Methode 2: Manuell (Drag & Drop)

1. **Build lokal erstellen**
   ```bash
   npm run build
   ```

2. **Vercel öffnen**
   - Gehe zu vercel.com
   - "Add New Project"
   - "Deploy manually"

3. **dist/ Ordner hochladen**
   - Ziehe den `dist/` Ordner per Drag & Drop in das Browser-Fenster
   - Warte bis Upload fertig ist

4. **Fertig!**
   - Du erhältst sofort eine URL

**Nachteil:** Bei Änderungen musst du manuell neu hochladen.

---

## ✅ Checkliste vor dem Hosting

- [ ] `npm run build` erfolgreich durchgelaufen
- [ ] `dist/` Ordner wurde erstellt
- [ ] Keine Fehler im Build-Output
- [ ] Lokal getestet: `npm run preview` (optional)
- [ ] Environment-Variablen notiert (falls nötig)

---

## 🧪 Nach dem Hosting testen

1. **App öffnen** über die bereitgestellte URL
2. **Features testen:**
   - ✅ Landing Page lädt
   - ✅ "Launch Studio" Button funktioniert
   - ✅ Shader werden geladen
   - ✅ Timeline funktioniert
   - ✅ Export funktioniert (Chrome/Edge empfohlen)
   - ✅ Video-Import funktioniert

3. **Falls Probleme:**
   - Browser-Konsole öffnen (F12)
   - Nach Fehlern suchen
   - Network-Tab prüfen (fehlende Dateien?)

---

## 🔒 Sicherheit & Best Practices

### Was sollte NICHT gehostet werden?

- ❌ `.env` Dateien (mit API-Keys)
- ❌ `node_modules/` (zu groß, nicht nötig)
- ❌ Source-Code (nur `dist/` wird gebraucht)

### Was wird automatisch ignoriert?

Die `.gitignore` Datei sorgt dafür, dass sensible Dateien nicht hochgeladen werden:
- `.env` Dateien
- `node_modules/`
- `dist/` (wird beim Build neu erstellt)

---

## 💰 Kosten

**Alle genannten Optionen sind KOSTENLOS für:**
- Kleine bis mittlere Projekte
- Persönliche Projekte
- Prüfungsprojekte

**Kosten entstehen nur bei:**
- Sehr hohem Traffic (Millionen von Besuchern)
- Enterprise-Features
- Custom-Domains (kann kostenlos sein, z.B. bei Vercel)

---

## 🆘 Troubleshooting

### Problem: "404 Not Found"
**Lösung:** Stelle sicher, dass `base: './'` in `vite.config.ts` gesetzt ist.

### Problem: "Assets werden nicht geladen"
**Lösung:** 
- Prüfe, ob alle Dateien im `dist/` Ordner sind
- Prüfe Browser-Konsole auf 404-Fehler
- Stelle sicher, dass relative Pfade verwendet werden

### Problem: "API-Key funktioniert nicht"
**Lösung:**
- Prüfe, ob Environment-Variable korrekt gesetzt ist
- Prüfe, ob Variable-Name exakt `GEMINI_API_KEY` ist
- Nach Änderung: Neu deployen

### Problem: "Export funktioniert nicht"
**Lösung:**
- MediaRecorder wird nur in Chrome/Edge unterstützt
- Teste in Chrome oder Edge
- Prüfe Browser-Konsole auf Fehler

---

## 📚 Weitere Ressourcen

- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **GitHub Pages Docs:** https://docs.github.com/pages
- **Vite Build Docs:** https://vitejs.dev/guide/build.html

---

## 🎉 Zusammenfassung

**Einfachste Methode (Empfohlen):**
1. Code auf GitHub hochladen
2. Vercel Account erstellen
3. Repository verbinden
4. Deploy klicken
5. Fertig! 🚀

**Zeitaufwand:** ~10 Minuten

**Kosten:** Kostenlos

**Resultat:** Deine App ist live im Internet! 🌐

---

**Fragen?** Schau in die Dokumentation der jeweiligen Plattform oder teste einfach - es ist schwer, etwas kaputt zu machen! 😊

