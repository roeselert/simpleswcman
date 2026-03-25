/**
 * Modellierung Local Adapter
 */

import {
  bausteinAnlegen, bausteinAbrufen, alleBausteineAbrufen,
  bausteinZuordnen, anforderungAnpassen,
  eintraegeByVerbundAbrufen, eintraegeByZielobjektAbrufen,
  dokumentationErstellen, dokumentationenAbrufen,
  standardBausteineInitialisieren
} from './services.js';

/**
 * Creates an adapter bound to a specific db instance.
 * @param {import('@electric-sql/pglite').PGlite} db
 */
export function createAdapter(db) {
  return {
    // Bausteine
    bausteinAnlegen: (data) => bausteinAnlegen(db, data),
    bausteinAbrufen: (baustein_id) => bausteinAbrufen(db, baustein_id),
    alleBausteineAbrufen: () => alleBausteineAbrufen(db),
    standardBausteineInitialisieren: () => standardBausteineInitialisieren(db),

    // Modellierungseinträge
    bausteinZuordnen: (data) => bausteinZuordnen(db, data),
    anforderungAnpassen: (eintrag_id, data) => anforderungAnpassen(db, eintrag_id, data),
    eintraegeByVerbundAbrufen: (verbund_id) => eintraegeByVerbundAbrufen(db, verbund_id),
    eintraegeByZielobjektAbrufen: (zielobjekt_id) => eintraegeByZielobjektAbrufen(db, zielobjekt_id),

    // Dokumentation
    dokumentationErstellen: (data) => dokumentationErstellen(db, data),
    dokumentationenAbrufen: (verbund_id) => dokumentationenAbrufen(db, verbund_id),
  };
}
