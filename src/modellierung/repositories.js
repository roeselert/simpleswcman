/**
 * Modellierung Repositories
 * Database access for baustein, modellierungseintrag, modellierungsdokumentation.
 */

// ==================== Baustein ====================

export async function insertBaustein(db, baustein) {
  const { baustein_id, bezeichnung, schicht, anwendungstyp, kompendium_version } = baustein;
  await db.query(
    `INSERT INTO baustein (baustein_id, bezeichnung, schicht, anwendungstyp, kompendium_version)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (baustein_id) DO NOTHING`,
    [baustein_id, bezeichnung, schicht, anwendungstyp, kompendium_version]
  );
}

export async function findBausteinById(db, baustein_id) {
  const res = await db.query(`SELECT * FROM baustein WHERE baustein_id = $1`, [baustein_id]);
  return res.rows[0] || null;
}

export async function findAlleBausteine(db) {
  const res = await db.query(`SELECT * FROM baustein ORDER BY schicht, baustein_id`);
  return res.rows;
}

export async function findBausteineBySchicht(db, schicht) {
  const res = await db.query(`SELECT * FROM baustein WHERE schicht = $1 ORDER BY baustein_id`, [schicht]);
  return res.rows;
}

// ==================== Modellierungseintrag ====================

export async function insertModellierungseintrag(db, eintrag) {
  const { eintrag_id, verbund_id, zielobjekt_id, baustein_id, anwendbar, begruendung,
          anforderung_angepasst, anpassung_details, erstellt_am, erstellt_von } = eintrag;
  await db.query(
    `INSERT INTO modellierungseintrag
     (eintrag_id, verbund_id, zielobjekt_id, baustein_id, anwendbar, begruendung,
      anforderung_angepasst, anpassung_details, erstellt_am, erstellt_von)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [eintrag_id, verbund_id, zielobjekt_id, baustein_id,
     anwendbar !== false ? 1 : 0,
     begruendung,
     anforderung_angepasst ? 1 : 0,
     anpassung_details || '',
     erstellt_am,
     erstellt_von]
  );
}

export async function findEintragById(db, eintrag_id) {
  const res = await db.query(`SELECT * FROM modellierungseintrag WHERE eintrag_id = $1`, [eintrag_id]);
  return res.rows[0] || null;
}

export async function findEintragByZielobjektUndBaustein(db, zielobjekt_id, baustein_id) {
  const res = await db.query(
    `SELECT * FROM modellierungseintrag WHERE zielobjekt_id = $1 AND baustein_id = $2`,
    [zielobjekt_id, baustein_id]
  );
  return res.rows[0] || null;
}

export async function findEintraegeByVerbund(db, verbund_id) {
  const res = await db.query(
    `SELECT me.*, b.bezeichnung as baustein_bezeichnung, b.schicht
     FROM modellierungseintrag me
     JOIN baustein b ON b.baustein_id = me.baustein_id
     WHERE me.verbund_id = $1
     ORDER BY me.zielobjekt_id, b.schicht`,
    [verbund_id]
  );
  return res.rows;
}

export async function findEintraegeByZielobjekt(db, zielobjekt_id) {
  const res = await db.query(
    `SELECT me.*, b.bezeichnung as baustein_bezeichnung, b.schicht
     FROM modellierungseintrag me
     JOIN baustein b ON b.baustein_id = me.baustein_id
     WHERE me.zielobjekt_id = $1
     ORDER BY b.schicht`,
    [zielobjekt_id]
  );
  return res.rows;
}

export async function updateModellierungseintrag(db, eintrag_id, updates) {
  const { anwendbar, begruendung, anforderung_angepasst, anpassung_details } = updates;
  await db.query(
    `UPDATE modellierungseintrag
     SET anwendbar = $1, begruendung = $2, anforderung_angepasst = $3, anpassung_details = $4
     WHERE eintrag_id = $5`,
    [anwendbar !== false ? 1 : 0, begruendung, anforderung_angepasst ? 1 : 0, anpassung_details || '', eintrag_id]
  );
}

// ==================== Modellierungsdokumentation ====================

export async function insertModellierungsdokumentation(db, dok) {
  const { dok_id, verbund_id, verwendungszweck, version, freigegeben_am, freigegeben_von } = dok;
  await db.query(
    `INSERT INTO modellierungsdokumentation (dok_id, verbund_id, verwendungszweck, version, freigegeben_am, freigegeben_von)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [dok_id, verbund_id, verwendungszweck, version, freigegeben_am || null, freigegeben_von || null]
  );
}

export async function findDokumentationById(db, dok_id) {
  const res = await db.query(`SELECT * FROM modellierungsdokumentation WHERE dok_id = $1`, [dok_id]);
  return res.rows[0] || null;
}

export async function findDokumentationenByVerbund(db, verbund_id) {
  const res = await db.query(`SELECT * FROM modellierungsdokumentation WHERE verbund_id = $1`, [verbund_id]);
  return res.rows;
}
