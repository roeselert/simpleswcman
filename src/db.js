/**
 * Database initialization for secman / simpleswcman
 * Creates all tables for strukturanalyse, schutzbedarfsfeststellung, and modellierung modules.
 * @param {import('@electric-sql/pglite').PGlite} db - PGlite instance
 */
export async function initDb(db) {
  await db.exec(`
    -- ============================================================
    -- Strukturanalyse
    -- ============================================================

    CREATE TABLE IF NOT EXISTS informationsverbund (
      verbund_id TEXT PRIMARY KEY,
      institution_name TEXT NOT NULL,
      beschreibung TEXT NOT NULL,
      geltungsbereich TEXT NOT NULL,
      erstellt_am TEXT NOT NULL,
      erstellt_von TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS liegenschaft (
      liegenschaft_id TEXT PRIMARY KEY,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id),
      bezeichnung TEXT NOT NULL,
      typ TEXT NOT NULL CHECK (typ IN ('Hauptstandort', 'Außenstelle', 'RZ'))
    );

    CREATE TABLE IF NOT EXISTS raum (
      raum_id TEXT PRIMARY KEY,
      liegenschaft_id TEXT NOT NULL REFERENCES liegenschaft(liegenschaft_id),
      bezeichnung TEXT NOT NULL,
      typ TEXT NOT NULL CHECK (typ IN ('Serverraum', 'Büro', 'Archiv', 'Besprechung', 'Sonstig')),
      verantwortlicher TEXT NOT NULL,
      schutzschraenke TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS geschaeftsprozess (
      prozess_id TEXT PRIMARY KEY,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id),
      bezeichnung TEXT NOT NULL,
      beschreibung TEXT NOT NULL,
      verantwortlicher TEXT NOT NULL,
      org_einheiten TEXT DEFAULT '[]',
      rechtl_vorgaben TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS information (
      info_id TEXT PRIMARY KEY,
      prozess_id TEXT NOT NULL REFERENCES geschaeftsprozess(prozess_id),
      bezeichnung TEXT NOT NULL,
      vertraulichkeit TEXT NOT NULL CHECK (vertraulichkeit IN ('normal', 'hoch', 'sehr hoch')),
      integritaet TEXT NOT NULL CHECK (integritaet IN ('normal', 'hoch', 'sehr hoch')),
      verfuegbarkeit TEXT NOT NULL CHECK (verfuegbarkeit IN ('normal', 'hoch', 'sehr hoch')),
      datenschutz_relevant INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS anwendung (
      anwendung_id TEXT PRIMARY KEY,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id),
      bezeichnung TEXT NOT NULL,
      beschreibung TEXT DEFAULT '',
      plattform TEXT NOT NULL,
      verantwortlicher TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anwendung_prozess (
      anwendung_id TEXT NOT NULL REFERENCES anwendung(anwendung_id),
      prozess_id TEXT NOT NULL REFERENCES geschaeftsprozess(prozess_id),
      PRIMARY KEY (anwendung_id, prozess_id)
    );

    CREATE TABLE IF NOT EXISTS it_system (
      system_id TEXT PRIMARY KEY,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id),
      bezeichnung TEXT NOT NULL,
      typ TEXT NOT NULL CHECK (typ IN ('Server', 'Client', 'Netzkomponente', 'Mobilgerät', 'ICS', 'Sonstiges')),
      betriebssystem TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('in Betrieb', 'in Planung', 'außer Betrieb')),
      verantwortlicher TEXT NOT NULL,
      raum_id TEXT REFERENCES raum(raum_id),
      gruppe_id TEXT
    );

    CREATE TABLE IF NOT EXISTS it_system_anwendung (
      system_id TEXT NOT NULL REFERENCES it_system(system_id),
      anwendung_id TEXT NOT NULL REFERENCES anwendung(anwendung_id),
      PRIMARY KEY (system_id, anwendung_id)
    );

    CREATE TABLE IF NOT EXISTS objektgruppe (
      gruppe_id TEXT PRIMARY KEY,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id),
      bezeichnung TEXT NOT NULL,
      typ TEXT NOT NULL CHECK (typ IN ('IT-System', 'Anwendung', 'Raum', 'Kommunikationslink')),
      gruppierungskriterium TEXT DEFAULT '',
      anzahl INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS netzverbindung (
      verbindung_id TEXT PRIMARY KEY,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id),
      system_von TEXT NOT NULL REFERENCES it_system(system_id),
      system_nach TEXT NOT NULL REFERENCES it_system(system_id),
      verbindungstyp TEXT NOT NULL CHECK (verbindungstyp IN ('LAN', 'WAN', 'WLAN', 'VPN', 'Internet')),
      verschluesselt INTEGER NOT NULL DEFAULT 0,
      extern INTEGER NOT NULL DEFAULT 0,
      netzsegment TEXT DEFAULT ''
    );

    -- ============================================================
    -- Schutzbedarfsfeststellung
    -- ============================================================

    CREATE TABLE IF NOT EXISTS schutzbedarf_kategorie (
      kategorie_id TEXT PRIMARY KEY,
      bezeichnung TEXT NOT NULL CHECK (bezeichnung IN ('normal', 'hoch', 'sehr hoch')),
      schadensszenario TEXT NOT NULL,
      beschreibung TEXT NOT NULL,
      konkretisierung TEXT NOT NULL,
      freigabe_datum TEXT,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id)
    );

    CREATE TABLE IF NOT EXISTS schadensbewertung (
      bewertung_id TEXT PRIMARY KEY,
      zielobjekt_id TEXT NOT NULL,
      zielobjekt_typ TEXT NOT NULL,
      schadensszenario TEXT NOT NULL CHECK (schadensszenario IN ('Gesetz', 'Selbstbestimmung', 'Unversehrtheit', 'Aufgabenerfüllung', 'Finanziell', 'Außenwirkung')),
      grundwert TEXT NOT NULL CHECK (grundwert IN ('Vertraulichkeit', 'Integrität', 'Verfügbarkeit')),
      kategorie TEXT NOT NULL CHECK (kategorie IN ('normal', 'hoch', 'sehr hoch')),
      begruendung TEXT NOT NULL,
      bewertet_von TEXT NOT NULL,
      datum TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'abgeschlossen'))
    );

    CREATE TABLE IF NOT EXISTS schutzbedarf_ergebnis (
      ergebnis_id TEXT PRIMARY KEY,
      zielobjekt_id TEXT NOT NULL,
      zielobjekt_typ TEXT NOT NULL,
      schutzbedarf_c TEXT NOT NULL CHECK (schutzbedarf_c IN ('normal', 'hoch', 'sehr hoch')),
      schutzbedarf_i TEXT NOT NULL CHECK (schutzbedarf_i IN ('normal', 'hoch', 'sehr hoch')),
      schutzbedarf_a TEXT NOT NULL CHECK (schutzbedarf_a IN ('normal', 'hoch', 'sehr hoch')),
      vererbungsprinzip TEXT CHECK (vererbungsprinzip IN ('Maximum', 'Kumulation', 'Verteilung')),
      begruendung TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'abgeschlossen'))
    );

    -- ============================================================
    -- Modellierung
    -- ============================================================

    CREATE TABLE IF NOT EXISTS baustein (
      baustein_id TEXT PRIMARY KEY,
      bezeichnung TEXT NOT NULL,
      schicht TEXT NOT NULL CHECK (schicht IN ('ISMS', 'ORP', 'CON', 'OPS', 'DER', 'APP', 'SYS', 'IND', 'NET', 'INF')),
      anwendungstyp TEXT NOT NULL CHECK (anwendungstyp IN ('Basis', 'Standard', 'erhöhter Schutzbedarf')),
      kompendium_version TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modellierungseintrag (
      eintrag_id TEXT PRIMARY KEY,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id),
      zielobjekt_id TEXT NOT NULL,
      baustein_id TEXT NOT NULL REFERENCES baustein(baustein_id),
      anwendbar INTEGER NOT NULL DEFAULT 1,
      begruendung TEXT NOT NULL,
      anforderung_angepasst INTEGER NOT NULL DEFAULT 0,
      anpassung_details TEXT DEFAULT '',
      erstellt_am TEXT NOT NULL,
      erstellt_von TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modellierungsdokumentation (
      dok_id TEXT PRIMARY KEY,
      verbund_id TEXT NOT NULL REFERENCES informationsverbund(verbund_id),
      verwendungszweck TEXT NOT NULL CHECK (verwendungszweck IN ('Prüfplan', 'Entwicklungskonzept')),
      version TEXT NOT NULL,
      freigegeben_am TEXT,
      freigegeben_von TEXT
    );
  `);
}
