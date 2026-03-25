/**
 * Schutzbedarfsfeststellung Tests
 * Tests all acceptance criteria from 0002_schutzbedarfsfeststellung.md
 */

import { PGlite } from '@electric-sql/pglite';
import { expect } from 'chai';
import { initDb } from '../db.js';
import { createAdapter as createStrukturAdapter } from '../strukturanalyse/adapter.js';
import { createAdapter } from './adapter.js';

let db;
let adapter;
let strukturAdapter;
let verbund_id;

before(async () => {
  db = new PGlite();
  await initDb(db);
  adapter = createAdapter(db);
  strukturAdapter = createStrukturAdapter(db);

  // Basis-Informationsverbund anlegen
  const verbund = await strukturAdapter.verbundAnlegen({
    institution_name: 'Schutzbedarfs-Test AG',
    beschreibung: 'Testverbund für Schutzbedarfsfeststellung',
    geltungsbereich: 'Gesamte Organisation',
    erstellt_von: 'ISB'
  });
  verbund_id = verbund.verbund_id;
});

// ============================================================
// US-01: Schutzbedarfskategorien definieren
// ============================================================

describe('US-01: Schutzbedarfskategorien definieren', () => {
  it('Happy Path – Kategorie erfolgreich definiert', async () => {
    const kategorie = await adapter.kategorieDefinieren({
      verbund_id,
      bezeichnung: 'hoch',
      schadensszenario: 'Beeinträchtigung der Aufgabenerfüllung',
      beschreibung: 'Erhebliche Beeinträchtigung der Aufgabenerfüllung',
      konkretisierung: 'Ausfallzeiten dürfen maximal 24 Stunden betragen',
      freigabe_datum: '2026-03-25'
    });

    expect(kategorie).to.be.an('object');
    expect(kategorie.bezeichnung).to.equal('hoch');
    expect(kategorie.konkretisierung).to.equal('Ausfallzeiten dürfen maximal 24 Stunden betragen');
    expect(kategorie.verbund_id).to.equal(verbund_id);
  });

  it('Negativtest – Kategorie ohne Konkretisierung', async () => {
    try {
      await adapter.kategorieDefinieren({
        verbund_id,
        bezeichnung: 'normal',
        schadensszenario: 'Finanzielle Auswirkungen',
        beschreibung: 'Geringe finanzielle Auswirkungen',
        konkretisierung: ''
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('konkretisieren');
    }
  });
});

// ============================================================
// US-02: Schadensszenarien bewerten
// ============================================================

describe('US-02: Schadensszenarien bewerten', () => {
  let anwendung_id;

  before(async () => {
    const anwendung = await strukturAdapter.anwendungErfassen({
      verbund_id,
      bezeichnung: 'Finanzbuchhaltung',
      plattform: 'SAP',
      verantwortlicher: 'CFO'
    });
    anwendung_id = anwendung.anwendung_id;
  });

  it('Happy Path – Bewertung vollständig und begründet', async () => {
    const bewertung = await adapter.schadensbewertungSpeichern({
      zielobjekt_id: anwendung_id,
      zielobjekt_typ: 'Anwendung',
      schadensszenario: 'Gesetz',
      grundwert: 'Vertraulichkeit',
      kategorie: 'hoch',
      begruendung: 'Verletzung handelsrechtlicher Aufbewahrungspflichten möglich',
      bewertet_von: 'ISB'
    });

    expect(bewertung).to.be.an('object');
    expect(bewertung.kategorie).to.equal('hoch');
    expect(bewertung.grundwert).to.equal('Vertraulichkeit');
    expect(bewertung.zielobjekt_id).to.equal(anwendung_id);
  });

  it('Negativtest – Bewertung ohne Begründung', async () => {
    try {
      await adapter.schadensbewertungSpeichern({
        zielobjekt_id: anwendung_id,
        zielobjekt_typ: 'Anwendung',
        schadensszenario: 'Finanziell',
        grundwert: 'Integrität',
        kategorie: 'sehr hoch',
        begruendung: '',
        bewertet_von: 'ISB'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Begründung ist für alle Schutzbedarfskategorien verpflichtend');
    }
  });
});

// ============================================================
// US-03: Schutzbedarf für Anwendungen berechnen (Maximumprinzip)
// ============================================================

describe('US-03: Schutzbedarf für Anwendungen feststellen', () => {
  let personalverwaltung_id;

  before(async () => {
    const anwendung = await strukturAdapter.anwendungErfassen({
      verbund_id,
      bezeichnung: 'Personalverwaltung',
      plattform: 'HR-System',
      verantwortlicher: 'HR-Leiter'
    });
    personalverwaltung_id = anwendung.anwendung_id;

    // Alle 6 Schadensszenarien für alle 3 Grundwerte bewerten
    const szenarien = ['Gesetz', 'Selbstbestimmung', 'Unversehrtheit', 'Aufgabenerfüllung', 'Finanziell', 'Außenwirkung'];
    for (const szenario of szenarien) {
      for (const gw of ['Vertraulichkeit', 'Integrität', 'Verfügbarkeit']) {
        await adapter.schadensbewertungSpeichern({
          zielobjekt_id: personalverwaltung_id,
          zielobjekt_typ: 'Anwendung',
          schadensszenario: szenario,
          grundwert: gw,
          kategorie: gw === 'Vertraulichkeit' ? 'hoch' : gw === 'Integrität' ? 'hoch' : 'normal',
          begruendung: `Bewertung für ${szenario} / ${gw}`,
          bewertet_von: 'ISB'
        });
      }
    }
  });

  it('Happy Path – Gesamtschutzbedarf als Maximum berechnet', async () => {
    const ergebnis = await adapter.schutzbedarfBerechnen(
      personalverwaltung_id,
      'Anwendung',
      'Maximumprinzip angewendet'
    );

    expect(ergebnis).to.be.an('object');
    expect(ergebnis.schutzbedarf_c).to.equal('hoch');
    expect(ergebnis.schutzbedarf_i).to.equal('hoch');
    expect(ergebnis.schutzbedarf_a).to.equal('normal');
    expect(ergebnis.vererbungsprinzip).to.equal('Maximum');
  });

  it('Happy Path – Status wechselt auf abgeschlossen', async () => {
    const ergebnis = await adapter.schutzbedarfAbschliessen(personalverwaltung_id);
    expect(ergebnis.status).to.equal('abgeschlossen');
  });

  it('Negativtest – Nicht alle Grundwerte bewertet', async () => {
    // Neue Anwendung ohne alle Grundwerte
    const anwendung = await strukturAdapter.anwendungErfassen({
      verbund_id,
      bezeichnung: 'Lagerverwaltung',
      plattform: 'WMS',
      verantwortlicher: 'Lagerleiter'
    });

    // Nur Vertraulichkeit bewerten, Integrität und Verfügbarkeit fehlen
    await adapter.schadensbewertungSpeichern({
      zielobjekt_id: anwendung.anwendung_id,
      zielobjekt_typ: 'Anwendung',
      schadensszenario: 'Finanziell',
      grundwert: 'Vertraulichkeit',
      kategorie: 'normal',
      begruendung: 'Geringe finanzielle Auswirkungen',
      bewertet_von: 'ISB'
    });

    try {
      await adapter.schutzbedarfBerechnen(anwendung.anwendung_id, 'Anwendung');
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Für alle drei Grundwerte (C, I, A) muss mindestens eine Bewertung vorliegen');
    }
  });
});

// ============================================================
// US-04/US-06: Schutzbedarf für IT-Systeme (Maximumprinzip)
// ============================================================

describe('US-04/US-06: Schutzbedarf für IT-Systeme feststellen', () => {
  let server_s4_id;
  let fibu_ergebnis;

  before(async () => {
    // IT-System anlegen
    const system = await strukturAdapter.itSystemErfassen({
      verbund_id,
      bezeichnung: 'Server S4',
      typ: 'Server',
      betriebssystem: 'Linux',
      status: 'in Betrieb',
      verantwortlicher: 'IT-Admin'
    });
    server_s4_id = system.system_id;

    // Finanzbuchhaltung Ergebnis - schon vorhanden aus US-02 setup
    // Erstelle neues Ergebnis-Objekt für Vererbungstest
    fibu_ergebnis = {
      schutzbedarf_c: 'hoch',
      schutzbedarf_i: 'hoch',
      schutzbedarf_a: 'normal'
    };
  });

  it('Happy Path – Maximumprinzip korrekt angewendet', async () => {
    const ergebnis = await adapter.itSystemSchutzbedarfVererben({
      system_id: server_s4_id,
      zielobjekt_typ: 'IT-System',
      anwendungsErgebnisse: [fibu_ergebnis],
      vererbungsprinzip: 'Maximum',
      begruendung: 'Maximumprinzip: Schutzbedarf von Finanzbuchhaltung vererbt'
    });

    expect(ergebnis.schutzbedarf_c).to.equal('hoch');
    expect(ergebnis.schutzbedarf_i).to.equal('hoch');
    expect(ergebnis.schutzbedarf_a).to.equal('normal');
    expect(ergebnis.vererbungsprinzip).to.equal('Maximum');
  });

  it('Negativtest – Keine Anwendungen zugeordnet', async () => {
    try {
      await adapter.itSystemSchutzbedarfVererben({
        system_id: server_s4_id,
        zielobjekt_typ: 'IT-System',
        anwendungsErgebnisse: [],
        vererbungsprinzip: 'Maximum'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('mindestens eine Anwendung zugeordnet sein');
    }
  });
});

// ============================================================
// US-07: Kumulationseffekt
// ============================================================

describe('US-07: Kumulationseffekt berücksichtigen', () => {
  let server_kum_id;

  before(async () => {
    const system = await strukturAdapter.itSystemErfassen({
      verbund_id,
      bezeichnung: 'Kumulations-Server',
      typ: 'Server',
      betriebssystem: 'Linux',
      status: 'in Betrieb',
      verantwortlicher: 'IT'
    });
    server_kum_id = system.system_id;

    // 5 Anwendungen mit normalem Schutzbedarf vererben
    const anwendungsErgebnisse = Array.from({ length: 5 }, () => ({
      schutzbedarf_c: 'normal',
      schutzbedarf_i: 'normal',
      schutzbedarf_a: 'normal'
    }));

    await adapter.itSystemSchutzbedarfVererben({
      system_id: server_kum_id,
      zielobjekt_typ: 'IT-System',
      anwendungsErgebnisse,
      vererbungsprinzip: 'Maximum',
      begruendung: 'Maximumprinzip initial'
    });
  });

  it('Happy Path – Kumulation korrekt erkannt und dokumentiert', async () => {
    const ergebnis = await adapter.kumulationseffektDokumentieren({
      zielobjekt_id: server_kum_id,
      zielobjekt_typ: 'IT-System',
      grundwert: 'Verfügbarkeit',
      begruendung: 'Gesamtausfall aller fünf Anwendungen verursacht Schaden im Bereich hoch',
      bewertet_von: 'ISB'
    });

    expect(ergebnis.schutzbedarf_a).to.equal('hoch'); // normal erhöht auf hoch
    expect(ergebnis.vererbungsprinzip).to.equal('Kumulation');
  });

  it('Negativtest – Kumulation ohne ausreichende Begründung', async () => {
    try {
      await adapter.kumulationseffektDokumentieren({
        zielobjekt_id: server_kum_id,
        zielobjekt_typ: 'IT-System',
        grundwert: 'Verfügbarkeit',
        begruendung: 'Zu kurz',
        bewertet_von: 'ISB'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('ausführlich');
    }
  });
});

// ============================================================
// US-08: Verteilungseffekt
// ============================================================

describe('US-08: Verteilungseffekt berücksichtigen', () => {
  let server_vert_id;

  before(async () => {
    const system = await strukturAdapter.itSystemErfassen({
      verbund_id,
      bezeichnung: 'Verteilungs-Server',
      typ: 'Server',
      betriebssystem: 'Linux',
      status: 'in Betrieb',
      verantwortlicher: 'IT'
    });
    server_vert_id = system.system_id;

    // Schutzbedarf mit hoher Verfügbarkeit
    await adapter.itSystemSchutzbedarfVererben({
      system_id: server_vert_id,
      zielobjekt_typ: 'IT-System',
      anwendungsErgebnisse: [{ schutzbedarf_c: 'hoch', schutzbedarf_i: 'hoch', schutzbedarf_a: 'hoch' }],
      vererbungsprinzip: 'Maximum',
      begruendung: 'Initial'
    });
  });

  it('Happy Path – Verfügbarkeit korrekt reduziert', async () => {
    const ergebnis = await adapter.verteilungseffektDokumentieren({
      zielobjekt_id: server_vert_id,
      zielobjekt_typ: 'IT-System',
      ausfallsicher: true,
      neue_verfuegbarkeit: 'normal',
      begruendung: 'System läuft lastverteilt auf 3 Servern; Einzelausfall hat keine Auswirkung',
      bewertet_von: 'ISB'
    });

    expect(ergebnis.schutzbedarf_a).to.equal('normal');
    expect(ergebnis.schutzbedarf_c).to.equal('hoch'); // unverändert
    expect(ergebnis.schutzbedarf_i).to.equal('hoch'); // unverändert
    expect(ergebnis.vererbungsprinzip).to.equal('Verteilung');
  });

  it('Negativtest – Einzelausfall führt zum Anwendungsausfall', async () => {
    try {
      await adapter.verteilungseffektDokumentieren({
        zielobjekt_id: server_vert_id,
        zielobjekt_typ: 'IT-System',
        ausfallsicher: false,
        begruendung: 'Nur ein Server',
        bewertet_von: 'ISB'
      });
      expect.fail('Sollte einen Fehler werfen');
    } catch (err) {
      expect(err.message).to.include('Einzelausfall führt zum Anwendungsausfall');
    }
  });
});
