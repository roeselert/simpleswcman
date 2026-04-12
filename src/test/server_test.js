/**
 * REST server integration test.
 * Spins up the HTTP server on a random port with a fresh PGlite db
 * and exercises a representative slice of routes from each module
 * to prove the wiring (router + body parsing + error mapping) works.
 */

import { PGlite } from '@electric-sql/pglite';
import { expect } from 'chai';
import { initDb } from '../db.js';
import { createServer } from '../server.js';

let server;
let baseUrl;

before(async () => {
  const db = new PGlite();
  await initDb(db);
  server = createServer(db);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(baseUrl + path, opts);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
}

describe('REST server – Strukturanalyse', () => {
  let verbundId;

  it('POST /api/sa/verbund creates a Verbund', async () => {
    const { status, data } = await api('POST', '/api/sa/verbund', {
      institution_name: 'REST Test GmbH',
      beschreibung: 'REST integration',
      geltungsbereich: 'Hauptstandort',
      erstellt_von: 'tester',
    });
    expect(status).to.equal(200);
    expect(data).to.have.property('verbund_id');
    verbundId = data.verbund_id;
  });

  it('GET /api/sa/verbund lists Verbunde', async () => {
    const { status, data } = await api('GET', '/api/sa/verbund');
    expect(status).to.equal(200);
    expect(data).to.be.an('array').with.length.greaterThan(0);
  });

  it('GET /api/sa/verbund/:id returns one Verbund', async () => {
    const { status, data } = await api('GET', `/api/sa/verbund/${verbundId}`);
    expect(status).to.equal(200);
    expect(data.institution_name).to.equal('REST Test GmbH');
  });

  it('POST /api/sa/verbund returns 400 with error message on validation failure', async () => {
    const { status, data } = await api('POST', '/api/sa/verbund', {
      institution_name: '',
      beschreibung: 'x',
      geltungsbereich: 'x',
      erstellt_von: 'x',
    });
    expect(status).to.equal(400);
    expect(data.error).to.include('Institutionsname');
  });

  it('GET on missing route returns 404', async () => {
    const { status } = await api('GET', '/api/sa/does-not-exist');
    expect(status).to.equal(404);
  });

  it('GET /api/sa/verbund/:id returns 404 for unknown id', async () => {
    const { status, data } = await api('GET', '/api/sa/verbund/no-such-id');
    expect(status).to.equal(404);
    expect(data.error).to.match(/nicht gefunden/);
  });

  it('POST /api/sa/liegenschaft + GET round-trip', async () => {
    const create = await api('POST', '/api/sa/liegenschaft', {
      verbund_id: verbundId,
      bezeichnung: 'Bonn HQ',
      typ: 'Hauptstandort',
    });
    expect(create.status).to.equal(200);
    const list = await api('GET', `/api/sa/liegenschaft?verbund_id=${verbundId}`);
    expect(list.status).to.equal(200);
    expect(list.data).to.be.an('array').with.length(1);
    expect(list.data[0].bezeichnung).to.equal('Bonn HQ');
  });
});

describe('REST server – Schutzbedarf', () => {
  let verbundId;

  before(async () => {
    const { data } = await api('POST', '/api/sa/verbund', {
      institution_name: 'SB REST Test',
      beschreibung: 'x',
      geltungsbereich: 'x',
      erstellt_von: 'x',
    });
    verbundId = data.verbund_id;
  });

  it('POST /api/sb/kategorie creates and GET lists', async () => {
    const create = await api('POST', '/api/sb/kategorie', {
      verbund_id: verbundId,
      bezeichnung: 'normal',
      schadensszenario: 'Bis 50.000 EUR',
      beschreibung: 'Begrenzte Auswirkungen',
      konkretisierung: 'Schaden < 50k',
    });
    expect(create.status).to.equal(200);

    const list = await api('GET', `/api/sb/kategorie?verbund_id=${verbundId}`);
    expect(list.status).to.equal(200);
    expect(list.data).to.be.an('array').with.length(1);
  });
});

describe('REST server – Modellierung', () => {
  it('POST /api/mod/baustein/init seeds standard Bausteine', async () => {
    const init = await api('POST', '/api/mod/baustein/init');
    expect(init.status).to.equal(200);
    expect(init.data).to.be.a('number').that.is.greaterThan(0);

    const list = await api('GET', '/api/mod/baustein');
    expect(list.status).to.equal(200);
    expect(list.data).to.be.an('array').with.length.greaterThan(0);
  });
});

describe('REST server – static files', () => {
  it('GET / serves index.html', async () => {
    const res = await fetch(baseUrl + '/');
    expect(res.status).to.equal(200);
    expect(res.headers.get('content-type')).to.match(/text\/html/);
    const body = await res.text();
    expect(body).to.include('secman');
  });

  it('GET /app.js serves the client script', async () => {
    const res = await fetch(baseUrl + '/app.js');
    expect(res.status).to.equal(200);
    expect(res.headers.get('content-type')).to.match(/javascript/);
  });

  it('GET /rest_client.js serves the REST client', async () => {
    const res = await fetch(baseUrl + '/rest_client.js');
    expect(res.status).to.equal(200);
  });
});
