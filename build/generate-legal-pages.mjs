import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

// Stelle sicher, dass dist-Verzeichnis existiert
mkdirSync(distDir, { recursive: true });

// Kontaktdaten
const contactData = {
  name: 'Frank Krumsdorf',
  street: 'Hospitalstraße 16',
  city: '53840 Troisdorf',
  email: 'fraendk@hotmail.com',
  phone: '+4915753105470',
  creationDate: '31.12.2025'
};

const currentDate = new Date().toLocaleDateString('de-DE', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

const baseHTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Elastic Pulse Studio - Professioneller WebGL Visual Sequencer für Echtzeit-Visuals, AI-generierte Shader und professionelle Automatisierung. Läuft komplett im Browser.">
  <meta name="robots" content="index, follow">
  <title>Elastic Pulse Studio - Professional Visual Sequencer</title>
  <link rel="icon" type="image/svg+xml" href="./favicon.svg">
  <link rel="alternate icon" type="image/png" href="./favicon.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #030712;
      color: #f9fafb;
      margin: 0;
      overflow-x: hidden;
    }
    .mesh-gradient {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      background: 
        radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.05) 0%, transparent 50%);
    }
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #030712;
    }
    ::-webkit-scrollbar-thumb {
      background: #1f2937;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #374151;
    }
  </style>
</head>
<body>
  <div class="mesh-gradient"></div>
  <div class="min-h-screen py-12 px-6">
    <div class="max-w-4xl mx-auto">
      <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 md:p-12">
        <div class="mb-8">
          <a href="./index.html" class="inline-flex items-center gap-2 text-[#ffdc5e] hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">
            ← Zurück zur Startseite
          </a>
        </div>
        {CONTENT}
      </div>
    </div>
  </div>
</body>
</html>`;

const datenschutzContent = `
        <h1 class="text-3xl md:text-4xl font-black text-white uppercase mb-8">Datenschutzerklärung</h1>
        <div class="space-y-8 text-slate-300 text-sm md:text-base leading-relaxed">
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">1. Verantwortlicher</h2>
            <p>Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
            <p class="mt-2 font-mono text-xs bg-[#0a0a0a] p-4 rounded-lg border border-white/5">
              ${contactData.name}<br/>
              ${contactData.street}<br/>
              ${contactData.city}<br/>
              E-Mail: ${contactData.email}<br/>
              Telefon: ${contactData.phone}
            </p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">2. Zweck der Website</h2>
            <p>Diese Website dient der Präsentation eines App- und Webprojekts im Rahmen einer Weiterbildung bzw. Prüfungsleistung im Bereich KI-gestützter Web- und App-Entwicklung. Es handelt sich nicht um ein kommerzielles Angebot.</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">3. Hosting</h2>
            <p>Die Website wird über GitHub Pages bereitgestellt. Beim Aufruf der Website werden durch den Hostinganbieter technisch bedingt sogenannte Server-Logfiles erhoben. Dazu können gehören:</p>
            <ul class="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>IP-Adresse</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>aufgerufene Seite</li>
              <li>Browsertyp und Betriebssystem</li>
            </ul>
            <p class="mt-3">Diese Daten werden ausschließlich zur Sicherstellung des technischen Betriebs verarbeitet und nicht von mir ausgewertet.</p>
            <p class="mt-2 text-xs italic text-slate-500">Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und stabilen Betrieb der Website).</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">4. Kontaktaufnahme</h2>
            <p>Eine Kontaktaufnahme ist über einen bereitgestellten E-Mail-Link möglich.</p>
            <p class="mt-2">Bei der Kontaktaufnahme per E-Mail werden die von Ihnen übermittelten personenbezogenen Daten (z. B. E-Mail-Adresse, Inhalt der Nachricht) ausschließlich zum Zweck der Bearbeitung Ihrer Anfrage verwendet.</p>
            <p class="mt-2">Die Daten werden nicht an Dritte weitergegeben und nach Abschluss der Kommunikation gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
            <p class="mt-2 text-xs italic text-slate-500">Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Kommunikation) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung von Anfragen).</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">5. Newsletter</h2>
            <p>Auf der Website besteht die Möglichkeit, sich für einen Newsletter einzutragen. Der Newsletter ist derzeit konzeptionell vorbereitet, jedoch noch nicht aktiv. Eine tatsächliche Speicherung oder Verarbeitung personenbezogener Daten für den Newsletter-Versand findet aktuell nicht statt.</p>
            <p class="mt-2">Sollte der Newsletter zu einem späteren Zeitpunkt aktiviert werden, erfolgt dies ausschließlich auf Grundlage einer ausdrücklichen Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Eine Abmeldung wäre jederzeit möglich.</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">6. Cookies und Tracking</h2>
            <p>Diese Website verwendet keine Cookies zu Analyse- oder Marketingzwecken. Es werden keine Tracking-Tools, Analyse-Dienste oder personalisierte Werbemaßnahmen eingesetzt.</p>
            <p class="mt-2">Technisch notwendige Cookies können in Einzelfällen durch den Hostinganbieter verwendet werden, sind jedoch für den Betrieb der Website erforderlich und nicht zustimmungspflichtig.</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">7. Weitergabe von Daten</h2>
            <p>Eine Weitergabe personenbezogener Daten an Dritte findet nicht statt.</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">8. Rechte der betroffenen Personen</h2>
            <p>Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf:</p>
            <ul class="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Auskunft über Ihre gespeicherten personenbezogenen Daten</li>
              <li>Berichtigung unrichtiger Daten</li>
              <li>Löschung Ihrer Daten</li>
              <li>Einschränkung der Verarbeitung</li>
              <li>Widerspruch gegen die Verarbeitung</li>
              <li>Datenübertragbarkeit</li>
            </ul>
            <p class="mt-3">Zur Wahrnehmung Ihrer Rechte wenden Sie sich bitte an die oben genannte E-Mail-Adresse.</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">9. Aktualität dieser Datenschutzerklärung</h2>
            <p>Diese Datenschutzerklärung hat den Stand: ${currentDate}</p>
            <p class="mt-2">Ich behalte mir vor, diese Datenschutzerklärung bei Bedarf anzupassen, um sie an rechtliche oder technische Änderungen anzupassen.</p>
          </div>
        </div>`;

const impressumContent = `
        <h1 class="text-3xl md:text-4xl font-black text-white uppercase mb-8">Impressum</h1>
        <div class="space-y-8 text-slate-300 text-sm md:text-base leading-relaxed">
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">Angaben gemäß § 5 Telemediengesetz (TMG)</h2>
            <p class="font-mono text-xs bg-[#0a0a0a] p-4 rounded-lg border border-white/5 mt-3">
              ${contactData.name}<br/>
              ${contactData.street}<br/>
              ${contactData.city}<br/>
              Deutschland
            </p>
            <p class="mt-3">E-Mail: ${contactData.email}</p>
            <p class="mt-2">Telefon: ${contactData.phone}</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">Projektbezogener Hinweis</h2>
            <p>Dieses Projekt wurde im Rahmen einer Weiterbildung bzw. Prüfungsleistung im Bereich KI-gestützte Web- und App-Entwicklung erstellt. Es handelt sich nicht um ein kommerzielles Angebot.</p>
            <p class="mt-2 text-xs italic text-slate-500">Erstellung: ${contactData.creationDate}</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
            <p class="font-mono text-xs bg-[#0a0a0a] p-4 rounded-lg border border-white/5 mt-3">
              ${contactData.name}<br/>
              ${contactData.street}<br/>
              ${contactData.city}
            </p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">Haftung für Inhalte</h2>
            <p>Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">Haftung für Links</h2>
            <p>Diese Website enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Für diese fremden Inhalte kann daher keine Gewähr übernommen werden. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
          </div>
          <div>
            <h2 class="text-white font-black uppercase mb-3 text-lg">Urheberrecht</h2>
            <p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors.</p>
          </div>
        </div>`;

// Generiere Datenschutz-HTML
const datenschutzHTML = baseHTML.replace('{CONTENT}', datenschutzContent)
  .replace('<title>Elastic Pulse Studio - Professional Visual Sequencer</title>', '<title>Datenschutzerklärung - Elastic Pulse Studio</title>')
  .replace(
    '<meta name="description" content="Elastic Pulse Studio - Professioneller WebGL Visual Sequencer für Echtzeit-Visuals, AI-generierte Shader und professionelle Automatisierung. Läuft komplett im Browser.">',
    '<meta name="description" content="Datenschutzerklärung der Elastic Pulse Studio Website. Informationen zur Verarbeitung personenbezogener Daten.">'
  );

// Generiere Impressum-HTML
const impressumHTML = baseHTML.replace('{CONTENT}', impressumContent)
  .replace('<title>Elastic Pulse Studio - Professional Visual Sequencer</title>', '<title>Impressum - Elastic Pulse Studio</title>')
  .replace(
    '<meta name="description" content="Elastic Pulse Studio - Professioneller WebGL Visual Sequencer für Echtzeit-Visuals, AI-generierte Shader und professionelle Automatisierung. Läuft komplett im Browser.">',
    '<meta name="description" content="Impressum der Elastic Pulse Studio Website. Angaben gemäß TMG.">'
  );

// Schreibe Dateien
writeFileSync(join(distDir, 'datenschutz.html'), datenschutzHTML);
writeFileSync(join(distDir, 'impressum.html'), impressumHTML);

console.log('✅ Legal pages generated successfully!');
console.log('   - dist/datenschutz.html');
console.log('   - dist/impressum.html');
