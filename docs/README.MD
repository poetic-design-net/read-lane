Erstelle eine vollständige, produktionsreife Web-App zum Veröffentlichen und Teilen von Markdown-Dokumenten.

## 1. Produktidee

Die App soll eine extrem einfache Möglichkeit bieten, eine `.md`-Datei hochzuladen oder Markdown direkt einzufügen, den Inhalt hochwertig darzustellen und anschließend über einen Link zu teilen.

Ein Dokument kann entweder:

1. öffentlich zugänglich sein,
2. nur über einen geheimen, nicht gelisteten Link erreichbar sein,
3. zusätzlich mit einem Passwort geschützt werden.

Die App soll bewusst minimalistisch sein. Keine unnötigen Social-, Team- oder Projektmanagement-Funktionen.

Arbeitstitel der App:

**MD Share**

Der Name soll zentral konfigurierbar sein, damit er später einfach geändert werden kann.

---

## 2. Technischer Stack

Verwende:

* Next.js mit App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* PostgreSQL mit Drizzle ORM
* Neon als PostgreSQL-Datenbank
* Vercel für das Deployment
* React Markdown für die Markdown-Darstellung
* remark-gfm für GitHub-Flavored Markdown
* rehype-sanitize für sichere HTML-Ausgabe
* Shiki oder eine vergleichbare serverseitige Lösung für Syntax-Highlighting
* Zod für Validierung
* bcrypt oder Argon2 für Passwort-Hashes
* nanoid für nicht erratbare Dokument-IDs und Bearbeitungs-Tokens

Nutze ausschließlich stabile, aktuelle und miteinander kompatible Versionen.

Die App muss direkt lokal und auf Vercel lauffähig sein.

---

## 3. Kernfunktionen

### Dokument erstellen

Auf der Startseite kann der Benutzer:

* eine `.md`-Datei per Drag-and-drop hochladen,
* über einen Dateiauswahldialog hochladen,
* Markdown direkt in ein Textfeld einfügen,
* einen Dokumenttitel vergeben,
* optional eine kurze Beschreibung eintragen.

Nach dem Upload beziehungsweise Einfügen wird sofort eine Live-Vorschau angezeigt.

Akzeptiere ausschließlich Markdown- und Textdateien:

* `.md`
* `.markdown`
* `.txt`

Definiere eine sinnvolle maximale Dateigröße, beispielsweise 2 MB.

### Markdown-Vorschau

Die Vorschau muss mindestens unterstützen:

* Überschriften
* Absätze
* Fett und Kursiv
* Links
* Bilder
* Blockquotes
* nummerierte Listen
* ungeordnete Listen
* Checklisten
* Tabellen
* horizontale Linien
* Inline-Code
* Codeblöcke
* Syntax-Highlighting
* Fußnoten, sofern mit vertretbarem Aufwand möglich

Unsicheres HTML und JavaScript dürfen niemals ausgeführt werden.

### Darstellungsoptionen

Vor der Veröffentlichung kann der Benutzer einige einfache Optionen auswählen:

* helles Theme
* dunkles Theme
* automatische Darstellung entsprechend dem System
* schmale Lesebreite
* normale Lesebreite
* breite Lesebreite
* Serifenschrift oder Sans-Serifenschrift für Fließtext
* Inhaltsverzeichnis automatisch anzeigen
* Zeilennummern bei Codeblöcken ein- oder ausschalten

Keine komplexe Design-Engine bauen. Die Einstellungen sollen übersichtlich bleiben.

### Veröffentlichung

Beim Veröffentlichen kann der Benutzer zwischen drei Sichtbarkeiten wählen:

#### Öffentlich

Das Dokument ist über seinen Link ohne Passwort erreichbar.

Das Dokument wird trotzdem nicht automatisch in einer öffentlichen Übersicht oder Suchseite aufgelistet.

#### Nicht gelistet

Das Dokument ist nur über eine lange, nicht erratbare URL erreichbar.

Es wird weder in einer Sitemap noch in einer internen Übersicht ausgegeben.

#### Passwortgeschützt

Das Dokument ist nur nach Eingabe des korrekten Passworts erreichbar.

Das Passwort darf niemals im Klartext gespeichert werden.

Speichere ausschließlich einen sicheren Passwort-Hash.

### Links

Nach der Veröffentlichung werden zwei getrennte Links erzeugt:

1. ein öffentlicher Share-Link,
2. ein geheimer Verwaltungslink.

Beispiel:

```text
https://domain.de/d/x7Ks91pQ
https://domain.de/manage/abc123-secret-token
```

Der Verwaltungslink muss deutlich als vertraulich gekennzeichnet werden.

Über den Verwaltungslink kann der Ersteller:

* das Dokument bearbeiten,
* den Markdown-Inhalt ersetzen,
* Titel und Beschreibung ändern,
* die Darstellung ändern,
* den Passwortschutz aktivieren oder deaktivieren,
* das Passwort ändern,
* den Share-Link kopieren,
* das Dokument löschen.

Der Verwaltungs-Token darf niemals im Share-Link oder im öffentlich ausgelieferten HTML erscheinen.

---

## 4. Benutzerkonten

Für die erste Version sind keine Benutzerkonten erforderlich.

Dokumente werden ausschließlich über den geheimen Verwaltungslink verwaltet.

Baue die Architektur jedoch so, dass später optional Benutzerkonten und eine Dokumentübersicht ergänzt werden können.

Keine Authentifizierungsbibliothek einbauen, solange sie für das MVP nicht benötigt wird.

---

## 5. Datenmodell

Erstelle mindestens eine Tabelle `documents`.

Sinnvolle Felder:

```text
id
publicId
managementTokenHash
title
description
markdownContent
visibility
passwordHash
theme
contentWidth
fontStyle
showTableOfContents
showCodeLineNumbers
createdAt
updatedAt
expiresAt
deletedAt
```

Vorgaben:

* `publicId` muss eindeutig und nicht erratbar sein.
* Der Verwaltungs-Token soll ebenfalls nicht im Klartext gespeichert werden.
* `visibility` soll typisiert sein.
* Gelöschte Dokumente sollen entweder sicher endgültig gelöscht oder zunächst per Soft Delete markiert werden.
* Datenbankzugriffe ausschließlich serverseitig durchführen.
* Niemals Passwort-Hashes, Verwaltungs-Tokens oder interne IDs an den Browser senden.

---

## 6. Passwortschutz

Bei einem passwortgeschützten Dokument soll zunächst nur eine schlichte Entsperrseite erscheinen.

Sie enthält:

* Dokumenttitel, sofern dies keinen Datenschutzkonflikt verursacht,
* Passwortfeld,
* Button „Dokument öffnen“,
* verständliche Fehlermeldung bei falschem Passwort.

Nach erfolgreicher Eingabe wird eine kurzlebige, sichere und HTTP-only Session für genau dieses Dokument gesetzt.

Anforderungen:

* Secure Cookie in Produktion
* HTTP-only Cookie
* SameSite=Lax oder strenger
* zeitlich begrenzte Freischaltung
* Rate Limiting für Passwortversuche
* keine Unterscheidung zwischen nicht vorhandenem Dokument und ungültigem Zugriff, sofern dies sicherheitsrelevant ist
* keine Speicherung des eingegebenen Passworts im Browser
* Schutz vor Brute-Force-Angriffen

---

## 7. Öffentliche Dokumentseite

Die Dokumentseite soll wie ein hochwertiges, ruhiges Online-Dokument wirken.

Aufbau:

* sehr dezenter Header
* kleines App-Logo beziehungsweise Wortmarke
* optionaler Dokumenttitel
* optionale Beschreibung
* Veröffentlichungs- oder Aktualisierungsdatum
* Markdown-Inhalt
* optional fixiertes oder ausklappbares Inhaltsverzeichnis
* Button zum Kopieren des Links
* Theme-Umschalter
* dezenter Footer

Die Markdown-Typografie soll professionell und hervorragend lesbar sein.

Achte besonders auf:

* angenehme Zeilenhöhe
* klare Abstände
* hochwertige Überschriften
* gut lesbare Tabellen
* schöne Blockquotes
* responsive Bilder
* horizontal scrollbar dargestellte Codeblöcke
* saubere Darstellung auf Smartphones
* gute Kontraste im Light- und Dark-Mode

Keine überladenen Karten, Verläufe oder unnötigen Animationen.

---

## 8. Startseite

Die Startseite soll sofort verständlich sein.

### Hero

Headline:

**Markdown schön teilen.**

Subheadline:

**Datei hochladen, Darstellung auswählen und einen öffentlichen oder passwortgeschützten Link versenden.**

Darunter befindet sich direkt der Upload- und Editorbereich.

### Editorbereich

Nutze auf Desktop eine zweigeteilte Ansicht:

* links Markdown-Eingabe
* rechts Live-Vorschau

Auf mobilen Geräten werden Editor und Vorschau über Tabs umgeschaltet.

Funktionen:

* Datei hochladen
* Markdown einfügen
* Beispieldokument laden
* Inhalt löschen
* Live-Vorschau
* Dokumenteinstellungen öffnen
* veröffentlichen

Das Interface soll auch ohne Erklärung verständlich sein.

---

## 9. Veröffentlichungsdialog

Beim Klick auf „Veröffentlichen“ öffnet sich ein klarer Dialog.

Eingaben:

* Titel
* Beschreibung
* Sichtbarkeit
* optionales Passwort
* Theme
* Lesebreite
* Schriftstil
* Inhaltsverzeichnis
* Zeilennummern

Bei der Option „Passwortgeschützt“ muss das Passwortfeld erscheinen.

Zeige vor dem Absenden klar an:

* wer das Dokument öffnen kann,
* ob ein Passwort erforderlich ist,
* dass der Verwaltungslink geheim gehalten werden muss.

Nach erfolgreicher Veröffentlichung erscheint eine Erfolgsansicht mit:

* Share-Link
* Verwaltungslink
* Kopieren-Buttons
* Button „Dokument öffnen“
* Button „Dokument verwalten“

Der Benutzer soll beide Links zusätzlich als einfache Textdatei herunterladen können.

---

## 10. Dokument bearbeiten

Die Verwaltungsseite soll den gleichen Editor wie die Startseite verwenden.

Vor dem Laden des Dokuments muss der Verwaltungs-Token serverseitig geprüft werden.

Der Benutzer kann Änderungen speichern, ohne dass sich der Share-Link ändert.

Zeige:

* Zeitpunkt der letzten Speicherung
* sichtbaren Speichern-Status
* Warnung vor ungespeicherten Änderungen
* Löschfunktion mit Bestätigungsdialog

Optional kann eine Funktion „Share-Link neu erzeugen“ eingebaut werden. Dabei wird der bisherige öffentliche Link sofort ungültig.

---

## 11. Sicherheit

Sicherheit ist ein zentraler Bestandteil der Umsetzung.

Berücksichtige:

* Markdown und HTML konsequent sanitizen
* Schutz vor XSS
* Schutz vor SQL Injection durch ORM und validierte Eingaben
* CSRF-Schutz für schreibende Aktionen
* Rate Limiting
* sichere Passwort-Hashes
* sichere Token-Erzeugung
* Token-Hashes statt Klartext-Tokens
* keine vertraulichen Informationen in Logs
* keine geheimen Werte im Client Bundle
* sichere HTTP-Header
* Content Security Policy
* `X-Content-Type-Options`
* `Referrer-Policy`
* sinnvolle CORS-Regeln
* keine Indexierung nicht gelisteter oder passwortgeschützter Dokumente
* `noindex` für Verwaltungsseiten
* `noindex` für passwortgeschützte und nicht gelistete Dokumente

Links und Bilder im Markdown müssen sicher behandelt werden.

Verhindere insbesondere:

* `javascript:`-Links
* eingebettete Skripte
* unsichere HTML-Attribute
* manipulierte Bildquellen
* gefährliche Data-URLs

---

## 12. Datenschutz

Die App soll datensparsam sein.

Für das MVP:

* keine Tracking-Cookies
* kein Google Analytics
* keine Werbung
* keine unnötigen externen Requests
* keine öffentlichen Autorenprofile
* keine automatische Veröffentlichung in Suchmaschinen

Füge eine einfache Datenschutz- und Impressumsseite als Platzhalter hinzu.

Die Inhalte sollen über eine zentrale Konfigurationsdatei austauschbar sein.

---

## 13. Fehlerbehandlung

Erstelle verständliche Fehlerzustände für:

* ungültige Datei
* Datei zu groß
* leeres Dokument
* Dokument nicht gefunden
* falsches Passwort
* abgelaufenes Dokument
* ungültiger Verwaltungslink
* Datenbankfehler
* Netzwerkfehler
* Rate Limit erreicht

Keine technischen Stacktraces im Frontend anzeigen.

Erstelle eine saubere 404-Seite und eine allgemeine Fehlerseite.

---

## 14. Barrierefreiheit

Die App muss möglichst barrierearm umgesetzt werden.

Berücksichtige:

* semantisches HTML
* vollständige Tastaturbedienbarkeit
* sichtbare Fokuszustände
* korrekte Labels
* ARIA-Attribute nur dort, wo sie notwendig sind
* ausreichende Farbkontraste
* verständliche Fehlermeldungen
* Screenreader-freundliche Dialoge
* reduzierte Animation bei `prefers-reduced-motion`

---

## 15. Performance

Die öffentlichen Dokumentseiten sollen sehr schnell laden.

Nutze:

* Server Components, wo sinnvoll
* möglichst wenig clientseitiges JavaScript
* serverseitiges Markdown-Rendering
* Caching, sofern mit dem Passwortschutz vereinbar
* dynamische Metadaten
* optimierte Fonts
* optimierte Bilder
* Lazy Loading
* schlanke Abhängigkeiten

Passwortgeschützte Inhalte dürfen niemals versehentlich statisch gecacht oder öffentlich ausgeliefert werden.

---

## 16. Metadaten und Sharing

Für öffentliche Dokumente sollen passende Metadaten erzeugt werden:

* Seitentitel
* Beschreibung
* Open-Graph-Titel
* Open-Graph-Beschreibung
* kanonische URL

Erstelle optional ein dynamisches Open-Graph-Bild mit:

* Dokumenttitel
* dezenter MD-Share-Wortmarke
* ruhigem, typografischem Layout

Nicht gelistete und passwortgeschützte Dokumente sollen keine sensiblen Inhalte in Open-Graph-Daten offenlegen.

---

## 17. Optionale Ablaufzeit

Bereite optional eine Ablaufzeit für Dokumente vor.

Auswahl:

* nie
* nach 24 Stunden
* nach 7 Tagen
* nach 30 Tagen
* benutzerdefiniertes Datum

Nach Ablauf darf das Dokument öffentlich nicht mehr erreichbar sein.

Diese Funktion darf zunächst als gut integriertes Feature umgesetzt werden, soll die Kernoberfläche aber nicht unnötig verkomplizieren.

---

## 18. Designrichtung

Das Design soll:

* minimalistisch
* modern
* ruhig
* hochwertig
* typografisch
* funktional
* vertrauenswürdig

sein.

Orientiere dich eher an hochwertigen Dokumentations- und Schreibwerkzeugen als an einem klassischen SaaS-Dashboard.

Vermeide:

* übermäßige Gradients
* Glasmorphismus
* verspielte Icons
* große Marketingbereiche
* komplexe Seitenleisten
* künstliche KI-Optik
* unnötige Animationen

Nutze eine neutrale Farbwelt:

* Off-White
* warmes Hellgrau
* dunkles Anthrazit
* eine einzelne dezente Akzentfarbe

Alle Farben sollen über CSS-Variablen zentral konfigurierbar sein.

---

## 19. Projektstruktur

Erstelle eine klare und wartbare Projektstruktur.

Trenne mindestens:

* UI-Komponenten
* Markdown-Rendering
* Datenbanklogik
* Dokument-Aktionen
* Passwortprüfung
* Token-Verwaltung
* Validierung
* Rate Limiting
* Konfiguration
* Typen
* Hilfsfunktionen

Vermeide große monolithische Komponenten.

Nutze Server Actions oder Route Handler bewusst und konsistent.

---

## 20. Entwicklungsanforderungen

Liefere:

* vollständigen Quellcode
* Datenbankschema
* Migrationen
* Seed oder Beispieldokument
* `.env.example`
* ausführliche `README.md`
* lokale Installationsanleitung
* Vercel-Deployment-Anleitung
* Neon-Einrichtungsanleitung
* Hinweise zu allen Umgebungsvariablen
* grundlegende Tests für sicherheitskritische Funktionen

Die README muss diese Schritte enthalten:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Passe die Befehle an die tatsächlich verwendete Paketverwaltung und Implementierung an.

---

## 21. Tests

Schreibe mindestens Tests für:

* Markdown-Sanitizing
* Token-Erzeugung
* Token-Hash-Vergleich
* Passwort-Hashing
* Passwortprüfung
* Zugriff auf öffentliche Dokumente
* Zugriff auf passwortgeschützte Dokumente
* ungültigen Verwaltungs-Token
* abgelaufene Dokumente
* Zod-Validierung

Führe zusätzlich vor Abschluss aus:

* TypeScript-Prüfung
* Linting
* Produktions-Build
* Tests

Behebe alle dabei auftretenden Fehler.

---

## 22. Akzeptanzkriterien

Die Umsetzung ist erst abgeschlossen, wenn folgender Ablauf vollständig funktioniert:

1. Ein Benutzer öffnet die Startseite.
2. Er lädt eine `.md`-Datei hoch.
3. Der Inhalt erscheint im Editor und in der Vorschau.
4. Er wählt Dark Mode und eine schmale Lesebreite.
5. Er aktiviert den Passwortschutz.
6. Er vergibt ein Passwort.
7. Er veröffentlicht das Dokument.
8. Er erhält einen Share-Link und einen Verwaltungslink.
9. Der Share-Link zeigt zunächst nur die Passwortabfrage.
10. Nach korrekter Passworteingabe wird das Dokument angezeigt.
11. Nach falscher Eingabe bleibt das Dokument geschützt.
12. Über den Verwaltungslink kann das Dokument bearbeitet werden.
13. Änderungen erscheinen anschließend unter demselben Share-Link.
14. Der Benutzer kann den Passwortschutz deaktivieren.
15. Der Benutzer kann das Dokument löschen.
16. Nach dem Löschen ist der Share-Link nicht mehr erreichbar.

---

## 23. Vorgehensweise

Arbeite eigenständig und implementiere die App vollständig.

Gehe in dieser Reihenfolge vor:

1. Projekt und Abhängigkeiten einrichten
2. Datenmodell und Migrationen erstellen
3. sichere Dokument- und Tokenlogik implementieren
4. Markdown-Rendering und Sanitizing umsetzen
5. Editor und Live-Vorschau erstellen
6. Veröffentlichungsprozess bauen
7. Share-Seite implementieren
8. Passwortschutz ergänzen
9. Verwaltungsseite bauen
10. Design und Responsive-Verhalten verfeinern
11. Fehlerzustände ergänzen
12. Tests schreiben
13. Build, Linting und TypeScript prüfen
14. README und Deployment-Anleitung vervollständigen

Stelle keine unnötigen Rückfragen. Triff bei kleineren offenen Punkten sinnvolle Entscheidungen, dokumentiere sie und setze die App bis zu einem funktionierenden, produktionsreifen Ergebnis um.

Am Ende:

* fasse die Architektur kurz zusammen,
* liste alle erstellten Seiten auf,
* nenne die benötigten Umgebungsvariablen,
* erkläre die lokale Einrichtung,
* erkläre das Deployment,
* nenne mögliche spätere Erweiterungen,
* bestätige, welche Tests und Prüfungen erfolgreich ausgeführt wurden.


# Erweiterung: Projekte, Dashboard und CLI-Workflow

Erweitere die App um eine projektbasierte Organisation und einen CLI-Workflow, über den Markdown-Dateien direkt aus lokalen Entwicklungsprojekten veröffentlicht und aktualisiert werden können.

Die zentrale Idee:

Ein Benutzer organisiert seine Dokumente in Projekten. Ein lokales Repository oder ein lokaler Ordner kann mit einem Projekt in der Web-App verbunden werden. Markdown-Dateien werden anschließend direkt aus VS Code beziehungsweise dem Terminal hochgeladen, ohne dass Inhalte kopiert und eingefügt werden müssen.

---

## 24. Benutzerkonten und persönliches Dashboard

Da Dokumente nun dauerhaft Projekten zugeordnet werden, benötigt die App Benutzerkonten.

Implementiere eine einfache, sichere Authentifizierung.

Unterstütze mindestens:

* Anmeldung per E-Mail und Passwort
* optional Magic Link
* Passwort zurücksetzen
* E-Mail-Adresse ändern
* Benutzerkonto löschen
* aktive CLI-Zugänge verwalten

Nach der Anmeldung gelangt der Benutzer in ein persönliches Dashboard.

Das Dashboard zeigt:

* alle Projekte
* zuletzt bearbeitete Dokumente
* zuletzt veröffentlichte Dokumente
* öffentliche Dokumente
* passwortgeschützte Dokumente
* Entwürfe
* Dokumente mit abgelaufenem Link
* zuletzt über die CLI synchronisierte Dateien

Die Oberfläche soll übersichtlich bleiben und nicht wie ein komplexes Enterprise-Dashboard wirken.

---

## 25. Projekte

Ein Benutzer kann beliebig viele Projekte anlegen.

Beispiele:

* Antya
* Poetic Design
* Good Karma Catering
* Co-Intelligent Circle
* Kundenprojekt A
* Private Notizen

Ein Projekt besitzt mindestens:

```text
id
ownerId
name
slug
description
defaultVisibility
defaultTheme
defaultContentWidth
defaultFontStyle
createdAt
updatedAt
archivedAt
```

Ein Dokument gehört standardmäßig zu genau einem Projekt.

Erweitere die Dokumenttabelle mindestens um:

```text
projectId
sourcePath
sourceFilename
sourceChecksum
lastCliSyncAt
createdBy
updatedBy
```

### Projektfunktionen

Innerhalb eines Projekts kann der Benutzer:

* Dokumente erstellen
* Markdown-Dateien hochladen
* vorhandene Dokumente bearbeiten
* Dokumente suchen
* Dokumente nach Status filtern
* Dokumente archivieren
* Dokumente verschieben
* Share-Links kopieren
* Passwortschutz ändern
* Standarddarstellung für das Projekt festlegen
* CLI-Verbindungen verwalten
* das Projekt archivieren oder löschen

### Projektübersicht

Jedes Projekt erhält eine eigene Übersichtsseite.

Zeige dort:

* Projektname
* Beschreibung
* Anzahl der Dokumente
* letzte Aktualisierung
* verbundene lokale Repositories
* zuletzt synchronisierte Dateien
* Dokumentliste
* Button „Dokument hinzufügen“
* Button „CLI verbinden“

Die Dokumentliste soll mindestens folgende Informationen enthalten:

* Titel
* Dateiname
* Sichtbarkeit
* Status
* letztes Update
* Quelle: Web oder CLI
* Share-Link
* Aktionen

---

## 26. Dokumentstatus

Führe einen klaren Dokumentstatus ein:

* `draft`
* `published`
* `archived`

Ein Entwurf ist nur im Dashboard sichtbar.

Ein veröffentlichtes Dokument besitzt einen Share-Link.

Ein archiviertes Dokument ist nicht mehr öffentlich erreichbar, bleibt aber im Projekt gespeichert.

Sichtbarkeit und Status müssen getrennt behandelt werden.

Beispiele:

* Entwurf ohne Share-Link
* veröffentlicht und öffentlich
* veröffentlicht und nicht gelistet
* veröffentlicht und passwortgeschützt
* archiviert

---

## 27. CLI-Paket

Erstelle ein eigenständiges CLI-Paket.

Vorgeschlagener Paketname:

```text
@mdshare/cli
```

Alternativ soll der Produktname zentral konfigurierbar sein.

Das CLI muss unter macOS, Linux und Windows funktionieren.

Es soll sowohl global als auch über `npx` beziehungsweise `pnpm dlx` verwendet werden können.

Beispiele:

```bash
npm install -g @mdshare/cli
```

oder:

```bash
npx @mdshare/cli push
```

Implementiere mindestens folgende Befehle:

```bash
mdshare login
mdshare logout
mdshare whoami
mdshare init
mdshare projects
mdshare push
mdshare push README.md
mdshare push docs/konzept.md
mdshare push --all
mdshare status
mdshare open
mdshare list
mdshare unlink
```

---

## 28. CLI-Anmeldung

### `mdshare login`

Der Benutzer meldet das CLI sicher bei seinem Konto an.

Bevorzugter Ablauf:

1. Das CLI öffnet eine Browserseite.
2. Der Benutzer meldet sich dort an.
3. Er bestätigt den neuen CLI-Zugang.
4. Das CLI erhält einen sicheren Zugriffstoken.
5. Der Token wird lokal im sicheren Credential Store des Betriebssystems gespeichert.

Nutze nach Möglichkeit:

* macOS Keychain
* Windows Credential Manager
* Secret Service unter Linux

Nur wenn kein sicherer Credential Store verfügbar ist, darf eine lokale Konfigurationsdatei verwendet werden.

Dabei müssen Dateirechte eingeschränkt werden.

Zugriffstokens:

* müssen zufällig und nicht erratbar sein
* dürfen serverseitig nur gehasht gespeichert werden
* müssen widerrufbar sein
* können ein Ablaufdatum besitzen
* müssen einem Benutzer und einem Gerät zugeordnet werden
* dürfen nicht in Logs erscheinen

Im Dashboard kann der Benutzer aktive CLI-Zugänge sehen und widerrufen.

Zeige dort:

* Gerätename
* Betriebssystem
* Erstellungsdatum
* letzte Nutzung
* Ablaufdatum
* Button „Zugang widerrufen“

---

## 29. Lokales Projekt verbinden

### `mdshare init`

Dieser Befehl verbindet den aktuellen lokalen Ordner mit einem Projekt in der Web-App.

Ablauf:

1. Prüfen, ob der Benutzer angemeldet ist.
2. Aktuellen Ordner erkennen.
3. Bestehende Projekte abrufen.
4. Auswahl ermöglichen:

   * vorhandenes Projekt verbinden
   * neues Projekt erstellen
5. Projektkonfiguration lokal speichern.
6. Optional vorhandene Markdown-Dateien erkennen.
7. Dem Benutzer anbieten, Dateien zur Synchronisierung auszuwählen.

Erstelle im lokalen Projekt eine Konfigurationsdatei:

```text
.mdshare.json
```

Beispiel:

```json
{
  "version": 1,
  "projectId": "prj_8nG72k",
  "projectSlug": "antya",
  "defaultVisibility": "unlisted",
  "defaultTheme": "system",
  "include": [
    "README.md",
    "docs/**/*.md"
  ],
  "exclude": [
    "node_modules/**",
    ".next/**",
    "private/**"
  ],
  "documents": {
    "README.md": {
      "documentId": "doc_Qm72Lp",
      "slug": "projektuebersicht"
    },
    "docs/architecture.md": {
      "documentId": "doc_Jf82Ks",
      "slug": "architektur"
    }
  }
}
```

Die Konfigurationsdatei darf keine geheimen Tokens oder Passwörter enthalten.

Sie kann grundsätzlich mit Git versioniert werden.

Projekt-IDs und Dokument-IDs dürfen allein keinen Zugriff auf vertrauliche Inhalte ermöglichen.

---

## 30. Markdown direkt veröffentlichen

### `mdshare push`

Der Befehl lädt eine Markdown-Datei hoch oder aktualisiert ein bereits verbundenes Dokument.

Beispiele:

```bash
mdshare push README.md
```

```bash
mdshare push docs/architecture.md
```

```bash
mdshare push --all
```

Beim ersten Upload einer Datei:

1. Markdown-Datei lesen.
2. Frontmatter auswerten.
3. Dokumenttitel bestimmen.
4. Projektzuordnung aus `.mdshare.json` laden.
5. Dokument in der Web-App erstellen.
6. Dokument-ID lokal zuordnen.
7. Share-Link ausgeben.
8. `.mdshare.json` aktualisieren.

Bei späteren Uploads:

1. lokale Datei lesen
2. Prüfsumme berechnen
3. mit letzter synchronisierter Version vergleichen
4. nur bei Änderungen hochladen
5. bestehendes Dokument aktualisieren
6. denselben Share-Link beibehalten
7. Synchronisierungszeit aktualisieren

Beispielausgabe:

```text
✓ README.md veröffentlicht
  Projekt: Antya
  Status: Öffentlich
  URL: https://domain.de/d/projektuebersicht
```

Bei unverändertem Inhalt:

```text
– README.md wurde nicht verändert
```

---

## 31. Frontmatter

Unterstütze optional YAML-Frontmatter in Markdown-Dateien.

Beispiel:

```yaml
---
title: Architektur
description: Technischer Überblick über das Projekt
visibility: password
theme: dark
width: normal
toc: true
published: true
slug: architektur
---
```

Unterstützte Felder:

```text
title
description
visibility
theme
width
font
toc
lineNumbers
published
slug
expiresAt
```

Passwörter dürfen niemals im Frontmatter stehen.

Passwortgeschützte Dokumente werden entweder:

* einmalig über das Web-Dashboard konfiguriert,
* über einen interaktiven CLI-Dialog geschützt,
* oder über eine sichere Umgebungsvariable gesetzt.

Beispiel:

```bash
mdshare push docs/private.md --password
```

Das CLI fragt das Passwort verdeckt ab.

Das Passwort darf nicht:

* in der Shell-Historie erscheinen
* in `.mdshare.json` gespeichert werden
* im Frontmatter gespeichert werden
* in Logs ausgegeben werden

---

## 32. CLI-Optionen

Unterstütze sinnvolle Optionen:

```bash
mdshare push README.md --public
mdshare push README.md --unlisted
mdshare push README.md --password
mdshare push README.md --draft
mdshare push README.md --publish
mdshare push README.md --title "Projektübersicht"
mdshare push README.md --slug projektuebersicht
mdshare push README.md --theme dark
mdshare push README.md --open
```

Priorität der Einstellungen:

1. explizite CLI-Option
2. Frontmatter
3. lokale `.mdshare.json`
4. Projektstandard
5. globaler App-Standard

Dokumentiere diese Priorität eindeutig.

---

## 33. Alle Dateien synchronisieren

### `mdshare push --all`

Dieser Befehl synchronisiert alle Dateien, die über `include` ausgewählt und nicht über `exclude` ausgeschlossen sind.

Zeige vor dem Upload eine Zusammenfassung:

```text
3 Dateien geändert
1 neue Datei
2 Dateien unverändert
```

Bei interaktiver Nutzung kann vor dem Upload bestätigt werden.

Für CI-Umgebungen soll es eine Option geben:

```bash
mdshare push --all --yes
```

Eine Datei, die lokal gelöscht wurde, darf nicht automatisch remote gelöscht werden.

Zeige stattdessen einen Hinweis:

```text
docs/old-concept.md wurde lokal nicht gefunden.
Das veröffentlichte Dokument bleibt bestehen.
```

Ein bewusstes Archivieren erfolgt über:

```bash
mdshare archive docs/old-concept.md
```

---

## 34. Status und Konflikte

### `mdshare status`

Zeige für alle verbundenen Dateien:

* lokal verändert
* synchron
* remote verändert
* nicht veröffentlicht
* lokal nicht mehr vorhanden
* Konflikt

Beispiel:

```text
README.md                 synchron
docs/api.md               lokal verändert
docs/design.md            remote verändert
docs/old.md               lokal nicht gefunden
```

Speichere für jede Synchronisierung:

* lokale Prüfsumme
* Remote-Version
* Synchronisierungszeitpunkt

Falls ein Dokument nach der letzten CLI-Synchronisierung im Web-Editor verändert wurde und anschließend lokal erneut gepusht wird, darf die Remote-Version nicht stillschweigend überschrieben werden.

Zeige einen Konflikt:

```text
Konflikt: docs/design.md wurde seit der letzten Synchronisierung online geändert.
```

Biete folgende Optionen:

```text
mdshare push docs/design.md --force
mdshare pull docs/design.md
mdshare diff docs/design.md
```

### `mdshare diff`

Zeigt den Unterschied zwischen lokaler und veröffentlichter Markdown-Version.

### `mdshare pull`

Lädt die Remote-Version herunter.

Vor dem Überschreiben einer lokalen Datei muss eine Bestätigung erfolgen.

---

## 35. Dateien im Browser öffnen

### `mdshare open`

Öffnet das verbundene Projekt im Browser.

Beispiele:

```bash
mdshare open
mdshare open README.md
mdshare open README.md --manage
```

* Ohne Datei wird die Projektübersicht geöffnet.
* Mit Datei wird der Share-Link geöffnet.
* Mit `--manage` wird die Verwaltungsansicht geöffnet.

Ein Verwaltungslink mit geheimem Token soll nicht dauerhaft in der lokalen Projektdatei gespeichert werden.

Das CLI soll stattdessen über die authentifizierte API eine kurzlebige Verwaltungs-URL anfordern.

---

## 36. VS-Code-Workflow

Der gesamte CLI-Workflow muss direkt im integrierten Terminal von VS Code funktionieren.

Ein typischer Ablauf soll so aussehen:

```bash
cd mein-projekt
mdshare init
mdshare push README.md --open
```

Spätere Aktualisierung:

```bash
mdshare push README.md
```

Für mehrere Dokumente:

```bash
mdshare push --all
```

Ergänze passende npm-Scripts:

```json
{
  "scripts": {
    "docs:status": "mdshare status",
    "docs:push": "mdshare push --all",
    "docs:open": "mdshare open"
  }
}
```

Danach kann der Benutzer aus VS Code ausführen:

```bash
npm run docs:push
```

---

## 37. Optionale VS-Code-Extension

Bereite die Architektur so vor, dass später eine VS-Code-Extension ergänzt werden kann.

Die Extension ist nicht zwingend Bestandteil des ersten MVP, kann aber optional umgesetzt werden.

Mögliche Funktionen:

* aktuelles Markdown-Dokument veröffentlichen
* aktuelles Dokument aktualisieren
* Projekt verbinden
* Share-Link kopieren
* Dokument im Browser öffnen
* Dokumentstatus in der Statusleiste anzeigen
* Konflikte anzeigen
* Vorschau der veröffentlichten Darstellung öffnen
* Projektübersicht in einer Sidebar anzeigen

Vorgeschlagene Commands:

```text
MD Share: Projekt verbinden
MD Share: Aktuelle Datei veröffentlichen
MD Share: Aktuelle Datei aktualisieren
MD Share: Alle Dokumente synchronisieren
MD Share: Share-Link kopieren
MD Share: Dokument öffnen
MD Share: Projektübersicht öffnen
```

Die Extension soll intern dieselbe API und dieselben Authentifizierungsmechanismen wie das CLI verwenden.

Keine separate Geschäftslogik in der Extension duplizieren.

---

## 38. API für CLI und Integrationen

Erstelle eine versionierte API:

```text
/api/v1
```

Benötigte Bereiche:

```text
POST   /api/v1/cli/device
POST   /api/v1/cli/token
DELETE /api/v1/cli/token/:id

GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id

GET    /api/v1/projects/:id/documents
POST   /api/v1/projects/:id/documents

GET    /api/v1/documents/:id
PUT    /api/v1/documents/:id
POST   /api/v1/documents/:id/publish
POST   /api/v1/documents/:id/archive
POST   /api/v1/documents/:id/management-url
```

API-Anforderungen:

* versionierte Endpunkte
* Zod-Validierung
* sichere Authentifizierung
* klar definierte Fehlercodes
* Rate Limiting
* idempotente Updates, wo sinnvoll
* keine internen Datenbank-IDs offenlegen
* keine Passwort-Hashes ausgeben
* keine permanenten Verwaltungs-Tokens ausgeben
* strukturierte, aber datensparsame Logs

Fehlerantworten sollen maschinenlesbar sein:

```json
{
  "error": {
    "code": "DOCUMENT_CONFLICT",
    "message": "The document was modified remotely.",
    "details": {
      "remoteVersion": 7,
      "localBaseVersion": 6
    }
  }
}
```

---

## 39. Erweiterung des Datenmodells

Erstelle zusätzlich mindestens folgende Tabellen:

### `users`

```text
id
email
passwordHash
emailVerifiedAt
createdAt
updatedAt
deletedAt
```

### `projects`

```text
id
publicId
ownerId
name
slug
description
defaultVisibility
defaultTheme
defaultContentWidth
defaultFontStyle
createdAt
updatedAt
archivedAt
```

### `projectMembers`

Für eine spätere Teamfunktion vorbereiten:

```text
id
projectId
userId
role
createdAt
```

Mögliche Rollen:

```text
owner
editor
viewer
```

Im ersten MVP genügt ein einzelner Eigentümer. Das Datenmodell soll spätere Teammitglieder aber ermöglichen.

### `cliTokens`

```text
id
userId
tokenHash
name
deviceName
operatingSystem
lastUsedAt
expiresAt
revokedAt
createdAt
```

### `documentVersions`

```text
id
documentId
version
markdownContent
contentChecksum
source
createdBy
createdAt
```

Mögliche Quellen:

```text
web
cli
api
```

Dokumentversionen sind wichtig für:

* Konflikterkennung
* Änderungsverlauf
* Wiederherstellung
* Diff-Ansicht

---

## 40. Versionsverlauf

Speichere bei jeder relevanten Änderung eine Dokumentversion.

Im Dashboard soll ein einfacher Versionsverlauf sichtbar sein:

* Versionsnummer
* Zeitpunkt
* Quelle
* Benutzer oder CLI-Gerät
* kurze Änderungsinformation

Der Benutzer kann:

* ältere Version ansehen
* Unterschiede vergleichen
* ältere Version wiederherstellen

Begrenze die Anzahl gespeicherter Versionen im MVP sinnvoll, beispielsweise auf die letzten 50 Versionen pro Dokument.

Die Begrenzung soll zentral konfigurierbar sein.

---

## 41. Suche und Filter

Das Dashboard benötigt eine einfache Suche.

Suchbar sind:

* Projektname
* Dokumenttitel
* Beschreibung
* Dateiname
* Quellpfad
* Slug

Filter:

* Projekt
* Dokumentstatus
* Sichtbarkeit
* Quelle
* zuletzt geändert
* passwortgeschützt
* archiviert

Für das MVP genügt eine performante Datenbanksuche. Eine externe Suchmaschine ist nicht erforderlich.

---

## 42. Git- und Repository-Verhalten

Die App muss ohne Git funktionieren.

Wenn ein Git-Repository erkannt wird, darf das CLI zusätzliche Metadaten lokal ermitteln:

* Repository-Name
* aktueller Branch
* letzter Commit
* Remote-URL

Sensible Repository-Daten dürfen nur übertragen werden, wenn sie für die Funktion benötigt werden und der Benutzer darüber informiert wird.

Standardmäßig sollen höchstens folgende Informationen gespeichert werden:

* lokaler Projektname
* optional Repository-Name
* optional Branch
* Dateipfad innerhalb des Projekts

Keine vollständige Git-Historie hochladen.

Keine Source-Code-Dateien hochladen, sofern sie nicht ausdrücklich als Markdown-Dateien ausgewählt wurden.

---

## 43. CI/CD-Unterstützung

Ermögliche später auch automatisches Veröffentlichen über GitHub Actions, GitLab CI oder andere CI-Systeme.

Unterstütze dafür projektbezogene API-Tokens mit eingeschränkten Rechten.

Beispiel:

```bash
MD_SHARE_TOKEN=...
mdshare push --all --yes
```

Token-Rechte:

* nur ein bestimmtes Projekt
* nur Dokumente lesen
* Dokumente schreiben
* Dokumente veröffentlichen
* keine Kontoeinstellungen verändern

Erstelle eine beispielhafte GitHub-Actions-Datei:

```yaml
name: Publish Markdown

on:
  push:
    branches:
      - main
    paths:
      - "**/*.md"

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm install -g @mdshare/cli

      - run: mdshare push --all --yes
        env:
          MD_SHARE_TOKEN: ${{ secrets.MD_SHARE_TOKEN }}
```

Die konkrete Node-Version und verwendeten Action-Versionen sollen bei der Umsetzung anhand aktueller stabiler Versionen geprüft werden.

---

## 44. Typischer Benutzerablauf

Der vollständige Ablauf muss funktionieren:

1. Benutzer registriert sich in der Web-App.
2. Benutzer erstellt das Projekt „Antya“.
3. Benutzer öffnet das Antya-Repository in VS Code.
4. Benutzer führt `mdshare login` aus.
5. Der Browser öffnet sich.
6. Benutzer bestätigt den CLI-Zugang.
7. Benutzer führt im Repository `mdshare init` aus.
8. Benutzer verbindet den lokalen Ordner mit dem Projekt „Antya“.
9. Benutzer führt `mdshare push README.md` aus.
10. Die Datei wird als Dokument im Projekt angelegt.
11. Das CLI gibt den Share-Link aus.
12. Der Benutzer verändert die Datei lokal.
13. Der Benutzer führt erneut `mdshare push README.md` aus.
14. Das bestehende Dokument wird aktualisiert.
15. Der Share-Link bleibt unverändert.
16. Die neue Version erscheint im Versionsverlauf.
17. Das Dokument ist im Web-Dashboard dem Projekt „Antya“ zugeordnet.
18. Der Benutzer kann es dort bearbeiten, schützen, archivieren oder löschen.
19. Falls das Dokument parallel online geändert wurde, erkennt das CLI einen Konflikt.
20. Der Benutzer kann den Unterschied prüfen und bewusst entscheiden, welche Version übernommen wird.

---

## 45. Zusätzliche Akzeptanzkriterien

Die Umsetzung ist erst abgeschlossen, wenn zusätzlich folgende Abläufe funktionieren:

### Projektverwaltung

* Benutzer kann Projekte erstellen.
* Benutzer kann Projekte umbenennen.
* Benutzer kann Projekte archivieren.
* Dokumente werden eindeutig einem Projekt zugeordnet.
* Die Projektübersicht zeigt alle zugehörigen Dokumente.

### CLI

* `mdshare login` funktioniert.
* `mdshare init` verbindet einen lokalen Ordner mit einem Projekt.
* `.mdshare.json` wird korrekt erzeugt.
* `mdshare push README.md` erstellt ein Dokument.
* Ein zweiter Push aktualisiert dasselbe Dokument.
* Der Share-Link bleibt unverändert.
* Unveränderte Dateien werden nicht erneut hochgeladen.
* `mdshare push --all` berücksichtigt Include- und Exclude-Regeln.
* `mdshare status` zeigt lokale und Remote-Änderungen korrekt.
* Remote-Konflikte werden nicht stillschweigend überschrieben.
* CLI-Tokens können im Dashboard widerrufen werden.
* Nach Widerruf kann das CLI nicht mehr auf das Konto zugreifen.

### Sicherheit

* Keine Passwörter in Frontmatter oder Konfigurationsdateien.
* Keine API-Tokens in `.mdshare.json`.
* Tokens werden serverseitig gehasht.
* Verwaltungslinks werden nur kurzzeitig erzeugt.
* Projekt- und Dokument-IDs allein ermöglichen keinen unberechtigten Zugriff.
* Rate Limits gelten auch für CLI- und API-Zugriffe.

---

## 46. Umsetzungspriorität

Setze die Funktionen in dieser Reihenfolge um:

### Phase 1: Web-App

1. Benutzerkonten
2. Projekte
3. Dokument-Dashboard
4. Web-Editor
5. Share-Links
6. Passwortschutz
7. Dokumentversionen

### Phase 2: API

1. CLI-Authentifizierung
2. Projekt-Endpunkte
3. Dokument-Endpunkte
4. Konflikterkennung
5. kurzlebige Verwaltungslinks

### Phase 3: CLI

1. `login`
2. `init`
3. `push`
4. `push --all`
5. `status`
6. `open`
7. `diff`
8. `pull`
9. `archive`

### Phase 4: Erweiterungen

1. VS-Code-Extension
2. CI/CD-Integration
3. Teammitglieder
4. eigene Domains
5. Kommentare
6. PDF-Export

Die erste produktionsfähige Version muss mindestens die Phasen 1 bis 3 vollständig abdecken.
