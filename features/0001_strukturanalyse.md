# User Stories – BSI IT-Grundschutz: Lektion 3 Strukturanalyse

> **Quelle:** BSI Online-Kurs IT-Grundschutz, Lektion 3 – Strukturanalyse  
> **Standard:** BSI-Standard 200-2, IT-Grundschutz-Methodik  
> **Kontext:** Softwarelösung zur Unterstützung des Informationssicherheitsbeauftragten (ISB) bei der Durchführung einer Strukturanalyse gemäß IT-Grundschutz

-----

## US-01 – Informationsverbund definieren

**Als** Informationssicherheitsbeauftragter (ISB)  
**möchte ich** den Geltungsbereich (Informationsverbund) meiner Institution festlegen,  
**damit** alle nachfolgenden Erhebungen auf einen klar abgegrenzten Bereich ausgerichtet sind.

-----

### Prozessbeschreibung / User Journey

1. ISB öffnet das Tool und legt ein neues Strukturanalyse-Projekt an.
1. ISB gibt den Namen der Institution sowie eine Beschreibung des Informationsverbundes ein.
1. ISB definiert den Geltungsbereich (z. B. ein Standort, eine Abteilung, das gesamte Unternehmen).
1. Das System speichert die Angaben und erstellt eine Übersichtsseite für den Informationsverbund.
1. ISB kann bestehende Dokumentationen (Inventare, Netzpläne) als Referenz hochladen.

-----

### Datenmodell

|Attribut           |Typ      |Pflicht|Beschreibung                                  |
|-------------------|---------|-------|----------------------------------------------|
|`verbund_id`       |UUID     |ja     |Eindeutige ID des Informationsverbundes       |
|`institution_name` |String   |ja     |Name der Institution/des Unternehmens         |
|`beschreibung`     |Text     |ja     |Kurzbeschreibung des Verbundes                |
|`geltungsbereich`  |String   |ja     |Abgrenzung (Standort, Abteilung, gesamt)      |
|`erstellt_am`      |Timestamp|ja     |Erstellungsdatum                              |
|`erstellt_von`     |String   |ja     |Benutzername des ISB                          |
|`referenzdokumente`|File[]   |nein   |Hochgeladene Bestandsinventare, Netzpläne etc.|

-----

### Akzeptanztests

#### Happy Path

**Given** der ISB ist im System angemeldet und befindet sich auf der Startseite  
**When** er einen neuen Informationsverbund mit Name „RECPLAST GmbH”, Beschreibung und Geltungsbereich „Hauptstandort Bonn” anlegt und speichert  
**Then** wird der Verbund erfolgreich angelegt, die Übersichtsseite wird angezeigt, und alle weiteren Strukturanalyse-Module (Geschäftsprozesse, Anwendungen, IT-Systeme, Räume) sind aktiviert

#### Negativtest 1 – Pflichtfeld fehlt

**Given** der ISB befindet sich im Formular zum Anlegen eines neuen Informationsverbundes  
**When** er versucht zu speichern, ohne einen Namen einzutragen  
**Then** zeigt das System eine Fehlermeldung „Institutionsname ist ein Pflichtfeld” und verhindert das Speichern

#### Negativtest 2 – Doppelter Verbundname

**Given** es existiert bereits ein Informationsverbund mit dem Namen „RECPLAST GmbH”  
**When** der ISB einen zweiten Verbund mit identischem Namen anlegen möchte  
**Then** warnt das System vor einer möglichen Dopplung und fordert eine Bestätigung oder Umbenennung

-----

## US-02 – Objekte sinnvoll gruppieren

**Als** Informationssicherheitsbeauftragter  
**möchte ich** gleichartige IT-Systeme und Komponenten zu Gruppen zusammenfassen,  
**damit** die Anzahl der zu bearbeitenden Objekte handhabbar bleibt und der Folgeschritt der Schutzbedarfsfeststellung effizient durchführbar ist.

-----

### Prozessbeschreibung / User Journey

1. ISB wechselt in das Modul „Objektgruppen”.
1. Das System listet alle bisher erfassten Einzelobjekte auf.
1. ISB wählt mehrere gleichartig konfigurierte Objekte aus (z. B. 12 identische Client-PCs).
1. ISB legt eine neue Gruppe an, vergibt einen Gruppenbezeichner und weist die Objekte zu.
1. Das System zeigt die Gruppe als ein konsolidiertes Objekt in den Folgeerhebungen an.
1. ISB kann Gruppen jederzeit aufschlüsseln oder neu zusammenstellen.

-----

### Datenmodell

|Attribut           |Typ     |Pflicht|Beschreibung                                     |
|-------------------|--------|-------|-------------------------------------------------|
|`gruppe_id`        |UUID    |ja     |Eindeutige ID der Gruppe                         |
|`verbund_id`       |UUID    |ja     |Referenz auf den Informationsverbund             |
|`bezeichnung`      |String  |ja     |Name der Gruppe (z. B. „Client-PCs Verwaltung”)  |
|`typ`              |Enum    |ja     |IT-System / Anwendung / Raum / Kommunikationslink|
|`gruppierungskrit.`|String  |nein   |Begründung für die Gruppierung                   |
|`mitglieder`       |Objekt[]|ja     |Liste der zugeordneten Einzelobjekte             |
|`anzahl`           |Integer |ja     |Anzahl gleichartiger Objekte in der Gruppe       |

-----

### Akzeptanztests

#### Happy Path

**Given** der ISB hat 12 identisch konfigurierte Windows-PCs als Einzelobjekte erfasst  
**When** er alle 12 auswählt, die Gruppe „Client-PCs Buchhaltung” erstellt und speichert  
**Then** werden die 12 Einzelobjekte der Gruppe zugeordnet, und in den Folgeerhebungen erscheint nur noch die Gruppe als ein Objekt mit Anzahl 12

#### Negativtest 1 – Objekte unterschiedlichen Typs gruppieren

**Given** der ISB wählt ein IT-System (Server) und einen Raum (Serverraum) gleichzeitig aus  
**When** er versucht, eine gemeinsame Gruppe anzulegen  
**Then** verhindert das System die Gruppierung und gibt den Hinweis „Objekte unterschiedlicher Typen können nicht gruppiert werden”

#### Negativtest 2 – Leere Gruppe

**Given** der ISB befindet sich im Gruppenformular  
**When** er eine Gruppe ohne zugeordnete Mitglieder speichern möchte  
**Then** zeigt das System eine Fehlermeldung „Eine Gruppe muss mindestens ein Objekt enthalten”

-----

## US-03 – Geschäftsprozesse und Informationen erheben

**Als** Informationssicherheitsbeauftragter  
**möchte ich** die wesentlichen Geschäftsprozesse meiner Institution dokumentieren und die in diesen Prozessen verarbeiteten schützenswerten Informationen erfassen,  
**damit** das Sicherheitskonzept gezielt auf den Schutz dieser Informationen ausgerichtet werden kann.

-----

### Prozessbeschreibung / User Journey

1. ISB öffnet das Modul „Geschäftsprozesse”.
1. ISB legt einen neuen Geschäftsprozess an (z. B. „Auftragsabwicklung”).
1. ISB trägt Prozessbeschreibung, Verantwortlichen und beteiligte Organisationseinheiten ein.
1. ISB erfasst die im Prozess benötigten Informationen und klassifiziert diese nach Schutzbedarf (Vertraulichkeit, Integrität, Verfügbarkeit).
1. Das System verknüpft die Informationen mit dem Prozess.
1. ISB wiederholt Schritt 2–5 für alle relevanten Prozesse.
1. ISB kann optional vorhandene Prozessmodelle (z. B. BPMN) referenzieren oder hochladen.

-----

### Datenmodell

**Geschäftsprozess**

|Attribut          |Typ     |Pflicht|Beschreibung                       |
|------------------|--------|-------|-----------------------------------|
|`prozess_id`      |UUID    |ja     |Eindeutige ID                      |
|`verbund_id`      |UUID    |ja     |Referenz Informationsverbund       |
|`bezeichnung`     |String  |ja     |Name des Prozesses                 |
|`beschreibung`    |Text    |ja     |Kurzbeschreibung des Prozesses     |
|`verantwortlicher`|String  |ja     |Prozessverantwortlicher            |
|`org_einheiten`   |String[]|nein   |Beteiligte Abteilungen             |
|`rechtl_vorgaben` |Text    |nein   |Datenschutz, Nachweispflichten etc.|

**Information (je Prozess)**

|Attribut              |Typ   |Pflicht|Beschreibung                              |
|----------------------|------|-------|------------------------------------------|
|`info_id`             |UUID  |ja     |Eindeutige ID                             |
|`prozess_id`          |UUID  |ja     |Zugehöriger Prozess                       |
|`bezeichnung`         |String|ja     |Name der Information (z. B. „Kundendaten”)|
|`vertraulichkeit`     |Enum  |ja     |normal / hoch / sehr hoch                 |
|`integritaet`         |Enum  |ja     |normal / hoch / sehr hoch                 |
|`verfuegbarkeit`      |Enum  |ja     |normal / hoch / sehr hoch                 |
|`datenschutz_relevant`|Bool  |ja     |Unterliegt Datenschutzvorschriften?       |

-----

### Akzeptanztests

#### Happy Path

**Given** der ISB arbeitet am Informationsverbund „RECPLAST GmbH”  
**When** er den Prozess „Auftragsabwicklung” mit Verantwortlichem, Beschreibung und der Information „Kundendaten” (Vertraulichkeit: hoch, Integrität: hoch, Verfügbarkeit: hoch) anlegt und speichert  
**Then** ist der Prozess im System erfasst, die Information ist dem Prozess zugeordnet, und der Datensatz erscheint in der Prozessübersicht

#### Negativtest 1 – Unvollständige Schutzbedarfsangabe

**Given** der ISB erfasst eine neue Information innerhalb eines Prozesses  
**When** er die Schutzbedarfskategorie „Verfügbarkeit” nicht auswählt und speichern möchte  
**Then** zeigt das System eine Validierungsmeldung „Alle drei Schutzziele müssen bewertet werden” und verhindert das Speichern

#### Negativtest 2 – Prozess ohne Information

**Given** der ISB hat einen Prozess angelegt, aber keine Informationen hinzugefügt  
**When** er den Prozess als „vollständig erfasst” markiert  
**Then** gibt das System eine Warnung aus: „Dem Prozess sind keine Informationen zugeordnet – bitte prüfen Sie die Vollständigkeit”

-----

## US-04 – Anwendungen erheben und Prozessen zuordnen

**Als** Informationssicherheitsbeauftragter  
**möchte ich** alle schutzbedürftigen IT-Anwendungen erfassen und ihre Abhängigkeiten zu Geschäftsprozessen dokumentieren,  
**damit** im späteren Sicherheitskonzept nachvollziehbar ist, welche Anwendungen welche Prozesse unterstützen.

-----

### Prozessbeschreibung / User Journey

1. ISB öffnet das Modul „Anwendungen”.
1. ISB legt eine neue Anwendung an und trägt Pflichtattribute ein (Bezeichnung, Plattform, Verantwortlicher).
1. ISB verknüpft die Anwendung mit den Geschäftsprozessen, in denen sie genutzt wird (n:m-Beziehung).
1. Das System generiert automatisch eine Abhängigkeitsmatrix (Anwendungen × Geschäftsprozesse).
1. ISB kann die Matrix exportieren oder drucken.

-----

### Datenmodell

**Anwendung**

|Attribut          |Typ   |Pflicht|Beschreibung                           |
|------------------|------|-------|---------------------------------------|
|`anwendung_id`    |UUID  |ja     |Eindeutige ID                          |
|`verbund_id`      |UUID  |ja     |Referenz Informationsverbund           |
|`bezeichnung`     |String|ja     |Name der Anwendung (z. B. „ERP-System”)|
|`beschreibung`    |Text  |nein   |Kurzbeschreibung der Funktion          |
|`plattform`       |String|ja     |Betriebssystem / Umgebung              |
|`verantwortlicher`|String|ja     |Anwendungsverantwortlicher             |
|`it_systeme`      |UUID[]|nein   |Zugehörige IT-Systeme                  |

**Anwendung–Prozess-Zuordnung (Abhängigkeitstabelle)**

|Attribut      |Typ |Pflicht|Beschreibung             |
|--------------|----|-------|-------------------------|
|`anwendung_id`|UUID|ja     |Referenz Anwendung       |
|`prozess_id`  |UUID|ja     |Referenz Geschäftsprozess|

-----

### Akzeptanztests

#### Happy Path

**Given** der ISB hat die Prozesse „Auftragsabwicklung” und „Buchhaltung” angelegt  
**When** er die Anwendung „ERP-System” erfasst und sie beiden Prozessen zuordnet  
**Then** erscheint die Anwendung in der Abhängigkeitsmatrix mit Markierungen in beiden Prozessspalten, und der Export der Matrix ist möglich

#### Negativtest 1 – Anwendung ohne Prozesszuordnung

**Given** der ISB hat eine Anwendung „E-Mail-Client” erfasst, aber keinem Prozess zugeordnet  
**When** er versucht, die Strukturanalyse abzuschließen  
**Then** zeigt das System eine Warnung: „Folgende Anwendungen sind keinem Geschäftsprozess zugeordnet: E-Mail-Client”

#### Negativtest 2 – Doppelanlage

**Given** eine Anwendung „ERP-System” ist bereits erfasst  
**When** der ISB erneut eine Anwendung mit identischer Bezeichnung anlegen möchte  
**Then** zeigt das System eine Warnung auf mögliche Dopplung und verlangt eine Bestätigung oder einen abweichenden Namen

-----

## US-05 – Netzplan erstellen und dokumentieren

**Als** Informationssicherheitsbeauftragter  
**möchte ich** einen aktuellen Netzplan des Informationsverbundes anlegen oder importieren,  
**damit** alle Kommunikationsverbindungen und Netzsegmente im Sicherheitskonzept berücksichtigt werden.

-----

### Prozessbeschreibung / User Journey

1. ISB öffnet das Modul „Netzplan”.
1. ISB importiert einen bestehenden Netzplan (z. B. als Bilddatei oder Visio-Export) oder erstellt ihn manuell im Tool.
1. ISB dokumentiert für jede Netzverbindung: beteiligte Systeme, Verbindungstyp, Verschlüsselung, Netzsegment.
1. ISB kennzeichnet externe Verbindungen (z. B. Standleitungen, VPN zu Außenbüros).
1. Das System prüft, ob alle erfassten IT-Systeme im Netzplan referenziert sind.
1. ISB speichert und versioniert den Netzplan.

-----

### Datenmodell

**Netzplan**

|Attribut     |Typ      |Pflicht|Beschreibung                |
|-------------|---------|-------|----------------------------|
|`plan_id`    |UUID     |ja     |Eindeutige ID               |
|`verbund_id` |UUID     |ja     |Referenz Informationsverbund|
|`version`    |String   |ja     |Versionsnummer (z. B. „1.2”)|
|`erstellt_am`|Timestamp|ja     |Erstellungsdatum            |
|`datei`      |File     |nein   |Hochgeladene Netzplandatei  |

**Netzverbindung**

|Attribut        |Typ   |Pflicht|Beschreibung                                |
|----------------|------|-------|--------------------------------------------|
|`verbindung_id` |UUID  |ja     |Eindeutige ID                               |
|`plan_id`       |UUID  |ja     |Referenz Netzplan                           |
|`system_von`    |UUID  |ja     |Ausgangssystem                              |
|`system_nach`   |UUID  |ja     |Zielsystem                                  |
|`verbindungstyp`|Enum  |ja     |LAN / WAN / WLAN / VPN / Internet           |
|`verschluesselt`|Bool  |ja     |Verbindung verschlüsselt?                   |
|`extern`        |Bool  |ja     |Externe Verbindung (Standleitung, Internet)?|
|`netzsegment`   |String|nein   |VLAN / DMZ / Produktionsnetz etc.           |

-----

### Akzeptanztests

#### Happy Path

**Given** der ISB hat IT-Systeme „Server-01” und „Client-PC-Gruppe” erfasst  
**When** er eine LAN-Verbindung zwischen beiden anlegt, „verschlüsselt: nein” und „extern: nein” setzt und speichert  
**Then** ist die Verbindung im Netzplan verzeichnet, beide Systeme sind als verbunden markiert, und der Netzplan wird versioniert gespeichert

#### Negativtest 1 – IT-System nicht im Netzplan

**Given** der ISB hat 5 IT-Systeme erfasst, aber nur 4 davon im Netzplan referenziert  
**When** er die Vollständigkeitsprüfung ausführt  
**Then** meldet das System: „1 IT-System ist nicht im Netzplan referenziert” mit Angabe des betroffenen Systems

#### Negativtest 2 – Ungültige Verbindung (gleiches Quell- und Zielsystem)

**Given** der ISB befindet sich im Formular für eine neue Netzverbindung  
**When** er für Quell- und Zielsystem dasselbe IT-System auswählt  
**Then** zeigt das System einen Validierungsfehler: „Quell- und Zielsystem dürfen nicht identisch sein”

-----

## US-06 – IT-Systeme erheben

**Als** Informationssicherheitsbeauftragter  
**möchte ich** alle im Informationsverbund betriebenen oder geplanten IT-Systeme vollständig erfassen,  
**damit** für jedes System im Folgeschritt der passende IT-Grundschutz-Baustein zugeordnet werden kann.

-----

### Prozessbeschreibung / User Journey

1. ISB öffnet das Modul „IT-Systeme”.
1. ISB legt ein neues IT-System an und füllt alle Pflichtattribute aus.
1. ISB weist dem System die zugehörigen Anwendungen zu.
1. ISB gibt den Aufstellungsort (Raum) an.
1. ISB kennzeichnet Systeme, die sich noch in Planung befinden.
1. Das System schlägt anhand des System-Typs passende IT-Grundschutz-Bausteine vor.

-----

### Datenmodell

|Attribut          |Typ   |Pflicht|Beschreibung                                           |
|------------------|------|-------|-------------------------------------------------------|
|`system_id`       |UUID  |ja     |Eindeutige ID                                          |
|`verbund_id`      |UUID  |ja     |Referenz Informationsverbund                           |
|`bezeichnung`     |String|ja     |Systemname / -bezeichnung                              |
|`typ`             |Enum  |ja     |Server / Client / Netzkomponente / Mobilgerät / ICS / …|
|`betriebssystem`  |String|ja     |BS und Version                                         |
|`status`          |Enum  |ja     |in Betrieb / in Planung / außer Betrieb                |
|`verantwortlicher`|String|ja     |Systemverantwortlicher                                 |
|`raum_id`         |UUID  |nein   |Aufstellungsort (Referenz auf Raum)                    |
|`anwendungen`     |UUID[]|nein   |Zugeordnete Anwendungen                                |
|`gruppe_id`       |UUID  |nein   |Zugehörige Systemgruppe (falls gruppiert)              |

-----

### Akzeptanztests

#### Happy Path

**Given** der ISB ist im Modul „IT-Systeme”  
**When** er den Server „SRV-01” (Typ: Server, BS: Windows Server 2022, Status: in Betrieb, Verantwortlicher: IT-Leiter) mit Raum „Serverraum EG” und Anwendung „ERP-System” anlegt und speichert  
**Then** ist das System erfasst, dem Raum und der Anwendung zugeordnet, und das System schlägt den IT-Grundschutz-Baustein „SYS.1.2 Windows Server” zur Modellierung vor

#### Negativtest 1 – Pflichtfeld „Typ” fehlt

**Given** der ISB füllt das Formular für ein neues IT-System aus, lässt aber den Typ leer  
**When** er speichern möchte  
**Then** gibt das System eine Fehlermeldung „Systemtyp ist ein Pflichtfeld” aus und verhindert das Speichern

#### Negativtest 2 – Anwendung auf nicht-kompatiblem System

**Given** eine Anwendung ist als „Windows-only” markiert  
**When** der ISB diese Anwendung einem Linux-Server zuordnet  
**Then** zeigt das System einen Hinweis: „Die gewählte Anwendung ist möglicherweise nicht kompatibel mit dem Betriebssystem des Systems – bitte prüfen”

-----

## US-07 – Räume und Liegenschaften erfassen

**Als** Informationssicherheitsbeauftragter  
**möchte ich** alle sicherheitsrelevanten Räumlichkeiten (Serverräume, Büros, Archive, Schutzkabinette) erfassen und mit den dort platzierten IT-Systemen verknüpfen,  
**damit** die physische Sicherheitsumgebung der IT im Sicherheitskonzept vollständig berücksichtigt wird.

-----

### Prozessbeschreibung / User Journey

1. ISB öffnet das Modul „Räume & Liegenschaften”.
1. ISB legt eine Liegenschaft (Standort/Gebäude) an.
1. ISB fügt Räume zu einer Liegenschaft hinzu und klassifiziert diese (z. B. Serverraum, Büroraum, Archiv).
1. ISB ordnet jeden Raum einem Verantwortlichen zu.
1. Das System generiert eine Raum-IT-System-Matrix, die zeigt, welche IT-Systeme in welchem Raum aufgestellt sind.
1. ISB kann Schutzschränke als untergeordnete Einheiten eines Raumes erfassen.

-----

### Datenmodell

**Liegenschaft**

|Attribut         |Typ   |Pflicht|Beschreibung                    |
|-----------------|------|-------|--------------------------------|
|`liegenschaft_id`|UUID  |ja     |Eindeutige ID                   |
|`verbund_id`     |UUID  |ja     |Referenz Informationsverbund    |
|`bezeichnung`    |String|ja     |Name / Adresse des Standorts    |
|`typ`            |Enum  |ja     |Hauptstandort / Außenstelle / RZ|

**Raum**

|Attribut          |Typ     |Pflicht|Beschreibung                                      |
|------------------|--------|-------|--------------------------------------------------|
|`raum_id`         |UUID    |ja     |Eindeutige ID                                     |
|`liegenschaft_id` |UUID    |ja     |Zugehörige Liegenschaft                           |
|`bezeichnung`     |String  |ja     |Raumbezeichnung (z. B. „Serverraum EG”)           |
|`typ`             |Enum    |ja     |Serverraum / Büro / Archiv / Besprechung / Sonstig|
|`verantwortlicher`|String  |ja     |Raumverantwortlicher                              |
|`schutzschraenke` |String[]|nein   |Bezeichnungen vorhandener Schutzschränke          |

-----

### Akzeptanztests

#### Happy Path

**Given** der ISB hat die Liegenschaft „Hauptstandort Bonn” angelegt  
**When** er den Raum „Serverraum EG” (Typ: Serverraum, Verantwortlicher: IT-Leiter) anlegt, einen Schutzschrank „SK-01” hinzufügt und den Server „SRV-01” diesem Raum zuordnet  
**Then** ist der Raum korrekt erfasst, der Server erscheint in der Raum-IT-System-Matrix unter „Serverraum EG”, und der Schutzschrank ist als Unterelement gespeichert

#### Negativtest 1 – Raum ohne Liegenschaft

**Given** der ISB versucht, einen Raum anzulegen, ohne eine Liegenschaft ausgewählt zu haben  
**When** er das Formular absenden möchte  
**Then** zeigt das System die Fehlermeldung: „Bitte wählen Sie zunächst eine Liegenschaft aus”

#### Negativtest 2 – IT-System in nicht existentem Raum

**Given** der ISB versucht, einem IT-System die Raum-ID eines gelöschten Raumes zuzuweisen (z. B. über Import)  
**When** die Zuweisung verarbeitet wird  
**Then** meldet das System einen Fehler: „Referenzierter Raum existiert nicht im System” und weist das IT-System keinem Raum zu

-----

## Zusammenfassung der User Stories

|ID   |Titel                                      |Priorität|
|-----|-------------------------------------------|---------|
|US-01|Informationsverbund definieren             |Hoch     |
|US-02|Objekte sinnvoll gruppieren                |Mittel   |
|US-03|Geschäftsprozesse und Informationen erheben|Hoch     |
|US-04|Anwendungen erheben und Prozessen zuordnen |Hoch     |
|US-05|Netzplan erstellen und dokumentieren       |Mittel   |
|US-06|IT-Systeme erheben                         |Hoch     |
|US-07|Räume und Liegenschaften erfassen          |Mittel   |

-----

*Erstellt auf Basis des BSI Online-Kurses IT-Grundschutz, Lektion 3: Strukturanalyse (BSI-Standard 200-2)*

---

## Implementierungsplan

### Module

**Modul: `src/strukturanalyse/`**

- `repositories.js` – CRUD-Operationen für alle Tabellen (informationsverbund, liegenschaft, raum, geschaeftsprozess, information, anwendung, anwendung_prozess, it_system, it_system_anwendung, objektgruppe, netzverbindung). Jede Funktion nimmt eine PGlite-Instanz als ersten Parameter.
- `services.js` – Geschäftslogik: Validierungen, Pflichtfeld-Prüfungen, Referenzprüfungen, Warnungen bei Dopplungen. Implementiert alle Regeln aus den Akzeptanztests.
- `adapter.js` – Async-Funktionen, die eine db-Instanz erstellen/wiederverwenden und an Services delegieren.

**Core: `src/db.js`**
- Exportiert `initDb(db)`: erstellt alle Tabellen (strukturanalyse + schutzbedarfsfeststellung + modellierung) via SQL.

### Schlüsselentscheidungen

1. IDs werden via `crypto.randomUUID()` generiert.
2. Arrays (org_einheiten, schutzschraenke) werden als JSON-Strings in TEXT-Spalten gespeichert.
3. Validierungsfehler werden als JavaScript `Error` mit beschreibender Meldung geworfen.
4. Dopplungswarnung bei Institutionsname: Service wirft einen Error mit Präfix `WARNUNG:`.
5. Netzverbindungen referenzieren it_system direkt (kein separater Netzplan-Datensatz nötig für MVP).

### Akzeptanztest-Strategie

- Jeder Akzeptanztest (Happy Path + Negativtest) aus den User Stories wird als Mocha-Test implementiert.
- Tests nutzen eine In-Memory PGlite-Instanz (kein persistenter Zustand zwischen Tests).
- `before()` Hook initialisiert die DB-Tabellen.
- Abgedeckte Tests:
  - US-01: Verbund anlegen (happy path, fehlendes Pflichtfeld, Dopplung)
  - US-02: Objektgruppe anlegen (happy path, Typ-Mismatch, leere Gruppe)
  - US-03: Geschäftsprozess + Information (happy path, fehlende Schutzbedarfsangabe)
  - US-04: Anwendung + Prozesszuordnung (happy path, Dopplung)
  - US-05: Netzverbindung (happy path, gleiches Quell-/Zielsystem)
  - US-06: IT-System (happy path, fehlendes Pflichtfeld)
  - US-07: Liegenschaft + Raum (happy path, Raum ohne Liegenschaft)