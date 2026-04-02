import { SITE_BASE, LISTS } from '../authConfig';

const PREFER = 'HonorNonIndexedQueriesWarningMayFailRandomly';

async function call(token, url, opts = {}) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: PREFER,
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error ${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function listUrl(listId) {
  return `${SITE_BASE}/lists/${listId}`;
}

export async function getItems(token, listId, filter = '', select = '') {
  let url = `${listUrl(listId)}/items?$expand=fields`;
  if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
  if (select) url += `&$select=${select}`;
  const data = await call(token, url);
  return (data?.value || []).map(i => ({ id: i.id, ...i.fields }));
}

export async function createItem(token, listId, fields) {
  return call(token, `${listUrl(listId)}/items`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
}

export async function updateItem(token, listId, itemId, fields) {
  return call(token, `${listUrl(listId)}/items/${itemId}/fields`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export async function deleteItem(token, listId, itemId) {
  return call(token, `${listUrl(listId)}/items/${itemId}`, { method: 'DELETE' });
}

export async function getUserRole(token, email) {
  const items = await getItems(token, LISTS.roles, `fields/Email eq '${email}'`);
  if (items.length > 0 && items[0].Activo !== false) return items[0].Rol;
  return null;
}

export async function getVacantes(token) {
  return getItems(token, LISTS.vacantes, "fields/Estado ne 'Cancelada'");
}

export async function getCandidatos(token, vacanteId = null) {
  const filter = vacanteId ? `fields/VacanteId eq ${vacanteId}` : '';
  return getItems(token, LISTS.candidatos, filter);
}

export async function getRequisiciones(token) {
  return getItems(token, LISTS.requisiciones);
}

export async function getEntrevistas(token) {
  return getItems(token, LISTS.entrevistas);
}

export async function moverEtapa(token, candidatoId, etapaAnterior, etapaNueva, responsable, notas = '') {
  await updateItem(token, LISTS.candidatos, candidatoId, { Etapa: etapaNueva });
  await createItem(token, LISTS.etapas, {
    Title: `Cambio ${candidatoId}`,
    CandidatoId: Number(candidatoId),
    EtapaAnterior: etapaAnterior,
    EtapaNueva: etapaNueva,
    FechaCambio: new Date().toISOString(),
    Responsable: responsable,
    Notas: notas,
  });
}
