# User Stories: BSI IT-Grundschutz – Lektion 4: Schutzbedarfsfeststellung

> **Quelle:** BSI Online-Kurs IT-Grundschutz, Lektion 4 – Schutzbedarfsfeststellung  
> **Referenz:** BSI-Standard 200-2, IT-Grundschutz-Methodik  
> **Stand:** März 2026

-----

## Übersicht der User Stories

|ID   |Titel                                                |Bereich      |
|-----|-----------------------------------------------------|-------------|
|US-01|Schutzbedarfskategorien definieren                   |Grundlagen   |
|US-02|Schadensszenarien bewerten                           |Grundlagen   |
|US-03|Schutzbedarf für Prozesse und Anwendungen feststellen|Analyse      |
|US-04|Schutzbedarf für IT-Systeme feststellen              |Analyse      |
|US-05|Schutzbedarf für Räume feststellen                   |Analyse      |
|US-06|Vererbungsprinzip anwenden (Maximumprinzip)          |Vererbung    |
|US-07|Kumulationseffekt berücksichtigen                    |Vererbung    |
|US-08|Verteilungseffekt berücksichtigen                    |Vererbung    |
|US-09|Schutzbedarfsfeststellung dokumentieren und begründen|Dokumentation|

-----

## US-01: Schutzbedarfskategorien definieren

### Titel (User Story Format)

> **Als** Informationssicherheitsbeauftragter (ISB)  
> **möchte ich** für meinen Informationsverbund institutionsspezifische Schutzbedarfskategorien definieren,  
> **damit** ich den Schutzbedarf aller Zielobjekte einheitlich und nachvollziehbar einordnen kann.

-----

### Prozessbeschreibung / User Journey

1. Der ISB startet die Schutzbedarfsfeststellung nach Abschluss der Strukturanalyse.
1. Er wählt die drei BSI-Standardkategorien als Ausgangsbasis: **normal**, **hoch**, **sehr hoch**.
1. Er legt für jedes relevante Schadensszenario konkrete, institutionsspezifische Schwellwerte fest (z. B. Eurobeträge für finanzielle Schäden, Stunden für Ausfallzeiten).
1. Die definierten Kategorien werden vom Management freigegeben.
1. Die Kategoriendefinitionen werden im Sicherheitskonzept dokumentiert.

-----

### Datenmodell

```
Schutzbedarfskategorie
├── ID              : String          (z. B. "SBK-01")
├── Bezeichnung     : Enum            (normal | hoch | sehr hoch)
├── Schadensszenario: String          (z. B. "Finanzielle Auswirkungen")
├── Beschreibung    : String          (allgemeine BSI-Definition)
├── Konkretisierung : String          (institutionsspezifische Schwellwerte)
└── FreigabeDatum   : Date
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Kategorie erfolgreich definiert**

```
Given  der ISB hat die Strukturanalyse abgeschlossen
  und der Informationsverbund nutzt Standard- oder Kern-Absicherung
When   der ISB für das Schadensszenario "Beeinträchtigung der Aufgabenerfüllung"
       die Kategorie "hoch" mit der Konkretisierung
       "Ausfallzeiten dürfen maximal 24 Stunden betragen" hinterlegt
Then   wird die Kategoriendefinition gespeichert
  and  ist sie für alle nachfolgenden Schutzbedarfsbewertungen verfügbar
  and  erscheint sie in der Dokumentation des Sicherheitskonzepts
```

**Negativtest – Basis-Absicherung ausgewählt**

```
Given  der Informationsverbund nutzt die Basis-Absicherung
When   der ISB versucht, eine Schutzbedarfsfeststellung zu starten
Then   wird ein Hinweis angezeigt:
       "Bei der Basis-Absicherung ist keine Schutzbedarfsfeststellung erforderlich."
  and  der Prozess wird nicht gestartet
```

**Negativtest – Schwellwerte nicht konkretisiert**

```
Given  der ISB erfasst Kategorien nur mit allgemeinen BSI-Definitionen
  and  ohne institutionsspezifische Konkretisierung
When   er die Kategorien speichern möchte
Then   erscheint eine Warnmeldung:
       "Bitte konkretisieren Sie die Kategoriengrenzen für Ihre Institution."
  and  die Speicherung wird ohne Bestätigung blockiert
```

-----

## US-02: Schadensszenarien bewerten

### Titel (User Story Format)

> **Als** ISB  
> **möchte ich** für jeden Geschäftsprozess realistische Schadensszenarien nach BSI-Standard formulieren,  
> **damit** ich den Schutzbedarf der drei Grundwerte (Vertraulichkeit, Integrität, Verfügbarkeit) fundiert einschätzen kann.

-----

### Prozessbeschreibung / User Journey

1. Der ISB wählt einen Geschäftsprozess oder eine Anwendung aus der Strukturanalyse.
1. Er formuliert „Was-wäre-wenn”-Fragen für jedes BSI-Schadensszenario:
- Verstöße gegen Gesetze/Vorschriften/Verträge
- Beeinträchtigung des informationellen Selbstbestimmungsrechts
- Beeinträchtigung der persönlichen Unversehrtheit
- Beeinträchtigung der Aufgabenerfüllung
- Finanzielle Auswirkungen
- Negative Innen- oder Außenwirkung
1. Er bewertet für jeden Grundwert (C, I, A) das Schadensausmaß anhand der definierten Kategorien.
1. Bei Uneinigkeit innerhalb der Projektgruppe trifft das Management die Entscheidung.
1. Die Bewertung wird mit Begründung dokumentiert.

-----

### Datenmodell

```
Schadensbewertung
├── ID                  : String
├── Zielobjekt_Ref      : FK → Geschäftsprozess / Anwendung
├── Schadensszenario    : Enum  (Gesetz | Selbstbestimmung | Unversehrtheit |
│                                Aufgabenerfüllung | Finanziell | Außenwirkung)
├── Grundwert           : Enum  (Vertraulichkeit | Integrität | Verfügbarkeit)
├── Schutzbedarfskategorie : Enum (normal | hoch | sehr hoch)
├── Begründung          : Text
├── Bewertet_von        : String (Name / Rolle)
└── Datum               : Date
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Bewertung vollständig und begründet**

```
Given  der ISB bewertet die Anwendung "Finanzbuchhaltung"
  and  das Schadensszenario ist "Verstöße gegen Gesetze/Vorschriften"
When   er die Vertraulichkeit als "hoch" einstuft
  and  die Begründung "Verletzung handelsrechtlicher Aufbewahrungspflichten möglich" eingibt
Then   wird die Bewertung gespeichert
  and  ist sie in der Schutzbedarfstabelle der Anwendung sichtbar
```

**Negativtest – Bewertung ohne Begründung**

```
Given  der ISB wählt für einen Grundwert die Kategorie "sehr hoch"
When   er keine Begründung eingibt und speichern möchte
Then   erscheint die Fehlermeldung:
       "Eine Begründung ist für alle Schutzbedarfskategorien verpflichtend."
  and  die Bewertung wird nicht gespeichert
```

**Negativtest – Kein Konsens, Management nicht eingebunden**

```
Given  zwei Projektmitglieder bewerten denselben Grundwert unterschiedlich (normal vs. hoch)
  and  kein Konsens wurde erzielt
When   versucht wird, die Bewertung ohne Management-Entscheidung abzuschließen
Then   erscheint ein Hinweis:
       "Bitte holen Sie eine Managemententscheidung zur abweichenden Bewertung ein."
  and  der Status bleibt auf "offen"
```

-----

## US-03: Schutzbedarf für Prozesse und Anwendungen feststellen

### Titel (User Story Format)

> **Als** ISB  
> **möchte ich** den Schutzbedarf aller in der Strukturanalyse erfassten Prozesse und Anwendungen festlegen,  
> **damit** dieser als Grundlage für die Vererbung auf nachgelagerte IT-Systeme und Infrastruktur dient.

-----

### Prozessbeschreibung / User Journey

1. Der ISB ruft die Liste aller Geschäftsprozesse und Anwendungen aus der Strukturanalyse ab.
1. Er bewertet jeden Eintrag für die drei Grundwerte anhand der Schadensszenarien.
1. Er bezieht die Fachabteilung (Prozessverantwortliche, Anwendungsnutzer) aktiv in die Bewertung ein.
1. Der höchste Schutzbedarf über alle Schadensszenarien je Grundwert wird als Gesamtschutzbedarf des Zielobjekts übernommen.
1. Die Ergebnisse werden in einer Schutzbedarfstabelle zusammengeführt.

-----

### Datenmodell

```
Zielobjekt_Anwendung
├── ID                  : String
├── Name                : String          (z. B. "Finanzbuchhaltung")
├── Typ                 : Enum            (Prozess | Anwendung)
├── Verantwortlicher    : String
├── Schutzbedarf_C      : Enum            (normal | hoch | sehr hoch)
├── Schutzbedarf_I      : Enum            (normal | hoch | sehr hoch)
├── Schutzbedarf_A      : Enum            (normal | hoch | sehr hoch)
├── Schadensbewertungen : List<Schadensbewertung>
└── Status              : Enum            (offen | abgeschlossen)
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Schutzbedarf vollständig erfasst**

```
Given  die Anwendung "Personalverwaltung" ist in der Strukturanalyse erfasst
  and  alle Schadensszenarien wurden für C, I und A bewertet
When   der ISB die Schutzbedarfsfeststellung für diese Anwendung abschließt
Then   wird der Gesamtschutzbedarf je Grundwert als Maximum aller Szenariobewertungen berechnet
  and  das Ergebnis wird in der Schutzbedarfstabelle angezeigt
  and  der Status der Anwendung wechselt auf "abgeschlossen"
```

**Negativtest – Fachabteilung nicht einbezogen**

```
Given  der ISB bewertet eine Anwendung ohne Einbindung der Prozessverantwortlichen
When   er versucht, die Bewertung abzuschließen
Then   erscheint eine Warnung:
       "Bitte bestätigen Sie, dass die Fachabteilung in die Bewertung einbezogen wurde."
```

**Negativtest – Nicht alle Schadensszenarien bewertet**

```
Given  für die Anwendung "Lagerverwaltung" fehlt die Bewertung des Grundwerts "Verfügbarkeit"
When   der ISB die Schutzbedarfsfeststellung abschließen möchte
Then   erscheint die Fehlermeldung:
       "Für alle drei Grundwerte (C, I, A) muss mindestens eine Bewertung vorliegen."
```

-----

## US-04: Schutzbedarf für IT-Systeme feststellen

### Titel (User Story Format)

> **Als** ISB  
> **möchte ich** den Schutzbedarf der IT-Systeme durch Vererbung vom Schutzbedarf der darauf betriebenen Anwendungen ableiten,  
> **damit** angemessene Sicherheitsmaßnahmen für die technische Infrastruktur definiert werden können.

-----

### Prozessbeschreibung / User Journey

1. Der ISB wählt ein IT-System aus der Strukturanalyse.
1. Er ermittelt alle Anwendungen, die auf diesem System betrieben werden.
1. Er wendet das Maximumprinzip an: Der höchste Schutzbedarf aller Anwendungen bestimmt den Schutzbedarf des Systems.
1. Er prüft, ob Kumulationseffekte (mehrere Anwendungen mit je normalem Bedarf ergeben gemeinsam hohen Bedarf) vorliegen.
1. Er prüft, ob Verteilungseffekte (Lastverteilung auf mehrere gleichwertige Systeme) die Verfügbarkeitsanforderungen reduzieren.
1. Das Ergebnis wird je Grundwert dokumentiert.

-----

### Datenmodell

```
Zielobjekt_IT_System
├── ID                   : String
├── Name                 : String          (z. B. "Server S1")
├── Typ                  : Enum            (Server | Client | Netz | ICS | IoT)
├── Anwendungen          : List<FK → Zielobjekt_Anwendung>
├── Schutzbedarf_C       : Enum            (normal | hoch | sehr hoch)
├── Schutzbedarf_I       : Enum            (normal | hoch | sehr hoch)
├── Schutzbedarf_A       : Enum            (normal | hoch | sehr hoch)
├── Vererbungsprinzip    : Enum            (Maximum | Kumulation | Verteilung)
├── Begründung           : Text
└── Status               : Enum            (offen | abgeschlossen)
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Maximumprinzip korrekt angewendet**

```
Given  auf Server "S4" läuft ausschließlich die Anwendung "Finanzbuchhaltung"
  and  die Anwendung hat den Schutzbedarf C=hoch, I=hoch, A=normal
When   der ISB das Vererbungsprinzip "Maximumprinzip" anwendet
Then   erhält Server S4 den Schutzbedarf C=hoch, I=hoch, A=normal
  and  das angewandte Vererbungsprinzip wird als "Maximumprinzip" dokumentiert
```

**Negativtest – IT-System nicht im Einsatz**

```
Given  ein IT-System ist als "nicht im Einsatz" markiert
When   der ISB versucht, eine Schutzbedarfsfeststellung dafür zu starten
Then   erscheint ein Hinweis:
       "Für nicht eingesetzte IT-Systeme ist keine Schutzbedarfsfeststellung erforderlich."
```

**Negativtest – Keine Anwendung zugeordnet**

```
Given  ein IT-System hat keine zugeordneten Anwendungen
When   der ISB die Schutzbedarfsfeststellung abschließen möchte
Then   erscheint die Fehlermeldung:
       "Dem IT-System muss mindestens eine Anwendung zugeordnet sein."
```

-----

## US-05: Schutzbedarf für Räume feststellen

### Titel (User Story Format)

> **Als** ISB  
> **möchte ich** den Schutzbedarf aller sicherheitsrelevanten Räume und Liegenschaften bestimmen,  
> **damit** angemessene physische Schutzmaßnahmen für die IT-Infrastruktur getroffen werden.

-----

### Prozessbeschreibung / User Journey

1. Der ISB ruft alle Räume aus der Strukturanalyse ab.
1. Er ermittelt, welche IT-Systeme und Datenträger sich in jedem Raum befinden.
1. Er wendet das Maximumprinzip an: Der höchste Schutzbedarf der dort vorhandenen Objekte bestimmt den Raum-Schutzbedarf.
1. Er prüft Kumulationseffekte: Befinden sich viele Objekte mit normalem Bedarf im Raum, kann der Gesamtschaden höher liegen.
1. Die Ergebnisse werden dokumentiert.

-----

### Datenmodell

```
Zielobjekt_Raum
├── ID                   : String
├── Bezeichnung          : String          (z. B. "Serverraum EG")
├── Standort             : String
├── IT_Systeme           : List<FK → Zielobjekt_IT_System>
├── Schutzbedarf_C       : Enum            (normal | hoch | sehr hoch)
├── Schutzbedarf_I       : Enum            (normal | hoch | sehr hoch)
├── Schutzbedarf_A       : Enum            (normal | hoch | sehr hoch)
├── Vererbungsprinzip    : Enum            (Maximum | Kumulation)
├── Begründung           : Text
└── Status               : Enum            (offen | abgeschlossen)
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Maximumprinzip für Raum**

```
Given  im Serverraum befinden sich die Server S1 (C=normal) und S4 (C=hoch)
When   der ISB die Schutzbedarfsfeststellung für den Raum abschließt
Then   erhält der Raum den Schutzbedarf C=hoch (Maximum)
  and  das Vererbungsprinzip wird als "Maximumprinzip" dokumentiert
```

**Negativtest – Raum ohne zugeordnete IT-Systeme**

```
Given  ein Raum hat keine IT-Systeme oder Datenträger zugeordnet
When   der ISB versucht, den Schutzbedarf abzuschließen
Then   erscheint eine Warnung:
       "Dem Raum sind keine IT-Systeme oder Datenträger zugeordnet. Bitte prüfen Sie die Strukturanalyse."
```

-----

## US-06: Vererbungsprinzip (Maximumprinzip) anwenden

### Titel (User Story Format)

> **Als** ISB  
> **möchte ich** das Maximumprinzip systemgestützt anwenden,  
> **damit** der höchste Schutzbedarf aller abhängigen Zielobjekte automatisch an übergeordnete Objekte vererbt wird.

-----

### Prozessbeschreibung / User Journey

1. Der ISB hat den Schutzbedarf für alle Anwendungen eines IT-Systems bewertet.
1. Das System berechnet für jeden Grundwert automatisch das Maximum.
1. Der ISB überprüft das Ergebnis und bestätigt oder begründet eine abweichende Einstufung.
1. Das Prinzip wird als Vererbungsregel in der Dokumentation vermerkt.

-----

### Datenmodell

```
Vererbungsregel
├── ID                   : String
├── Quellobjekte         : List<FK → Zielobjekt>
├── Zielobjekt           : FK → Zielobjekt
├── Prinzip              : Enum  (Maximum | Kumulation | Verteilung)
├── Grundwert            : Enum  (C | I | A)
├── Ergebnis_Kategorie   : Enum  (normal | hoch | sehr hoch)
└── Begründung           : Text
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Maximumprinzip automatisch berechnet**

```
Given  Server S4 hat die Anwendungen A1 (C=normal) und A2 (C=hoch) zugeordnet
When   der ISB das Maximumprinzip für Grundwert Vertraulichkeit anwendet
Then   wird C=hoch als Schutzbedarf für S4 berechnet und angezeigt
  and  die Vererbungsregel wird als "Maximumprinzip" gespeichert
```

**Negativtest – Kein Quellobjekt vorhanden**

```
Given  einem IT-System sind keine Anwendungen zugeordnet
When   der ISB das Maximumprinzip anwenden möchte
Then   erscheint die Fehlermeldung:
       "Das Maximumprinzip kann nicht angewendet werden: Keine Quellobjekte vorhanden."
```

-----

## US-07: Kumulationseffekt berücksichtigen

### Titel (User Story Format)

> **Als** ISB  
> **möchte ich** Kumulationseffekte bei der Schutzbedarfsfeststellung erkennen und dokumentieren,  
> **damit** ein erhöhter Gesamtschaden durch das Zusammenwirken mehrerer Einzelschäden korrekt abgebildet wird.

-----

### Prozessbeschreibung / User Journey

1. Der ISB prüft, ob auf einem IT-System oder in einem Raum mehrere Objekte mit je „normalem” Schutzbedarf vorhanden sind.
1. Er bewertet, ob die Summe der Einzelschäden den Schwellwert zur nächsten Kategorie überschreitet.
1. Falls ja, stuft er den Schutzbedarf des Zielobjekts um eine Kategorie höher ein.
1. Die Begründung des Kumulationseffekts wird dokumentiert.

-----

### Datenmodell

```
Kumulationseffekt
├── ID                   : String
├── Zielobjekt           : FK → Zielobjekt
├── Betroffene_Objekte   : List<FK → Zielobjekt>
├── Grundwert            : Enum  (C | I | A)
├── Schutzbedarf_Einzel  : Enum  (normal | hoch | sehr hoch)
├── Schutzbedarf_Kumuliert: Enum (normal | hoch | sehr hoch)
└── Begründung           : Text
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Kumulation korrekt erkannt**

```
Given  auf einem Server laufen fünf Anwendungen, jede mit A=normal
  and  der ISB bewertet, dass der Gesamtausfall aller fünf Anwendungen
       einen Schaden im Bereich "hoch" verursacht
When   der ISB den Kumulationseffekt dokumentiert
Then   wird der Schutzbedarf des Servers für A auf "hoch" erhöht
  and  die Begründung wird gespeichert
```

**Negativtest – Kumulation ohne ausreichende Begründung**

```
Given  der ISB erhöht den Schutzbedarf aufgrund von Kumulation
When   die Begründung fehlt oder weniger als 20 Zeichen enthält
Then   erscheint die Fehlermeldung:
       "Bitte begründen Sie den Kumulationseffekt ausführlich."
```

-----

## US-08: Verteilungseffekt berücksichtigen

### Titel (User Story Format)

> **Als** ISB  
> **möchte ich** Verteilungseffekte bei lastverteilten IT-Systemen berücksichtigen,  
> **damit** die Verfügbarkeitsanforderungen einzelner Systeme nicht unnötig hoch angesetzt werden.

-----

### Prozessbeschreibung / User Journey

1. Der ISB identifiziert Anwendungen, die auf mehreren gleichwertigen Systemen im Lastverbund betrieben werden.
1. Er prüft, ob der Ausfall eines einzelnen Systems zum Ausfall der Anwendung führt.
1. Ist dies nicht der Fall, kann der Schutzbedarf für Verfügbarkeit der einzelnen Systeme geringer als der der Anwendung sein.
1. Vertraulichkeit und Integrität werden weiterhin 1:1 vererbt.
1. Der Verteilungseffekt wird mit Begründung dokumentiert.

-----

### Datenmodell

```
Verteilungseffekt
├── ID                   : String
├── Anwendung            : FK → Zielobjekt_Anwendung
├── IT_Systeme           : List<FK → Zielobjekt_IT_System>
├── Ausfallsicher        : Boolean       (true = kein Einzelausfall führt zu Anwendungsausfall)
├── Schutzbedarf_A_Anwendung : Enum      (normal | hoch | sehr hoch)
├── Schutzbedarf_A_System    : Enum      (normal | hoch | sehr hoch)
└── Begründung           : Text
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Verfügbarkeit korrekt reduziert**

```
Given  Anwendung A1 läuft lastverteilt auf Servern S1, S2, S3
  and  jeder Server kann die anderen bei Ausfall vertreten
  and  der Schutzbedarf A1 für Verfügbarkeit = "hoch"
When   der ISB den Verteilungseffekt dokumentiert
Then   wird der Verfügbarkeits-Schutzbedarf der Server S1, S2, S3 auf "normal" gesetzt
  and  Vertraulichkeit und Integrität bleiben auf dem Wert der Anwendung
```

**Negativtest – Einzelausfall führt zum Anwendungsausfall**

```
Given  ein Server ist das einzige System, das eine Anwendung betreibt
When   der ISB versucht, den Verteilungseffekt anzuwenden
Then   erscheint die Fehlermeldung:
       "Verteilungseffekt nicht anwendbar: Einzelausfall führt zum Anwendungsausfall."
```

-----

## US-09: Schutzbedarfsfeststellung dokumentieren und begründen

### Titel (User Story Format)

> **Als** ISB  
> **möchte ich** alle Schutzbedarfsfeststellungen revisionssicher dokumentieren und begründen,  
> **damit** Entscheidungen für Dritte (Management, Auditoren, Nachfolger) nachvollziehbar sind.

-----

### Prozessbeschreibung / User Journey

1. Der ISB schließt die Schutzbedarfsbewertung für alle Zielobjekte ab.
1. Das System generiert automatisch eine Schutzbedarfstabelle mit allen Zielobjekten, Grundwerten und Kategorien.
1. Jede Einstufung enthält eine Begründung, das angewandte Vererbungsprinzip und den Bewerter.
1. Der ISB exportiert die Dokumentation als PDF oder in das Sicherheitskonzept.
1. Das Management zeichnet die Schutzbedarfsfeststellung ab.

-----

### Datenmodell

```
Schutzbedarfsdokumentation
├── ID                   : String
├── Informationsverbund  : String
├── Erstellungsdatum     : Date
├── Erstellt_von         : String
├── Freigabe_Management  : Boolean
├── Freigabedatum        : Date
├── Zielobjekte          : List<Zielobjekt> (Anwendungen, IT-Systeme, Räume, Netze)
└── Version              : String

Zielobjekt (zusammengefasst)
├── ID / Name / Typ
├── Schutzbedarf_C / I / A
├── Vererbungsprinzip
├── Begründung
└── Sondereffekte        : List<Enum> (Kumulation | Verteilung)
```

-----

### Akzeptanztests (Given-When-Then)

**Happy Path – Vollständige Dokumentation exportiert**

```
Given  alle Zielobjekte des Informationsverbunds haben einen abgeschlossenen Schutzbedarf
  and  alle Einstufungen sind begründet
When   der ISB die Schutzbedarfsdokumentation exportiert
Then   wird ein vollständiges Dokument erzeugt
  and  es enthält alle Zielobjekte mit Grundwerten, Kategorien, Begründungen und Vererbungsprinzipien
  and  eine Zusammenfassung der Objekte mit erhöhtem Schutzbedarf (hoch / sehr hoch) ist enthalten
```

**Negativtest – Offene Bewertungen vorhanden**

```
Given  drei IT-Systeme haben den Status "offen"
When   der ISB die Gesamtdokumentation abschließen möchte
Then   erscheint die Fehlermeldung:
       "Es sind noch 3 Zielobjekte mit offenem Schutzbedarf vorhanden. Bitte schließen Sie alle Bewertungen ab."
```

**Negativtest – Fehlende Management-Freigabe**

```
Given  die Dokumentation ist vollständig befüllt
  and  die Management-Freigabe fehlt
When   die Dokumentation als "final" markiert werden soll
Then   erscheint ein Hinweis:
       "Die Schutzbedarfsfeststellung muss durch das Management freigegeben werden."
  and  der Status bleibt auf "Entwurf"
```

-----

## Anhang: Glossar

|Begriff                    |Definition                                                                                             |
|---------------------------|-------------------------------------------------------------------------------------------------------|
|**Schutzbedarf**           |Maß für den erforderlichen Schutz eines Zielobjekts bzgl. Vertraulichkeit, Integrität und Verfügbarkeit|
|**Schutzbedarfskategorien**|normal / hoch / sehr hoch (gemäß BSI-Standard 200-2)                                                   |
|**Schadensszenario**       |Kategorisierter Schadenstyp (z. B. finanziell, rechtlich, persönliche Unversehrtheit)                  |
|**Maximumprinzip**         |Der höchste Schutzbedarf aller abhängigen Objekte wird übernommen                                      |
|**Kumulationseffekt**      |Summe von Einzelschäden führt zu einem höheren Gesamtschaden                                           |
|**Verteilungseffekt**      |Lastverteilung auf mehrere Systeme reduziert den Verfügbarkeitsbedarf je System                        |
|**Informationsverbund**    |Gesamtheit der betrachteten Geschäftsprozesse, IT-Systeme, Netze und Räume                             |
|**C / I / A**              |Confidentiality (Vertraulichkeit) / Integrity (Integrität) / Availability (Verfügbarkeit)              |
|**ISB**                    |Informationssicherheitsbeauftragter                                                                    |
|**BSI-Standard 200-2**     |IT-Grundschutz-Methodik des Bundesamts für Sicherheit in der Informationstechnik                       |

---

## Implementierungsplan

### Module

**Modul: `src/schutzbedarfsfeststellung/`**

- `repositories.js` – CRUD für schutzbedarf_kategorie, schadensbewertung, schutzbedarf_ergebnis.
- `services.js` – Geschäftslogik:
  - Schutzbedarfskategorien definieren (Pflicht: Konkretisierung muss ausgefüllt sein)
  - Schadensbewertung speichern (Begründung Pflichtfeld)
  - Schutzbedarf berechnen: Maximumprinzip über alle Bewertungen je Grundwert
  - Kumulationseffekt: erhöht Schutzbedarf um eine Stufe mit ausreichender Begründung (≥20 Zeichen)
  - Verteilungseffekt: reduziert Verfügbarkeits-Schutzbedarf wenn Ausfallsicherheit gegeben
  - Vollständigkeitsprüfung: alle drei Grundwerte (C, I, A) müssen bewertet sein
  - Status-Übergang: offen → abgeschlossen
- `adapter.js` – Delegiert an Services mit DB-Instanz.

### Abhängigkeiten

- Baut auf strukturanalyse-Schema auf (informationsverbund-Tabelle muss existieren).
- zielobjekt_id/zielobjekt_typ referenzieren strukturanalyse-Objekte (lose Kopplung via TEXT).

### Schlüsselentscheidungen

1. schutzbedarf_ergebnis speichert das berechnete Maximum aller schadensbewertungen je Zielobjekt.
2. Vererbungsprinzip wird explizit im Ergebnis-Datensatz gespeichert.
3. Kumulationseffekt erfordert Mindestbegründung (20 Zeichen) für Audit-Qualität.
4. Verteilungseffekt nur anwendbar wenn System nicht Single-Point-of-Failure.

### Akzeptanztest-Strategie

- US-01: Kategorie definieren (happy path, fehlende Konkretisierung)
- US-02: Schadensbewertung (happy path, fehlende Begründung)
- US-03: Schutzbedarf für Anwendung (happy path – Maximum berechnet, fehlende Bewertung)
- US-04: Schutzbedarf für IT-System via Maximumprinzip (happy path, kein System im Einsatz)
- US-06: Maximumprinzip automatisch berechnet
- US-07: Kumulationseffekt dokumentiert (happy path, unzureichende Begründung)
- US-08: Verteilungseffekt (happy path, Single-Point-of-Failure)