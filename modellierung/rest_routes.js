/**
 * Modellierung REST routes.
 */

import {
  bausteinAnlegen, bausteinAbrufen, alleBausteineAbrufen,
  bausteinZuordnen, anforderungAnpassen,
  eintraegeByVerbundAbrufen, eintraegeByZielobjektAbrufen,
  dokumentationErstellen, dokumentationenAbrufen,
  standardBausteineInitialisieren,
} from './services.js';

export function modellierungRoutes(db) {
  return [
    // Baustein
    { method: 'POST', path: '/api/mod/baustein', handler: (req) => bausteinAnlegen(db, req.body) },
    { method: 'GET',  path: '/api/mod/baustein', handler: () => alleBausteineAbrufen(db) },
    { method: 'GET',  path: '/api/mod/baustein/:id', handler: (req) => bausteinAbrufen(db, req.params.id) },
    { method: 'POST', path: '/api/mod/baustein/init', handler: () => standardBausteineInitialisieren(db) },

    // Modellierungseintrag
    { method: 'POST', path: '/api/mod/eintrag', handler: (req) => bausteinZuordnen(db, req.body) },
    { method: 'PUT',  path: '/api/mod/eintrag/:id/anpassung', handler: (req) => anforderungAnpassen(db, req.params.id, req.body) },
    { method: 'GET',  path: '/api/mod/eintrag', handler: (req) => {
      if (req.query.zielobjekt_id) return eintraegeByZielobjektAbrufen(db, req.query.zielobjekt_id);
      return eintraegeByVerbundAbrufen(db, req.query.verbund_id);
    } },

    // Dokumentation
    { method: 'POST', path: '/api/mod/dokumentation', handler: (req) => dokumentationErstellen(db, req.body) },
    { method: 'GET',  path: '/api/mod/dokumentation', handler: (req) => dokumentationenAbrufen(db, req.query.verbund_id) },
  ];
}
