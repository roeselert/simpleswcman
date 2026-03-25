/**
 * Schutzbedarfsfeststellung Repositories
 * Database access for schutzbedarf_kategorie, schadensbewertung, schutzbedarf_ergebnis.
 */

// ==================== Schutzbedarf Kategorie ====================

export async function insertSchutzbedarfKategorie(db, kategorie) {
  const { kategorie_id, bezeichnung, schadensszenario, beschreibung, konkretisierung, freigabe_datum, verbund_id } = kategorie;
  await db.query(
    `INSERT INTO schutzbedarf_kategorie (kategorie_id, bezeichnung, schadensszenario, beschreibung, konkretisierung, freigabe_datum, verbund_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [kategorie_id, bezeichnung, schadensszenario, beschreibung, konkretisierung, freigabe_datum || null, verbund_id]
  );
}

export async function findKategorieById(db, kategorie_id) {
  const res = await db.query(`SELECT * FROM schutzbedarf_kategorie WHERE kategorie_id = $1`, [kategorie_id]);
  return res.rows[0] || null;
}

export async function findKategorienByVerbund(db, verbund_id) {
  const res = await db.query(`SELECT * FROM schutzbedarf_kategorie WHERE verbund_id = $1`, [verbund_id]);
  return res.rows;
}

// ==================== Schadensbewertung ====================

export async function insertSchadensbewertung(db, bewertung) {
  const { bewertung_id, zielobjekt_id, zielobjekt_typ, schadensszenario, grundwert, kategorie, begruendung, bewertet_von, datum, status } = bewertung;
  await db.query(
    `INSERT INTO schadensbewertung (bewertung_id, zielobjekt_id, zielobjekt_typ, schadensszenario, grundwert, kategorie, begruendung, bewertet_von, datum, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [bewertung_id, zielobjekt_id, zielobjekt_typ, schadensszenario, grundwert, kategorie, begruendung, bewertet_von, datum, status || 'offen']
  );
}

export async function findBewertungById(db, bewertung_id) {
  const res = await db.query(`SELECT * FROM schadensbewertung WHERE bewertung_id = $1`, [bewertung_id]);
  return res.rows[0] || null;
}

export async function findBewertungenByZielobjekt(db, zielobjekt_id) {
  const res = await db.query(`SELECT * FROM schadensbewertung WHERE zielobjekt_id = $1`, [zielobjekt_id]);
  return res.rows;
}

export async function updateBewertungStatus(db, bewertung_id, status) {
  await db.query(`UPDATE schadensbewertung SET status = $1 WHERE bewertung_id = $2`, [status, bewertung_id]);
}

// ==================== Schutzbedarf Ergebnis ====================

export async function upsertSchutzbedarfErgebnis(db, ergebnis) {
  const { ergebnis_id, zielobjekt_id, zielobjekt_typ, schutzbedarf_c, schutzbedarf_i, schutzbedarf_a, vererbungsprinzip, begruendung, status } = ergebnis;

  // Check if exists for this zielobjekt
  const existing = await db.query(
    `SELECT ergebnis_id FROM schutzbedarf_ergebnis WHERE zielobjekt_id = $1`,
    [zielobjekt_id]
  );

  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE schutzbedarf_ergebnis
       SET zielobjekt_typ = $1, schutzbedarf_c = $2, schutzbedarf_i = $3, schutzbedarf_a = $4,
           vererbungsprinzip = $5, begruendung = $6, status = $7
       WHERE zielobjekt_id = $8`,
      [zielobjekt_typ, schutzbedarf_c, schutzbedarf_i, schutzbedarf_a, vererbungsprinzip || null, begruendung || '', status || 'offen', zielobjekt_id]
    );
    return existing.rows[0].ergebnis_id;
  } else {
    await db.query(
      `INSERT INTO schutzbedarf_ergebnis (ergebnis_id, zielobjekt_id, zielobjekt_typ, schutzbedarf_c, schutzbedarf_i, schutzbedarf_a, vererbungsprinzip, begruendung, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ergebnis_id, zielobjekt_id, zielobjekt_typ, schutzbedarf_c, schutzbedarf_i, schutzbedarf_a, vererbungsprinzip || null, begruendung || '', status || 'offen']
    );
    return ergebnis_id;
  }
}

export async function findErgebnisByZielobjekt(db, zielobjekt_id) {
  const res = await db.query(`SELECT * FROM schutzbedarf_ergebnis WHERE zielobjekt_id = $1`, [zielobjekt_id]);
  return res.rows[0] || null;
}

export async function findAlleErgebnisseByVerbund(db, verbund_id) {
  // We join through zielobjekt_id - we query all ergebnisse and filter by verbund through it_system or anwendung
  // Since zielobjekt_id is a loose reference, we return all and let caller filter
  const res = await db.query(`SELECT * FROM schutzbedarf_ergebnis`);
  return res.rows;
}

export async function updateErgebnisStatus(db, zielobjekt_id, status) {
  await db.query(`UPDATE schutzbedarf_ergebnis SET status = $1 WHERE zielobjekt_id = $2`, [status, zielobjekt_id]);
}
