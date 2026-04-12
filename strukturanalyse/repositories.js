/**
 * Strukturanalyse Repositories
 * All database access functions for the strukturanalyse module.
 * Each function takes a PGlite db instance as first parameter.
 */

// ==================== Informationsverbund ====================

export async function insertVerbund(db, verbund) {
  const { verbund_id, institution_name, beschreibung, geltungsbereich, erstellt_am, erstellt_von } = verbund;
  await db.query(
    `INSERT INTO informationsverbund (verbund_id, institution_name, beschreibung, geltungsbereich, erstellt_am, erstellt_von)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [verbund_id, institution_name, beschreibung, geltungsbereich, erstellt_am, erstellt_von]
  );
}

export async function findVerbundByName(db, institution_name) {
  const res = await db.query(
    `SELECT * FROM informationsverbund WHERE institution_name = $1`,
    [institution_name]
  );
  return res.rows;
}

export async function findVerbundById(db, verbund_id) {
  const res = await db.query(
    `SELECT * FROM informationsverbund WHERE verbund_id = $1`,
    [verbund_id]
  );
  return res.rows[0] || null;
}

export async function findAllVerbund(db) {
  const res = await db.query(`SELECT * FROM informationsverbund ORDER BY erstellt_am`);
  return res.rows;
}

export async function deleteVerbundById(db, verbund_id) {
  await db.query(`DELETE FROM informationsverbund WHERE verbund_id = $1`, [verbund_id]);
}

// ==================== Objektgruppe ====================

export async function insertObjektgruppe(db, gruppe) {
  const { gruppe_id, verbund_id, bezeichnung, typ, gruppierungskriterium, anzahl } = gruppe;
  await db.query(
    `INSERT INTO objektgruppe (gruppe_id, verbund_id, bezeichnung, typ, gruppierungskriterium, anzahl)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [gruppe_id, verbund_id, bezeichnung, typ, gruppierungskriterium || '', anzahl]
  );
}

export async function findObjektgruppeById(db, gruppe_id) {
  const res = await db.query(`SELECT * FROM objektgruppe WHERE gruppe_id = $1`, [gruppe_id]);
  return res.rows[0] || null;
}

export async function findObjektgruppenByVerbund(db, verbund_id) {
  const res = await db.query(`SELECT * FROM objektgruppe WHERE verbund_id = $1`, [verbund_id]);
  return res.rows;
}

// ==================== Geschäftsprozess ====================

export async function insertGeschaeftsprozess(db, prozess) {
  const { prozess_id, verbund_id, bezeichnung, beschreibung, verantwortlicher, org_einheiten, rechtl_vorgaben } = prozess;
  await db.query(
    `INSERT INTO geschaeftsprozess (prozess_id, verbund_id, bezeichnung, beschreibung, verantwortlicher, org_einheiten, rechtl_vorgaben)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [prozess_id, verbund_id, bezeichnung, beschreibung, verantwortlicher,
     JSON.stringify(org_einheiten || []), rechtl_vorgaben || '']
  );
}

export async function findProzessById(db, prozess_id) {
  const res = await db.query(`SELECT * FROM geschaeftsprozess WHERE prozess_id = $1`, [prozess_id]);
  return res.rows[0] || null;
}

export async function findProzessByVerbund(db, verbund_id) {
  const res = await db.query(`SELECT * FROM geschaeftsprozess WHERE verbund_id = $1`, [verbund_id]);
  return res.rows;
}

// ==================== Information ====================

export async function insertInformation(db, info) {
  const { info_id, prozess_id, bezeichnung, vertraulichkeit, integritaet, verfuegbarkeit, datenschutz_relevant } = info;
  await db.query(
    `INSERT INTO information (info_id, prozess_id, bezeichnung, vertraulichkeit, integritaet, verfuegbarkeit, datenschutz_relevant)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [info_id, prozess_id, bezeichnung, vertraulichkeit, integritaet, verfuegbarkeit, datenschutz_relevant ? 1 : 0]
  );
}

export async function findInfoByProzess(db, prozess_id) {
  const res = await db.query(`SELECT * FROM information WHERE prozess_id = $1`, [prozess_id]);
  return res.rows;
}

// ==================== Anwendung ====================

export async function insertAnwendung(db, anwendung) {
  const { anwendung_id, verbund_id, bezeichnung, beschreibung, plattform, verantwortlicher } = anwendung;
  await db.query(
    `INSERT INTO anwendung (anwendung_id, verbund_id, bezeichnung, beschreibung, plattform, verantwortlicher)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [anwendung_id, verbund_id, bezeichnung, beschreibung || '', plattform, verantwortlicher]
  );
}

export async function findAnwendungByBezeichnung(db, verbund_id, bezeichnung) {
  const res = await db.query(
    `SELECT * FROM anwendung WHERE verbund_id = $1 AND bezeichnung = $2`,
    [verbund_id, bezeichnung]
  );
  return res.rows;
}

export async function findAnwendungById(db, anwendung_id) {
  const res = await db.query(`SELECT * FROM anwendung WHERE anwendung_id = $1`, [anwendung_id]);
  return res.rows[0] || null;
}

export async function findAnwendungByVerbund(db, verbund_id) {
  const res = await db.query(`SELECT * FROM anwendung WHERE verbund_id = $1`, [verbund_id]);
  return res.rows;
}

export async function insertAnwendungProzess(db, anwendung_id, prozess_id) {
  await db.query(
    `INSERT INTO anwendung_prozess (anwendung_id, prozess_id) VALUES ($1, $2)
     ON CONFLICT (anwendung_id, prozess_id) DO NOTHING`,
    [anwendung_id, prozess_id]
  );
}

export async function findProzesseByAnwendung(db, anwendung_id) {
  const res = await db.query(
    `SELECT gp.* FROM geschaeftsprozess gp
     JOIN anwendung_prozess ap ON ap.prozess_id = gp.prozess_id
     WHERE ap.anwendung_id = $1`,
    [anwendung_id]
  );
  return res.rows;
}

export async function findAnwendungenOhneProzess(db, verbund_id) {
  const res = await db.query(
    `SELECT a.* FROM anwendung a
     WHERE a.verbund_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM anwendung_prozess ap WHERE ap.anwendung_id = a.anwendung_id
       )`,
    [verbund_id]
  );
  return res.rows;
}

// ==================== IT-System ====================

export async function insertItSystem(db, system) {
  const { system_id, verbund_id, bezeichnung, typ, betriebssystem, status, verantwortlicher, raum_id, gruppe_id } = system;
  await db.query(
    `INSERT INTO it_system (system_id, verbund_id, bezeichnung, typ, betriebssystem, status, verantwortlicher, raum_id, gruppe_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [system_id, verbund_id, bezeichnung, typ, betriebssystem, status, verantwortlicher, raum_id || null, gruppe_id || null]
  );
}

export async function findItSystemById(db, system_id) {
  const res = await db.query(`SELECT * FROM it_system WHERE system_id = $1`, [system_id]);
  return res.rows[0] || null;
}

export async function findItSystemByVerbund(db, verbund_id) {
  const res = await db.query(`SELECT * FROM it_system WHERE verbund_id = $1`, [verbund_id]);
  return res.rows;
}

export async function insertItSystemAnwendung(db, system_id, anwendung_id) {
  await db.query(
    `INSERT INTO it_system_anwendung (system_id, anwendung_id) VALUES ($1, $2)
     ON CONFLICT (system_id, anwendung_id) DO NOTHING`,
    [system_id, anwendung_id]
  );
}

export async function findAnwendungenBySystem(db, system_id) {
  const res = await db.query(
    `SELECT a.* FROM anwendung a
     JOIN it_system_anwendung isa ON isa.anwendung_id = a.anwendung_id
     WHERE isa.system_id = $1`,
    [system_id]
  );
  return res.rows;
}

export async function findSystemeByRaum(db, raum_id) {
  const res = await db.query(`SELECT * FROM it_system WHERE raum_id = $1`, [raum_id]);
  return res.rows;
}

// ==================== Liegenschaft ====================

export async function insertLiegenschaft(db, liegenschaft) {
  const { liegenschaft_id, verbund_id, bezeichnung, typ } = liegenschaft;
  await db.query(
    `INSERT INTO liegenschaft (liegenschaft_id, verbund_id, bezeichnung, typ)
     VALUES ($1, $2, $3, $4)`,
    [liegenschaft_id, verbund_id, bezeichnung, typ]
  );
}

export async function findLiegenschaftById(db, liegenschaft_id) {
  const res = await db.query(`SELECT * FROM liegenschaft WHERE liegenschaft_id = $1`, [liegenschaft_id]);
  return res.rows[0] || null;
}

export async function findLiegenschaftenByVerbund(db, verbund_id) {
  const res = await db.query(`SELECT * FROM liegenschaft WHERE verbund_id = $1`, [verbund_id]);
  return res.rows;
}

// ==================== Raum ====================

export async function insertRaum(db, raum) {
  const { raum_id, liegenschaft_id, bezeichnung, typ, verantwortlicher, schutzschraenke } = raum;
  await db.query(
    `INSERT INTO raum (raum_id, liegenschaft_id, bezeichnung, typ, verantwortlicher, schutzschraenke)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [raum_id, liegenschaft_id, bezeichnung, typ, verantwortlicher, JSON.stringify(schutzschraenke || [])]
  );
}

export async function findRaumById(db, raum_id) {
  const res = await db.query(`SELECT * FROM raum WHERE raum_id = $1`, [raum_id]);
  return res.rows[0] || null;
}

export async function findRaeumeByLiegenschaft(db, liegenschaft_id) {
  const res = await db.query(`SELECT * FROM raum WHERE liegenschaft_id = $1`, [liegenschaft_id]);
  return res.rows;
}

// ==================== Netzverbindung ====================

export async function insertNetzverbindung(db, verbindung) {
  const { verbindung_id, verbund_id, system_von, system_nach, verbindungstyp, verschluesselt, extern, netzsegment } = verbindung;
  await db.query(
    `INSERT INTO netzverbindung (verbindung_id, verbund_id, system_von, system_nach, verbindungstyp, verschluesselt, extern, netzsegment)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [verbindung_id, verbund_id, system_von, system_nach, verbindungstyp,
     verschluesselt ? 1 : 0, extern ? 1 : 0, netzsegment || '']
  );
}

export async function findNetzverbindungById(db, verbindung_id) {
  const res = await db.query(`SELECT * FROM netzverbindung WHERE verbindung_id = $1`, [verbindung_id]);
  return res.rows[0] || null;
}

export async function findNetzverbindungenByVerbund(db, verbund_id) {
  const res = await db.query(`SELECT * FROM netzverbindung WHERE verbund_id = $1`, [verbund_id]);
  return res.rows;
}

export async function findSystemeImNetzplan(db, verbund_id) {
  const res = await db.query(
    `SELECT DISTINCT system_id FROM (
       SELECT system_von AS system_id FROM netzverbindung WHERE verbund_id = $1
       UNION
       SELECT system_nach AS system_id FROM netzverbindung WHERE verbund_id = $1
     ) netz`,
    [verbund_id]
  );
  return res.rows.map(r => r.system_id);
}
