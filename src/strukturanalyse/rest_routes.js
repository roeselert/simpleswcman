/**
 * Strukturanalyse REST routes.
 * Maps HTTP method+path to service calls. Each handler receives
 * { body, params, query } and returns the value to JSON-encode.
 */

import * as s from './services.js';

export function strukturanalyseRoutes(db) {
  return [
    // Informationsverbund
    { method: 'POST', path: '/api/sa/verbund', handler: (req) => s.verbundAnlegen(db, req.body) },
    { method: 'GET',  path: '/api/sa/verbund', handler: () => s.alleVerbundeAbrufen(db) },
    { method: 'GET',  path: '/api/sa/verbund/:id', handler: (req) => s.verbundAbrufen(db, req.params.id) },

    // Objektgruppe
    { method: 'POST', path: '/api/sa/objektgruppe', handler: (req) => s.objektgruppeAnlegen(db, req.body) },
    { method: 'GET',  path: '/api/sa/objektgruppe', handler: (req) => s.objektgruppenAbrufen(db, req.query.verbund_id) },

    // Geschäftsprozess
    { method: 'POST', path: '/api/sa/prozess', handler: (req) => s.prozessAnlegen(db, req.body) },
    { method: 'GET',  path: '/api/sa/prozess', handler: (req) => s.prozesseByVerbundAbrufen(db, req.query.verbund_id) },
    { method: 'GET',  path: '/api/sa/prozess/:id', handler: (req) => s.prozessAbrufen(db, req.params.id) },
    { method: 'GET',  path: '/api/sa/prozess/:id/vollstaendigkeit', handler: (req) => s.prozessVollstaendigkeitPruefen(db, req.params.id) },

    // Information
    { method: 'POST', path: '/api/sa/information', handler: (req) => s.informationErfassen(db, req.body) },
    { method: 'GET',  path: '/api/sa/information', handler: (req) => s.informationenByProzessAbrufen(db, req.query.prozess_id) },

    // Anwendung
    { method: 'POST', path: '/api/sa/anwendung', handler: (req) => s.anwendungErfassen(db, req.body) },
    { method: 'POST', path: '/api/sa/anwendung-prozess', handler: (req) => s.anwendungProzessZuordnen(db, req.body.anwendung_id, req.body.prozess_id) },
    { method: 'GET',  path: '/api/sa/anwendungsmatrix', handler: (req) => s.anwendungsmatrixAbrufen(db, req.query.verbund_id) },
    { method: 'GET',  path: '/api/sa/anwendungen-ohne-prozess', handler: (req) => s.anwendungenOhneProzessPruefen(db, req.query.verbund_id) },

    // IT-System
    { method: 'POST', path: '/api/sa/itsystem', handler: (req) => s.itSystemErfassen(db, req.body) },
    { method: 'POST', path: '/api/sa/itsystem-anwendung', handler: (req) => s.itSystemAnwendungZuordnen(db, req.body.system_id, req.body.anwendung_id) },
    { method: 'GET',  path: '/api/sa/itsystem/:id', handler: (req) => s.itSystemAbrufen(db, req.params.id) },
    { method: 'GET',  path: '/api/sa/raum-itsystem-matrix', handler: (req) => s.raumItSystemMatrixAbrufen(db, req.query.verbund_id) },

    // Liegenschaft
    { method: 'POST', path: '/api/sa/liegenschaft', handler: (req) => s.liegenschaftAnlegen(db, req.body) },
    { method: 'GET',  path: '/api/sa/liegenschaft', handler: (req) => s.liegenschaftenByVerbundAbrufen(db, req.query.verbund_id) },
    { method: 'GET',  path: '/api/sa/liegenschaft/:id', handler: (req) => s.liegenschaftAbrufen(db, req.params.id) },

    // Raum
    { method: 'POST', path: '/api/sa/raum', handler: (req) => s.raumAnlegen(db, req.body) },
    { method: 'GET',  path: '/api/sa/raum', handler: (req) => s.raeumeByLiegenschaftAbrufen(db, req.query.liegenschaft_id) },
    { method: 'GET',  path: '/api/sa/raum/:id', handler: (req) => s.raumAbrufen(db, req.params.id) },

    // Netzverbindung
    { method: 'POST', path: '/api/sa/netzverbindung', handler: (req) => s.netzverbindungAnlegen(db, req.body) },
    { method: 'GET',  path: '/api/sa/netzverbindung', handler: (req) => s.netzverbindungenByVerbundAbrufen(db, req.query.verbund_id) },
    { method: 'GET',  path: '/api/sa/netzplan-vollstaendigkeit', handler: (req) => s.netzplanVollstaendigkeitPruefen(db, req.query.verbund_id) },
  ];
}
