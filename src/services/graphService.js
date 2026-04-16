import { SITE_BASE, LISTS } from '../authConfig';

const PREFER = 'HonorNonIndexedQueriesWarningMayFailRandomly';

async function call(token, url, opts = {}) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: PREFER, ...opts.headers },
    ...opts,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`Graph API error ${res.status}: ${err}`); }
  if (res.status === 204) return null;
  return res.json();
}

function listUrl(listId) { return `${SITE_BASE}/lists/${listId}`; }

export async function getItems(token, listId, filter = '', select = '') {
  let url = `${listUrl(listId)}/items?$expand=fields`;
  if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
  if (select) url += `&$select=${select}`;
  const data = await call(token, url);
  return (data?.value || []).map(i => ({ id: i.id, ...i.fields }));
}

export async function createItem(token, listId, fields) {
  return call(token, `${listUrl(listId)}/items`, { method: 'POST', body: JSON.stringify({ fields }) });
}

export async function updateItem(token, listId, itemId, fields) {
  return call(token, `${listUrl(listId)}/items/${itemId}/fields`, { method: 'PATCH', body: JSON.stringify(fields) });
}

export async function getUserRole(token, email) {
  const items = await getItems(token, LISTS.roles, `fields/Email eq '${email}'`);
  if (items.length > 0 && items[0].Activo !== false) return items[0].Rol;
  return null;
}

export async function getVacantes(token) { return getItems(token, LISTS.vacantes, "fields/Estado ne 'Cancelada'"); }
export async function getCandidatos(token, vacanteId = null) { const filter = vacanteId ? `fields/VacanteId eq ${vacanteId}` : ''; return getItems(token, LISTS.candidatos, filter); }
export async function getRequisiciones(token) { return getItems(token, LISTS.requisiciones); }
export async function getEntrevistas(token) { return getItems(token, LISTS.entrevistas); }
export async function getPsicometrias(token, candidatoId) { return getItems(token, LISTS.psicometrias, candidatoId ? `fields/CandidatoId eq ${candidatoId}` : ''); }
export async function getReferencias(token, candidatoId) { return getItems(token, LISTS.referencias, candidatoId ? `fields/CandidatoId eq ${candidatoId}` : ''); }

export async function moverEtapa(token, candidatoId, etapaAnterior, etapaNueva, responsable, notas = '') {
  await updateItem(token, LISTS.candidatos, candidatoId, { Etapa: etapaNueva });
  await createItem(token, LISTS.etapas, { Title: `Cambio ${candidatoId}`, CandidatoId: Number(candidatoId), EtapaAnterior: etapaAnterior, EtapaNueva: etapaNueva, FechaCambio: new Date().toISOString(), Responsable: responsable, Notas: notas });
}

export async function getCalendarSlots(token, entrevistadorEmail, fecha) {
  const inicio = new Date(fecha); inicio.setHours(8, 0, 0, 0);
  const fin = new Date(fecha); fin.setHours(19, 0, 0, 0);
  const url = `https://graph.microsoft.com/v1.0/users/${entrevistadorEmail}/calendarView?startDateTime=${inicio.toISOString()}&endDateTime=${fin.toISOString()}&$select=start,end,subject&$orderby=start/dateTime`;
  let ocupados = [];
  try {
    const data = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    if (data.ok) { const json = await data.json(); ocupados = (json.value || []).map(e => ({ inicio: new Date(e.start.dateTime + 'Z'), fin: new Date(e.end.dateTime + 'Z') })); }
  } catch (e) { console.warn('No se pudo leer el calendario:', e.message); }
  const slots = [];
  for (let h = 8; h < 18; h++) {
    const sI = new Date(fecha); sI.setHours(h, 0, 0, 0);
    const sF = new Date(fecha); sF.setHours(h + 1, 0, 0, 0);
    const ocupado = ocupados.some(e => (sI >= e.inicio && sI < e.fin) || (sF > e.inicio && sF <= e.fin) || (sI <= e.inicio && sF >= e.fin));
    slots.push({ hora: `${h.toString().padStart(2,'0')}:00`, horaFin: `${(h+1).toString().padStart(2,'0')}:00`, inicio: sI, fin: sF, disponible: !ocupado });
  }
  return slots;
}

export async function crearEntrevistaCalendar(token, { candidatoNombre, candidatoEmail, vacanteTitulo, entrevistadorEmail, entrevistadorNombre, inicio, fin, modalidad, notas }) {
  const evento = {
    subject: `Entrevista — ${candidatoNombre} · ${vacanteTitulo}`,
    body: { contentType: 'HTML', content: `<p>Entrevista con <b>${candidatoNombre}</b> para la vacante <b>${vacanteTitulo}</b>.<br/>Modalidad: ${modalidad}<br/>${notas ? `Notas: ${notas}<br/>` : ''}Gestionar en: <a href="https://reclutamiento.faza.com.mx">reclutamiento.faza.com.mx</a></p>` },
    start: { dateTime: inicio.toISOString(), timeZone: 'America/Monterrey' },
    end: { dateTime: fin.toISOString(), timeZone: 'America/Monterrey' },
    location: { displayName: modalidad === 'Teams' ? 'Microsoft Teams' : modalidad === 'Telefónica' ? 'Llamada telefónica' : 'Oficinas FAZA — Torreón' },
    attendees: [
      { emailAddress: { address: entrevistadorEmail, name: entrevistadorNombre }, type: 'required' },
      ...(candidatoEmail ? [{ emailAddress: { address: candidatoEmail, name: candidatoNombre }, type: 'required' }] : []),
    ],
    isOnlineMeeting: modalidad === 'Teams',
  };
  return fetch('https://graph.microsoft.com/v1.0/me/events', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(evento) }).then(r => r.json());
}
