/**
 * Schutzbedarfsfeststellung Local Adapter
 */

import {
  kategorieDefinieren, kategorienAbrufen,
  schadensbewertungSpeichern,
  schutzbedarfBerechnen, schutzbedarfAbschliessen, schutzbedarfAbrufen,
  kumulationseffektDokumentieren,
  verteilungseffektDokumentieren,
  itSystemSchutzbedarfVererben
} from './services.js';

/**
 * Creates an adapter bound to a specific db instance.
 * @param {import('@electric-sql/pglite').PGlite} db
 */
export function createAdapter(db) {
  return {
    // Schutzbedarfskategorien
    kategorieDefinieren: (data) => kategorieDefinieren(db, data),
    kategorienAbrufen: (verbund_id) => kategorienAbrufen(db, verbund_id),

    // Schadensbewertung
    schadensbewertungSpeichern: (data) => schadensbewertungSpeichern(db, data),

    // Schutzbedarf berechnen
    schutzbedarfBerechnen: (zielobjekt_id, zielobjekt_typ, begruendung) =>
      schutzbedarfBerechnen(db, zielobjekt_id, zielobjekt_typ, begruendung),
    schutzbedarfAbschliessen: (zielobjekt_id) => schutzbedarfAbschliessen(db, zielobjekt_id),
    schutzbedarfAbrufen: (zielobjekt_id) => schutzbedarfAbrufen(db, zielobjekt_id),

    // Vererbungseffekte
    kumulationseffektDokumentieren: (data) => kumulationseffektDokumentieren(db, data),
    verteilungseffektDokumentieren: (data) => verteilungseffektDokumentieren(db, data),
    itSystemSchutzbedarfVererben: (data) => itSystemSchutzbedarfVererben(db, data),
  };
}
