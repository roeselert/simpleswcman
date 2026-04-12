/**
 * Browser-side REST clients.
 *
 * Each `create*Client()` returns an object with the same method
 * surface as the corresponding local adapter, so app.js doesn't
 * need to know whether it's talking to PGlite directly or to the
 * REST backend.
 */

async function request(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined && body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data;
}

function get(path, query) {
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, v);
    }
    const qs = params.toString();
    if (qs) path = `${path}?${qs}`;
  }
  return request('GET', path);
}
const post = (p, b) => request('POST', p, b);
const put  = (p, b) => request('PUT',  p, b);
const enc  = encodeURIComponent;

// ─── Strukturanalyse ──────────────────────────────────────────────────────────
export function createStrukturanalyseClient() {
  return {
    verbundAnlegen: (data) => post('/api/sa/verbund', data),
    alleVerbundeAbrufen: () => get('/api/sa/verbund'),
    verbundAbrufen: (id) => get(`/api/sa/verbund/${enc(id)}`),

    objektgruppeAnlegen: (data) => post('/api/sa/objektgruppe', data),
    objektgruppenAbrufen: (verbund_id) => get('/api/sa/objektgruppe', { verbund_id }),

    prozessAnlegen: (data) => post('/api/sa/prozess', data),
    prozessAbrufen: (id) => get(`/api/sa/prozess/${enc(id)}`),
    prozesseByVerbundAbrufen: (verbund_id) => get('/api/sa/prozess', { verbund_id }),

    informationErfassen: (data) => post('/api/sa/information', data),
    informationenByProzessAbrufen: (prozess_id) => get('/api/sa/information', { prozess_id }),
    prozessVollstaendigkeitPruefen: (prozess_id) => get(`/api/sa/prozess/${enc(prozess_id)}/vollstaendigkeit`),

    anwendungErfassen: (data) => post('/api/sa/anwendung', data),
    anwendungProzessZuordnen: (anwendung_id, prozess_id) =>
      post('/api/sa/anwendung-prozess', { anwendung_id, prozess_id }),
    anwendungsmatrixAbrufen: (verbund_id) => get('/api/sa/anwendungsmatrix', { verbund_id }),
    anwendungenOhneProzessPruefen: (verbund_id) => get('/api/sa/anwendungen-ohne-prozess', { verbund_id }),

    itSystemErfassen: (data) => post('/api/sa/itsystem', data),
    itSystemAnwendungZuordnen: (system_id, anwendung_id) =>
      post('/api/sa/itsystem-anwendung', { system_id, anwendung_id }),
    itSystemAbrufen: (id) => get(`/api/sa/itsystem/${enc(id)}`),
    raumItSystemMatrixAbrufen: (verbund_id) => get('/api/sa/raum-itsystem-matrix', { verbund_id }),

    liegenschaftAnlegen: (data) => post('/api/sa/liegenschaft', data),
    liegenschaftAbrufen: (id) => get(`/api/sa/liegenschaft/${enc(id)}`),
    liegenschaftenByVerbundAbrufen: (verbund_id) => get('/api/sa/liegenschaft', { verbund_id }),

    raumAnlegen: (data) => post('/api/sa/raum', data),
    raumAbrufen: (id) => get(`/api/sa/raum/${enc(id)}`),
    raeumeByLiegenschaftAbrufen: (liegenschaft_id) => get('/api/sa/raum', { liegenschaft_id }),

    netzverbindungAnlegen: (data) => post('/api/sa/netzverbindung', data),
    netzverbindungenByVerbundAbrufen: (verbund_id) => get('/api/sa/netzverbindung', { verbund_id }),
    netzplanVollstaendigkeitPruefen: (verbund_id) => get('/api/sa/netzplan-vollstaendigkeit', { verbund_id }),
  };
}

// ─── Schutzbedarfsfeststellung ────────────────────────────────────────────────
export function createSchutzbedarfClient() {
  return {
    kategorieDefinieren: (data) => post('/api/sb/kategorie', data),
    kategorienAbrufen: (verbund_id) => get('/api/sb/kategorie', { verbund_id }),

    schadensbewertungSpeichern: (data) => post('/api/sb/bewertung', data),

    schutzbedarfBerechnen: (zielobjekt_id, zielobjekt_typ, begruendung) =>
      post('/api/sb/schutzbedarf/berechnen', { zielobjekt_id, zielobjekt_typ, begruendung }),
    schutzbedarfAbschliessen: (zielobjekt_id) =>
      post('/api/sb/schutzbedarf/abschliessen', { zielobjekt_id }),
    schutzbedarfAbrufen: (zielobjekt_id) =>
      get(`/api/sb/schutzbedarf/${enc(zielobjekt_id)}`),

    kumulationseffektDokumentieren: (data) => post('/api/sb/schutzbedarf/kumulation', data),
    verteilungseffektDokumentieren: (data) => post('/api/sb/schutzbedarf/verteilung', data),
    itSystemSchutzbedarfVererben: (data) => post('/api/sb/schutzbedarf/vererbung', data),
  };
}

// ─── Modellierung ─────────────────────────────────────────────────────────────
export function createModellierungClient() {
  return {
    bausteinAnlegen: (data) => post('/api/mod/baustein', data),
    bausteinAbrufen: (baustein_id) => get(`/api/mod/baustein/${enc(baustein_id)}`),
    alleBausteineAbrufen: () => get('/api/mod/baustein'),
    standardBausteineInitialisieren: () => post('/api/mod/baustein/init'),

    bausteinZuordnen: (data) => post('/api/mod/eintrag', data),
    anforderungAnpassen: (eintrag_id, data) =>
      put(`/api/mod/eintrag/${enc(eintrag_id)}/anpassung`, data),
    eintraegeByVerbundAbrufen: (verbund_id) => get('/api/mod/eintrag', { verbund_id }),
    eintraegeByZielobjektAbrufen: (zielobjekt_id) => get('/api/mod/eintrag', { zielobjekt_id }),

    dokumentationErstellen: (data) => post('/api/mod/dokumentation', data),
    dokumentationenAbrufen: (verbund_id) => get('/api/mod/dokumentation', { verbund_id }),
  };
}
