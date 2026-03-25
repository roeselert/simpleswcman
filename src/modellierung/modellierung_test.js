/**
 * Modellierung Tests
 * Tests all acceptance criteria from 0003_modellierung.md (AT-01 through AT-08)
 */

import { PGlite } from '@electric-sql/pglite';
import { expect } from 'chai';
import { initDb } from '../db.js';
import { createAdapter as createStrukturAdapter } from '../strukturanalyse/adapter.js';
import { createAdapter as createSchutzbedarfAdapter } from '../schutzbedarfsfeststellung/adapter.js';
import { createAdapter } from './adapter.js';

let db;
let adapter;
let strukturAdapter;
let schutzbedarfAdapter;
let verbund_id;
let fileserver_id;
let webserver_id;

before(async () => {
  db = new PGlite();
  await initDb(db);
  adapter = createAdapter(db);
  strukturAdapter = createStrukturAdapter(db);
  schutzbedarfAdapter = createSchutzbedarfAdapter(db);

  // Standard-Bausteine initialisieren (simuliertes Kompendium)
  await adapter.standardBausteineInitialisieren();

  // Basis-Informationsverbund
  const verbund = await strukturAdapter.verbundAnlegen({
    institution_name: 'Modellierungs-Test GmbH',
    beschreibung: 'Testverbund für Modellierung',
    geltungsbereich: 'Gesamtes Unternehmen',
    erstellt_von: 'ISB'
  });
  verbund_id = verbund.verbund_id;

  // Zielobjekte anlegen
  const fileserver = await strukturAdapter.itSystemErfassen({
    verbund_id,
    bezeichnung: 'Fileserver',
    typ: 'Server',
    betriebssystem: 'Linux',
    status: 'in Betrieb',
    verantwortlicher: 'IT-Admin'
  });
  fileserver_id = fileserver.system_id;

  const webserver = await strukturAdapter.itSystemErfassen({
    verbund_id,
    bezeichnung: 'Webserver',
    typ: 'Server',
    betriebssystem: 'Linux',
    status: 'in Betrieb',
    verantwortlicher: 'IT-Admin'
  });
  webserver_id = webserver.system_id;
});

// ============================================================
// AT-01: Baustein einem Zielobjekt zuordnen
// ============================================================

describe('AT-01: Baustein einem Zielobjekt zuordnen', () => {
  it('Happy Path – Baustein SYS.1.1 dem Fileserver zuordnen', async () => {
    const eintrag = await adapter.bausteinZuordnen({
      verbund_id,
      zielobjekt_id: fileserver_id,
      baustein_id: 'SYS.1.1',
      anwendbar: true,
      begruendung: 'Allgemeiner Server-Baustein für Fileserver anwendbar',
      erstellt_von: 'ISB'
    });

    expect(eintrag).to.be.an('object');
    expect(eintrag.zielobjekt_id).to.equal(fileserver_id);
    expect(eintrag.baustein_id).to.equal('SYS.1.1');
    expect(eintrag.anwendbar).to.equal(1);

    // Eintrag erscheint in der Modellierungsübersicht
    const eintraege = await adapter.eintraegeByVerbundAbrufen(verbund_id);
    const gefunden = eintraege.find(e => e.zielobjekt_id === fileserver_id && e.baustein_id === 'SYS.1.1');
    expect(gefunden).to.exist;
  });
});

// ============================================================
// AT-02: Vollständige Modellierung → Prüfplan
// ============================================================

describe('AT-02: Vollständige Modellierung als Prüfplan', () => {
  before(async () => {
    // Weitere Bausteine für vollständige Modellierung zuordnen
    await adapter.bausteinZuordnen({
      verbund_id,
      zielobjekt_id: fileserver_id,
      baustein_id: 'ISMS.1',
      anwendbar: true,
      begruendung: 'Sicherheitsmanagement für alle Systeme relevant',
      erstellt_von: 'ISB'
    });

    await adapter.bausteinZuordnen({
      verbund_id,
      zielobjekt_id: fileserver_id,
      baustein_id: 'INF.2',
      anwendbar: true,
      begruendung: 'Server steht in Rechenzentrum',
      erstellt_von: 'ISB'
    });
  });

  it('Happy Path – Prüfplan für Bestandssysteme erstellen', async () => {
    const result = await adapter.dokumentationErstellen({
      verbund_id,
      verwendungszweck: 'Prüfplan',
      version: '1.0',
      erstellt_von: 'ISB',
      zielobjektStatus: [
        { zielobjekt_id: fileserver_id, hatSchutzbedarf: true }
      ]
    });

    expect(result.dokumentation).to.be.an('object');
    expect(result.dokumentation.verwendungszweck).to.equal('Prüfplan');
    expect(result.dokumentation.version).to.equal('1.0');
    expect(result.eintraege).to.have.length.greaterThan(0);
  });
});

// ============================================================
// AT-03: Anforderungsanpassung bei erhöhtem Schutzbedarf
// ============================================================

describe('AT-03: Anforderungsanpassung bei erhöhtem Schutzbedarf', () => {
  let eintrag_id;

  before(async () => {
    // NET.1.1 dem Fileserver zuordnen für Anpassungstest
    const eintrag = await adapter.bausteinZuordnen({
      verbund_id,
      zielobjekt_id: fileserver_id,
      baustein_id: 'NET.1.1',
      anwendbar: true,
      begruendung: 'Netzarchitektur relevant',
      erstellt_von: 'ISB'
    });
    eintrag_id = eintrag.eintrag_id;
  });

  it('Happy Path – Anforderungsanpassung mit Details gespeichert', async () => {
    const eintrag = await adapter.anforderungAnpassen(eintrag_id, {
      anpassung_details: 'Erhöhter Schutzbedarf C=sehr hoch: Zusätzliche Netzwerksegmentierung und Logging erforderlich',
      begruendung: 'Schutzbedarf sehr hoch erfordert Ergänzungen'
    });

    expect(eintrag.anforderung_angepasst).to.equal(1);
    expect(eintrag.anpassung_details).to.include('Netzwerksegmentierung');
  });
});

// ============================================================
// AT-04: Entwicklungskonzept für geplante Systeme
// ============================================================

describe('AT-04: Entwicklungskonzept für geplante Systeme', () => {
  let geplanter_server_id;

  before(async () => {
    // Geplantes System anlegen
    const system = await strukturAdapter.itSystemErfassen({
      verbund_id,
      bezeichnung: 'Geplanter Datenbank-Server',
      typ: 'Server',
      betriebssystem: 'PostgreSQL on Linux',
      status: 'in Planung',
      verantwortlicher: 'IT-Admin'
    });
    geplanter_server_id = system.system_id;

    await adapter.bausteinZuordnen({
      verbund_id,
      zielobjekt_id: geplanter_server_id,
      baustein_id: 'SYS.1.1',
      anwendbar: true,
      begruendung: 'Standard Server-Baustein für geplantes System',
      erstellt_von: 'ISB'
    });
  });

  it('Happy Path – Entwicklungskonzept mit Verwendungszweck gesetzt', async () => {
    const result = await adapter.dokumentationErstellen({
      verbund_id,
      verwendungszweck: 'Entwicklungskonzept',
      version: '1.0',
      erstellt_von: 'ISB',
      zielobjektStatus: [
        { zielobjekt_id: geplanter_server_id, hatSchutzbedarf: true }
      ]
    });

    expect(result.dokumentation.verwendungszweck).to.equal('Entwicklungskonzept');
    // Hinweis wäre in der UI zu zeigen; hier prüfen wir den Verwendungszweck
    expect(result.dokumentation.verwendungszweck).to.equal('Entwicklungskonzept');
  });
});

// ============================================================
// AT-05: Modellierung ohne Schutzbedarf nicht abschließbar
// ============================================================

describe('AT-05: Modellierung ohne Schutzbedarf nicht abschließbar', () => {
  it('Negativtest – Zielobjekte ohne Schutzbedarf verhindern Abschluss', async () => {
    try {
      await adapter.dokumentationErstellen({
        verbund_id,
        verwendungszweck: 'Prüfplan',
        version: '2.0',
        erstellt_von: 'ISB',
        zielobjektStatus: [
          { zielobjekt_id: fileserver_id, hatSchutzbedarf: true },
          { zielobjekt_id: 'datenbank-ohne-schutzbedarf', hatSchutzbedarf: false }
        ]
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('vollständigen Schutzbedarf');
    }
  });
});

// ============================================================
// AT-06: Ungültige Baustein-ID kann nicht zugeordnet werden
// ============================================================

describe('AT-06: Ungültige Baustein-ID', () => {
  it('Negativtest – Nicht-existierende Baustein-ID wird abgelehnt', async () => {
    try {
      await adapter.bausteinZuordnen({
        verbund_id,
        zielobjekt_id: fileserver_id,
        baustein_id: 'XYZ.9.9',
        anwendbar: true,
        begruendung: 'Test mit ungültigem Baustein',
        erstellt_von: 'ISB'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('XYZ.9.9');
      expect(err.message).to.include('nicht im IT-Grundschutz-Kompendium');
    }
  });
});

// ============================================================
// AT-07: Doppelte Baustein-Zielobjekt-Zuordnung verhindert
// ============================================================

describe('AT-07: Doppelte Baustein-Zielobjekt-Zuordnung verhindert', () => {
  before(async () => {
    // Webserver dem APP.3.2-Baustein zuordnen
    await adapter.bausteinZuordnen({
      verbund_id,
      zielobjekt_id: webserver_id,
      baustein_id: 'APP.3.2',
      anwendbar: true,
      begruendung: 'Webserver-Baustein für Webserver anwendbar',
      erstellt_von: 'ISB'
    });
  });

  it('Negativtest – Gleicher Baustein zweimal für gleiches Zielobjekt', async () => {
    try {
      await adapter.bausteinZuordnen({
        verbund_id,
        zielobjekt_id: webserver_id,
        baustein_id: 'APP.3.2',
        anwendbar: true,
        begruendung: 'Zweite Zuordnung des gleichen Bausteins',
        erstellt_von: 'ISB'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('bereits vorhanden');
    }
  });
});

// ============================================================
// AT-08: Anforderungsanpassung ohne Begründung nicht speicherbar
// ============================================================

describe('AT-08: Anforderungsanpassung ohne Begründung nicht speicherbar', () => {
  let eintrag_id;

  before(async () => {
    const eintrag = await adapter.bausteinZuordnen({
      verbund_id,
      zielobjekt_id: webserver_id,
      baustein_id: 'OPS.1.1.2',
      anwendbar: true,
      begruendung: 'IT-Administration für Webserver relevant',
      erstellt_von: 'ISB'
    });
    eintrag_id = eintrag.eintrag_id;
  });

  it('Negativtest – Anforderungsanpassung ohne anpassung_details abgelehnt', async () => {
    try {
      await adapter.anforderungAnpassen(eintrag_id, {
        anpassung_details: '',
        begruendung: 'Anpassung nötig'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Begründung für die Anpassung ist erforderlich');
    }
  });
});
