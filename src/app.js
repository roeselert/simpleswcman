/**
 * secman – BSI IT-Grundschutz Management
 * Single-page app initializing PGlite and rendering all 3 feature modules.
 */
import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js';
import { initDb } from './db.js';
import { createAdapter as createSAAdapter } from './strukturanalyse/adapter.js';
import { createAdapter as createSBAdapter } from './schutzbedarfsfeststellung/adapter.js';
import { createAdapter as createModAdapter } from './modellierung/adapter.js';

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ─── State ────────────────────────────────────────────────────────────────────
const S = {
  db: null,
  sa: null,
  sb: null,
  mod: null,
  verbundId: null,
  verbundName: null,
  module: 'home',
  sub: 'verbund',
};

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function init() {
  try {
    S.db = new PGlite();
    await initDb(S.db);
    S.sa = createSAAdapter(S.db);
    S.sb = createSBAdapter(S.db);
    S.mod = createModAdapter(S.db);
    renderShell();
  } catch (e) {
    document.getElementById('app').innerHTML = msgHtml(e.message, 'error');
  }
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function renderShell() {
  document.getElementById('app').innerHTML = `
    <div class="layout">
      <nav id="sidebar" class="sidebar"></nav>
      <main id="pane" class="pane"></main>
    </div>`;
  updateSidebar();
  renderPane();
}

function updateSidebar() {
  const vbox = S.verbundId
    ? `<div class="vbox active"><span class="vb-label">Aktiver Verbund</span><span class="vb-name">${esc(S.verbundName)}</span></div>`
    : `<div class="vbox"><span class="vb-label">Kein Verbund ausgewählt</span></div>`;
  const navItems = [
    ['home', '🏛', 'Verbund'],
    ['sa', '📊', 'Strukturanalyse'],
    ['sb', '🛡', 'Schutzbedarf'],
    ['mod', '📐', 'Modellierung'],
  ];
  const nav = navItems.map(([id, icon, label]) =>
    `<button class="nbtn${S.module === id ? ' active' : ''}" data-nav="${id}">${icon} ${label}</button>`
  ).join('');
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `${vbox}<div class="navlist">${nav}</div>`;
  sidebar.addEventListener('click', e => {
    const btn = e.target.closest('[data-nav]');
    if (btn) navigate(btn.dataset.nav);
  });
}

function navigate(module, sub) {
  S.module = module;
  S.sub = sub || defaultSub(module);
  updateSidebar();
  renderPane();
}

function defaultSub(m) {
  const map = { home: 'verbund', sa: 'liegenschaft', sb: 'kategorie', mod: 'bausteine' };
  return map[m] || 'main';
}

// ─── Pane ────────────────────────────────────────────────────────────────────
async function renderPane() {
  const pane = document.getElementById('pane');
  pane.innerHTML = '<p class="loading">Wird geladen…</p>';
  try {
    const html = await buildContent();
    pane.innerHTML = html;
    bindPane(pane);
  } catch (e) {
    pane.innerHTML = msgHtml(e.message, 'error');
  }
}

async function buildContent() {
  switch (S.module) {
    case 'home': return buildHome();
    case 'sa':   return buildSA();
    case 'sb':   return buildSB();
    case 'mod':  return buildMod();
    default:     return '<p>Unbekanntes Modul</p>';
  }
}

function bindPane(root) {
  root.querySelectorAll('[data-sub]').forEach(btn =>
    btn.addEventListener('click', () => { S.sub = btn.dataset.sub; renderPane(); })
  );
  root.querySelectorAll('form[data-action]').forEach(form =>
    form.addEventListener('submit', async e => { e.preventDefault(); await submitForm(form); })
  );
  root.querySelectorAll('button[data-action]').forEach(btn =>
    btn.addEventListener('click', async () => { await clickAction(btn); })
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
async function buildHome() {
  const verbunde = await S.sa.alleVerbundeAbrufen();
  const rows = verbunde.map(v => `
    <tr>
      <td>${esc(v.institution_name)}</td>
      <td>${esc(v.geltungsbereich)}</td>
      <td>${esc(v.erstellt_von)}</td>
      <td>${esc(v.erstellt_am ? v.erstellt_am.substring(0, 10) : '')}</td>
      <td><button class="btn btn-sm" data-action="select-verbund"
            data-id="${v.verbund_id}" data-name="${esc(v.institution_name)}">Auswählen</button></td>
    </tr>`).join('') || `<tr><td colspan="5" class="empty">Noch keine Verbunde vorhanden</td></tr>`;

  return `<div class="pane-inner">
    <h2>Informationsverbund</h2>
    <div id="msg-home"></div>
    <div class="card">
      <h3>Neuen Verbund anlegen</h3>
      <form data-action="create-verbund">
        <div class="fg-2col">
          ${fg('Institutionsname *', 'institution_name', { required: true })}
          ${fg('Geltungsbereich *', 'geltungsbereich', { required: true })}
        </div>
        ${fg('Beschreibung *', 'beschreibung', { type: 'textarea', rows: 2, required: true })}
        ${fg('Erstellt von *', 'erstellt_von', { required: true })}
        <button class="btn" type="submit">Verbund anlegen</button>
      </form>
    </div>
    <div class="card">
      <h3>Vorhandene Verbunde</h3>
      <table class="tbl">
        <thead><tr><th>Name</th><th>Geltungsbereich</th><th>Erstellt von</th><th>Datum</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

// ─── Strukturanalyse ──────────────────────────────────────────────────────────
async function buildSA() {
  if (!S.verbundId) return noVerbund();
  const tabItems = [
    ['liegenschaft','Liegenschaft'], ['raum','Raum'], ['prozess','Prozess'],
    ['information','Information'], ['anwendung','Anwendung'],
    ['itsystem','IT-System'], ['netzverbindung','Netzverbindung'], ['objektgruppe','Objektgruppe'],
  ];
  const tabBar = tabItems.map(([id, label]) =>
    `<button class="tab${S.sub === id ? ' active' : ''}" data-sub="${id}">${label}</button>`
  ).join('');
  const subContent = await buildSASub();
  return `<div class="pane-inner">
    <h2>Strukturanalyse</h2>
    <div class="tabs">${tabBar}</div>
    ${subContent}
  </div>`;
}

async function buildSASub() {
  switch (S.sub) {
    case 'liegenschaft':   return buildLiegenschaft();
    case 'raum':           return buildRaum();
    case 'prozess':        return buildProzess();
    case 'information':    return buildInformation();
    case 'anwendung':      return buildAnwendung();
    case 'itsystem':       return buildItSystem();
    case 'netzverbindung': return buildNetzverbindung();
    case 'objektgruppe':   return buildObjektgruppe();
    default:               return '';
  }
}

async function buildLiegenschaft() {
  const list = await S.sa.liegenschaftenByVerbundAbrufen(S.verbundId);
  const rows = list.map(l =>
    `<tr><td>${esc(l.bezeichnung)}</td><td>${esc(l.typ)}</td></tr>`
  ).join('') || `<tr><td colspan="2" class="empty">Keine Liegenschaften</td></tr>`;
  return `<div id="msg-ls"></div>
    <div class="card">
      <h3>Liegenschaft anlegen</h3>
      <form data-action="create-liegenschaft">
        <div class="fg-2col">
          ${fg('Bezeichnung *', 'bezeichnung', { required: true })}
          ${fg('Typ *', 'typ', { type: 'select', options: ['Hauptstandort','Außenstelle','RZ'], required: true })}
        </div>
        <button class="btn" type="submit">Anlegen</button>
      </form>
    </div>
    <div class="card">
      <h3>Liegenschaften (${list.length})</h3>
      <table class="tbl">
        <thead><tr><th>Bezeichnung</th><th>Typ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function buildRaum() {
  const liegenschaften = await S.sa.liegenschaftenByVerbundAbrufen(S.verbundId);
  const lsOpts = liegenschaften.map(l => [l.liegenschaft_id, `${l.bezeichnung} (${l.typ})`]);
  return `<div id="msg-raum"></div>
    <div class="card">
      <h3>Raum anlegen</h3>
      ${liegenschaften.length === 0
        ? '<p class="empty">Bitte zuerst eine Liegenschaft anlegen.</p>'
        : `<form data-action="create-raum">
          ${fg('Liegenschaft *', 'liegenschaft_id', { type: 'select', options: lsOpts, required: true })}
          <div class="fg-2col">
            ${fg('Bezeichnung *', 'bezeichnung', { required: true })}
            ${fg('Typ *', 'typ', { type: 'select', options: ['Serverraum','Büro','Archiv','Besprechung','Sonstig'], required: true })}
          </div>
          ${fg('Verantwortlicher *', 'verantwortlicher', { required: true })}
          <button class="btn" type="submit">Anlegen</button>
        </form>`}
    </div>`;
}

async function buildProzess() {
  const list = await S.sa.prozesseByVerbundAbrufen(S.verbundId);
  const rows = list.map(p =>
    `<tr><td>${esc(p.bezeichnung)}</td><td>${esc(p.verantwortlicher)}</td><td>${esc(p.beschreibung)}</td></tr>`
  ).join('') || `<tr><td colspan="3" class="empty">Keine Prozesse</td></tr>`;
  return `<div id="msg-prozess"></div>
    <div class="card">
      <h3>Geschäftsprozess anlegen</h3>
      <form data-action="create-prozess">
        <div class="fg-2col">
          ${fg('Bezeichnung *', 'bezeichnung', { required: true })}
          ${fg('Verantwortlicher *', 'verantwortlicher', { required: true })}
        </div>
        ${fg('Beschreibung *', 'beschreibung', { type: 'textarea', rows: 2, required: true })}
        ${fg('Rechtliche Vorgaben', 'rechtl_vorgaben')}
        <button class="btn" type="submit">Anlegen</button>
      </form>
    </div>
    <div class="card">
      <h3>Geschäftsprozesse (${list.length})</h3>
      <table class="tbl">
        <thead><tr><th>Bezeichnung</th><th>Verantwortlicher</th><th>Beschreibung</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function buildInformation() {
  const prozesse = await S.sa.prozesseByVerbundAbrufen(S.verbundId);
  const pOpts = prozesse.map(p => [p.prozess_id, p.bezeichnung]);
  const schutzOpts = ['normal', 'hoch', 'sehr hoch'];
  return `<div id="msg-info"></div>
    <div class="card">
      <h3>Information erfassen</h3>
      ${prozesse.length === 0
        ? '<p class="empty">Bitte zuerst einen Geschäftsprozess anlegen.</p>'
        : `<form data-action="create-information">
          ${fg('Prozess *', 'prozess_id', { type: 'select', options: pOpts, required: true })}
          ${fg('Bezeichnung *', 'bezeichnung', { required: true })}
          <div class="fg-row">
            ${fg('Vertraulichkeit (C) *', 'vertraulichkeit', { type: 'select', options: schutzOpts, required: true })}
            ${fg('Integrität (I) *', 'integritaet', { type: 'select', options: schutzOpts, required: true })}
            ${fg('Verfügbarkeit (A) *', 'verfuegbarkeit', { type: 'select', options: schutzOpts, required: true })}
          </div>
          <label class="fg-inline"><input type="checkbox" name="datenschutz_relevant"> Datenschutzrelevant</label>
          <br><br>
          <button class="btn" type="submit">Erfassen</button>
        </form>`}
    </div>`;
}

async function buildAnwendung() {
  const { anwendungen, prozesse, matrix } = await S.sa.anwendungsmatrixAbrufen(S.verbundId);
  const rows = anwendungen.map(a => {
    const entry = matrix.find(m => m.anwendung.anwendung_id === a.anwendung_id);
    const pNames = entry ? entry.prozesse.map(p => p.bezeichnung).join(', ') || '—' : '—';
    return `<tr><td>${esc(a.bezeichnung)}</td><td>${esc(a.plattform)}</td><td>${esc(a.verantwortlicher)}</td><td>${esc(pNames)}</td></tr>`;
  }).join('') || `<tr><td colspan="4" class="empty">Keine Anwendungen</td></tr>`;

  const aOpts = anwendungen.map(a => [a.anwendung_id, a.bezeichnung]);
  const pOpts = prozesse.map(p => [p.prozess_id, p.bezeichnung]);

  return `<div id="msg-aw"></div>
    <div class="card">
      <h3>Anwendung erfassen</h3>
      <form data-action="create-anwendung">
        <div class="fg-2col">
          ${fg('Bezeichnung *', 'bezeichnung', { required: true })}
          ${fg('Plattform *', 'plattform', { required: true })}
        </div>
        <div class="fg-2col">
          ${fg('Verantwortlicher *', 'verantwortlicher', { required: true })}
          ${fg('Beschreibung', 'beschreibung')}
        </div>
        <button class="btn" type="submit">Erfassen</button>
      </form>
    </div>
    ${aOpts.length && pOpts.length ? `
    <div class="card">
      <h3>Anwendung einem Prozess zuordnen</h3>
      <form data-action="link-anwendung-prozess">
        <div class="fg-2col">
          ${fg('Anwendung', 'anwendung_id', { type: 'select', options: aOpts })}
          ${fg('Prozess', 'prozess_id', { type: 'select', options: pOpts })}
        </div>
        <button class="btn btn-secondary" type="submit">Zuordnen</button>
      </form>
    </div>` : ''}
    <div class="card">
      <h3>Anwendungen (${anwendungen.length})</h3>
      <table class="tbl">
        <thead><tr><th>Bezeichnung</th><th>Plattform</th><th>Verantwortlicher</th><th>Prozesse</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function buildItSystem() {
  const matrix = await S.sa.raumItSystemMatrixAbrufen(S.verbundId);
  const allSysteme = Object.values(matrix).flat();
  const { anwendungen } = await S.sa.anwendungsmatrixAbrufen(S.verbundId);

  const rows = allSysteme.map(s =>
    `<tr><td>${esc(s.bezeichnung)}</td><td>${esc(s.typ)}</td><td>${esc(s.betriebssystem)}</td><td>${esc(s.status)}</td><td>${esc(s.verantwortlicher)}</td></tr>`
  ).join('') || `<tr><td colspan="5" class="empty">Keine IT-Systeme</td></tr>`;

  const sOpts = allSysteme.map(s => [s.system_id, s.bezeichnung]);
  const aOpts = anwendungen.map(a => [a.anwendung_id, a.bezeichnung]);

  return `<div id="msg-sys"></div>
    <div class="card">
      <h3>IT-System erfassen</h3>
      <form data-action="create-itsystem">
        <div class="fg-2col">
          ${fg('Bezeichnung *', 'bezeichnung', { required: true })}
          ${fg('Typ *', 'typ', { type: 'select', options: ['Server','Client','Netzkomponente','Mobilgerät','ICS','Sonstiges'], required: true })}
        </div>
        <div class="fg-2col">
          ${fg('Betriebssystem *', 'betriebssystem', { required: true })}
          ${fg('Status *', 'status', { type: 'select', options: ['aktiv','geplant','außer Betrieb'], required: true })}
        </div>
        ${fg('Verantwortlicher *', 'verantwortlicher', { required: true })}
        <button class="btn" type="submit">Erfassen</button>
      </form>
    </div>
    ${sOpts.length && aOpts.length ? `
    <div class="card">
      <h3>IT-System einer Anwendung zuordnen</h3>
      <form data-action="link-system-anwendung">
        <div class="fg-2col">
          ${fg('IT-System', 'system_id', { type: 'select', options: sOpts })}
          ${fg('Anwendung', 'anwendung_id', { type: 'select', options: aOpts })}
        </div>
        <button class="btn btn-secondary" type="submit">Zuordnen</button>
      </form>
    </div>` : ''}
    <div class="card">
      <h3>IT-Systeme (${allSysteme.length})</h3>
      <table class="tbl">
        <thead><tr><th>Bezeichnung</th><th>Typ</th><th>Betriebssystem</th><th>Status</th><th>Verantwortlicher</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function buildNetzverbindung() {
  const matrix = await S.sa.raumItSystemMatrixAbrufen(S.verbundId);
  const allSysteme = Object.values(matrix).flat();
  const verbindungen = await S.sa.netzverbindungenByVerbundAbrufen(S.verbundId);

  if (allSysteme.length < 2) {
    return `<div class="card"><p class="empty">Bitte zuerst mindestens zwei IT-Systeme erfassen.</p></div>`;
  }

  const sOpts = allSysteme.map(s => [s.system_id, s.bezeichnung]);
  const sMap = Object.fromEntries(allSysteme.map(s => [s.system_id, s.bezeichnung]));
  const rows = verbindungen.map(v =>
    `<tr><td>${esc(sMap[v.system_von] || v.system_von)}</td><td>${esc(sMap[v.system_nach] || v.system_nach)}</td>
     <td>${esc(v.verbindungstyp)}</td><td>${v.verschluesselt ? 'Ja' : 'Nein'}</td><td>${v.extern ? 'Ja' : 'Nein'}</td></tr>`
  ).join('') || `<tr><td colspan="5" class="empty">Keine Netzverbindungen</td></tr>`;

  return `<div id="msg-netz"></div>
    <div class="card">
      <h3>Netzverbindung anlegen</h3>
      <form data-action="create-netzverbindung">
        <div class="fg-2col">
          ${fg('Ausgangssystem *', 'system_von', { type: 'select', options: sOpts, required: true })}
          ${fg('Zielsystem *', 'system_nach', { type: 'select', options: sOpts, required: true })}
        </div>
        <div class="fg-2col">
          ${fg('Verbindungstyp *', 'verbindungstyp', { type: 'select', options: ['LAN','WAN','WLAN','VPN','Internet'], required: true })}
          ${fg('Netzsegment', 'netzsegment')}
        </div>
        <div style="display:flex;gap:1.5rem;margin-bottom:0.875rem">
          <label class="fg-inline"><input type="checkbox" name="verschluesselt"> Verschlüsselt</label>
          <label class="fg-inline"><input type="checkbox" name="extern"> Extern</label>
        </div>
        <button class="btn" type="submit">Anlegen</button>
      </form>
    </div>
    <div class="card">
      <h3>Netzverbindungen (${verbindungen.length})</h3>
      <table class="tbl">
        <thead><tr><th>Von</th><th>Nach</th><th>Typ</th><th>Verschlüsselt</th><th>Extern</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function buildObjektgruppe() {
  const gruppen = await S.sa.objektgruppenAbrufen(S.verbundId);
  const rows = gruppen.map(g =>
    `<tr><td>${esc(g.bezeichnung)}</td><td>${esc(g.typ)}</td><td>${g.anzahl}</td><td>${esc(g.gruppierungskriterium)}</td></tr>`
  ).join('') || `<tr><td colspan="4" class="empty">Keine Objektgruppen</td></tr>`;

  return `<div id="msg-og"></div>
    <div class="card">
      <h3>Objektgruppe anlegen</h3>
      <form data-action="create-objektgruppe">
        <div class="fg-2col">
          ${fg('Bezeichnung *', 'bezeichnung', { required: true })}
          ${fg('Typ *', 'typ', { type: 'select', options: ['IT-System','Anwendung','Raum','Kommunikationslink'], required: true })}
        </div>
        <div class="fg-2col">
          ${fg('Anzahl Objekte *', 'anzahl', { type: 'number', value: '1', required: true })}
          ${fg('Gruppierungskriterium', 'gruppierungskriterium')}
        </div>
        <button class="btn" type="submit">Anlegen</button>
      </form>
    </div>
    <div class="card">
      <h3>Objektgruppen (${gruppen.length})</h3>
      <table class="tbl">
        <thead><tr><th>Bezeichnung</th><th>Typ</th><th>Anzahl</th><th>Kriterium</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ─── Schutzbedarfsfeststellung ────────────────────────────────────────────────
async function buildSB() {
  if (!S.verbundId) return noVerbund();
  const tabItems = [
    ['kategorie','Kategorien'], ['bewertung','Schadensbewertung'], ['schutzbedarf','Schutzbedarf'],
  ];
  const tabBar = tabItems.map(([id, label]) =>
    `<button class="tab${S.sub === id ? ' active' : ''}" data-sub="${id}">${label}</button>`
  ).join('');
  const subContent = await buildSBSub();
  return `<div class="pane-inner">
    <h2>Schutzbedarfsfeststellung</h2>
    <div class="tabs">${tabBar}</div>
    ${subContent}
  </div>`;
}

async function buildSBSub() {
  switch (S.sub) {
    case 'kategorie':   return buildKategorie();
    case 'bewertung':   return buildSchadensbewertung();
    case 'schutzbedarf': return buildSchutzbedarf();
    default:            return '';
  }
}

async function buildKategorie() {
  const kategorien = await S.sb.kategorienAbrufen(S.verbundId);
  const rows = kategorien.map(k => `
    <tr>
      <td><span class="badge badge-${badgeClass(k.bezeichnung)}">${esc(k.bezeichnung)}</span></td>
      <td>${esc(k.schadensszenario)}</td>
      <td>${esc(k.beschreibung)}</td>
      <td>${esc(k.konkretisierung)}</td>
    </tr>`).join('') || `<tr><td colspan="4" class="empty">Keine Kategorien definiert</td></tr>`;

  return `<div id="msg-kat"></div>
    <div class="card">
      <h3>Schutzbedarfskategorie definieren</h3>
      <form data-action="create-kategorie">
        <div class="fg-2col">
          ${fg('Stufe *', 'bezeichnung', { type: 'select', options: ['normal','hoch','sehr hoch'], required: true })}
          ${fg('Schadensszenario *', 'schadensszenario', { type: 'select', options: ['Gesetz','Selbstbestimmung','Unversehrtheit','Aufgabenerfüllung','Finanziell','Außenwirkung'], required: true })}
        </div>
        ${fg('Beschreibung *', 'beschreibung', { type: 'textarea', rows: 2, required: true })}
        ${fg('Konkretisierung (institutionsspezifisch) *', 'konkretisierung', { type: 'textarea', rows: 2, required: true })}
        ${fg('Freigabedatum', 'freigabe_datum', { type: 'date' })}
        <button class="btn" type="submit">Definieren</button>
      </form>
    </div>
    <div class="card">
      <h3>Definierte Kategorien (${kategorien.length})</h3>
      <table class="tbl">
        <thead><tr><th>Stufe</th><th>Szenario</th><th>Beschreibung</th><th>Konkretisierung</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function buildSchadensbewertung() {
  const zielobjekte = await getZielobjekte();
  if (zielobjekte.length === 0) {
    return `<div class="card"><p class="empty">Bitte zuerst Anwendungen, Prozesse oder IT-Systeme in der Strukturanalyse anlegen.</p></div>`;
  }
  const zOpts = zielobjekte.map(z => [z.id, z.name]);
  return `<div id="msg-sbw"></div>
    <div class="card">
      <h3>Schadensbewertung speichern</h3>
      <form data-action="create-bewertung">
        ${fg('Zielobjekt *', 'zielobjekt_id', { type: 'select', options: zOpts, required: true })}
        <div class="fg-row">
          ${fg('Schadensszenario *', 'schadensszenario', { type: 'select', options: ['Gesetz','Selbstbestimmung','Unversehrtheit','Aufgabenerfüllung','Finanziell','Außenwirkung'], required: true })}
          ${fg('Grundwert *', 'grundwert', { type: 'select', options: ['Vertraulichkeit','Integrität','Verfügbarkeit'], required: true })}
          ${fg('Kategorie *', 'kategorie', { type: 'select', options: ['normal','hoch','sehr hoch'], required: true })}
        </div>
        ${fg('Begründung *', 'begruendung', { type: 'textarea', rows: 2, required: true })}
        ${fg('Bewertet von *', 'bewertet_von', { required: true })}
        <button class="btn" type="submit">Speichern</button>
      </form>
    </div>`;
}

async function buildSchutzbedarf() {
  const zielobjekte = await getZielobjekte();
  if (zielobjekte.length === 0) {
    return `<div class="card"><p class="empty">Bitte zuerst Zielobjekte in der Strukturanalyse anlegen.</p></div>`;
  }
  const zOpts = zielobjekte.map(z => [z.id, z.name]);

  // Load existing results
  const results = [];
  for (const z of zielobjekte) {
    try {
      const r = await S.sb.schutzbedarfAbrufen(z.id);
      if (r) results.push({ ...z, r });
    } catch { /* no result yet */ }
  }

  const resultRows = results.map(({ name, r }) => `
    <tr>
      <td>${esc(name)}</td>
      <td><span class="badge badge-${badgeClass(r.schutzbedarf_c)}">${r.schutzbedarf_c}</span></td>
      <td><span class="badge badge-${badgeClass(r.schutzbedarf_i)}">${r.schutzbedarf_i}</span></td>
      <td><span class="badge badge-${badgeClass(r.schutzbedarf_a)}">${r.schutzbedarf_a}</span></td>
      <td>${esc(r.vererbungsprinzip || '—')}</td>
      <td>${esc(r.status)}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="empty">Noch keine Schutzbedarf-Ergebnisse</td></tr>`;

  return `<div id="msg-sb"></div>
    <div class="card">
      <h3>Schutzbedarf berechnen (Maximumprinzip)</h3>
      <form data-action="berechne-schutzbedarf">
        <div class="fg-2col">
          ${fg('Zielobjekt *', 'zielobjekt_id', { type: 'select', options: zOpts, required: true })}
          ${fg('Typ *', 'zielobjekt_typ', { type: 'select', options: ['Anwendung','Geschäftsprozess','IT-System'], required: true })}
        </div>
        ${fg('Begründung (optional)', 'begruendung')}
        <button class="btn" type="submit">Berechnen</button>
      </form>
    </div>
    <div class="card">
      <h3>Schutzbedarf abschließen</h3>
      <form data-action="abschliessen-schutzbedarf">
        ${fg('Zielobjekt *', 'zielobjekt_id', { type: 'select', options: zOpts, required: true })}
        <button class="btn btn-success" type="submit">Abschließen</button>
      </form>
    </div>
    <div class="card">
      <h3>Schutzbedarf-Ergebnisse (${results.length})</h3>
      <table class="tbl">
        <thead><tr><th>Zielobjekt</th><th>C</th><th>I</th><th>A</th><th>Prinzip</th><th>Status</th></tr></thead>
        <tbody>${resultRows}</tbody>
      </table>
    </div>`;
}

// ─── Modellierung ─────────────────────────────────────────────────────────────
async function buildMod() {
  if (!S.verbundId) return noVerbund();
  const tabItems = [
    ['bausteine','Bausteine'], ['zuordnung','Zuordnung'], ['dokumentation','Dokumentation'],
  ];
  const tabBar = tabItems.map(([id, label]) =>
    `<button class="tab${S.sub === id ? ' active' : ''}" data-sub="${id}">${label}</button>`
  ).join('');
  const subContent = await buildModSub();
  return `<div class="pane-inner">
    <h2>Modellierung</h2>
    <div class="tabs">${tabBar}</div>
    ${subContent}
  </div>`;
}

async function buildModSub() {
  switch (S.sub) {
    case 'bausteine':    return buildBausteine();
    case 'zuordnung':    return buildZuordnung();
    case 'dokumentation': return buildDokumentation();
    default:             return '';
  }
}

async function buildBausteine() {
  const bausteine = await S.mod.alleBausteineAbrufen();
  const rows = bausteine.map(b =>
    `<tr><td>${esc(b.baustein_id)}</td><td>${esc(b.bezeichnung)}</td><td>${esc(b.schicht)}</td><td>${esc(b.anwendungstyp)}</td></tr>`
  ).join('') || `<tr><td colspan="4" class="empty">Keine Bausteine geladen</td></tr>`;

  return `<div id="msg-bs"></div>
    <div class="card">
      <h3>IT-Grundschutz-Kompendium</h3>
      <p style="font-size:0.85rem;color:#666;margin-bottom:1rem">Laden Sie die Standard-Bausteine des BSI IT-Grundschutz-Kompendiums 2023.</p>
      <button class="btn" data-action="init-bausteine">Bausteine initialisieren (IT-GS-Kompendium 2023)</button>
    </div>
    <div class="card">
      <h3>Bausteine im Kompendium (${bausteine.length})</h3>
      <table class="tbl">
        <thead><tr><th>ID</th><th>Bezeichnung</th><th>Schicht</th><th>Typ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function buildZuordnung() {
  const bausteine = await S.mod.alleBausteineAbrufen();
  const matrix = await S.sa.raumItSystemMatrixAbrufen(S.verbundId);
  const { anwendungen } = await S.sa.anwendungsmatrixAbrufen(S.verbundId);
  const allSysteme = Object.values(matrix).flat();

  if (bausteine.length === 0) {
    return `<div class="card"><p class="empty">Bitte zuerst Bausteine initialisieren.</p></div>`;
  }
  if (allSysteme.length === 0 && anwendungen.length === 0) {
    return `<div class="card"><p class="empty">Bitte zuerst IT-Systeme oder Anwendungen in der Strukturanalyse anlegen.</p></div>`;
  }

  const zielobjekte = [
    ...allSysteme.map(s => [s.system_id, `${s.bezeichnung} (IT-System)`]),
    ...anwendungen.map(a => [a.anwendung_id, `${a.bezeichnung} (Anwendung)`]),
  ];
  const bOpts = bausteine.map(b => [b.baustein_id, `${b.baustein_id} – ${b.bezeichnung}`]);

  const eintraege = await S.mod.eintraegeByVerbundAbrufen(S.verbundId);
  const bMap = Object.fromEntries(bausteine.map(b => [b.baustein_id, b.bezeichnung]));
  const eRows = eintraege.map(e => `
    <tr>
      <td title="${esc(e.zielobjekt_id)}">${esc(e.zielobjekt_id.substring(0, 8))}…</td>
      <td>${esc(e.baustein_id)}</td>
      <td>${esc(bMap[e.baustein_id] || '—')}</td>
      <td>${e.anwendbar ? 'Ja' : 'Nein'}</td>
      <td>${e.anforderung_angepasst ? '✓' : '—'}</td>
      <td>${esc(e.erstellt_von)}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="empty">Keine Einträge</td></tr>`;

  return `<div id="msg-zu"></div>
    <div class="card">
      <h3>Baustein zuordnen</h3>
      <form data-action="create-zuordnung">
        ${fg('Zielobjekt *', 'zielobjekt_id', { type: 'select', options: zielobjekte, required: true })}
        ${fg('Baustein *', 'baustein_id', { type: 'select', options: bOpts, required: true })}
        <label class="fg-inline" style="margin-bottom:0.875rem"><input type="checkbox" name="anwendbar" checked> Anwendbar</label>
        ${fg('Begründung *', 'begruendung', { type: 'textarea', rows: 2, required: true })}
        ${fg('Erstellt von', 'erstellt_von', { value: 'ISB' })}
        <button class="btn" type="submit">Zuordnen</button>
      </form>
    </div>
    <div class="card">
      <h3>Modellierungseinträge (${eintraege.length})</h3>
      <table class="tbl">
        <thead><tr><th>Zielobjekt-ID</th><th>Baustein-ID</th><th>Bezeichnung</th><th>Anwendbar</th><th>Angepasst</th><th>Erstellt von</th></tr></thead>
        <tbody>${eRows}</tbody>
      </table>
    </div>`;
}

async function buildDokumentation() {
  const doks = await S.mod.dokumentationenAbrufen(S.verbundId);
  const rows = doks.map(d =>
    `<tr><td>${esc(d.verwendungszweck)}</td><td>${esc(d.version)}</td><td>${esc(d.erstellt_am ? d.erstellt_am.substring(0, 10) : '—')}</td></tr>`
  ).join('') || `<tr><td colspan="3" class="empty">Noch keine Dokumentationen</td></tr>`;

  return `<div id="msg-dok"></div>
    <div class="card">
      <h3>Modellierungsdokumentation erstellen</h3>
      <form data-action="create-dokumentation">
        <div class="fg-2col">
          ${fg('Verwendungszweck *', 'verwendungszweck', { type: 'select', options: ['Prüfplan','Entwicklungskonzept'], required: true })}
          ${fg('Version', 'version', { value: '1.0' })}
        </div>
        <button class="btn" type="submit">Dokumentation erstellen</button>
      </form>
    </div>
    <div class="card">
      <h3>Erstellte Dokumentationen (${doks.length})</h3>
      <table class="tbl">
        <thead><tr><th>Verwendungszweck</th><th>Version</th><th>Erstellt</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ─── Form & Action Handlers ───────────────────────────────────────────────────
async function submitForm(form) {
  const action = form.dataset.action;
  const fd = new FormData(form);
  const data = Object.fromEntries(fd);
  form.querySelectorAll('input[type=checkbox]').forEach(cb => { data[cb.name] = cb.checked; });

  const msgEl = form.closest('.card')?.previousElementSibling?.matches('[id^=msg-]')
    ? form.closest('.card').previousElementSibling
    : document.querySelector('[id^=msg-]');

  try {
    await executeAction(action, data);
    form.reset();
    renderPane();
  } catch (e) {
    if (msgEl) msgEl.innerHTML = msgHtml(e.message, 'error');
  }
}

async function clickAction(btn) {
  const action = btn.dataset.action;
  const data = { ...btn.dataset };
  const msgEl = btn.closest('.card')?.previousElementSibling?.matches?.('[id^=msg-]')
    ? btn.closest('.card').previousElementSibling
    : document.querySelector('[id^=msg-]');

  try {
    await executeAction(action, data);
    renderPane();
  } catch (e) {
    if (msgEl) msgEl.innerHTML = msgHtml(e.message, 'error');
  }
}

async function executeAction(action, data) {
  switch (action) {
    // ── Verbund ──
    case 'create-verbund':
      await S.sa.verbundAnlegen(data);
      break;
    case 'select-verbund':
      S.verbundId = data.id;
      S.verbundName = data.name;
      S.module = 'sa';
      S.sub = 'liegenschaft';
      updateSidebar();
      break;

    // ── Strukturanalyse ──
    case 'create-liegenschaft':
      await S.sa.liegenschaftAnlegen({ ...data, verbund_id: S.verbundId });
      break;
    case 'create-raum':
      await S.sa.raumAnlegen(data);
      break;
    case 'create-prozess':
      await S.sa.prozessAnlegen({ ...data, verbund_id: S.verbundId, org_einheiten: [] });
      break;
    case 'create-information':
      await S.sa.informationErfassen({
        ...data,
        datenschutz_relevant: data.datenschutz_relevant === true || data.datenschutz_relevant === 'true',
      });
      break;
    case 'create-anwendung':
      await S.sa.anwendungErfassen({ ...data, verbund_id: S.verbundId });
      break;
    case 'link-anwendung-prozess':
      await S.sa.anwendungProzessZuordnen(data.anwendung_id, data.prozess_id);
      break;
    case 'create-itsystem':
      await S.sa.itSystemErfassen({ ...data, verbund_id: S.verbundId });
      break;
    case 'link-system-anwendung':
      await S.sa.itSystemAnwendungZuordnen(data.system_id, data.anwendung_id);
      break;
    case 'create-netzverbindung':
      await S.sa.netzverbindungAnlegen({
        ...data,
        verbund_id: S.verbundId,
        verschluesselt: data.verschluesselt === true || data.verschluesselt === 'true',
        extern: data.extern === true || data.extern === 'true',
      });
      break;
    case 'create-objektgruppe':
      await S.sa.objektgruppeAnlegen({ ...data, verbund_id: S.verbundId, anzahl: Number(data.anzahl) });
      break;

    // ── Schutzbedarfsfeststellung ──
    case 'create-kategorie':
      await S.sb.kategorieDefinieren({ ...data, verbund_id: S.verbundId });
      break;
    case 'create-bewertung': {
      const zielobjekte = await getZielobjekte();
      const zo = zielobjekte.find(z => z.id === data.zielobjekt_id);
      await S.sb.schadensbewertungSpeichern({ ...data, zielobjekt_typ: zo ? zo.typ : 'Anwendung' });
      break;
    }
    case 'berechne-schutzbedarf':
      await S.sb.schutzbedarfBerechnen(data.zielobjekt_id, data.zielobjekt_typ, data.begruendung || '');
      break;
    case 'abschliessen-schutzbedarf':
      await S.sb.schutzbedarfAbschliessen(data.zielobjekt_id);
      break;

    // ── Modellierung ──
    case 'init-bausteine':
      await S.mod.standardBausteineInitialisieren();
      break;
    case 'create-zuordnung':
      await S.mod.bausteinZuordnen({
        ...data,
        verbund_id: S.verbundId,
        anwendbar: data.anwendbar === true || data.anwendbar === 'true',
      });
      break;
    case 'create-dokumentation':
      await S.mod.dokumentationErstellen({ ...data, verbund_id: S.verbundId });
      break;

    default:
      throw new Error(`Unbekannte Aktion: ${action}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Collect all Zielobjekte (Anwendungen + Prozesse + IT-Systeme) for current Verbund */
async function getZielobjekte() {
  const { anwendungen } = await S.sa.anwendungsmatrixAbrufen(S.verbundId);
  const prozesse = await S.sa.prozesseByVerbundAbrufen(S.verbundId);
  const matrix = await S.sa.raumItSystemMatrixAbrufen(S.verbundId);
  const allSysteme = Object.values(matrix).flat();
  return [
    ...anwendungen.map(a => ({ id: a.anwendung_id, name: `${a.bezeichnung} (Anwendung)`, typ: 'Anwendung' })),
    ...prozesse.map(p => ({ id: p.prozess_id, name: `${p.bezeichnung} (Prozess)`, typ: 'Geschäftsprozess' })),
    ...allSysteme.map(s => ({ id: s.system_id, name: `${s.bezeichnung} (IT-System)`, typ: 'IT-System' })),
  ];
}

/** Render a "no verbund selected" placeholder */
function noVerbund() {
  return `<div class="pane-inner">
    <div class="msg warning">
      Bitte wählen Sie zunächst einen Informationsverbund aus.
    </div>
  </div>`;
}

/** HTML for a message box */
function msgHtml(text, type = 'success') {
  return `<div class="msg ${type}">${esc(text)}</div>`;
}

/** Escape HTML special chars */
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Badge CSS class from protection level string */
function badgeClass(val) {
  if (!val) return 'normal';
  return val.replace(/\s+/g, '-').toLowerCase();
}

/**
 * Generate a form group (label + input/select/textarea).
 * @param {string} label
 * @param {string} name - input name attribute
 * @param {Object} opts - type, options, required, value, rows, placeholder
 */
function fg(label, name, opts = {}) {
  const { type = 'text', options, required = false, value = '', rows = 3, placeholder = '' } = opts;
  const req = required ? ' required' : '';
  const val = value ? ` value="${esc(value)}"` : '';

  if (type === 'textarea') {
    return `<div class="fg"><label>${label}</label><textarea name="${name}" rows="${rows}"${req}>${esc(value)}</textarea></div>`;
  }
  if (type === 'select') {
    const optsList = (options || []).map(o => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}">${esc(l)}</option>`;
    }).join('');
    return `<div class="fg"><label>${label}</label><select name="${name}"${req}><option value="">Bitte wählen…</option>${optsList}</select></div>`;
  }
  return `<div class="fg"><label>${label}</label><input type="${type}" name="${name}"${req}${val}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}></div>`;
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();
