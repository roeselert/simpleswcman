/**
 * Schutzbedarfsfeststellung REST routes.
 */

import {
  kategorieDefinieren, kategorienAbrufen,
  schadensbewertungSpeichern,
  schutzbedarfBerechnen, schutzbedarfAbschliessen, schutzbedarfAbrufen,
  kumulationseffektDokumentieren,
  verteilungseffektDokumentieren,
  itSystemSchutzbedarfVererben,
} from './services.js';

export function schutzbedarfRoutes(db) {
  return [
    { method: 'POST', path: '/api/sb/kategorie', handler: (req) => kategorieDefinieren(db, req.body) },
    { method: 'GET',  path: '/api/sb/kategorie', handler: (req) => kategorienAbrufen(db, req.query.verbund_id) },

    { method: 'POST', path: '/api/sb/bewertung', handler: (req) => schadensbewertungSpeichern(db, req.body) },

    { method: 'POST', path: '/api/sb/schutzbedarf/berechnen',
      handler: (req) => schutzbedarfBerechnen(db, req.body.zielobjekt_id, req.body.zielobjekt_typ, req.body.begruendung) },
    { method: 'POST', path: '/api/sb/schutzbedarf/abschliessen',
      handler: (req) => schutzbedarfAbschliessen(db, req.body.zielobjekt_id) },
    { method: 'GET',  path: '/api/sb/schutzbedarf/:zielobjekt_id',
      handler: (req) => schutzbedarfAbrufen(db, req.params.zielobjekt_id) },

    { method: 'POST', path: '/api/sb/schutzbedarf/kumulation', handler: (req) => kumulationseffektDokumentieren(db, req.body) },
    { method: 'POST', path: '/api/sb/schutzbedarf/verteilung', handler: (req) => verteilungseffektDokumentieren(db, req.body) },
    { method: 'POST', path: '/api/sb/schutzbedarf/vererbung',  handler: (req) => itSystemSchutzbedarfVererben(db, req.body) },
  ];
}
