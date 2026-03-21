# BSI-Grundschutz Strukturanalyse – User Stories

**Informationsverbund:** RECPLAST GmbH  
**Basis:** BSI IT-Grundschutz Kompendium  
**Version:** 1.0

-----

## Inhaltsverzeichnis

1. [Benutzerrollen & Berechtigungsprofile](#1-benutzerrollen--berechtigungsprofile)
1. [Zentrales Datenmodell](#2-zentrales-datenmodell)
1. [US-01 – Geschäftsprozesse & Informationen erfassen](#3-us-01--geschäftsprozesse--informationen-erfassen)
1. [US-02 – Netzplan erstellen & verwalten](#4-us-02--netzplan-erstellen--verwalten)
1. [US-03 – IT-Systeme inventarisieren](#5-us-03--it-systeme-inventarisieren)
1. [US-04 – Anwendungen & Abhängigkeiten dokumentieren](#6-us-04--anwendungen--abhängigkeiten-dokumentieren)
1. [US-05 – Liegenschaften & Räume erfassen](#7-us-05--liegenschaften--räume-erfassen)
1. [US-06 – Schutzbedarf feststellen & berichten](#8-us-06--schutzbedarf-feststellen--berichten)

-----

## 1. Benutzerrollen & Berechtigungsprofile

|Rolle                                        |Beschreibung                                  |Zugriffsniveau                                                         |
|---------------------------------------------|----------------------------------------------|-----------------------------------------------------------------------|
|**ISB** – Informationssicherheitsbeauftragter|Hauptverantwortlicher für die Strukturanalyse |Vollzugriff auf alle Objekte; erstellt und pflegt Berichte             |
|**IT-Administrator**                         |Technische Erfassung von Systemen und Netzwerk|Vollzugriff auf IT-Systeme, Netzplan, Anwendungen; kein Berichtszugriff|
|**CISO / Management**                        |Strategische Übersicht und Freigaben          |Lesezugriff auf alle Objekte; Freigabe von Berichten                   |
|**Facility Manager**                         |Physische Infrastruktur & Räumlichkeiten      |Vollzugriff auf Liegenschaften, Gebäude, Räume                         |
|**Auditor**                                  |Externe/interne Revision                      |Ausschließlich Lesezugriff auf freigegebene Inhalte                    |

-----

## 2. Zentrales Datenmodell

```
BENUTZER ──── verwaltet ──────► GESCHAEFTSPROZESS
                                      │
                                      ├── 1:N ──► INFORMATION (C/I/A Schutzbedarf)
                                      ├── M:N ──► ANWENDUNG
                                      └── M:N ──► ITSYSTEM

ANWENDUNG ──── läuft auf ────────► ITSYSTEM         (M:N via Rolle)
               └── verbunden mit ─► ANWENDUNG        (Schnittstellen M:N)

ITSYSTEM ───── platziert in ─────► RAUM
               └── verbunden über ► NETZSEGMENT

NETZSEGMENT ── enthält ──────────► NETZKOMPONENTE
               └── verbunden mit ─► NETZSEGMENT via NETZVERBINDUNG
               └── liegt in ──────► LIEGENSCHAFT

LIEGENSCHAFT ── hat 1:N ─────────► GEBAEUDE
GEBAEUDE ─────── hat 1:N ─────────► RAUM

SCHUTZBEDARF_BERICHT ── aggregiert ► alle Entitäten (CIA-Maximumprinzip)

AUDIT_LOG ── protokolliert alle CREATE / UPDATE / DELETE / Auth-Events
BENUTZER_ROLLE ── M:N (Benutzer kann mehrere Rollen je Verbund haben)
```

### Schutzbedarf-Vererbungskette (Maximumprinzip)

```
INFORMATION  →  GESCHAEFTSPROZESS  →  ANWENDUNG  →  ITSYSTEM
  (Quelle)         (Maximum aller       (Maximum aller   (Grundlage für
C / I / A          Informationen)       Prozesse)        Maßnahmen)
```

-----

## 3. US-01 – Geschäftsprozesse & Informationen erfassen

### Story

> Als **Informationssicherheitsbeauftragter (ISB)** möchte ich Geschäftsprozesse meiner Organisation mit allen relevanten Informationen, Anwendungen und IT-Systemen strukturiert erfassen und pflegen, damit ich die Grundlage für die Schutzbedarfsfeststellung und das Sicherheitskonzept habe.

**Tags:** `Strukturanalyse` `Geschäftsprozesse` `CRUD` `Pflicht`

-----

### Datenmodell

```
GESCHAEFTSPROZESS {
  id                UUID            [PK, required]
  bezeichnung       String(200)     [required]
  beschreibung      Text            [optional]
  verantwortlicher  FK → BENUTZER   [required]
  organisationseinheit String(100)  [required]
  kritikalitaet     Enum(NORMAL | WICHTIG | KRITISCH)  [required]
  erstellt_am       DateTime        [auto]
  geaendert_am      DateTime        [auto]
}

INFORMATION {
  id                UUID
  bezeichnung       String(200)     [required]
  kategorie         Enum(PERS_DATEN | FINANZDATEN | KNOW_HOW | BETRIEBSDATEN | SONSTIGE)
  schutzbedarf_C    Enum(NORMAL | HOCH | SEHR_HOCH)   // Vertraulichkeit
  schutzbedarf_I    Enum(NORMAL | HOCH | SEHR_HOCH)   // Integrität
  schutzbedarf_A    Enum(NORMAL | HOCH | SEHR_HOCH)   // Verfügbarkeit
  prozess_id        FK → GESCHAEFTSPROZESS
}

// M:N Verknüpfungen
PROZESS_ANWENDUNG { prozess_id, anwendung_id }
PROZESS_ITSYSTEM  { prozess_id, itsystem_id }
```

-----

### Berechtigungsprofil

|Rolle                  |Anlegen|Lesen|Bearbeiten|Freigeben|Löschen|Exportieren|
|-----------------------|:-----:|:---:|:--------:|:-------:|:-----:|:---------:|
|ISB                    |✅      |✅    |✅         |✅        |✅      |✅          |
|CISO / Leitung         |❌      |✅    |❌         |✅        |❌      |✅          |
|Prozessverantwortlicher|❌      |✅    |✅ (eigene)|❌        |❌      |✅ (eigene) |
|IT-Admin               |❌      |✅    |❌         |❌        |❌      |❌          |
|Auditor                |❌      |✅    |❌         |❌        |❌      |✅          |

-----

### Prozessbeschreibung

#### Schritt 1 – Erstaufnahme importieren / anlegen

**Happy Path**

```gherkin
Given  Ein ISB ist eingeloggt und ruft "Neuer Geschäftsprozess" auf
When   Er alle Pflichtfelder (Bezeichnung, Verantwortlicher, Org.-Einheit, Kritikalität) ausfüllt
  And  Optional eine Beschreibung hinzufügt
  And  Das Formular absendet
Then   Wird der Prozess mit eindeutiger ID gespeichert
  And  Erscheint sofort in der Prozessliste
  And  Die Felder erstellt_am und geaendert_am werden automatisch gesetzt
```

**Negativtests**

```gherkin
# N1 – Pflichtfeld fehlt
Given  Ein ISB ruft das Formular "Neuer Geschäftsprozess" auf
When   Er das Formular ohne Angabe der Kritikalität absendet
Then   Zeigt das System "Kritikalität ist ein Pflichtfeld"
  And  Der Datensatz wird nicht gespeichert

# N2 – Bezeichnung zu lang
Given  Ein ISB ruft das Formular auf
When   Er eine Bezeichnung mit mehr als 200 Zeichen eingibt und speichert
Then   Zeigt das System "Bezeichnung darf maximal 200 Zeichen enthalten"

# N3 – Kein Import bei fehlerhafter CSV-Struktur
Given  Ein ISB versucht eine CSV-Datei zu importieren
When   Die Datei keine Spalte "bezeichnung" enthält
Then   Bricht der Import mit "Pflichtfeld 'bezeichnung' fehlt in Spalte X" ab
  And  Es werden keine Datensätze angelegt
```

-----

#### Schritt 2 – Informationen zuordnen

**Happy Path**

```gherkin
Given  Ein gespeicherter Prozess "Auftragsverarbeitung" existiert
When   Der ISB die Information "Kundenstammdaten" anlegt
  And  Schutzbedarf C=HOCH, I=NORMAL, A=NORMAL setzt
  And  Die Information dem Prozess zuordnet
Then   Erscheint die Information in der Detailansicht unter "Verarbeitete Informationen"
  And  Der abgeleitete Prozess-Schutzbedarf aktualisiert sich auf C=HOCH (Maximumprinzip)
```

**Negativtests**

```gherkin
# N1 – Schutzbedarf nicht gesetzt
Given  Ein ISB legt eine neue Information an
When   Er keinen Schutzbedarf für C, I oder A auswählt und speichert
Then   Zeigt das System "Alle drei Schutzbedarf-Dimensionen (C/I/A) müssen bewertet werden"

# N2 – Doppelte Information im gleichen Prozess
Given  Information "Kundenstammdaten" ist Prozess "Auftragsverarbeitung" bereits zugeordnet
When   Der ISB dieselbe Information erneut zuordnet
Then   Zeigt das System "Diese Information ist diesem Prozess bereits zugeordnet"
```

-----

#### Schritt 3 – Anwendungen & IT-Systeme verknüpfen

**Happy Path**

```gherkin
Given  Prozess "Auftragsverarbeitung" und Anwendung "ERP-System" existieren
When   Der ISB die Anwendung mit dem Prozess verknüpft
Then   Erscheint "ERP-System" in der Prozessdetailansicht unter "Genutzte Anwendungen"
  And  Der Schutzbedarf des ERP-Systems berücksichtigt den Prozess-Schutzbedarf
```

**Negativtests**

```gherkin
# N1 – Verknüpfung mit nicht existierender Anwendung
Given  Ein ISB versucht eine Anwendung "XYZ-Tool" zu verknüpfen
When   Diese Anwendung im System nicht vorhanden ist
Then   Zeigt das System "Anwendung 'XYZ-Tool' nicht gefunden – bitte zuerst in US-04 anlegen"

# N2 – IT-Admin versucht Verknüpfung zu ändern
Given  Ein Benutzer mit Rolle "IT-Admin" ist eingeloggt
When   Er versucht, eine Prozess-Anwendungs-Verknüpfung zu entfernen
Then   Zeigt das System HTTP 403 "Keine Berechtigung für diese Aktion"
```

-----

#### Schritt 4 – Review & Freigabe

**Happy Path**

```gherkin
Given  Prozessverantwortlicher hat eigenen Prozess geprüft und bestätigt
When   ISB den Prozess freigibt
Then   Wird der Status auf "FREIGEGEBEN" gesetzt
  And  Zeitstempel und freigebende Person werden im Audit-Log gespeichert
```

**Negativtests**

```gherkin
# N1 – Freigabe ohne Informationen
Given  Ein Prozess hat keine verknüpften Informationen
When   ISB versucht ihn freizugeben
Then   Zeigt das System "Warnung: Prozess hat keine verarbeiteten Informationen – Freigabe trotzdem fortfahren?"

# N2 – Auditor versucht Freigabe
Given  Ein Benutzer mit Rolle "Auditor" ist eingeloggt
When   Er einen Prozess freigeben möchte
Then   Wird HTTP 403 zurückgegeben
  And  Der Versuch wird im Audit-Log protokolliert
```

-----

#### Schritt 5 – Export & Berichterstattung

**Happy Path**

```gherkin
Given  Mindestens ein freigegebener Prozess mit Informationen existiert
When   ISB "Prozessliste als PDF exportieren" wählt
Then   Wird ein PDF mit Prozessname, Kritikalität, Informationen und Schutzbedarf generiert
  And  Das Dokument enthält Datum, Versionsnummer und Erstellername
```

**Negativtests**

```gherkin
# N1 – Export ohne freigegebene Prozesse
Given  Alle Prozesse haben Status "ENTWURF"
When   ISB einen Export auslöst
Then   Zeigt das System "Keine freigegebenen Prozesse für Export vorhanden"

# N2 – Prozessverantwortlicher exportiert fremde Prozesse
Given  Prozessverantwortlicher Müller versucht Prozesse von Abteilung "Controlling" zu exportieren
When   Diese Prozesse nicht seiner Verantwortung zugeordnet sind
Then   Gibt das System HTTP 403 zurück
```

-----

## 4. US-02 – Netzplan erstellen & verwalten

### Story

> Als **IT-Administrator** möchte ich den Netzplan des Informationsverbundes mit allen Segmenten, aktiven Netzkomponenten, Verbindungen und Sicherheitszonen erfassen und visualisieren, damit Sicherheitsverantwortliche die Netzstruktur verstehen und Maßnahmen ableiten können.

**Tags:** `Netzplan` `Infrastruktur` `Topologie` `Sicherheitszonen`

-----

### Datenmodell

```
NETZSEGMENT {
  id              UUID
  bezeichnung     String(100)     [required]   // z.B. "DMZ", "Büronetz"
  netzadresse     CIDRField       [optional]   // z.B. 192.168.10.0/24
  vlan_id         Integer         [optional]
  zone            Enum(INTERN | DMZ | EXTERN | OT | MANAGEMENT)
  schutzbedarf    Enum(NORMAL | HOCH | SEHR_HOCH)
  standort_id     FK → LIEGENSCHAFT
}

NETZKOMPONENTE {
  id              UUID
  bezeichnung     String(100)     [required]
  typ             Enum(ROUTER | SWITCH | FIREWALL | WAP | PROXY | VPN_GW)
  hersteller      String(100)
  modell          String(100)
  ip_adresse      InetField
  segment_id      FK → NETZSEGMENT
  itsystem_id     FK → ITSYSTEM   [optional]
}

NETZVERBINDUNG {
  id              UUID
  von_segment     FK → NETZSEGMENT
  zu_segment      FK → NETZSEGMENT
  protokoll       String(50)      // TCP / UDP / IPSec etc.
  verschluesselt  Boolean         [required]
  firewall_regel  Text            [optional]
}
```

-----

### Berechtigungsprofil

|Rolle                  |Anlegen|Lesen|Bearbeiten|Exportieren|
|-----------------------|:-----:|:---:|:--------:|:---------:|
|IT-Admin               |✅      |✅    |✅         |✅          |
|ISB                    |❌      |✅    |❌         |✅          |
|CISO / Leitung         |❌      |✅    |❌         |✅          |
|Auditor                |❌      |✅    |❌         |✅          |
|Prozessverantwortlicher|❌      |❌    |❌         |❌          |

-----

### Prozessbeschreibung

#### Schritt 1 – Netzsegmente definieren

**Happy Path**

```gherkin
Given  IT-Admin ist eingeloggt und wählt "Neues Netzsegment"
When   Er Bezeichnung "Büronetz", Zone "INTERN", CIDR "192.168.10.0/24", VLAN 10 eingibt
  And  Das Formular speichert
Then   Wird das Segment gespeichert und in der Segmentübersicht angezeigt
  And  Es kann sofort mit einem Liegenschaftsstandort verknüpft werden
```

**Negativtests**

```gherkin
# N1 – Ungültige CIDR-Notation
Given  IT-Admin legt neues Netzsegment an
When   Er als Netzadresse "192.168.999.0/24" eingibt
Then   Zeigt das System "Ungültige CIDR-Notation – Bitte gültigen IP-Adressbereich eingeben"
  And  Das Segment wird nicht gespeichert

# N2 – Doppelter CIDR-Block
Given  Segment "Büronetz" mit CIDR "192.168.10.0/24" existiert bereits
When   IT-Admin ein weiteres Segment mit identischem CIDR-Block anlegt
Then   Zeigt das System "Netzadresse bereits vergeben – überlappende Segmente sind nicht erlaubt"

# N3 – Pflichtfeld Zone fehlt
Given  IT-Admin füllt das Formular ohne Auswahl der Zone aus
When   Er speichert
Then   Zeigt das System "Zone ist ein Pflichtfeld"
```

-----

#### Schritt 2 – Netzkomponenten erfassen

**Happy Path**

```gherkin
Given  Netzsegment "DMZ" existiert
When   IT-Admin neue Komponente Typ "FIREWALL", Hersteller "Palo Alto", IP "10.0.0.1" anlegt
  And  Dem Segment "DMZ" zuordnet
Then   Erscheint die Firewall in der Komponentenliste des Segments "DMZ"
  And  Optional kann sie mit einem IT-System (US-03) verknüpft werden
```

**Negativtests**

```gherkin
# N1 – Ungültige IP-Adresse
Given  IT-Admin legt neue Netzkomponente an
When   Er "256.0.0.1" als IP-Adresse eingibt
Then   Zeigt das System "Ungültige IP-Adresse"

# N2 – Komponente ohne Segment
Given  IT-Admin legt Komponente ohne Segment-Zuordnung an
When   Er speichert
Then   Zeigt das System "Jede Netzkomponente muss einem Netzsegment zugeordnet sein"
```

-----

#### Schritt 3 – Verbindungen & Übergänge dokumentieren

**Happy Path**

```gherkin
Given  Segmente "Büronetz (INTERN)" und "DMZ" existieren
When   IT-Admin Verbindung von Büronetz → DMZ mit Protokoll "HTTPS", verschluesselt=true anlegt
Then   Wird die Verbindung gespeichert
  And  Erscheint als gerichtete Kante in der Topologie-Visualisierung
```

**Negativtests**

```gherkin
# N1 – Unverschlüsselter Übergang zur DMZ
Given  Zwei Segmente "Büronetz (INTERN)" und "DMZ" existieren
When   IT-Admin eine Verbindung ohne Verschlüsselung anlegt
Then   Zeigt das System "Sicherheitswarnung: Unverschlüsselter Übergang zur Zone DMZ"
  And  Die Verbindung kann nach expliziter Bestätigung trotzdem gespeichert werden
  And  Der Eintrag wird im Audit-Log als "Sicherheitswarnung bestätigt" markiert

# N2 – Verbindung auf dasselbe Segment
Given  IT-Admin legt eine Verbindung von "Büronetz" zu "Büronetz" an
When   Er speichert
Then   Zeigt das System "Quell- und Zielsegment dürfen nicht identisch sein"
```

-----

#### Schritt 4 – Topologie-Visualisierung & Export

**Happy Path**

```gherkin
Given  Mindestens 3 Segmente und 5 Komponenten sind erfasst
When   ISB auf "Netzplan als PDF exportieren" klickt
Then   Wird ein PDF mit grafischer Topologie und tabellarischer Komponentenliste generiert
  And  Das Dokument enthält Datum, Versionsnummer und Erstellername
```

**Negativtests**

```gherkin
# N1 – Export ohne Segmente
Given  Es sind keine Netzsegmente erfasst
When   IT-Admin den Export auslöst
Then   Zeigt das System "Kein Netzplan vorhanden – bitte zuerst Segmente anlegen"

# N2 – Prozessverantwortlicher versucht Netzplan zu sehen
Given  Benutzer mit Rolle "Prozessverantwortlicher" ist eingeloggt
When   Er den Netzplan aufruft
Then   Gibt das System HTTP 403 zurück
```

-----

## 5. US-03 – IT-Systeme inventarisieren

### Story

> Als **IT-Administrator** möchte ich alle im Informationsverbund betriebenen oder geplanten IT-Systeme mit technischen Details, Standort, Schutzbedarf und Verantwortlichkeiten erfassen, damit der ISB darauf aufbauend Gefährdungen und Maßnahmen identifizieren kann.

**Tags:** `IT-Inventar` `Systemkatalog` `Kritische Systeme` `OT/IoT`

-----

### Datenmodell

```
ITSYSTEM {
  id                UUID              [PK]
  inventarnummer    String(50)        [required, unique]
  bezeichnung       String(200)       [required]
  typ               Enum(SERVER | CLIENT | NETZWERK | MOBILE | DRUCKER | OT | IOT | SONSTIGE)
  plattform         Enum(PHYSISCH | VM | CONTAINER | CLOUD_SAAS | CLOUD_IAAS)
  betriebssystem    String(100)       [optional]
  os_version        String(50)
  hostname          String(100)
  ip_adressen       JSON[]            // mehrere IPs möglich
  mac_adresse       MACField          [optional]
  status            Enum(PRODUKTIV | TEST | GEPLANT | ABGEKUENDIGT)
  schutzbedarf      Enum(NORMAL | HOCH | SEHR_HOCH)   // abgeleitet via Vererbung
  verantwortlicher  FK → BENUTZER
  raum_id           FK → RAUM         [optional]
  segment_id        FK → NETZSEGMENT
  anschaffungsdatum Date              [optional]
  end_of_support    Date              [optional]
  bemerkung         Text
}
```

-----

### Berechtigungsprofil

|Rolle                  |Anlegen|Lesen     |Bearbeiten      |Schutzbedarf setzen|Löschen|
|-----------------------|:-----:|:--------:|:--------------:|:-----------------:|:-----:|
|IT-Admin               |✅      |✅         |✅               |✅                  |✅      |
|ISB                    |❌      |✅         |✅ (Schutzbedarf)|✅                  |❌      |
|CISO / Leitung         |❌      |✅         |❌               |❌                  |❌      |
|Auditor                |❌      |✅         |❌               |❌                  |❌      |
|Prozessverantwortlicher|❌      |✅ (eigene)|❌               |❌                  |❌      |

-----

### Prozessbeschreibung

#### Schritt 1 – Systeme anlegen / importieren

**Happy Path**

```gherkin
Given  IT-Admin ist eingeloggt und wählt "Neues IT-System"
When   Er Bezeichnung, Typ, Plattform, Betriebssystem und Verantwortlichen eingibt
  And  Das Formular speichert
Then   Wird das System mit automatisch generierter Inventarnummer (z.B. "INV-2025-0043") gespeichert
  And  Erscheint in der Systemübersicht mit Status "PRODUKTIV"
```

**Negativtests**

```gherkin
# N1 – Inventarnummer doppelt vergeben
Given  System mit Inventarnummer "INV-2024-0042" existiert bereits
When   IT-Admin ein neues System mit gleicher Inventarnummer anlegt
Then   Zeigt das System "Inventarnummer bereits vergeben"
  And  Der Datensatz wird nicht gespeichert

# N2 – Ungültige IP-Adresse
Given  IT-Admin legt neues IT-System an
When   Er "999.168.1.1" als IP-Adresse eingibt
Then   Zeigt das System "Ungültiges IP-Format"

# N3 – Pflichtfeld Typ fehlt
Given  IT-Admin füllt Formular ohne Typ-Auswahl aus
When   Er speichert
Then   Zeigt das System "Systemtyp ist ein Pflichtfeld"
```

-----

#### Schritt 2 – Klassifizierung & Plattform

**Happy Path**

```gherkin
Given  IT-System "SRV-001" existiert
When   IT-Admin Plattform "VM" und EoS-Datum "2024-12-31" (Vergangenheit) setzt
Then   Wird das System gespeichert
  And  Zeigt das System eine Warnung "System außerhalb Herstellersupport"
  And  Das System wird in der Übersicht mit Icon ⚠️ markiert
```

**Negativtests**

```gherkin
# N1 – EoS-Datum vor Anschaffungsdatum
Given  IT-Admin gibt Anschaffungsdatum "2023-01-01" und EoS-Datum "2022-01-01" ein
When   Er speichert
Then   Zeigt das System "End-of-Support-Datum darf nicht vor dem Anschaffungsdatum liegen"

# N2 – Plattform CLOUD_SAAS ohne Datenhaltungsort
Given  IT-Admin wählt Plattform "CLOUD_SAAS"
When   Er keinen Datenhaltungsort angibt und speichert
Then   Zeigt das System "Bei Cloud-Plattformen ist der Datenhaltungsort Pflicht"
```

-----

#### Schritt 3 – Standort & Netz zuordnen

**Happy Path**

```gherkin
Given  Raum "SR-EG-01" und Netzsegment "Server-LAN" existieren
When   IT-Admin das System "SRV-FILESERVER" dem Raum und Segment zuordnet
Then   Erscheint SRV-FILESERVER in der Raumliste von SR-EG-01
  And  Segment und Raum werden in der System-Detailansicht angezeigt
```

**Negativtests**

```gherkin
# N1 – Raum existiert nicht
Given  IT-Admin versucht System einem nicht existierenden Raum "SR-99-99" zuzuordnen
When   Er speichert
Then   Zeigt das System "Raum 'SR-99-99' nicht gefunden – bitte zuerst in US-05 anlegen"

# N2 – Netzsegment und Standort in verschiedenen Liegenschaften
Given  Raum "SR-Berlin" gehört zu Liegenschaft "Berlin"
  And  Segment "Server-LAN-Hamburg" gehört zu Liegenschaft "Hamburg"
When   IT-Admin das System mit dieser Kombination speichert
Then   Zeigt das System "Warnung: Raum und Netzsegment befinden sich in verschiedenen Liegenschaften"
```

-----

#### Schritt 4 – Schutzbedarf vererben

**Happy Path**

```gherkin
Given  Anwendung "ERP-System" mit Schutzbedarf C=SEHR_HOCH läuft auf Server "SRV-001"
When   ISB die Systemdetails von SRV-001 aufruft
Then   Zeigt das System Schutzbedarf C=SEHR_HOCH mit Hinweis "(abgeleitet von: ERP-System)"
  And  ISB kann den Wert begründet manuell überschreiben
```

**Negativtests**

```gherkin
# N1 – Manuelle Absenkung ohne Begründung
Given  System "SRV-001" hat abgeleiteten Schutzbedarf SEHR_HOCH
When   ISB den Schutzbedarf auf NORMAL absenken möchte ohne Begründung
Then   Zeigt das System "Eine Absenkung des abgeleiteten Schutzbedarfs erfordert eine schriftliche Begründung"

# N2 – IT-Admin versucht Schutzbedarf zu setzen
Given  Benutzer mit Rolle "IT-Admin" ist eingeloggt
When   Er den Schutzbedarf eines Systems direkt ändern möchte
Then   Ist das Feld "Schutzbedarf manuell setzen" ausgegraut (nur ISB darf das)
```

-----

## 6. US-04 – Anwendungen & Abhängigkeiten dokumentieren

### Story

> Als **Informationssicherheitsbeauftragter** möchte ich alle eingesetzten Anwendungen mit ihren Abhängigkeiten zu Geschäftsprozessen und IT-Systemen sowie den darin verarbeiteten Daten dokumentieren, damit ich Risiken aus Softwareveralterung oder Abhängigkeitsbrüchen frühzeitig erkennen kann.

**Tags:** `Anwendungen` `Abhängigkeiten` `Softwarekatalog` `DSGVO`

-----

### Datenmodell

```
ANWENDUNG {
  id                  UUID
  bezeichnung         String(200)     [required]
  hersteller          String(100)
  version             String(50)
  lizenzmodell        Enum(KAUF | MIETE | OPEN_SOURCE | EIGENENTWICKLUNG)
  betriebsart         Enum(ON_PREMISE | CLOUD | HYBRID)
  datenhaltung_ort    String(200)     // Serverstandort / Cloudregion
  personendaten       Boolean         // DSGVO-relevant?
  schnittstellen      JSON[]          // APIs zu anderen Anwendungen
  verantwortlicher    FK → BENUTZER
  status              Enum(PRODUKTIV | TEST | GEPLANT | ABGEKUENDIGT)
}

// Anwendung läuft auf IT-System (M:N)
ANWENDUNG_ITSYSTEM {
  anwendung_id  FK
  itsystem_id   FK
  rolle         String    // z.B. "Appserver", "Datenbankserver", "Client"
}
```

-----

### Berechtigungsprofil

|Rolle                  |Anlegen|Lesen     |Bearbeiten|Löschen|
|-----------------------|:-----:|:--------:|:--------:|:-----:|
|ISB                    |✅      |✅         |✅         |✅      |
|IT-Admin               |✅      |✅         |✅         |❌      |
|CISO / Leitung         |❌      |✅         |❌         |❌      |
|Auditor                |❌      |✅         |❌         |❌      |
|Prozessverantwortlicher|❌      |✅ (eigene)|✅ (eigene)|❌      |

-----

### Prozessbeschreibung

#### Schritt 1 – Anwendung anlegen

**Happy Path**

```gherkin
Given  ISB ist eingeloggt und wählt "Neue Anwendung"
When   Er Bezeichnung "SAP ERP", Hersteller "SAP", Version "S/4HANA 2023", Lizenzmodell "MIETE" eingibt
  And  Betriebsart "ON_PREMISE" und Status "PRODUKTIV" setzt
  And  Speichert
Then   Wird die Anwendung im Anwendungskatalog gespeichert
  And  Erscheint in der Anwendungsübersicht
```

**Negativtests**

```gherkin
# N1 – Bezeichnung fehlt
Given  ISB füllt das Formular ohne Bezeichnung aus
When   Er speichert
Then   Zeigt das System "Bezeichnung ist ein Pflichtfeld"

# N2 – Ungültiger Status
Given  ISB wählt einen Status der nicht in der Enum-Liste vorhanden ist
When   Er speichert
Then   Gibt die API HTTP 400 mit "Ungültiger Statuswert" zurück
```

-----

#### Schritt 2 – Datenhaltung & DSGVO

**Happy Path**

```gherkin
Given  ISB legt neue Anwendung an und aktiviert "Personendaten = Ja"
When   Er Datenhaltungsort "Frankfurt (EU)" eingibt und speichert
Then   Wird ein grünes Icon "EU-Datenhaltung konform" angezeigt
  And  Die Anwendung wird in der DSGVO-relevanten Anwendungsliste geführt
```

**Negativtests**

```gherkin
# N1 – Personendaten ohne Datenhaltungsort
Given  ISB aktiviert "Personendaten = Ja"
When   Er das Formular ohne Datenhaltungsort absendet
Then   Zeigt das System "Datenhaltungsort ist bei Personendaten Pflicht (DSGVO Art. 30)"

# N2 – Datenhaltung außerhalb EU ohne Hinweis
Given  ISB gibt Datenhaltungsort "USA (Virginia)" ein
When   Er speichert
Then   Zeigt das System ein rotes Warnsymbol "Drittlandstransfer – Art. 46 DSGVO prüfen"
  And  Ein Hinweis-Text "Geeignete Garantien erforderlich" wird angezeigt
```

-----

#### Schritt 3 – IT-Systeme verknüpfen

**Happy Path**

```gherkin
Given  Anwendung "SAP ERP" und IT-System "SRV-SAP-01" existieren
When   IT-Admin die Verknüpfung mit Rolle "Appserver" anlegt
Then   Erscheint "SRV-SAP-01" in der Systemliste von "SAP ERP"
  And  Der Schutzbedarf von SRV-SAP-01 berücksichtigt den Anwendungs-Schutzbedarf
```

**Negativtests**

```gherkin
# N1 – Verknüpfung mit System im falschen Status
Given  IT-System "SRV-ALT-99" hat Status "ABGEKUENDIGT"
When   IT-Admin versucht es mit Anwendung "SAP ERP" zu verknüpfen
Then   Zeigt das System "Warnung: IT-System hat Status 'ABGEKUENDIGT' – Verknüpfung trotzdem anlegen?"

# N2 – Auditor versucht Verknüpfung
Given  Auditor ist eingeloggt
When   Er versucht eine Anwendung-System-Verknüpfung anzulegen
Then   Ist der Button "Verknüpfung hinzufügen" nicht sichtbar (kein Schreibrecht)
```

-----

#### Schritt 4 – Schnittstellen erfassen & Abhängigkeitsmatrix

**Happy Path**

```gherkin
Given  Anwendungen "CRM", "ERP" und "E-Mail-Server" existieren
When   ISB für "CRM" Schnittstellen zu "ERP" und "E-Mail-Server" einträgt
  And  Die Abhängigkeitsmatrix aufruft
Then   Wird ein gerichteter Graph angezeigt: CRM → ERP, CRM → E-Mail-Server
  And  Der Graph kann als PNG/SVG exportiert werden
```

**Negativtests**

```gherkin
# N1 – Zirkuläre Abhängigkeit
Given  Anwendung "A" hat Schnittstelle zu "B", "B" hat Schnittstelle zu "C"
When   ISB Schnittstelle von "C" → "A" anlegt
Then   Zeigt das System "Warnung: Zirkuläre Abhängigkeit erkannt (A → B → C → A)"
  And  Die Schnittstelle kann nach Bestätigung trotzdem gespeichert werden

# N2 – Schnittstelle auf sich selbst
Given  ISB legt Schnittstelle von "CRM" zu "CRM" an
When   Er speichert
Then   Zeigt das System "Quell- und Zielanwendung dürfen nicht identisch sein"
```

-----

## 7. US-05 – Liegenschaften & Räume erfassen

### Story

> Als **Facility Manager / IT-Administrator** möchte ich alle Liegenschaften, Gebäude und relevanten Räume (insbesondere Serverräume und Produktionsstätten) mit ihren physischen Sicherheitsmerkmalen erfassen, damit Zutrittskontrolle und physische Schutzmaßnahmen im Sicherheitskonzept berücksichtigt werden.

**Tags:** `Liegenschaften` `Gebäude` `Zutrittskontrolle` `Produktion`

-----

### Datenmodell

```
LIEGENSCHAFT {
  id            UUID
  bezeichnung   String(200)   [required]
  adresse       String(300)
  land          ISO3166
}

GEBAEUDE {
  id              UUID
  bezeichnung     String(100)   [required]
  liegenschaft_id FK → LIEGENSCHAFT
  stockwerke      Integer
  baujahr         Year
}

RAUM {
  id                UUID
  bezeichnung       String(100)   [required]
  raumnummer        String(20)
  gebaeude_id       FK → GEBAEUDE
  typ               Enum(BUERO | SERVERRAUM | RZ | PRODUKTION | LAGER | BESPRECHUNG | SONSTIGE)
  etage             Integer
  zutrittskontrolle Enum(KEINS | SCHLUESSEL | TRANSPONDER | BIOMETRIE)
  brandschutz       Boolean
  einbruchschutz    Enum(KEINS | BASIS | ERHOEHEN | HOCH)
  klimatisierung    Boolean
  usv               Boolean       // Unterbrechungsfreie Stromversorgung
}
```

-----

### Berechtigungsprofil

|Rolle           |Anlegen  |Lesen|Bearbeiten           |Löschen|
|----------------|:-------:|:---:|:-------------------:|:-----:|
|Facility Manager|✅        |✅    |✅                    |✅      |
|IT-Admin        |✅ (Räume)|✅    |✅ (Räume)            |❌      |
|ISB             |❌        |✅    |✅ (Sicherheitsfelder)|❌      |
|CISO / Leitung  |❌        |✅    |❌                    |❌      |
|Auditor         |❌        |✅    |❌                    |❌      |

-----

### Prozessbeschreibung

#### Schritt 1 – Liegenschaft anlegen

**Happy Path**

```gherkin
Given  Facility Manager ist eingeloggt und wählt "Neue Liegenschaft"
When   Er Bezeichnung "Hauptsitz München", Adresse "Musterstraße 1", Land "DE" eingibt
  And  Speichert
Then   Wird die Liegenschaft gespeichert
  And  Erscheint als Wurzelelement in der Standorthierarchie
```

**Negativtests**

```gherkin
# N1 – Bezeichnung fehlt
Given  Facility Manager füllt Formular ohne Bezeichnung aus
When   Er speichert
Then   Zeigt das System "Bezeichnung ist ein Pflichtfeld"

# N2 – Ungültiger Ländercode
Given  Facility Manager gibt Ländercode "XX" ein
When   Er speichert
Then   Zeigt das System "Ungültiger ISO-3166 Ländercode"
```

-----

#### Schritt 2 – Gebäudestruktur erfassen

**Happy Path**

```gherkin
Given  Liegenschaft "Hauptsitz München" existiert
When   Facility Manager Gebäude "Verwaltungsgebäude A", 4 Stockwerke, Baujahr 1998 anlegt
  And  Der Liegenschaft zuordnet
Then   Erscheint das Gebäude als untergeordnetes Element der Liegenschaft
```

**Negativtests**

```gherkin
# N1 – Gebäude ohne Liegenschaft
Given  Facility Manager legt Gebäude ohne Liegenschaft-Zuordnung an
When   Er speichert
Then   Zeigt das System "Jedes Gebäude muss einer Liegenschaft zugeordnet sein"

# N2 – Negative Stockwerkanzahl
Given  Facility Manager gibt Stockwerke = -2 ein
When   Er speichert
Then   Zeigt das System "Stockwerkanzahl muss eine positive Ganzzahl sein"
```

-----

#### Schritt 3 – Räume & physische Sicherheit

**Happy Path**

```gherkin
Given  Gebäude "Servergebäude B" existiert
When   IT-Admin Raum "SR-EG-01", Typ "SERVERRAUM", Zutrittskontrolle "TRANSPONDER",
       Brandschutz=true, Klimatisierung=true, USV=true anlegt
Then   Wird der Raum gespeichert
  And  Erscheint in der BSI-konformen Checkliste mit Status "alle Pflichtfelder erfüllt"
```

**Negativtests**

```gherkin
# N1 – Serverraum ohne Zutrittskontrolle
Given  IT-Admin legt Raum mit Typ "SERVERRAUM" an
When   Er das Formular ohne Angabe der Zutrittskontrolle speichert
Then   Zeigt das System "Zutrittskontrolle ist für Serverräume Pflicht (BSI SYS.1.1)"

# N2 – Rechenzentrum ohne USV
Given  IT-Admin legt Raum mit Typ "RZ" an
When   Er USV=false setzt und speichert
Then   Zeigt das System "Warnung: Rechenzentren ohne USV erfüllen BSI-Mindestanforderungen nicht"
  And  Kann nach Bestätigung trotzdem gespeichert werden
```

-----

#### Schritt 4 – IT-Systeme räumlich verorten

**Happy Path**

```gherkin
Given  Serverraum "SR-EG-01" und IT-System "SRV-FILESERVER" existieren
When   IT-Admin das System dem Raum zuordnet
Then   Erscheint SRV-FILESERVER in der Systemliste von SR-EG-01
  And  Der Standort wird in der IT-System-Detailansicht angezeigt
```

**Negativtests**

```gherkin
# N1 – Löschen einer Liegenschaft mit abhängigen Gebäuden
Given  Liegenschaft "Hauptsitz München" hat 3 abhängige Gebäude
When   Facility Manager versucht die Liegenschaft zu löschen
Then   Zeigt das System "Liegenschaft hat 3 abhängige Gebäude – bitte zuerst verschieben oder löschen"
  And  Der Löschvorgang wird abgebrochen

# N2 – Raum mit IT-Systemen löschen
Given  Raum "SR-EG-01" hat 5 zugeordnete IT-Systeme
When   Facility Manager versucht den Raum zu löschen
Then   Zeigt das System "Raum hat 5 zugeordnete IT-Systeme – Zuordnung bitte zuerst aufheben"
```

-----

## 8. US-06 – Schutzbedarf feststellen & berichten

### Story

> Als **CISO / Geschäftsführung** möchte ich eine konsolidierte Schutzbedarfsfeststellung mit einer Übersicht aller kritischen Systeme, Anwendungen und Prozesse sowie einen druckfertigen BSI-konformen Bericht erhalten, damit ich fundierte Entscheidungen über Sicherheitsinvestitionen treffen kann.

**Tags:** `Schutzbedarf` `Management` `BSI-Konform` `Export` `Freigabe-Workflow`

-----

### Datenmodell

```
SCHUTZBEDARF_BERICHT {
  id               UUID
  titel            String(200)
  version          String(20)
  erstellt_von     FK → BENUTZER
  erstellt_am      DateTime
  freigegeben_von  FK → BENUTZER     [nullable]
  freigegeben_am   DateTime          [nullable]
  status           Enum(ENTWURF | REVIEW | FREIGEGEBEN | ABGELEHNT)
  zusammenfassung  Text
}

SCHUTZBEDARF_POSITION {
  bericht_id      FK → SCHUTZBEDARF_BERICHT
  objekt_typ      Enum(PROZESS | ANWENDUNG | ITSYSTEM)
  objekt_id       UUID
  schutzbedarf_C  Enum(NORMAL | HOCH | SEHR_HOCH)
  schutzbedarf_I  Enum(NORMAL | HOCH | SEHR_HOCH)
  schutzbedarf_A  Enum(NORMAL | HOCH | SEHR_HOCH)
  quelle          Enum(ABGELEITET | MANUELL)
  begruendung     Text
}
```

-----

### Berechtigungsprofil

|Rolle                  |Bericht erstellen|Bericht lesen|Freigeben / Ablehnen|Exportieren     |Positionen bearbeiten|
|-----------------------|:---------------:|:-----------:|:------------------:|:--------------:|:-------------------:|
|ISB                    |✅                |✅            |❌                   |✅               |✅                    |
|CISO / Leitung         |❌                |✅            |✅                   |✅               |❌                    |
|IT-Admin               |❌                |✅            |❌                   |❌               |❌                    |
|Auditor                |❌                |✅            |❌                   |✅ (freigegebene)|❌                    |
|Prozessverantwortlicher|❌                |✅ (eigene)   |❌                   |❌               |❌                    |

-----

### Prozessbeschreibung

#### Schritt 1 – Schutzbedarf automatisch konsolidieren

**Happy Path**

```gherkin
Given  Alle Prozesse, Anwendungen und IT-Systeme sind vollständig erfasst und freigegeben
When   ISB "Neuen Schutzbedarf-Bericht erstellen" wählt
Then   Aggregiert das System automatisch alle Schutzbedarfswerte via Maximumprinzip
  And  Jede Position zeigt C / I / A Wert sowie die treibende Quelle
  And  Der Bericht hat Status "ENTWURF"
```

**Negativtests**

```gherkin
# N1 – Bericht ohne vollständige Daten
Given  15 von 20 IT-Systemen haben keinen gesetzten Schutzbedarf
When   ISB einen Bericht erstellt
Then   Zeigt das System "Warnung: 15 IT-Systeme haben keinen Schutzbedarf – Bericht unvollständig"
  And  Die betroffenen Systeme werden aufgelistet

# N2 – Maximumprinzip-Verletzung durch manuelle Absenkung ohne Begründung
Given  System "SRV-001" hat abgeleiteten Schutzbedarf SEHR_HOCH
When   ISB im Bericht den Wert auf NORMAL absenkt ohne Begründung
Then   Zeigt das System "Manuelle Absenkung unter abgeleiteten Wert erfordert Begründung (Pflichtfeld)"
```

-----

#### Schritt 2 – ISB prüft & begründet

**Happy Path**

```gherkin
Given  Bericht "Strukturanalyse Q1 2025" im Status "ENTWURF" existiert
When   ISB eine Position manuell von HOCH auf SEHR_HOCH anhebt
  And  Begründung "Produktionsdaten mit direktem Unternehmenswert" einträgt
Then   Wird die Position mit Quelle "MANUELL" und Begründungstext gespeichert
  And  Die Änderung wird im Audit-Log protokolliert
```

**Negativtests**

```gherkin
# N1 – Bearbeitung eines freigegebenen Berichts
Given  Bericht hat Status "FREIGEGEBEN"
When   ISB versucht eine Position zu bearbeiten
Then   Zeigt das System "Freigegebene Berichte können nicht bearbeitet werden – bitte neue Version anlegen"

# N2 – CISO versucht Positionen zu bearbeiten
Given  CISO ist eingeloggt
When   Er eine Schutzbedarfs-Position bearbeiten möchte
Then   Sind die Bearbeitungsfelder ausgegraut (nur ISB hat Schreibrecht auf Positionen)
```

-----

#### Schritt 3 – CISO Review & Freigabe

**Happy Path**

```gherkin
Given  ISB reicht Bericht "Strukturanalyse Q1 2025" zur Freigabe ein
When   Das System den Status auf "REVIEW" setzt
Then   Erhält der CISO eine E-Mail-Benachrichtigung "Bericht wartet auf Ihre Freigabe"
  And  Der Bericht erscheint im CISO-Dashboard unter "Ausstehende Freigaben"
When   CISO den Bericht freigibt
Then   Wird Status auf "FREIGEGEBEN" gesetzt
  And  Freigabedatum und freigebende Person werden gespeichert
```

**Negativtests**

```gherkin
# N1 – ISB gibt eigenen Bericht frei
Given  ISB hat Bericht erstellt und möchte ihn selbst freigeben
When   Er den Freigabe-Button betätigt
Then   Zeigt das System "Vier-Augen-Prinzip: Der Ersteller darf den Bericht nicht selbst freigeben"

# N2 – Freigabe eines Berichts mit offenen Warnungen
Given  Bericht enthält 3 Positionen mit Warnung "Begründung fehlt"
When   CISO den Bericht freigeben möchte
Then   Zeigt das System "Bericht enthält 3 unbegründete manuelle Anpassungen – trotzdem freigeben?"
  And  CISO muss explizit bestätigen

# N3 – Ablehnung ohne Kommentar
Given  CISO möchte Bericht ablehnen
When   Er auf "Ablehnen" klickt ohne einen Ablehnungsgrund einzutragen
Then   Zeigt das System "Bitte Ablehnungsgrund angeben – dieser wird dem ISB mitgeteilt"
```

-----

#### Schritt 4 – BSI-Bericht exportieren

**Happy Path**

```gherkin
Given  Bericht "Strukturanalyse Q1 2025" hat Status "FREIGEGEBEN"
When   CISO auf "PDF exportieren" klickt
Then   Wird ein PDF generiert mit:
       - Deckblatt (Titel, Version, Datum, Freigabe-Person)
       - Inhaltsverzeichnis
       - Schutzbedarfstabelle (C / I / A je Objekt)
       - Begründungen für manuelle Anpassungen
       - Glossar der verwendeten Begriffe
  And  Die Datei trägt den Dateinamen "BSI-Schutzbedarf_RECPLAST_Q1-2025_v1.0.pdf"
```

**Negativtests**

```gherkin
# N1 – Export eines nicht freigegebenen Berichts durch Auditor
Given  Auditor ist eingeloggt
  And  Bericht hat Status "ENTWURF"
When   Auditor versucht den Bericht zu exportieren
Then   Zeigt das System HTTP 403 "Nur freigegebene Berichte können von Auditoren exportiert werden"

# N2 – PDF-Generierung schlägt fehl (Systemfehler)
Given  PDF-Generierungsdienst ist nicht erreichbar
When   CISO Export auslöst
Then   Zeigt das System "PDF-Export fehlgeschlagen – bitte erneut versuchen oder Administrator kontaktieren"
  And  Der Fehler wird im System-Log protokolliert
  And  Der Bericht-Status bleibt "FREIGEGEBEN" (kein Datenverlust)
```

-----

*Dokument generiert für BSI IT-Grundschutz Strukturanalyse | RECPLAST GmbH | Version 1.0*