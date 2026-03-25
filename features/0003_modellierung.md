# User Story: IT-Grundschutz-Modellierung eines Informationsverbundes

**Story-ID:** US-ITGS-005  
**Erstellt am:** 2026-03-24  
**Quelle:** [BSI Online-Kurs IT-Grundschutz – Lektion 5: Modellierung](https://www.bsi.bund.de/dok/10990048)  
**Status:** Draft

-----

## Titel (User Story Format)

> **Als** Informationssicherheitsbeauftragter (ISB) einer Organisation  
> **möchte ich** auf Basis der ermittelten Zielobjekte und Schutzbedarfseinstufungen eine IT-Grundschutz-Modellierung meines Informationsverbundes durchführen,  
> **damit** ich die relevanten Sicherheitsanforderungen für jedes Zielobjekt systematisch ableiten und ein vollständiges IT-Grundschutz-Modell als Prüfplan (Bestandssysteme) bzw. Entwicklungskonzept (geplante Systeme) dokumentieren kann.

-----

## Prozessbeschreibung / User Journey

### Vorbedingungen

- Lektion 4 (Schutzbedarfsfeststellung) wurde abgeschlossen.
- Alle Zielobjekte des Informationsverbundes sind identifiziert und ihr Schutzbedarf (normal / hoch / sehr hoch) ist bewertet.
- Das aktuelle IT-Grundschutz-Kompendium (BSI) liegt vor oder ist zugänglich.

### User Journey

```
Schritt 1 – Vorbereitung
  Der ISB öffnet das IT-Grundschutz-Kompendium und
  verschafft sich einen Überblick über die verfügbaren
  Bausteine, deren Schichten und Zuordnungsregeln.

Schritt 2 – Bausteine identifizieren
  Für jedes Zielobjekt (z. B. Server, Clients, Räume,
  Prozesse, Netze) wählt der ISB passende IT-Grundschutz-
  Bausteine aus dem Kompendium aus. Die Bausteine sind
  nach Schichten gegliedert (ISMS, ORP, CON, OPS, DER,
  APP, SYS, IND, NET, INF).

Schritt 3 – Schichtenmodell anwenden
  Der ISB ordnet die Bausteine den Zielobjekten
  entsprechend des Schichtenmodells zu und stellt sicher,
  dass alle relevanten Schichten abgedeckt sind.

Schritt 4 – Besondere Szenarien berücksichtigen
  Für spezielle Architekturen (z. B. Virtualisierung,
  Cloud, Industrie) prüft der ISB, ob ergänzende oder
  abweichende Bausteine anzuwenden sind.

Schritt 5 – Anforderungen anpassen
  Falls Standard-Anforderungen für den konkreten
  Anwendungsfall nicht passen (zu streng oder nicht
  ausreichend), werden Anforderungen entschärft
  (mit Begründung) oder ergänzt (höherer Schutzbedarf).

Schritt 6 – Modell dokumentieren
  Das fertige IT-Grundschutz-Modell wird in einer
  Modellierungstabelle dokumentiert: Zielobjekt –
  Baustein – Anwendbarkeit – Begründung.

Schritt 7 – Ergebnis nutzen
  Das Modell dient als:
  - Prüfplan (für bestehende Systeme → Basis-Sicherheitscheck)
  - Entwicklungskonzept (für geplante Systeme → Sicherheitsanforderungen)
```

-----

## Datenmodell

### Entitäten und Attribute

```
┌─────────────────────────────────────────────────────────────┐
│ Informationsverbund                                         │
├──────────────────────┬──────────────────────────────────────┤
│ verbund_id           │ UUID (PK)                            │
│ bezeichnung          │ String                               │
│ beschreibung         │ Text                                 │
│ erstellt_am          │ Date                                 │
│ verantwortlicher_isb │ String (FK → Benutzer)               │
└──────────────────────┴──────────────────────────────────────┘
          │ 1
          │ enthält n
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Zielobjekt                                                  │
├──────────────────────┬──────────────────────────────────────┤
│ zielobjekt_id        │ UUID (PK)                            │
│ verbund_id           │ UUID (FK → Informationsverbund)      │
│ bezeichnung          │ String                               │
│ typ                  │ Enum: [Prozess, System, Netz, Raum,  │
│                      │        Anwendung, Sonstiges]         │
│ schutzbedarf_c       │ Enum: [normal, hoch, sehr_hoch]      │
│ schutzbedarf_i       │ Enum: [normal, hoch, sehr_hoch]      │
│ schutzbedarf_a       │ Enum: [normal, hoch, sehr_hoch]      │
└──────────────────────┴──────────────────────────────────────┘
          │ n
          │ zugeordnet zu m
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Baustein (aus IT-Grundschutz-Kompendium)                    │
├──────────────────────┬──────────────────────────────────────┤
│ baustein_id          │ String (PK, z. B. "SYS.1.1")        │
│ bezeichnung          │ String (z. B. "Allgemeiner Server")  │
│ schicht              │ Enum: [ISMS, ORP, CON, OPS, DER,     │
│                      │        APP, SYS, IND, NET, INF]      │
│ anwendungstyp        │ Enum: [Basis, Standard, erhöhter     │
│                      │        Schutzbedarf]                 │
│ kompendium_version   │ String                               │
└──────────────────────┴──────────────────────────────────────┘
          │
          │ Zuordnung via Modellierungseintrag
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Modellierungseintrag (Zuordnungstabelle)                    │
├──────────────────────┬──────────────────────────────────────┤
│ eintrag_id           │ UUID (PK)                            │
│ verbund_id           │ UUID (FK → Informationsverbund)      │
│ zielobjekt_id        │ UUID (FK → Zielobjekt)               │
│ baustein_id          │ String (FK → Baustein)               │
│ anwendbar            │ Boolean                              │
│ begruendung          │ Text                                 │
│ anforderung_angepasst│ Boolean                              │
│ anpassung_details    │ Text (optional)                      │
│ erstellt_am          │ Date                                 │
│ erstellt_von         │ String (FK → Benutzer)               │
└──────────────────────┴──────────────────────────────────────┘
          │
          │ enthält n
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Modellierungsdokumentation                                  │
├──────────────────────┬──────────────────────────────────────┤
│ dok_id               │ UUID (PK)                            │
│ verbund_id           │ UUID (FK → Informationsverbund)      │
│ verwendungszweck     │ Enum: [Prüfplan, Entwicklungskonzept]│
│ version              │ String                               │
│ freigegeben_am       │ Date (optional)                      │
│ freigegeben_von      │ String (optional)                    │
└──────────────────────┴──────────────────────────────────────┘
```

-----

## Akzeptanztests (Given – When – Then)

### Happy Path Tests

-----

#### AT-01: Baustein einem Zielobjekt zuordnen

**Given** der ISB hat einen Informationsverbund mit mindestens einem Zielobjekt (z. B. „Fileserver”, Typ: System, Schutzbedarf C: hoch) angelegt  
**And** das IT-Grundschutz-Kompendium ist mit aktuellen Bausteinen geladen  
**When** der ISB den Baustein `SYS.1.1 – Allgemeiner Server` dem Zielobjekt „Fileserver” zuordnet  
**Then** wird ein Modellierungseintrag mit `zielobjekt_id = Fileserver`, `baustein_id = SYS.1.1`, `anwendbar = true` gespeichert  
**And** der Eintrag erscheint in der Modellierungsübersicht des Informationsverbundes

-----

#### AT-02: Vollständige Modellierung eines Informationsverbundes

**Given** alle Zielobjekte eines Informationsverbundes sind vollständig erfasst und mit Schutzbedarf bewertet  
**When** der ISB für jedes Zielobjekt mindestens einen passenden Baustein aus jeder relevanten Schicht zuordnet  
**And** die Modellierung als „vollständig” markiert wird  
**Then** erzeugt das System eine Modellierungsdokumentation mit `verwendungszweck = Prüfplan`  
**And** die Dokumentation enthält die Gesamtliste aller Zielobjekte mit zugehörigen Bausteinen, Schichten und Begründungen

-----

#### AT-03: Anforderungsanpassung bei erhöhtem Schutzbedarf

**Given** ein Zielobjekt hat den Schutzbedarf C: „sehr hoch”  
**And** der zugeordnete Baustein `SYS.1.1` deckt nur Standard-Anforderungen ab  
**When** der ISB die Anforderungsanpassung aktiviert und eine Ergänzung für erhöhten Schutzbedarf eingibt  
**Then** wird `anforderung_angepasst = true` und `anpassung_details = <Freitext>` im Modellierungseintrag gespeichert  
**And** die Modellierungsdokumentation weist die Anpassung als Sondervermerk aus

-----

#### AT-04: Modellierung als Entwicklungskonzept für geplante Systeme

**Given** ein Zielobjekt ist als „geplant” (noch nicht produktiv) gekennzeichnet  
**When** die Modellierung abgeschlossen und exportiert wird  
**Then** erhält die Dokumentation automatisch `verwendungszweck = Entwicklungskonzept`  
**And** die exportierte Tabelle enthält den Hinweis „Sicherheitsanforderungen vor Inbetriebnahme umzusetzen”

-----

### Negativtests

-----

#### AT-05: Modellierung ohne Schutzbedarf nicht abschließbar

**Given** ein Zielobjekt „Datenbank” wurde angelegt, aber die Schutzbedarfsfelder (C, I, A) sind noch nicht ausgefüllt  
**When** der ISB versucht, die Modellierung für den Informationsverbund abzuschließen  
**Then** gibt das System eine Fehlermeldung: „Nicht alle Zielobjekte haben einen vollständigen Schutzbedarf – Modellierung kann nicht abgeschlossen werden.”  
**And** der Status der Modellierung bleibt „In Bearbeitung”

-----

#### AT-06: Ungültiger Baustein kann nicht zugeordnet werden

**Given** der ISB gibt eine nicht existierende Baustein-ID (z. B. `XYZ.9.9`) in die Zuordnungsmaske ein  
**When** die Speicherung ausgelöst wird  
**Then** gibt das System eine Validierungsfehlermeldung: „Baustein-ID XYZ.9.9 nicht im IT-Grundschutz-Kompendium vorhanden.”  
**And** es wird kein Modellierungseintrag gespeichert

-----

#### AT-07: Doppelte Baustein-Zielobjekt-Zuordnung wird verhindert

**Given** dem Zielobjekt „Webserver” ist Baustein `APP.3.2 – Webserver` bereits zugeordnet  
**When** der ISB versucht, denselben Baustein `APP.3.2` erneut demselben Zielobjekt zuzuordnen  
**Then** gibt das System eine Hinweismeldung: „Dieser Baustein ist für das Zielobjekt bereits vorhanden.”  
**And** es wird kein doppelter Eintrag angelegt

-----

#### AT-08: Anforderungsanpassung ohne Begründung nicht speicherbar

**Given** der ISB aktiviert die Option „Anforderung anpassen” für einen Modellierungseintrag  
**When** der ISB das Feld `anpassung_details` leer lässt und speichert  
**Then** gibt das System eine Validierungsfehlermeldung: „Eine Begründung für die Anpassung ist erforderlich.”  
**And** der Eintrag wird nicht gespeichert

-----

## Hinweise für die Implementierung

- Das IT-Grundschutz-Kompendium wird als Referenzdatenbank (read-only) eingebunden; Bausteine können nicht durch den ISB geändert werden.
- Der Export der Modellierungsdokumentation unterstützt die Formate PDF und XLSX.
- Rollenbasierte Zugriffssteuerung: Nur Benutzer mit der Rolle `ISB` oder `ISMS-Admin` dürfen Modellierungseinträge anlegen und abschließen.
- Audit-Log: Alle Änderungen an Modellierungseinträgen werden protokolliert (Wer? Was? Wann?).

-----

## Definition of Done (DoD)

- [ ] Alle 8 Akzeptanztests bestanden (4 Happy Path + 4 Negativtests)
- [ ] Datenmodell migriert und in Testumgebung validiert
- [ ] Exportfunktion (PDF + XLSX) implementiert und getestet
- [ ] Rollenrechte konfiguriert und verifiziert
- [ ] Code-Review abgeschlossen
- [ ] Technische Dokumentation aktualisiert

---

## Implementierungsplan

### Module

**Modul: `src/modellierung/`**

- `repositories.js` – CRUD für baustein, modellierungseintrag, modellierungsdokumentation.
- `services.js` – Geschäftslogik:
  - Baustein anlegen und abrufen (read-only Kompendium-Referenz)
  - Modellierungseintrag erstellen: Validierung Baustein-ID existiert, Duplikat-Prüfung
  - Anforderungsanpassung: anforderung_angepasst=true nur wenn anpassung_details ausgefüllt
  - Modellierung abschließen: alle Zielobjekte müssen Schutzbedarf gesetzt haben (Prüfung via schutzbedarf_ergebnis)
  - Dokumentation erstellen: Prüfplan (Bestandssysteme) vs. Entwicklungskonzept (geplante Systeme)
- `adapter.js` – Delegiert an Services mit DB-Instanz.

### Abhängigkeiten

- Baut auf strukturanalyse- und schutzbedarfsfeststellung-Schema auf.
- Modellierungseintrag.zielobjekt_id referenziert strukturanalyse-Objekte (loose coupling via TEXT).

### Schlüsselentscheidungen

1. Bausteine werden als Stammdaten per Service angelegt (simuliertes Kompendium).
2. Duplikat-Prüfung: gleiche (zielobjekt_id, baustein_id)-Kombination nicht erlaubt.
3. Anforderungsanpassung erfordert nicht-leeres anpassung_details-Feld.
4. Verwendungszweck der Dokumentation: 'Entwicklungskonzept' für geplante Systeme, 'Prüfplan' für Bestandssysteme.

### Akzeptanztest-Strategie

- AT-01: Baustein zuordnen (happy path)
- AT-02: Vollständige Modellierung → Dokumentation als Prüfplan
- AT-03: Anforderungsanpassung bei erhöhtem Schutzbedarf
- AT-04: Entwicklungskonzept für geplante Systeme
- AT-05: Modellierung ohne Schutzbedarf nicht abschließbar
- AT-06: Ungültige Baustein-ID (Validierungsfehler)
- AT-07: Doppelte Baustein-Zielobjekt-Zuordnung verhindert
- AT-08: Anforderungsanpassung ohne Begründung nicht speicherbar