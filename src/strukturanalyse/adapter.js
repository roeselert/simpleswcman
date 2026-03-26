/**
 * Strukturanalyse Local Adapter
 * Exposes services for frontend use with a shared db instance.
 * In production, imports PGlite from CDN. In tests, db is injected.
 */

import {
  verbundAnlegen, alleVerbundeAbrufen, verbundAbrufen,
  objektgruppeAnlegen, objektgruppenAbrufen,
  prozessAnlegen, prozessAbrufen, prozesseByVerbundAbrufen,
  informationErfassen, informationenByProzessAbrufen, prozessVollstaendigkeitPruefen,
  anwendungErfassen, anwendungProzessZuordnen, anwendungsmatrixAbrufen, anwendungenOhneProzessPruefen,
  itSystemErfassen, itSystemAnwendungZuordnen, itSystemAbrufen, raumItSystemMatrixAbrufen,
  liegenschaftAnlegen, liegenschaftAbrufen,
  raumAnlegen, raumAbrufen,
  netzverbindungAnlegen, netzplanVollstaendigkeitPruefen
} from './services.js';

// In production this db instance is created once and reused.
// Tests inject their own db via createAdapter(db).
const _db = null;

/**
 * Creates an adapter bound to a specific db instance.
 * Use this in tests and when you need an isolated adapter.
 * @param {import('@electric-sql/pglite').PGlite} db
 */
export function createAdapter(db) {
  return {
    // Informationsverbund
    verbundAnlegen: (data) => verbundAnlegen(db, data),
    alleVerbundeAbrufen: () => alleVerbundeAbrufen(db),
    verbundAbrufen: (id) => verbundAbrufen(db, id),

    // Objektgruppe
    objektgruppeAnlegen: (data) => objektgruppeAnlegen(db, data),
    objektgruppenAbrufen: (verbund_id) => objektgruppenAbrufen(db, verbund_id),

    // Geschäftsprozess
    prozessAnlegen: (data) => prozessAnlegen(db, data),
    prozessAbrufen: (id) => prozessAbrufen(db, id),
    prozesseByVerbundAbrufen: (verbund_id) => prozesseByVerbundAbrufen(db, verbund_id),

    // Information
    informationErfassen: (data) => informationErfassen(db, data),
    informationenByProzessAbrufen: (prozess_id) => informationenByProzessAbrufen(db, prozess_id),
    prozessVollstaendigkeitPruefen: (prozess_id) => prozessVollstaendigkeitPruefen(db, prozess_id),

    // Anwendung
    anwendungErfassen: (data) => anwendungErfassen(db, data),
    anwendungProzessZuordnen: (anwendung_id, prozess_id) => anwendungProzessZuordnen(db, anwendung_id, prozess_id),
    anwendungsmatrixAbrufen: (verbund_id) => anwendungsmatrixAbrufen(db, verbund_id),
    anwendungenOhneProzessPruefen: (verbund_id) => anwendungenOhneProzessPruefen(db, verbund_id),

    // IT-System
    itSystemErfassen: (data) => itSystemErfassen(db, data),
    itSystemAnwendungZuordnen: (system_id, anwendung_id) => itSystemAnwendungZuordnen(db, system_id, anwendung_id),
    itSystemAbrufen: (id) => itSystemAbrufen(db, id),
    raumItSystemMatrixAbrufen: (verbund_id) => raumItSystemMatrixAbrufen(db, verbund_id),

    // Liegenschaft
    liegenschaftAnlegen: (data) => liegenschaftAnlegen(db, data),
    liegenschaftAbrufen: (id) => liegenschaftAbrufen(db, id),

    // Raum
    raumAnlegen: (data) => raumAnlegen(db, data),
    raumAbrufen: (id) => raumAbrufen(db, id),

    // Netzverbindung
    netzverbindungAnlegen: (data) => netzverbindungAnlegen(db, data),
    netzplanVollstaendigkeitPruefen: (verbund_id) => netzplanVollstaendigkeitPruefen(db, verbund_id),
  };
}
