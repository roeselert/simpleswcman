/**
 * Strukturanalyse Services
 * Business logic for the strukturanalyse module.
 * Each service manages its own database transaction.
 */

const randomUUID = globalThis.crypto?.randomUUID
  ? () => globalThis.crypto.randomUUID()
  : (await import('node:crypto')).randomUUID;
import { withTransaction, withReadTransaction } from '../db_transaction.js';
import {
  insertVerbund, findVerbundByName, findVerbundById, findAllVerbund,
  insertObjektgruppe, findObjektgruppeById, findObjektgruppenByVerbund,
  insertGeschaeftsprozess, findProzessById, findProzessByVerbund,
  insertInformation, findInfoByProzess,
  insertAnwendung, findAnwendungByBezeichnung, findAnwendungById, findAnwendungByVerbund,
  insertAnwendungProzess, findProzesseByAnwendung, findAnwendungenOhneProzess,
  insertItSystem, findItSystemById, findItSystemByVerbund,
  insertItSystemAnwendung,
  insertLiegenschaft, findLiegenschaftById, findLiegenschaftenByVerbund,
  insertRaum, findRaumById, findRaeumeByLiegenschaft,
  insertNetzverbindung, findSystemeImNetzplan, findNetzverbindungenByVerbund
} from './repositories.js';

// ==================== Private validation helpers ====================
// These helpers operate within the caller's transaction – they do not start their own.

async function requireVerbund(tx, verbund_id) {
  const verbund = await findVerbundById(tx, verbund_id);
  if (!verbund) throw new Error(`Informationsverbund mit ID "${verbund_id}" nicht gefunden`);
  return verbund;
}

async function requireProzess(tx, prozess_id) {
  const prozess = await findProzessById(tx, prozess_id);
  if (!prozess) throw new Error(`Prozess mit ID "${prozess_id}" nicht gefunden`);
  return prozess;
}

// ==================== Informationsverbund ====================

/**
 * Legt einen neuen Informationsverbund an.
 * Wirft einen Fehler wenn Pflichtfelder fehlen.
 * Gibt eine Warnung zurück (als Error mit 'WARNUNG:'-Präfix) bei Dopplung.
 */
export async function verbundAnlegen(db, data) {
  const { institution_name, beschreibung, geltungsbereich, erstellt_von } = data;

  if (!institution_name || institution_name.trim() === '') {
    throw new Error('Institutionsname ist ein Pflichtfeld');
  }
  if (!beschreibung || beschreibung.trim() === '') {
    throw new Error('Beschreibung ist ein Pflichtfeld');
  }
  if (!geltungsbereich || geltungsbereich.trim() === '') {
    throw new Error('Geltungsbereich ist ein Pflichtfeld');
  }
  if (!erstellt_von || erstellt_von.trim() === '') {
    throw new Error('Erstellt-von ist ein Pflichtfeld');
  }

  return withTransaction(db, async (tx) => {
    const existing = await findVerbundByName(tx, institution_name.trim());
    if (existing.length > 0) {
      throw new Error(`WARNUNG: Ein Informationsverbund mit dem Namen "${institution_name}" existiert bereits. Bitte bestätigen Sie oder wählen Sie einen anderen Namen.`);
    }

    const verbund_id = randomUUID();
    const erstellt_am = new Date().toISOString();

    await insertVerbund(tx, {
      verbund_id,
      institution_name: institution_name.trim(),
      beschreibung: beschreibung.trim(),
      geltungsbereich: geltungsbereich.trim(),
      erstellt_am,
      erstellt_von: erstellt_von.trim()
    });

    return findVerbundById(tx, verbund_id);
  });
}

export async function alleVerbundeAbrufen(db) {
  return withReadTransaction(db, (tx) => findAllVerbund(tx));
}

export async function verbundAbrufen(db, verbund_id) {
  return withReadTransaction(db, (tx) => requireVerbund(tx, verbund_id));
}

// ==================== Objektgruppe ====================

/**
 * Legt eine Objektgruppe an.
 * Erfordert mindestens ein Mitglied (anzahl >= 1) und einen Typ.
 */
export async function objektgruppeAnlegen(db, data) {
  const { verbund_id, bezeichnung, typ, gruppierungskriterium, anzahl } = data;

  if (!bezeichnung || bezeichnung.trim() === '') {
    throw new Error('Bezeichnung der Gruppe ist ein Pflichtfeld');
  }
  if (!typ) {
    throw new Error('Typ der Gruppe ist ein Pflichtfeld');
  }
  const erlaubteTypen = ['IT-System', 'Anwendung', 'Raum', 'Kommunikationslink'];
  if (!erlaubteTypen.includes(typ)) {
    throw new Error(`Ungültiger Gruppentyp: ${typ}. Erlaubt: ${erlaubteTypen.join(', ')}`);
  }
  if (!anzahl || anzahl < 1) {
    throw new Error('Eine Gruppe muss mindestens ein Objekt enthalten');
  }

  return withTransaction(db, async (tx) => {
    await requireVerbund(tx, verbund_id);

    const gruppe_id = randomUUID();
    await insertObjektgruppe(tx, {
      gruppe_id,
      verbund_id,
      bezeichnung: bezeichnung.trim(),
      typ,
      gruppierungskriterium: gruppierungskriterium || '',
      anzahl
    });

    return findObjektgruppeById(tx, gruppe_id);
  });
}

export async function objektgruppenAbrufen(db, verbund_id) {
  return withReadTransaction(db, (tx) => findObjektgruppenByVerbund(tx, verbund_id));
}

// ==================== Geschäftsprozess ====================

export async function prozessAnlegen(db, data) {
  const { verbund_id, bezeichnung, beschreibung, verantwortlicher, org_einheiten, rechtl_vorgaben } = data;

  if (!bezeichnung || bezeichnung.trim() === '') {
    throw new Error('Bezeichnung des Prozesses ist ein Pflichtfeld');
  }
  if (!beschreibung || beschreibung.trim() === '') {
    throw new Error('Beschreibung des Prozesses ist ein Pflichtfeld');
  }
  if (!verantwortlicher || verantwortlicher.trim() === '') {
    throw new Error('Verantwortlicher ist ein Pflichtfeld');
  }

  return withTransaction(db, async (tx) => {
    await requireVerbund(tx, verbund_id);

    const prozess_id = randomUUID();
    await insertGeschaeftsprozess(tx, {
      prozess_id,
      verbund_id,
      bezeichnung: bezeichnung.trim(),
      beschreibung: beschreibung.trim(),
      verantwortlicher: verantwortlicher.trim(),
      org_einheiten: org_einheiten || [],
      rechtl_vorgaben: rechtl_vorgaben || ''
    });

    return findProzessById(tx, prozess_id);
  });
}

export async function prozessAbrufen(db, prozess_id) {
  return withReadTransaction(db, (tx) => requireProzess(tx, prozess_id));
}

export async function prozesseByVerbundAbrufen(db, verbund_id) {
  return withReadTransaction(db, (tx) => findProzessByVerbund(tx, verbund_id));
}

// ==================== Information ====================

export async function informationErfassen(db, data) {
  const { prozess_id, bezeichnung, vertraulichkeit, integritaet, verfuegbarkeit, datenschutz_relevant } = data;

  if (!bezeichnung || bezeichnung.trim() === '') {
    throw new Error('Bezeichnung der Information ist ein Pflichtfeld');
  }

  const erlaubteWerte = ['normal', 'hoch', 'sehr hoch'];
  if (!vertraulichkeit || !erlaubteWerte.includes(vertraulichkeit)) {
    throw new Error('Alle drei Schutzziele müssen bewertet werden');
  }
  if (!integritaet || !erlaubteWerte.includes(integritaet)) {
    throw new Error('Alle drei Schutzziele müssen bewertet werden');
  }
  if (!verfuegbarkeit || !erlaubteWerte.includes(verfuegbarkeit)) {
    throw new Error('Alle drei Schutzziele müssen bewertet werden');
  }

  return withTransaction(db, async (tx) => {
    await requireProzess(tx, prozess_id);

    const info_id = randomUUID();
    await insertInformation(tx, {
      info_id,
      prozess_id,
      bezeichnung: bezeichnung.trim(),
      vertraulichkeit,
      integritaet,
      verfuegbarkeit,
      datenschutz_relevant: datenschutz_relevant || false
    });

    const infos = await findInfoByProzess(tx, prozess_id);
    return infos.find(i => i.info_id === info_id);
  });
}

export async function informationenByProzessAbrufen(db, prozess_id) {
  return withReadTransaction(db, (tx) => findInfoByProzess(tx, prozess_id));
}

/**
 * Prüft ob ein Prozess vollständig ist (hat Informationen zugeordnet).
 * Gibt Warnung zurück wenn keine Informationen vorhanden.
 */
export async function prozessVollstaendigkeitPruefen(db, prozess_id) {
  return withReadTransaction(db, async (tx) => {
    const infos = await findInfoByProzess(tx, prozess_id);
    if (infos.length === 0) {
      throw new Error('Dem Prozess sind keine Informationen zugeordnet – bitte prüfen Sie die Vollständigkeit');
    }
    return { vollstaendig: true, anzahl_informationen: infos.length };
  });
}

// ==================== Anwendung ====================

export async function anwendungErfassen(db, data) {
  const { verbund_id, bezeichnung, beschreibung, plattform, verantwortlicher } = data;

  if (!bezeichnung || bezeichnung.trim() === '') {
    throw new Error('Bezeichnung der Anwendung ist ein Pflichtfeld');
  }
  if (!plattform || plattform.trim() === '') {
    throw new Error('Plattform ist ein Pflichtfeld');
  }
  if (!verantwortlicher || verantwortlicher.trim() === '') {
    throw new Error('Verantwortlicher ist ein Pflichtfeld');
  }

  return withTransaction(db, async (tx) => {
    await requireVerbund(tx, verbund_id);

    const existing = await findAnwendungByBezeichnung(tx, verbund_id, bezeichnung.trim());
    if (existing.length > 0) {
      throw new Error(`WARNUNG: Eine Anwendung mit dem Namen "${bezeichnung}" existiert bereits. Bitte bestätigen Sie oder wählen Sie einen anderen Namen.`);
    }

    const anwendung_id = randomUUID();
    await insertAnwendung(tx, {
      anwendung_id,
      verbund_id,
      bezeichnung: bezeichnung.trim(),
      beschreibung: beschreibung || '',
      plattform: plattform.trim(),
      verantwortlicher: verantwortlicher.trim()
    });

    return findAnwendungById(tx, anwendung_id);
  });
}

export async function anwendungProzessZuordnen(db, anwendung_id, prozess_id) {
  return withTransaction(db, async (tx) => {
    const anwendung = await findAnwendungById(tx, anwendung_id);
    if (!anwendung) throw new Error(`Anwendung ${anwendung_id} nicht gefunden`);
    await requireProzess(tx, prozess_id);
    await insertAnwendungProzess(tx, anwendung_id, prozess_id);
  });
}

export async function anwendungsmatrixAbrufen(db, verbund_id) {
  return withReadTransaction(db, async (tx) => {
    const anwendungen = await findAnwendungByVerbund(tx, verbund_id);
    const prozesse = await findProzessByVerbund(tx, verbund_id);

    const matrix = [];
    for (const anwendung of anwendungen) {
      const zugeordneteProzesse = await findProzesseByAnwendung(tx, anwendung.anwendung_id);
      matrix.push({
        anwendung,
        prozesse: zugeordneteProzesse
      });
    }
    return { anwendungen, prozesse, matrix };
  });
}

export async function anwendungenOhneProzessPruefen(db, verbund_id) {
  return withReadTransaction(db, async (tx) => {
    const ohneZuordnung = await findAnwendungenOhneProzess(tx, verbund_id);
    if (ohneZuordnung.length > 0) {
      const namen = ohneZuordnung.map(a => a.bezeichnung).join(', ');
      throw new Error(`Folgende Anwendungen sind keinem Geschäftsprozess zugeordnet: ${namen}`);
    }
    return { vollstaendig: true };
  });
}

// ==================== IT-System ====================

export async function itSystemErfassen(db, data) {
  const { verbund_id, bezeichnung, typ, betriebssystem, status, verantwortlicher, raum_id, gruppe_id } = data;

  if (!bezeichnung || bezeichnung.trim() === '') {
    throw new Error('Bezeichnung des IT-Systems ist ein Pflichtfeld');
  }
  if (!typ || typ.trim() === '') {
    throw new Error('Systemtyp ist ein Pflichtfeld');
  }
  const erlaubteTypen = ['Server', 'Client', 'Netzkomponente', 'Mobilgerät', 'ICS', 'Sonstiges'];
  if (!erlaubteTypen.includes(typ)) {
    throw new Error(`Ungültiger Systemtyp: ${typ}`);
  }
  if (!betriebssystem || betriebssystem.trim() === '') {
    throw new Error('Betriebssystem ist ein Pflichtfeld');
  }
  if (!status) {
    throw new Error('Status ist ein Pflichtfeld');
  }
  if (!verantwortlicher || verantwortlicher.trim() === '') {
    throw new Error('Verantwortlicher ist ein Pflichtfeld');
  }

  return withTransaction(db, async (tx) => {
    await requireVerbund(tx, verbund_id);

    if (raum_id) {
      const raum = await findRaumById(tx, raum_id);
      if (!raum) {
        throw new Error('Referenzierter Raum existiert nicht im System');
      }
    }

    const system_id = randomUUID();
    await insertItSystem(tx, {
      system_id,
      verbund_id,
      bezeichnung: bezeichnung.trim(),
      typ,
      betriebssystem: betriebssystem.trim(),
      status,
      verantwortlicher: verantwortlicher.trim(),
      raum_id: raum_id || null,
      gruppe_id: gruppe_id || null
    });

    return findItSystemById(tx, system_id);
  });
}

export async function itSystemAnwendungZuordnen(db, system_id, anwendung_id) {
  return withTransaction(db, async (tx) => {
    const system = await findItSystemById(tx, system_id);
    if (!system) throw new Error(`IT-System ${system_id} nicht gefunden`);
    const anwendung = await findAnwendungById(tx, anwendung_id);
    if (!anwendung) throw new Error(`Anwendung ${anwendung_id} nicht gefunden`);
    await insertItSystemAnwendung(tx, system_id, anwendung_id);
  });
}

export async function itSystemAbrufen(db, system_id) {
  return withReadTransaction(db, async (tx) => {
    const system = await findItSystemById(tx, system_id);
    if (!system) throw new Error(`IT-System ${system_id} nicht gefunden`);
    return system;
  });
}

export async function raumItSystemMatrixAbrufen(db, verbund_id) {
  return withReadTransaction(db, async (tx) => {
    const systeme = await findItSystemByVerbund(tx, verbund_id);
    const matrix = {};
    for (const system of systeme) {
      const raum_id = system.raum_id || 'ohne_raum';
      if (!matrix[raum_id]) matrix[raum_id] = [];
      matrix[raum_id].push(system);
    }
    return matrix;
  });
}

// ==================== Liegenschaft ====================

export async function liegenschaftAnlegen(db, data) {
  const { verbund_id, bezeichnung, typ } = data;

  if (!bezeichnung || bezeichnung.trim() === '') {
    throw new Error('Bezeichnung der Liegenschaft ist ein Pflichtfeld');
  }
  if (!typ) {
    throw new Error('Typ der Liegenschaft ist ein Pflichtfeld');
  }
  const erlaubteTypen = ['Hauptstandort', 'Außenstelle', 'RZ'];
  if (!erlaubteTypen.includes(typ)) {
    throw new Error(`Ungültiger Liegenschaftstyp: ${typ}`);
  }

  return withTransaction(db, async (tx) => {
    await requireVerbund(tx, verbund_id);

    const liegenschaft_id = randomUUID();
    await insertLiegenschaft(tx, { liegenschaft_id, verbund_id, bezeichnung: bezeichnung.trim(), typ });

    return findLiegenschaftById(tx, liegenschaft_id);
  });
}

export async function liegenschaftAbrufen(db, liegenschaft_id) {
  return withReadTransaction(db, async (tx) => {
    const liegenschaft = await findLiegenschaftById(tx, liegenschaft_id);
    if (!liegenschaft) throw new Error(`Liegenschaft ${liegenschaft_id} nicht gefunden`);
    return liegenschaft;
  });
}

// ==================== Raum ====================

export async function raumAnlegen(db, data) {
  const { liegenschaft_id, bezeichnung, typ, verantwortlicher, schutzschraenke } = data;

  if (!liegenschaft_id || liegenschaft_id.trim() === '') {
    throw new Error('Bitte wählen Sie zunächst eine Liegenschaft aus');
  }
  if (!bezeichnung || bezeichnung.trim() === '') {
    throw new Error('Bezeichnung des Raums ist ein Pflichtfeld');
  }
  if (!typ) {
    throw new Error('Typ des Raums ist ein Pflichtfeld');
  }
  if (!verantwortlicher || verantwortlicher.trim() === '') {
    throw new Error('Verantwortlicher ist ein Pflichtfeld');
  }

  return withTransaction(db, async (tx) => {
    const liegenschaft = await findLiegenschaftById(tx, liegenschaft_id);
    if (!liegenschaft) {
      throw new Error('Bitte wählen Sie zunächst eine Liegenschaft aus');
    }

    const raum_id = randomUUID();
    await insertRaum(tx, {
      raum_id,
      liegenschaft_id,
      bezeichnung: bezeichnung.trim(),
      typ,
      verantwortlicher: verantwortlicher.trim(),
      schutzschraenke: schutzschraenke || []
    });

    return findRaumById(tx, raum_id);
  });
}

export async function raumAbrufen(db, raum_id) {
  return withReadTransaction(db, async (tx) => {
    const raum = await findRaumById(tx, raum_id);
    if (!raum) throw new Error(`Raum ${raum_id} nicht gefunden`);
    return raum;
  });
}

// ==================== Netzverbindung ====================

export async function netzverbindungAnlegen(db, data) {
  const { verbund_id, system_von, system_nach, verbindungstyp, verschluesselt, extern, netzsegment } = data;

  if (!system_von) throw new Error('Ausgangssystem ist ein Pflichtfeld');
  if (!system_nach) throw new Error('Zielsystem ist ein Pflichtfeld');

  if (system_von === system_nach) {
    throw new Error('Quell- und Zielsystem dürfen nicht identisch sein');
  }

  const erlaubteTypen = ['LAN', 'WAN', 'WLAN', 'VPN', 'Internet'];
  if (!verbindungstyp || !erlaubteTypen.includes(verbindungstyp)) {
    throw new Error(`Ungültiger Verbindungstyp: ${verbindungstyp}`);
  }

  return withTransaction(db, async (tx) => {
    await requireVerbund(tx, verbund_id);

    const vonSystem = await findItSystemById(tx, system_von);
    if (!vonSystem) throw new Error(`Ausgangssystem ${system_von} nicht gefunden`);
    const nachSystem = await findItSystemById(tx, system_nach);
    if (!nachSystem) throw new Error(`Zielsystem ${system_nach} nicht gefunden`);

    const verbindung_id = randomUUID();
    await insertNetzverbindung(tx, {
      verbindung_id,
      verbund_id,
      system_von,
      system_nach,
      verbindungstyp,
      verschluesselt: verschluesselt || false,
      extern: extern || false,
      netzsegment: netzsegment || ''
    });

    return verbindung_id;
  });
}

export async function liegenschaftenByVerbundAbrufen(db, verbund_id) {
  return withReadTransaction(db, (tx) => findLiegenschaftenByVerbund(tx, verbund_id));
}

export async function raeumeByLiegenschaftAbrufen(db, liegenschaft_id) {
  return withReadTransaction(db, (tx) => findRaeumeByLiegenschaft(tx, liegenschaft_id));
}

export async function netzverbindungenByVerbundAbrufen(db, verbund_id) {
  return withReadTransaction(db, (tx) => findNetzverbindungenByVerbund(tx, verbund_id));
}

export async function netzplanVollstaendigkeitPruefen(db, verbund_id) {
  return withReadTransaction(db, async (tx) => {
    const alleSysteme = await findItSystemByVerbund(tx, verbund_id);
    const systemeImPlan = await findSystemeImNetzplan(tx, verbund_id);

    const fehlendeSysteme = alleSysteme.filter(s => !systemeImPlan.includes(s.system_id));

    if (fehlendeSysteme.length > 0) {
      const anzahl = fehlendeSysteme.length;
      const namen = fehlendeSysteme.map(s => s.bezeichnung).join(', ');
      throw new Error(`${anzahl} IT-System${anzahl > 1 ? 'e sind' : ' ist'} nicht im Netzplan referenziert: ${namen}`);
    }

    return { vollstaendig: true };
  });
}
