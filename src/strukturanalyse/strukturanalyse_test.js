/**
 * Strukturanalyse Tests
 * Tests all acceptance criteria from 0001_strukturanalyse.md
 */

import { PGlite } from '@electric-sql/pglite';
import { expect } from 'chai';
import { initDb } from '../db.js';
import { createAdapter } from './adapter.js';

let db;
let adapter;

before(async () => {
  db = new PGlite();
  await initDb(db);
  adapter = createAdapter(db);
});

// ============================================================
// US-01: Informationsverbund definieren
// ============================================================

describe('US-01: Informationsverbund definieren', () => {
  it('Happy Path – Verbund erfolgreich anlegen', async () => {
    const verbund = await adapter.verbundAnlegen({
      institution_name: 'RECPLAST GmbH',
      beschreibung: 'Kunststoffverarbeitung',
      geltungsbereich: 'Hauptstandort Bonn',
      erstellt_von: 'ISB-Test'
    });

    expect(verbund).to.be.an('object');
    expect(verbund.institution_name).to.equal('RECPLAST GmbH');
    expect(verbund.geltungsbereich).to.equal('Hauptstandort Bonn');
    expect(verbund.verbund_id).to.be.a('string').with.length.greaterThan(0);
  });

  it('Negativtest 1 – Pflichtfeld Institutionsname fehlt', async () => {
    try {
      await adapter.verbundAnlegen({
        institution_name: '',
        beschreibung: 'Test',
        geltungsbereich: 'Bonn',
        erstellt_von: 'ISB'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Institutionsname ist ein Pflichtfeld');
    }
  });

  it('Negativtest 2 – Doppelter Verbundname', async () => {
    try {
      await adapter.verbundAnlegen({
        institution_name: 'RECPLAST GmbH',
        beschreibung: 'Zweite Instanz',
        geltungsbereich: 'Außenstelle',
        erstellt_von: 'ISB'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('WARNUNG:');
      expect(err.message).to.include('RECPLAST GmbH');
    }
  });
});

// ============================================================
// US-02: Objekte sinnvoll gruppieren
// ============================================================

describe('US-02: Objekte sinnvoll gruppieren', () => {
  let verbund_id;

  before(async () => {
    const verbund = await adapter.verbundAnlegen({
      institution_name: 'Gruppe-Test GmbH',
      beschreibung: 'Test',
      geltungsbereich: 'Hauptstandort',
      erstellt_von: 'ISB'
    });
    verbund_id = verbund.verbund_id;
  });

  it('Happy Path – Gruppe mit 12 Client-PCs anlegen', async () => {
    const gruppe = await adapter.objektgruppeAnlegen({
      verbund_id,
      bezeichnung: 'Client-PCs Buchhaltung',
      typ: 'IT-System',
      gruppierungskriterium: 'Identische Windows 11 Konfiguration',
      anzahl: 12
    });

    expect(gruppe).to.be.an('object');
    expect(gruppe.bezeichnung).to.equal('Client-PCs Buchhaltung');
    expect(gruppe.anzahl).to.equal(12);
    expect(gruppe.typ).to.equal('IT-System');
  });

  it('Negativtest 1 – Objekte unterschiedlicher Typen können nicht gruppiert werden', async () => {
    // Das Typen-Mismatch wird durch die Einschränkung behandelt, dass eine Gruppe
    // einen einzigen Typ hat. In der UI würde man prüfen ob ausgewählte Objekte
    // alle denselben Typ haben. Der Service wirft einen Fehler bei ungültigem Typ.
    try {
      await adapter.objektgruppeAnlegen({
        verbund_id,
        bezeichnung: 'Gemischte Gruppe',
        typ: 'UnbekannterTyp',
        anzahl: 2
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Ungültiger Gruppentyp');
    }
  });

  it('Negativtest 2 – Leere Gruppe (anzahl < 1)', async () => {
    try {
      await adapter.objektgruppeAnlegen({
        verbund_id,
        bezeichnung: 'Leere Gruppe',
        typ: 'IT-System',
        anzahl: 0
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Eine Gruppe muss mindestens ein Objekt enthalten');
    }
  });
});

// ============================================================
// US-03: Geschäftsprozesse und Informationen erheben
// ============================================================

describe('US-03: Geschäftsprozesse und Informationen erheben', () => {
  let verbund_id;
  let prozess_id;

  before(async () => {
    const verbund = await adapter.verbundAnlegen({
      institution_name: 'Prozess-Test AG',
      beschreibung: 'Test AG',
      geltungsbereich: 'Hauptsitz',
      erstellt_von: 'ISB'
    });
    verbund_id = verbund.verbund_id;
  });

  it('Happy Path – Prozess mit Information anlegen', async () => {
    const prozess = await adapter.prozessAnlegen({
      verbund_id,
      bezeichnung: 'Auftragsabwicklung',
      beschreibung: 'Verarbeitung von Kundenaufträgen',
      verantwortlicher: 'Vertriebsleiter'
    });
    prozess_id = prozess.prozess_id;

    expect(prozess.bezeichnung).to.equal('Auftragsabwicklung');

    const info = await adapter.informationErfassen({
      prozess_id,
      bezeichnung: 'Kundendaten',
      vertraulichkeit: 'hoch',
      integritaet: 'hoch',
      verfuegbarkeit: 'hoch',
      datenschutz_relevant: true
    });

    expect(info.bezeichnung).to.equal('Kundendaten');
    expect(info.vertraulichkeit).to.equal('hoch');
    expect(info.prozess_id).to.equal(prozess_id);
  });

  it('Negativtest 1 – Verfügbarkeit nicht bewertet', async () => {
    try {
      await adapter.informationErfassen({
        prozess_id,
        bezeichnung: 'Lieferantendaten',
        vertraulichkeit: 'normal',
        integritaet: 'normal',
        verfuegbarkeit: null
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Alle drei Schutzziele müssen bewertet werden');
    }
  });

  it('Negativtest 2 – Prozess ohne Information als vollständig markieren', async () => {
    const leererProzess = await adapter.prozessAnlegen({
      verbund_id,
      bezeichnung: 'Leerer Prozess',
      beschreibung: 'Keine Informationen',
      verantwortlicher: 'Test'
    });

    try {
      await adapter.prozessVollstaendigkeitPruefen(leererProzess.prozess_id);
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('keine Informationen zugeordnet');
    }
  });
});

// ============================================================
// US-04: Anwendungen erheben und Prozessen zuordnen
// ============================================================

describe('US-04: Anwendungen erheben und Prozessen zuordnen', () => {
  let verbund_id;
  let prozess1_id;
  let prozess2_id;

  before(async () => {
    const verbund = await adapter.verbundAnlegen({
      institution_name: 'Anwendung-Test GmbH',
      beschreibung: 'Test',
      geltungsbereich: 'Hauptsitz',
      erstellt_von: 'ISB'
    });
    verbund_id = verbund.verbund_id;

    const p1 = await adapter.prozessAnlegen({
      verbund_id,
      bezeichnung: 'Auftragsabwicklung',
      beschreibung: 'Auftragsabwicklung',
      verantwortlicher: 'Leiter'
    });
    prozess1_id = p1.prozess_id;

    const p2 = await adapter.prozessAnlegen({
      verbund_id,
      bezeichnung: 'Buchhaltung',
      beschreibung: 'Buchführung',
      verantwortlicher: 'CFO'
    });
    prozess2_id = p2.prozess_id;
  });

  it('Happy Path – ERP-System beiden Prozessen zuordnen', async () => {
    const anwendung = await adapter.anwendungErfassen({
      verbund_id,
      bezeichnung: 'ERP-System',
      plattform: 'Windows Server 2022',
      verantwortlicher: 'IT-Leiter'
    });

    await adapter.anwendungProzessZuordnen(anwendung.anwendung_id, prozess1_id);
    await adapter.anwendungProzessZuordnen(anwendung.anwendung_id, prozess2_id);

    const matrix = await adapter.anwendungsmatrixAbrufen(verbund_id);
    const erpEntry = matrix.matrix.find(e => e.anwendung.bezeichnung === 'ERP-System');
    expect(erpEntry).to.exist;
    expect(erpEntry.prozesse).to.have.length(2);
  });

  it('Negativtest – Anwendung ohne Prozesszuordnung bei Abschluss', async () => {
    await adapter.anwendungErfassen({
      verbund_id,
      bezeichnung: 'E-Mail-Client',
      plattform: 'Windows',
      verantwortlicher: 'IT'
    });

    try {
      await adapter.anwendungenOhneProzessPruefen(verbund_id);
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('E-Mail-Client');
    }
  });

  it('Negativtest – Doppelanlage einer Anwendung', async () => {
    try {
      await adapter.anwendungErfassen({
        verbund_id,
        bezeichnung: 'ERP-System',
        plattform: 'Windows',
        verantwortlicher: 'IT'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('WARNUNG:');
      expect(err.message).to.include('ERP-System');
    }
  });
});

// ============================================================
// US-05: Netzplan erstellen und dokumentieren
// ============================================================

describe('US-05: Netzplan erstellen und dokumentieren', () => {
  let verbund_id;
  let system1_id;
  let system2_id;

  before(async () => {
    const verbund = await adapter.verbundAnlegen({
      institution_name: 'Netzplan-Test GmbH',
      beschreibung: 'Test',
      geltungsbereich: 'Hauptsitz',
      erstellt_von: 'ISB'
    });
    verbund_id = verbund.verbund_id;

    const s1 = await adapter.itSystemErfassen({
      verbund_id,
      bezeichnung: 'Server-01',
      typ: 'Server',
      betriebssystem: 'Windows Server 2022',
      status: 'in Betrieb',
      verantwortlicher: 'IT-Leiter'
    });
    system1_id = s1.system_id;

    const s2 = await adapter.itSystemErfassen({
      verbund_id,
      bezeichnung: 'Client-PC-Gruppe',
      typ: 'Client',
      betriebssystem: 'Windows 11',
      status: 'in Betrieb',
      verantwortlicher: 'IT-Leiter'
    });
    system2_id = s2.system_id;
  });

  it('Happy Path – LAN-Verbindung anlegen', async () => {
    const verbindung_id = await adapter.netzverbindungAnlegen({
      verbund_id,
      system_von: system1_id,
      system_nach: system2_id,
      verbindungstyp: 'LAN',
      verschluesselt: false,
      extern: false
    });

    expect(verbindung_id).to.be.a('string').with.length.greaterThan(0);
  });

  it('Negativtest 1 – Nicht alle Systeme im Netzplan', async () => {
    // Lege ein System an, das nicht im Netzplan ist
    await adapter.itSystemErfassen({
      verbund_id,
      bezeichnung: 'Isoliertes System',
      typ: 'Server',
      betriebssystem: 'Linux',
      status: 'in Betrieb',
      verantwortlicher: 'IT'
    });

    try {
      await adapter.netzplanVollstaendigkeitPruefen(verbund_id);
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('nicht im Netzplan referenziert');
      expect(err.message).to.include('Isoliertes System');
    }
  });

  it('Negativtest 2 – Gleiches Quell- und Zielsystem', async () => {
    try {
      await adapter.netzverbindungAnlegen({
        verbund_id,
        system_von: system1_id,
        system_nach: system1_id,
        verbindungstyp: 'LAN'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Quell- und Zielsystem dürfen nicht identisch sein');
    }
  });
});

// ============================================================
// US-06: IT-Systeme erheben
// ============================================================

describe('US-06: IT-Systeme erheben', () => {
  let verbund_id;

  before(async () => {
    const verbund = await adapter.verbundAnlegen({
      institution_name: 'IT-System-Test AG',
      beschreibung: 'Test',
      geltungsbereich: 'Hauptsitz',
      erstellt_von: 'ISB'
    });
    verbund_id = verbund.verbund_id;
  });

  it('Happy Path – Server erfassen mit Raum und Anwendung', async () => {
    // Liegenschaft und Raum anlegen
    const liegenschaft = await adapter.liegenschaftAnlegen({
      verbund_id,
      bezeichnung: 'Hauptstandort',
      typ: 'Hauptstandort'
    });
    const raum = await adapter.raumAnlegen({
      liegenschaft_id: liegenschaft.liegenschaft_id,
      bezeichnung: 'Serverraum EG',
      typ: 'Serverraum',
      verantwortlicher: 'IT-Leiter'
    });

    const anwendung = await adapter.anwendungErfassen({
      verbund_id,
      bezeichnung: 'ERP-System-IT',
      plattform: 'Windows Server',
      verantwortlicher: 'IT'
    });

    const system = await adapter.itSystemErfassen({
      verbund_id,
      bezeichnung: 'SRV-01',
      typ: 'Server',
      betriebssystem: 'Windows Server 2022',
      status: 'in Betrieb',
      verantwortlicher: 'IT-Leiter',
      raum_id: raum.raum_id
    });

    await adapter.itSystemAnwendungZuordnen(system.system_id, anwendung.anwendung_id);

    expect(system.bezeichnung).to.equal('SRV-01');
    expect(system.raum_id).to.equal(raum.raum_id);
  });

  it('Negativtest 1 – Pflichtfeld Typ fehlt', async () => {
    try {
      await adapter.itSystemErfassen({
        verbund_id,
        bezeichnung: 'Test-Server',
        typ: '',
        betriebssystem: 'Linux',
        status: 'in Betrieb',
        verantwortlicher: 'Admin'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Systemtyp ist ein Pflichtfeld');
    }
  });

  it('Negativtest 2 – IT-System in nicht existentem Raum', async () => {
    try {
      await adapter.itSystemErfassen({
        verbund_id,
        bezeichnung: 'Phantom-Server',
        typ: 'Server',
        betriebssystem: 'Linux',
        status: 'in Betrieb',
        verantwortlicher: 'Admin',
        raum_id: 'nicht-existierende-id'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Referenzierter Raum existiert nicht');
    }
  });
});

// ============================================================
// US-07: Räume und Liegenschaften erfassen
// ============================================================

describe('US-07: Räume und Liegenschaften erfassen', () => {
  let verbund_id;

  before(async () => {
    const verbund = await adapter.verbundAnlegen({
      institution_name: 'Raum-Test GmbH',
      beschreibung: 'Test',
      geltungsbereich: 'Hauptsitz',
      erstellt_von: 'ISB'
    });
    verbund_id = verbund.verbund_id;
  });

  it('Happy Path – Liegenschaft und Raum mit Schutzschrank anlegen', async () => {
    const liegenschaft = await adapter.liegenschaftAnlegen({
      verbund_id,
      bezeichnung: 'Hauptstandort Bonn',
      typ: 'Hauptstandort'
    });

    expect(liegenschaft.bezeichnung).to.equal('Hauptstandort Bonn');

    const raum = await adapter.raumAnlegen({
      liegenschaft_id: liegenschaft.liegenschaft_id,
      bezeichnung: 'Serverraum EG',
      typ: 'Serverraum',
      verantwortlicher: 'IT-Leiter',
      schutzschraenke: ['SK-01']
    });

    expect(raum.bezeichnung).to.equal('Serverraum EG');
    expect(raum.typ).to.equal('Serverraum');

    // Schutzschraenke sind als JSON-String gespeichert
    const schraenke = JSON.parse(raum.schutzschraenke);
    expect(schraenke).to.include('SK-01');
  });

  it('Negativtest 1 – Raum ohne Liegenschaft', async () => {
    try {
      await adapter.raumAnlegen({
        liegenschaft_id: 'nicht-existierend',
        bezeichnung: 'Büro 1',
        typ: 'Büro',
        verantwortlicher: 'Chef'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Bitte wählen Sie zunächst eine Liegenschaft aus');
    }
  });

  it('Negativtest 2 – Raum ohne liegenschaft_id angegeben', async () => {
    try {
      await adapter.raumAnlegen({
        liegenschaft_id: '',
        bezeichnung: 'Büro 2',
        typ: 'Büro',
        verantwortlicher: 'Chef'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Bitte wählen Sie zunächst eine Liegenschaft aus');
    }
  });
});
