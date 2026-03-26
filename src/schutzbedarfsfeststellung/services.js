/**
 * Schutzbedarfsfeststellung Services
 * Business logic for protection requirement assessment.
 * Each service manages its own database transaction.
 */

import { randomUUID } from 'crypto';
import { withTransaction, withReadTransaction } from '../db_transaction.js';
import {
  insertSchutzbedarfKategorie, findKategorieById, findKategorienByVerbund,
  insertSchadensbewertung, findBewertungById, findBewertungenByZielobjekt,
  upsertSchutzbedarfErgebnis, findErgebnisByZielobjekt, updateErgebnisStatus
} from './repositories.js';

// Schutzbedarf Stufen in aufsteigender Reihenfolge
const STUFEN = ['normal', 'hoch', 'sehr hoch'];

function maxStufe(stufen) {
  let max = 0;
  for (const s of stufen) {
    const idx = STUFEN.indexOf(s);
    if (idx > max) max = idx;
  }
  return STUFEN[max];
}

function erhoeheUmEineStufe(stufe) {
  const idx = STUFEN.indexOf(stufe);
  if (idx < STUFEN.length - 1) return STUFEN[idx + 1];
  return stufe;
}

// ==================== Schutzbedarfskategorien ====================

/**
 * US-01: Schutzbedarfskategorie definieren
 * Konkretisierung ist Pflichtfeld.
 */
export async function kategorieDefinieren(db, data) {
  const { verbund_id, bezeichnung, schadensszenario, beschreibung, konkretisierung, freigabe_datum } = data;

  if (!bezeichnung || !STUFEN.includes(bezeichnung)) {
    throw new Error(`Ungültige Bezeichnung: ${bezeichnung}. Erlaubt: ${STUFEN.join(', ')}`);
  }
  if (!schadensszenario || schadensszenario.trim() === '') {
    throw new Error('Schadensszenario ist ein Pflichtfeld');
  }
  if (!beschreibung || beschreibung.trim() === '') {
    throw new Error('Beschreibung ist ein Pflichtfeld');
  }
  if (!konkretisierung || konkretisierung.trim() === '') {
    throw new Error('Bitte konkretisieren Sie die Kategoriengrenzen für Ihre Institution.');
  }

  return withTransaction(db, async (tx) => {
    const kategorie_id = randomUUID();
    await insertSchutzbedarfKategorie(tx, {
      kategorie_id,
      bezeichnung,
      schadensszenario: schadensszenario.trim(),
      beschreibung: beschreibung.trim(),
      konkretisierung: konkretisierung.trim(),
      freigabe_datum: freigabe_datum || null,
      verbund_id
    });

    return findKategorieById(tx, kategorie_id);
  });
}

export async function kategorienAbrufen(db, verbund_id) {
  return withReadTransaction(db, (tx) => findKategorienByVerbund(tx, verbund_id));
}

// ==================== Schadensbewertung ====================

/**
 * US-02: Schadensszenario bewerten
 * Begründung ist immer Pflichtfeld.
 */
export async function schadensbewertungSpeichern(db, data) {
  const { zielobjekt_id, zielobjekt_typ, schadensszenario, grundwert, kategorie, begruendung, bewertet_von } = data;

  const erlaubteSchaeden = ['Gesetz', 'Selbstbestimmung', 'Unversehrtheit', 'Aufgabenerfüllung', 'Finanziell', 'Außenwirkung'];
  if (!schadensszenario || !erlaubteSchaeden.includes(schadensszenario)) {
    throw new Error(`Ungültiges Schadensszenario: ${schadensszenario}`);
  }

  const erlaubteGrundwerte = ['Vertraulichkeit', 'Integrität', 'Verfügbarkeit'];
  if (!grundwert || !erlaubteGrundwerte.includes(grundwert)) {
    throw new Error(`Ungültiger Grundwert: ${grundwert}`);
  }

  if (!kategorie || !STUFEN.includes(kategorie)) {
    throw new Error(`Ungültige Kategorie: ${kategorie}`);
  }

  if (!begruendung || begruendung.trim() === '') {
    throw new Error('Eine Begründung ist für alle Schutzbedarfskategorien verpflichtend.');
  }

  if (!bewertet_von || bewertet_von.trim() === '') {
    throw new Error('Bewertet-von ist ein Pflichtfeld');
  }

  return withTransaction(db, async (tx) => {
    const bewertung_id = randomUUID();
    const datum = new Date().toISOString().split('T')[0];

    await insertSchadensbewertung(tx, {
      bewertung_id,
      zielobjekt_id,
      zielobjekt_typ: zielobjekt_typ || 'Anwendung',
      schadensszenario,
      grundwert,
      kategorie,
      begruendung: begruendung.trim(),
      bewertet_von: bewertet_von.trim(),
      datum,
      status: 'offen'
    });

    return findBewertungById(tx, bewertung_id);
  });
}

// ==================== Schutzbedarf berechnen (Maximum) ====================

/**
 * US-03/US-06: Schutzbedarf berechnen via Maximumprinzip
 * Berechnet den maximalen Schutzbedarf über alle Bewertungen je Grundwert.
 */
export async function schutzbedarfBerechnen(db, zielobjekt_id, zielobjekt_typ, begruendung) {
  return withTransaction(db, async (tx) => {
    const bewertungen = await findBewertungenByZielobjekt(tx, zielobjekt_id);

    if (bewertungen.length === 0) {
      throw new Error('Das Maximumprinzip kann nicht angewendet werden: Keine Quellobjekte vorhanden.');
    }

    const grundwerte = new Set(bewertungen.map(b => b.grundwert));
    if (!grundwerte.has('Vertraulichkeit') || !grundwerte.has('Integrität') || !grundwerte.has('Verfügbarkeit')) {
      throw new Error('Für alle drei Grundwerte (C, I, A) muss mindestens eine Bewertung vorliegen.');
    }

    const c_werte = bewertungen.filter(b => b.grundwert === 'Vertraulichkeit').map(b => b.kategorie);
    const i_werte = bewertungen.filter(b => b.grundwert === 'Integrität').map(b => b.kategorie);
    const a_werte = bewertungen.filter(b => b.grundwert === 'Verfügbarkeit').map(b => b.kategorie);

    const schutzbedarf_c = maxStufe(c_werte);
    const schutzbedarf_i = maxStufe(i_werte);
    const schutzbedarf_a = maxStufe(a_werte);

    const ergebnis_id = randomUUID();
    await upsertSchutzbedarfErgebnis(tx, {
      ergebnis_id,
      zielobjekt_id,
      zielobjekt_typ,
      schutzbedarf_c,
      schutzbedarf_i,
      schutzbedarf_a,
      vererbungsprinzip: 'Maximum',
      begruendung: begruendung || 'Maximumprinzip automatisch angewendet',
      status: 'offen'
    });

    return findErgebnisByZielobjekt(tx, zielobjekt_id);
  });
}

/**
 * US-03: Schutzbedarf für Anwendung/Prozess abschließen
 */
export async function schutzbedarfAbschliessen(db, zielobjekt_id) {
  return withTransaction(db, async (tx) => {
    const ergebnis = await findErgebnisByZielobjekt(tx, zielobjekt_id);
    if (!ergebnis) {
      throw new Error('Kein Schutzbedarf-Ergebnis für dieses Zielobjekt vorhanden. Bitte berechnen Sie zuerst den Schutzbedarf.');
    }
    await updateErgebnisStatus(tx, zielobjekt_id, 'abgeschlossen');
    return findErgebnisByZielobjekt(tx, zielobjekt_id);
  });
}

export async function schutzbedarfAbrufen(db, zielobjekt_id) {
  return withReadTransaction(db, (tx) => findErgebnisByZielobjekt(tx, zielobjekt_id));
}

// ==================== US-07: Kumulationseffekt ====================

/**
 * Dokumentiert einen Kumulationseffekt und erhöht den Schutzbedarf um eine Stufe.
 * Begründung muss mindestens 20 Zeichen haben.
 */
export async function kumulationseffektDokumentieren(db, data) {
  const { zielobjekt_id, zielobjekt_typ, grundwert, begruendung, _bewertet_von } = data;

  if (!begruendung || begruendung.trim().length < 20) {
    throw new Error('Bitte begründen Sie den Kumulationseffekt ausführlich.');
  }

  const erlaubteGrundwerte = ['Vertraulichkeit', 'Integrität', 'Verfügbarkeit'];
  if (!grundwert || !erlaubteGrundwerte.includes(grundwert)) {
    throw new Error(`Ungültiger Grundwert: ${grundwert}`);
  }

  return withTransaction(db, async (tx) => {
    const ergebnis = await findErgebnisByZielobjekt(tx, zielobjekt_id);
    if (!ergebnis) {
      throw new Error('Kein Schutzbedarf-Ergebnis vorhanden. Bitte berechnen Sie zuerst den Schutzbedarf.');
    }

    let neues_c = ergebnis.schutzbedarf_c;
    let neues_i = ergebnis.schutzbedarf_i;
    let neues_a = ergebnis.schutzbedarf_a;

    if (grundwert === 'Vertraulichkeit') neues_c = erhoeheUmEineStufe(ergebnis.schutzbedarf_c);
    if (grundwert === 'Integrität') neues_i = erhoeheUmEineStufe(ergebnis.schutzbedarf_i);
    if (grundwert === 'Verfügbarkeit') neues_a = erhoeheUmEineStufe(ergebnis.schutzbedarf_a);

    await upsertSchutzbedarfErgebnis(tx, {
      ergebnis_id: ergebnis.ergebnis_id,
      zielobjekt_id,
      zielobjekt_typ,
      schutzbedarf_c: neues_c,
      schutzbedarf_i: neues_i,
      schutzbedarf_a: neues_a,
      vererbungsprinzip: 'Kumulation',
      begruendung: begruendung.trim(),
      status: ergebnis.status
    });

    return findErgebnisByZielobjekt(tx, zielobjekt_id);
  });
}

// ==================== US-08: Verteilungseffekt ====================

/**
 * Dokumentiert einen Verteilungseffekt.
 * Reduziert Verfügbarkeits-Schutzbedarf wenn Ausfallsicherheit gegeben.
 * Nur anwendbar wenn mehr als ein System betroffen (ausfallsicher = true).
 */
export async function verteilungseffektDokumentieren(db, data) {
  const { zielobjekt_id, zielobjekt_typ, ausfallsicher, neue_verfuegbarkeit, begruendung, _bewertet_von } = data;

  if (!ausfallsicher) {
    throw new Error('Verteilungseffekt nicht anwendbar: Einzelausfall führt zum Anwendungsausfall.');
  }

  if (!begruendung || begruendung.trim() === '') {
    throw new Error('Begründung ist für den Verteilungseffekt Pflichtfeld');
  }

  return withTransaction(db, async (tx) => {
    const ergebnis = await findErgebnisByZielobjekt(tx, zielobjekt_id);
    if (!ergebnis) {
      throw new Error('Kein Schutzbedarf-Ergebnis vorhanden.');
    }

    const neue_a = neue_verfuegbarkeit || 'normal';

    await upsertSchutzbedarfErgebnis(tx, {
      ergebnis_id: ergebnis.ergebnis_id,
      zielobjekt_id,
      zielobjekt_typ,
      schutzbedarf_c: ergebnis.schutzbedarf_c,
      schutzbedarf_i: ergebnis.schutzbedarf_i,
      schutzbedarf_a: neue_a,
      vererbungsprinzip: 'Verteilung',
      begruendung: begruendung.trim(),
      status: ergebnis.status
    });

    return findErgebnisByZielobjekt(tx, zielobjekt_id);
  });
}

// ==================== US-04: Schutzbedarf für IT-Systeme via Vererbung ====================

/**
 * Berechnet den Schutzbedarf eines IT-Systems durch Vererbung von Anwendungen.
 * Wendet Maximumprinzip über alle zugeordneten Anwendungs-Ergebnisse an.
 * @param {Array} anwendungsErgebnisse - Array von schutzbedarf_ergebnis Objekten der Anwendungen
 */
export async function itSystemSchutzbedarfVererben(db, data) {
  const { system_id, zielobjekt_typ, anwendungsErgebnisse, vererbungsprinzip, begruendung } = data;

  if (!anwendungsErgebnisse || anwendungsErgebnisse.length === 0) {
    throw new Error('Dem IT-System muss mindestens eine Anwendung zugeordnet sein.');
  }

  return withTransaction(db, async (tx) => {
    const c_werte = anwendungsErgebnisse.map(e => e.schutzbedarf_c);
    const i_werte = anwendungsErgebnisse.map(e => e.schutzbedarf_i);
    const a_werte = anwendungsErgebnisse.map(e => e.schutzbedarf_a);

    const schutzbedarf_c = maxStufe(c_werte);
    const schutzbedarf_i = maxStufe(i_werte);
    const schutzbedarf_a = maxStufe(a_werte);

    const ergebnis_id = randomUUID();
    await upsertSchutzbedarfErgebnis(tx, {
      ergebnis_id,
      zielobjekt_id: system_id,
      zielobjekt_typ: zielobjekt_typ || 'IT-System',
      schutzbedarf_c,
      schutzbedarf_i,
      schutzbedarf_a,
      vererbungsprinzip: vererbungsprinzip || 'Maximum',
      begruendung: begruendung || 'Vererbung vom Schutzbedarf der Anwendungen (Maximumprinzip)',
      status: 'offen'
    });

    return findErgebnisByZielobjekt(tx, system_id);
  });
}
