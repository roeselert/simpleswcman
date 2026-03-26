/**
 * Modellierung Services
 * Business logic for IT-Grundschutz modelling.
 * Each service manages its own database transaction.
 */

const randomUUID = globalThis.crypto?.randomUUID
  ? () => globalThis.crypto.randomUUID()
  : (await import('node:crypto')).randomUUID;
import { withTransaction, withReadTransaction } from '../db_transaction.js';
import {
  insertBaustein, findBausteinById, findAlleBausteine,
  insertModellierungseintrag, findEintragById, findEintragByZielobjektUndBaustein,
  findEintraegeByVerbund, findEintraegeByZielobjekt, updateModellierungseintrag,
  insertModellierungsdokumentation, findDokumentationById, findDokumentationenByVerbund
} from './repositories.js';

// ==================== Baustein (Kompendium-Referenz) ====================

/**
 * Legt einen Baustein im Kompendium an (Stammdaten, read-only für ISB).
 */
export async function bausteinAnlegen(db, data) {
  const { baustein_id, bezeichnung, schicht, anwendungstyp, kompendium_version } = data;

  if (!baustein_id || baustein_id.trim() === '') {
    throw new Error('Baustein-ID ist ein Pflichtfeld');
  }
  if (!bezeichnung || bezeichnung.trim() === '') {
    throw new Error('Bezeichnung ist ein Pflichtfeld');
  }

  const erlaubteSchichten = ['ISMS', 'ORP', 'CON', 'OPS', 'DER', 'APP', 'SYS', 'IND', 'NET', 'INF'];
  if (!schicht || !erlaubteSchichten.includes(schicht)) {
    throw new Error(`Ungültige Schicht: ${schicht}. Erlaubt: ${erlaubteSchichten.join(', ')}`);
  }

  const erlaubteTypen = ['Basis', 'Standard', 'erhöhter Schutzbedarf'];
  if (!anwendungstyp || !erlaubteTypen.includes(anwendungstyp)) {
    throw new Error(`Ungültiger Anwendungstyp: ${anwendungstyp}`);
  }

  return withTransaction(db, async (tx) => {
    await insertBaustein(tx, {
      baustein_id: baustein_id.trim(),
      bezeichnung: bezeichnung.trim(),
      schicht,
      anwendungstyp,
      kompendium_version: kompendium_version || '2023'
    });

    return findBausteinById(tx, baustein_id.trim());
  });
}

export async function bausteinAbrufen(db, baustein_id) {
  return withReadTransaction(db, (tx) => findBausteinById(tx, baustein_id));
}

export async function alleBausteineAbrufen(db) {
  return withReadTransaction(db, (tx) => findAlleBausteine(tx));
}

// ==================== Modellierungseintrag ====================

/**
 * AT-01: Baustein einem Zielobjekt zuordnen
 * Validiert: Baustein-ID muss existieren, keine Duplikate.
 */
export async function bausteinZuordnen(db, data) {
  const { verbund_id, zielobjekt_id, baustein_id, anwendbar, begruendung, erstellt_von } = data;

  if (!zielobjekt_id || zielobjekt_id.trim() === '') {
    throw new Error('Zielobjekt-ID ist ein Pflichtfeld');
  }
  if (!baustein_id || baustein_id.trim() === '') {
    throw new Error('Baustein-ID ist ein Pflichtfeld');
  }
  if (!begruendung || begruendung.trim() === '') {
    throw new Error('Begründung ist ein Pflichtfeld für den Modellierungseintrag');
  }

  return withTransaction(db, async (tx) => {
    // AT-06: Baustein muss im Kompendium vorhanden sein
    const baustein = await findBausteinById(tx, baustein_id.trim());
    if (!baustein) {
      throw new Error(`Baustein-ID ${baustein_id} nicht im IT-Grundschutz-Kompendium vorhanden.`);
    }

    // AT-07: Duplikat-Prüfung
    const existing = await findEintragByZielobjektUndBaustein(tx, zielobjekt_id.trim(), baustein_id.trim());
    if (existing) {
      throw new Error(`Dieser Baustein ist für das Zielobjekt bereits vorhanden.`);
    }

    const eintrag_id = randomUUID();
    const erstellt_am = new Date().toISOString();

    await insertModellierungseintrag(tx, {
      eintrag_id,
      verbund_id,
      zielobjekt_id: zielobjekt_id.trim(),
      baustein_id: baustein_id.trim(),
      anwendbar: anwendbar !== false,
      begruendung: begruendung.trim(),
      anforderung_angepasst: false,
      anpassung_details: '',
      erstellt_am,
      erstellt_von: erstellt_von || 'ISB'
    });

    return findEintragById(tx, eintrag_id);
  });
}

/**
 * AT-03/AT-08: Anforderungsanpassung aktivieren
 * anpassung_details muss ausgefüllt sein wenn anforderung_angepasst = true.
 */
export async function anforderungAnpassen(db, eintrag_id, data) {
  const { anpassung_details, begruendung } = data;

  // AT-08: Anpassungsdetails sind Pflichtfeld wenn Anpassung aktiviert
  if (!anpassung_details || anpassung_details.trim() === '') {
    throw new Error('Eine Begründung für die Anpassung ist erforderlich.');
  }

  return withTransaction(db, async (tx) => {
    const eintrag = await findEintragById(tx, eintrag_id);
    if (!eintrag) {
      throw new Error(`Modellierungseintrag ${eintrag_id} nicht gefunden`);
    }

    await updateModellierungseintrag(tx, eintrag_id, {
      anwendbar: eintrag.anwendbar,
      begruendung: begruendung || eintrag.begruendung,
      anforderung_angepasst: true,
      anpassung_details: anpassung_details.trim()
    });

    return findEintragById(tx, eintrag_id);
  });
}

export async function eintraegeByVerbundAbrufen(db, verbund_id) {
  return withReadTransaction(db, (tx) => findEintraegeByVerbund(tx, verbund_id));
}

export async function eintraegeByZielobjektAbrufen(db, zielobjekt_id) {
  return withReadTransaction(db, (tx) => findEintraegeByZielobjekt(tx, zielobjekt_id));
}

// ==================== Modellierungsdokumentation ====================

/**
 * AT-02: Vollständige Modellierung → Prüfplan erstellen
 * AT-04: Entwicklungskonzept für geplante Systeme
 *
 * @param {string} verwendungszweck - 'Prüfplan' oder 'Entwicklungskonzept'
 */
export async function dokumentationErstellen(db, data) {
  const { verbund_id, verwendungszweck, version, _erstellt_von, zielobjektStatus } = data;

  const erlaubteZwecke = ['Prüfplan', 'Entwicklungskonzept'];
  if (!verwendungszweck || !erlaubteZwecke.includes(verwendungszweck)) {
    throw new Error(`Ungültiger Verwendungszweck: ${verwendungszweck}. Erlaubt: ${erlaubteZwecke.join(', ')}`);
  }

  // AT-05: Alle Zielobjekte müssen vollständigen Schutzbedarf haben
  if (zielobjektStatus && zielobjektStatus.length > 0) {
    const ohneSchutzbedarf = zielobjektStatus.filter(z => !z.hatSchutzbedarf);
    if (ohneSchutzbedarf.length > 0) {
      throw new Error(
        'Nicht alle Zielobjekte haben einen vollständigen Schutzbedarf – Modellierung kann nicht abgeschlossen werden.'
      );
    }
  }

  return withTransaction(db, async (tx) => {
    const eintraege = await findEintraegeByVerbund(tx, verbund_id);
    if (eintraege.length === 0) {
      throw new Error('Keine Modellierungseinträge vorhanden. Bitte ordnen Sie zunächst Bausteine zu.');
    }

    const dok_id = randomUUID();
    await insertModellierungsdokumentation(tx, {
      dok_id,
      verbund_id,
      verwendungszweck,
      version: version || '1.0',
      freigegeben_am: null,
      freigegeben_von: null
    });

    const dok = await findDokumentationById(tx, dok_id);
    return { dokumentation: dok, eintraege };
  });
}

export async function dokumentationenAbrufen(db, verbund_id) {
  return withReadTransaction(db, (tx) => findDokumentationenByVerbund(tx, verbund_id));
}

/**
 * Hilfsmethode: Lädt Standard-Bausteine aus dem IT-Grundschutz-Kompendium
 * (simulierte Initialdaten für Tests).
 */
export async function standardBausteineInitialisieren(db) {
  const standardBausteine = [
    { baustein_id: 'ISMS.1', bezeichnung: 'Sicherheitsmanagement', schicht: 'ISMS', anwendungstyp: 'Basis', kompendium_version: '2023' },
    { baustein_id: 'ORP.1', bezeichnung: 'Organisation', schicht: 'ORP', anwendungstyp: 'Basis', kompendium_version: '2023' },
    { baustein_id: 'ORP.2', bezeichnung: 'Personal', schicht: 'ORP', anwendungstyp: 'Basis', kompendium_version: '2023' },
    { baustein_id: 'CON.1', bezeichnung: 'Kryptokonzept', schicht: 'CON', anwendungstyp: 'Standard', kompendium_version: '2023' },
    { baustein_id: 'OPS.1.1.2', bezeichnung: 'Ordnungsgemäße IT-Administration', schicht: 'OPS', anwendungstyp: 'Basis', kompendium_version: '2023' },
    { baustein_id: 'DER.1', bezeichnung: 'Detektion von sicherheitsrelevanten Ereignissen', schicht: 'DER', anwendungstyp: 'Standard', kompendium_version: '2023' },
    { baustein_id: 'APP.3.2', bezeichnung: 'Webserver', schicht: 'APP', anwendungstyp: 'Standard', kompendium_version: '2023' },
    { baustein_id: 'SYS.1.1', bezeichnung: 'Allgemeiner Server', schicht: 'SYS', anwendungstyp: 'Basis', kompendium_version: '2023' },
    { baustein_id: 'SYS.1.2', bezeichnung: 'Windows Server', schicht: 'SYS', anwendungstyp: 'Standard', kompendium_version: '2023' },
    { baustein_id: 'SYS.2.1', bezeichnung: 'Allgemeiner Client', schicht: 'SYS', anwendungstyp: 'Basis', kompendium_version: '2023' },
    { baustein_id: 'NET.1.1', bezeichnung: 'Netzarchitektur und -design', schicht: 'NET', anwendungstyp: 'Basis', kompendium_version: '2023' },
    { baustein_id: 'NET.1.2', bezeichnung: 'Netzmanagement', schicht: 'NET', anwendungstyp: 'Standard', kompendium_version: '2023' },
    { baustein_id: 'INF.1', bezeichnung: 'Allgemeines Gebäude', schicht: 'INF', anwendungstyp: 'Basis', kompendium_version: '2023' },
    { baustein_id: 'INF.2', bezeichnung: 'Rechenzentrum sowie Serverraum', schicht: 'INF', anwendungstyp: 'Standard', kompendium_version: '2023' },
  ];

  return withTransaction(db, async (tx) => {
    for (const baustein of standardBausteine) {
      await insertBaustein(tx, baustein);
    }
    return standardBausteine.length;
  });
}
