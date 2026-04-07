import React, { useState, useEffect, useCallback } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest, LISTS } from './authConfig';
import { getUserRole, getVacantes, getCandidatos, getRequisiciones, getEntrevistas, moverEtapa, createItem, updateItem, getCalendarSlots, crearEntrevistaCalendar } from './services/graphService';

const ETAPAS = [
  { key: 'Postulado',   label: 'Postulado',   color: 'var(--postulado)'  },
  { key: 'Entrevista',  label: 'Entrevista',  color: 'var(--entrevista)' },
  { key: 'Psicometria', label: 'Psicometría', color: 'var(--psico)'      },
  { key: 'Referencias', label: 'Referencias', color: 'var(--referencias)'},
  { key: 'Aprobado',    label: 'Aprobado',    color: 'var(--aprobado)'   },
  { key: 'Rechazado',   label: 'Rechazado',   color: 'var(--rechazado)'  },
];

const ETAPA_FLOW = ['Postulado','Entrevista','Psicometria','Referencias','Aprobado'];

const AREAS_DEPARTAMENTOS = {
  'Administracion': ['Credito y Cobranza','Tesoreria','Contabilidad','Gestion Administrativa','Administracion'],
  'Auditoria': ['Auditoria Operativa','Gestion Administrativa'],
  'Construccion y Mantenimiento': ['Mantenimiento','Construccion y Mantenimiento','Construccion'],
  'Juridico': ['Juridico'],
  'Mejora Continua': ['Procesos'],
  'Mercadotecnia y Publicidad': ['Diseño y Redes Sociales','Mercadotecnia'],
  'Operaciones Combustible': ['Ventas','Regulaciones','Comercializadora','Transporte','Estaciones Gasolina','Operaciones Combustible'],
  'Operaciones Tiendas': ['Compras Insumos','Tienda Cedis','Operaciones Tiendas','Cedis','Compras Comercial'],
  'Recursos Humanos': ['Nominas','Relaciones Laborales','Reclutamiento','Recursos Humanos','Seguridad patrimonial'],
  'Tecnologias de la Informacion': ['Desarrollo de Software','Soporte Tecnico','Tecnologias de la Informacion'],
};

const AREAS = Object.keys(AREAS_DEPARTAMENTOS);

// Roles que SOLO pueden ver Requisiciones
const ROLES_REQUISICION = ['Gerente','Coordinador'];
// Roles con acceso completo
const ROLES_COMPLETOS = ['Reclutadora','JefaRRHH','Admin'];

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function diasDesde(fecha) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha)) / 86400000);
}

const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#14b8a6','#f97316','#6366f1','#10b981'];
function colorFor(str) { let h = 0; for (let c of (str||'')) h = (h*31+c.charCodeAt(0))&0xffff; return COLORS[h % COLORS.length]; }

function Toast({ msg, onHide }) {
  useEffect(() => { if (msg) { const t = setTimeout(onHide, 2800); return () => clearTimeout(t); } }, [msg, onHide]);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

function LoginScreen() {
  const { instance } = useMsal();
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">FAZA</div>
        <div className="login-sub">Sistema de Reclutamiento y Selección</div>
        <button className="btn btn-primary login-btn" onClick={() => instance.loginRedirect(loginRequest)}>
          Iniciar sesión con Microsoft 365
        </button>
      </div>
    </div>
  );
}

function Sidebar({ view, setView, counts, user, rol }) {
  const esReclutamiento = ROLES_COMPLETOS.includes(rol);
  const nav = [];
  if (esReclutamiento) {
    nav.push({ id: 'dashboard',     label: 'Dashboard',       icon: '▦' });
    nav.push({ id: 'pipeline',      label: 'Pipeline',         icon: '⊟', count: counts.candidatos });
    nav.push({ id: 'vacantes',      label: 'Vacantes',         icon: '◈', count: counts.vacantes });
  }
  nav.push({ id: 'requisiciones', label: 'Requisiciones', icon: '◻', count: counts.requisiciones });
  if (rol === 'JefaRRHH' || rol === 'Admin') nav.push({ id: 'banco', label: 'Banco de talento', icon: '◑' });

  const ini = initials(user?.name || '');
  return (
    <aside className="sidebar">
      <div className="logo-area">
        <div className="logo-title">FAZA</div>
        <div className="logo-sub">Reclutamiento y Selección</div>
      </div>
      <nav className="nav">
        {nav.map(n => (
          <button key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
            {n.count > 0 && <span className="nav-badge">{n.count}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-avatar">{ini}</div>
        <div>
          <div className="user-name">{user?.name?.split(' ').slice(0,2).join(' ')}</div>
          <div className="user-role">{rol} · RRHH</div>
        </div>
      </div>
    </aside>
  );
}

function CandidatoPanel({ candidato, vacantes, onClose, onSave, saving, onAgendar }) {
  const [stage, setStage] = useState('');
  const [nota, setNota] = useState('');
  if (!candidato) return null;
  const vac = vacantes.find(v => v.id === String(candidato.VacanteId));
  const etapaIdx = ETAPA_FLOW.indexOf(candidato.Etapa);
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-head">
          <div className="detail-avatar" style={{ background: colorFor(candidato.Title) }}>{initials(candidato.Title)}</div>
          <div>
            <div className="detail-name">{candidato.Title}</div>
            <div className="detail-vacante">{vac?.Title || (candidato.VacanteId ? `Vacante #${candidato.VacanteId}` : 'Sin vacante asignada')}</div>
          </div>
          <button className="detail-close" onClick={onClose}>✕</button>
        </div>
        <div className="detail-body">
          <div className="detail-section">
            <div className="detail-section-title">Etapa actual — {candidato.Etapa}</div>
            <div className="stage-stepper">
              {ETAPA_FLOW.map((e, i) => (
                <React.Fragment key={e}>
                  {i > 0 && <div className={`step-line ${i <= etapaIdx ? 'done' : ''}`} />}
                  <div className="step">
                    <div className={`step-dot ${i < etapaIdx ? 'done' : ''} ${i === etapaIdx ? 'current' : ''}`} />
                    <div className="step-label">{ETAPAS.find(et => et.key === e)?.label}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Contacto</div>
            <div className="detail-field"><span className="detail-field-label">Teléfono</span><span className="detail-field-val">{candidato.Telefono || '—'}</span></div>
            <div className="detail-field"><span className="detail-field-label">Email</span><span className="detail-field-val">{candidato.Email || '—'}</span></div>
            <div className="detail-field"><span className="detail-field-label">Fuente</span><span className="detail-field-val">{candidato.Fuente || '—'}</span></div>
            <div className="detail-field"><span className="detail-field-label">Experiencia</span><span className="detail-field-val">{candidato.Experiencia || '—'}</span></div>
          </div>
          {vac && (
            <div className="detail-section">
              <div className="detail-section-title">Vacante</div>
              <div className="detail-field"><span className="detail-field-label">Puesto</span><span className="detail-field-val">{vac.Title}</span></div>
              <div className="detail-field"><span className="detail-field-label">Área</span><span className="detail-field-val">{vac.Area}</span></div>
              <div className="detail-field"><span className="detail-field-label">Líder</span><span className="detail-field-val">{vac.Lider}</span></div>
            </div>
          )}
        </div>
        <div className="detail-actions">
          <select className="action-select" value={stage} onChange={e => setStage(e.target.value)}>
            <option value="">— Mover a etapa —</option>
            {ETAPAS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
          <textarea className="detail-note-input" rows={2} placeholder="Agregar nota..." value={nota} onChange={e => setNota(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving || (!stage && !nota)} onClick={() => onSave(candidato, stage, nota)}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button className="btn btn-ghost" onClick={() => onAgendar && onAgendar(candidato)}>📅 Entrevista</button>
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Dashboard({ vacantes, candidatos, setView }) {
  const entrevistas = candidatos.filter(c => c.Etapa === 'Entrevista').length;
  const ingresos = candidatos.filter(c => c.Etapa === 'Aprobado').length;
  const priColors = { Alta: 'var(--rechazado)', Media: 'var(--entrevista)', Baja: 'var(--muted2)' };
  return (
    <div className="content">
      <div className="kpi-grid">
        <div className="kpi-card green"><div className="kpi-label">Vacantes activas</div><div className="kpi-value">{vacantes.length}</div><div className="kpi-sub">Torreón · CEDIS · Chihuahua</div></div>
        <div className="kpi-card blue"><div className="kpi-label">Candidatos en proceso</div><div className="kpi-value">{candidatos.length}</div><div className="kpi-sub">Total en pipeline</div></div>
        <div className="kpi-card amber"><div className="kpi-label">En entrevista</div><div className="kpi-value">{entrevistas}</div><div className="kpi-sub">Pendientes de resultado</div></div>
        <div className="kpi-card purple"><div className="kpi-label">Aprobados</div><div className="kpi-value">{ingresos}</div><div className="kpi-sub">Pendientes de ingreso</div></div>
      </div>
      <div className="row-2">
        <div>
          <div className="section-head">
            <div className="section-title">Vacantes activas</div>
            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setView('vacantes')}>Ver todas →</button>
          </div>
          {vacantes.slice(0, 6).map(v => (
            <div key={v.id} className="vacante-row" onClick={() => setView('pipeline')}>
              <div className="vacante-dot" style={{ background: priColors[v.Prioridad] || 'var(--muted2)' }} />
              <div className="vacante-info">
                <div className="vacante-titulo">{v.Title}</div>
                <div className="vacante-meta">{v.Lider} · {v.Ubicacion}</div>
              </div>
              <span className={`prioridad-badge p-${v.Prioridad}`}>{v.Prioridad}</span>
            </div>
          ))}
          {vacantes.length === 0 && <div className="empty-col">Sin vacantes — crea la primera con el botón "+" de arriba</div>}
        </div>
        <div>
          <div className="section-head"><div className="section-title">Pipeline por etapa</div></div>
          {ETAPAS.slice(0, 5).map(e => {
            const cnt = candidatos.filter(c => c.Etapa === e.key).length;
            return (
              <div key={e.key} className="vacante-row" style={{ cursor: 'default' }}>
                <div className="vacante-dot" style={{ background: e.color }} />
                <div className="vacante-info"><div className="vacante-titulo">{e.label}</div></div>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Pipeline({ candidatos, vacantes, onOpenCandidato, filterVacId, setFilterVacId }) {
  const filtered = filterVacId ? candidatos.filter(c => String(c.VacanteId) === filterVacId || c.VacanteId === Number(filterVacId)) : candidatos;
  return (
    <div className="pipeline-view">
      <div className="pipeline-filters">
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Filtrar:</span>
        <button className={`filter-btn ${!filterVacId ? 'active' : ''}`} onClick={() => setFilterVacId(null)}>Todas</button>
        {vacantes.map(v => (
          <button key={v.id} className={`filter-btn ${filterVacId === v.id ? 'active' : ''}`} onClick={() => setFilterVacId(v.id)}>
            {v.Title}
          </button>
        ))}
      </div>
      <div className="kanban-scroll">
        {ETAPAS.map(etapa => {
          const cols = filtered.filter(c => c.Etapa === etapa.key);
          return (
            <div key={etapa.key} className="kanban-col">
              <div className="col-header">
                <div className="col-dot" style={{ background: etapa.color }} />
                <div className="col-name">{etapa.label}</div>
                <div className="col-num">{cols.length}</div>
              </div>
              <div className="col-cards">
                {cols.length === 0 && <div className="empty-col">Sin candidatos</div>}
                {cols.map(c => {
                  const vac = vacantes.find(v => v.id === String(c.VacanteId) || Number(v.id) === c.VacanteId);
                  return (
                    <div key={c.id} className="cand-card" onClick={() => onOpenCandidato(c)}>
                      <div className="cand-name">{c.Title}</div>
                      <div className="cand-vacante">{vac?.Title || (c.VacanteId ? `Vacante #${c.VacanteId}` : 'Sin vacante asignada')}</div>
                      <div className="cand-footer">
                        <span className={`source-pill src-${(c.Fuente||'Otro').replace(/\s/g,'-')}`}>{c.Fuente || 'Otro'}</span>
                        <span className="cand-exp">{c.Experiencia || ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Vacantes({ vacantes, candidatos }) {
  return (
    <div className="content">
      {vacantes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <div className="empty-state-title">Sin vacantes activas</div>
          <div>Crea la primera vacante con el botón "+" de arriba</div>
        </div>
      ) : (
        <div className="vac-grid">
          {vacantes.map(v => {
            const cnt = candidatos.filter(c => String(c.VacanteId) === v.id || c.VacanteId === Number(v.id)).length;
            const dias = diasDesde(v.FechaApertura);
            return (
              <div key={v.id} className="vac-card">
                <div className="vac-card-head">
                  <div className="vac-card-title">{v.Title}</div>
                  <span className={`prioridad-badge p-${v.Prioridad}`}>{v.Prioridad}</span>
                </div>
                <div className="vac-card-meta">
                  <span>{v.Lider}</span>
                  <span>{v.Ubicacion}</span>
                  <span>{v.Area}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{cnt} candidato{cnt !== 1 ? 's' : ''} en proceso</div>
                <div className="vac-progress-bar"><div className="vac-progress-fill" style={{ width: `${Math.min(100, cnt * 12)}%` }} /></div>
                <div className={`dias-tag ${dias > 14 ? 'urgent' : ''}`}>Día {dias} abierta</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Requisiciones({ requisiciones, rol }) {
  const priColors = { Alta: '#fee2e2', Media: '#fef3c7', Baja: '#f1f5f9' };
  const priText   = { Alta: '#b91c1c', Media: '#92400e', Baja: 'var(--muted)' };
  const esGerente = ROLES_REQUISICION.includes(rol);

  const getVal = (field) => {
    if (!field) return '—';
    if (typeof field === 'object' && field.Value) return field.Value;
    return field;
  };

  return (
    <div className="content" style={{ maxWidth: 640 }}>
      {esGerente && (
        <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: 16, fontSize: 13, color: 'var(--accent-dark)' }}>
          Puedes crear requisiciones de personal para tu área usando el botón "+ Nueva requisición" de arriba.
        </div>
      )}
      {requisiciones.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◻</div>
          <div className="empty-state-title">Sin requisiciones pendientes</div>
          <div>Crea una nueva requisición con el botón "+" de arriba</div>
        </div>
      ) : requisiciones.map(r => (
        <div key={r.id} className="req-card">
          <div className="req-card-head">
            <div className="req-avatar" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{initials(r.Lider || 'NN')}</div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.Title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Solicitado por {r.Lider}</div>
            </div>
            <span className="prioridad-badge" style={{ marginLeft: 'auto', background: priColors[getVal(r.Urgencia)], color: priText[getVal(r.Urgencia)] }}>{getVal(r.Urgencia)}</span>
          </div>
          <div className="req-card-body">
            <div><span style={{ color: 'var(--muted2)' }}>Área: </span>{getVal(r.Area)}</div>
            <div><span style={{ color: 'var(--muted2)' }}>Departamento: </span>{getVal(r.Departamento) || '—'}</div>
            <div><span style={{ color: 'var(--muted2)' }}>Motivo: </span>{getVal(r.Motivo)}</div>
            <div><span style={{ color: 'var(--muted2)' }}>Estado: </span>{r.Estado}</div>
            <div><span style={{ color: 'var(--muted2)' }}>Fecha requerida: </span>{r.FechaRequerida ? new Date(r.FechaRequerida).toLocaleDateString('es-MX') : '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NuevaVacanteModal({ onClose, onSave, saving }) {
  const [form, setForm] = useState({ Title:'', Area:'', Lider:'', Ubicacion:'', Prioridad:'Media', Estado:'Abierta', Descripcion:'', Requisitos:'' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Nueva vacante</div>
        <div className="form-group"><label className="form-label">Puesto *</label><input className="form-input" value={form.Title} onChange={set('Title')} placeholder="Ej: Analista de Operaciones" /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Área *</label>
            <select className="form-input" value={form.Area} onChange={set('Area')}>
              <option value="">Seleccionar...</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Líder solicitante *</label><input className="form-input" value={form.Lider} onChange={set('Lider')} placeholder="Nombre del líder" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Ubicación</label><input className="form-input" value={form.Ubicacion} onChange={set('Ubicacion')} placeholder="Torreón, Coah." /></div>
          <div className="form-group"><label className="form-label">Prioridad</label>
            <select className="form-input" value={form.Prioridad} onChange={set('Prioridad')}>
              <option>Alta</option><option>Media</option><option>Baja</option>
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-input" rows={3} value={form.Descripcion} onChange={set('Descripcion')} /></div>
        <div className="form-group"><label className="form-label">Requisitos</label><textarea className="form-input" rows={2} value={form.Requisitos} onChange={set('Requisitos')} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !form.Title || !form.Area || !form.Lider} onClick={() => onSave({ ...form, FechaApertura: new Date().toISOString() })}>
            {saving ? 'Guardando...' : 'Crear vacante'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevoCandidatoModal({ vacantes, onClose, onSave, saving }) {
  const [form, setForm] = useState({ Title:'', Telefono:'', Email:'', Fuente:'Indeed', VacanteId:'', Etapa:'Postulado', Experiencia:'' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Nuevo candidato</div>
        <div className="form-group"><label className="form-label">Nombre completo *</label><input className="form-input" value={form.Title} onChange={set('Title')} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={form.Telefono} onChange={set('Telefono')} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.Email} onChange={set('Email')} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Vacante *</label>
            <select className="form-input" value={form.VacanteId} onChange={set('VacanteId')}>
              <option value="">Seleccionar...</option>
              {vacantes.map(v => <option key={v.id} value={v.id}>{v.Title}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Fuente</label>
            <select className="form-input" value={form.Fuente} onChange={set('Fuente')}>
              <option>Indeed</option><option>Referido</option><option>Walk-in</option><option>LinkedIn</option><option>Otro</option>
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Experiencia resumida</label><input className="form-input" value={form.Experiencia} onChange={set('Experiencia')} placeholder="Ej: 3 años en operaciones" /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !form.Title || !form.VacanteId} onClick={() => onSave({ ...form, VacanteId: Number(form.VacanteId) })}>
            {saving ? 'Guardando...' : 'Agregar candidato'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevaRequisicionModal({ onClose, onSave, saving, user }) {
  const [form, setForm] = useState({
    Title:'', Area:'', Departamento:'', Lider: user?.name || '',
    Motivo:'Vacante nueva', Urgencia:'Media', FechaRequerida:'', Descripcion:'', Estado:'Pendiente'
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const departamentos = form.Area ? (AREAS_DEPARTAMENTOS[form.Area] || []) : [];

  const handleAreaChange = e => {
    setForm(f => ({ ...f, Area: e.target.value, Departamento: '' }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Nueva requisición de personal</div>
        <div className="form-group"><label className="form-label">Puesto solicitado *</label><input className="form-input" value={form.Title} onChange={set('Title')} placeholder="Ej: Auxiliar de Almacén" /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Área *</label>
            <select className="form-input" value={form.Area} onChange={handleAreaChange}>
              <option value="">Seleccionar área...</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Departamento *</label>
            <select className="form-input" value={form.Departamento} onChange={set('Departamento')} disabled={!form.Area}>
              <option value="">{form.Area ? 'Seleccionar...' : 'Primero selecciona área'}</option>
              {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Líder solicitante *</label><input className="form-input" value={form.Lider} onChange={set('Lider')} placeholder="Tu nombre" /></div>
          <div className="form-group"><label className="form-label">Urgencia</label>
            <select className="form-input" value={form.Urgencia} onChange={set('Urgencia')}>
              <option>Alta</option><option>Media</option><option>Baja</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Motivo</label>
            <select className="form-input" value={form.Motivo} onChange={set('Motivo')}>
              <option>Vacante nueva</option>
              <option>Reemplazo</option>
              <option>Baja voluntaria</option>
              <option>Incremento de operación</option>
              <option>Otro</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Fecha requerida</label><input className="form-input" type="date" value={form.FechaRequerida} onChange={set('FechaRequerida')} /></div>
        </div>
        <div className="form-group"><label className="form-label">Descripción del perfil</label><textarea className="form-input" rows={3} value={form.Descripcion} onChange={set('Descripcion')} placeholder="Describe las funciones y el perfil que necesitas..." /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !form.Title || !form.Area || !form.Departamento || !form.Lider} onClick={() => onSave(form)}>
            {saving ? 'Guardando...' : 'Enviar requisición'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL AGENDAR ENTREVISTA ────────────────────────────────────────────────
function AgendarEntrevistaModal({ candidato, vacante, token, onClose, onSave, saving }) {
  const [fecha, setFecha] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotSelected, setSlotSelected] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [entrevistador, setEntrevistador] = useState(vacante?.Lider || '');
  const [entrevistadorEmail, setEntrevistadorEmail] = useState('');
  const [modalidad, setModalidad] = useState('Presencial');
  const [notas, setNotas] = useState('');

  const hoy = new Date().toISOString().split('T')[0];

  const cargarSlots = async (f, email) => {
    if (!f || !email) return;
    setLoadingSlots(true);
    setSlotSelected(null);
    try {
      const s = await getCalendarSlots(token, email, new Date(f + 'T12:00:00'));
      setSlots(s);
    } catch {
      setSlots([]);
    }
    setLoadingSlots(false);
  };

  const handleFecha = e => {
    setFecha(e.target.value);
    if (entrevistadorEmail) cargarSlots(e.target.value, entrevistadorEmail);
  };

  const handleEmail = e => {
    setEntrevistadorEmail(e.target.value);
    if (fecha && e.target.value.includes('@')) cargarSlots(fecha, e.target.value);
  };

  const handleGuardar = () => {
    if (!slotSelected) return;
    onSave({
      candidato, vacante, entrevistador, entrevistadorEmail,
      modalidad, notas,
      inicio: slotSelected.inicio,
      fin: slotSelected.fin,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Agendar entrevista</div>

        <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>Candidato: </span>
          <strong>{candidato?.Title}</strong>
          <span style={{ color: 'var(--muted)', marginLeft: 12 }}>Vacante: </span>
          <strong>{vacante?.Title}</strong>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Entrevistador *</label>
            <input className="form-input" value={entrevistador} onChange={e => setEntrevistador(e.target.value)} placeholder="Nombre del entrevistador" />
          </div>
          <div className="form-group">
            <label className="form-label">Email del entrevistador *</label>
            <input className="form-input" value={entrevistadorEmail} onChange={handleEmail} placeholder="correo@faza.com.mx" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fecha *</label>
            <input className="form-input" type="date" min={hoy} value={fecha} onChange={handleFecha} />
          </div>
          <div className="form-group">
            <label className="form-label">Modalidad</label>
            <select className="form-input" value={modalidad} onChange={e => setModalidad(e.target.value)}>
              <option>Presencial</option>
              <option>Teams</option>
              <option>Telefónica</option>
            </select>
          </div>
        </div>

        {fecha && entrevistadorEmail && (
          <div className="form-group">
            <label className="form-label">Horario disponible — {new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' })}</label>
            {loadingSlots ? (
              <div className="slots-loading">Consultando calendario...</div>
            ) : (
              <div className="slots-grid">
                {slots.map(s => (
                  <button
                    key={s.hora}
                    className={`slot-btn ${!s.disponible ? 'ocupado' : ''} ${slotSelected?.hora === s.hora ? 'selected' : ''}`}
                    disabled={!s.disponible}
                    onClick={() => setSlotSelected(s)}
                  >
                    {s.hora}
                    {!s.disponible && <div style={{ fontSize: 10, opacity: .8 }}>Ocupado</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {slotSelected && (
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--accent-dark)', marginTop: 8 }}>
            Horario seleccionado: <strong>{slotSelected.hora} – {slotSelected.horaFin}</strong>
          </div>
        )}

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Notas para el entrevistador</label>
          <textarea className="form-input" rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Instrucciones, contexto del candidato, etc." />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !slotSelected || !entrevistadorEmail} onClick={handleGuardar}>
            {saving ? 'Agendando...' : 'Confirmar entrevista'}
          </button>
        </div>
      </div>
    </div>
  );
}

const VIEW_TITLES = { dashboard:'Dashboard', pipeline:'Pipeline de candidatos', vacantes:'Vacantes activas', requisiciones:'Requisiciones de personal', banco:'Banco de talento' };

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuth = useIsAuthenticated();
  const [token, setToken] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [vacantes, setVacantes] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [requisiciones, setRequisiciones] = useState([]);
  const [openCand, setOpenCand] = useState(null);
  const [filterVacId, setFilterVacId] = useState(null);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNuevaVacante, setShowNuevaVacante] = useState(false);
  const [showNuevoCandidato, setShowNuevoCandidato] = useState(false);
  const [showNuevaRequisicion, setShowNuevaRequisicion] = useState(false);
  const [showAgendarEntrevista, setShowAgendarEntrevista] = useState(false);
  const [candidatoEntrevista, setCandidatoEntrevista] = useState(null);

  const showToast = msg => setToast(msg);

  const getToken = useCallback(async () => {
    if (!accounts[0]) return null;
    try {
      const res = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
      return res.accessToken;
    } catch {
      const res = await instance.acquireTokenRedirect(loginRequest);
      return res?.accessToken;
    }
  }, [instance, accounts]);

  const loadData = useCallback(async (t) => {
    try {
      const [v, c, r] = await Promise.all([getVacantes(t), getCandidatos(t), getRequisiciones(t)]);
      setVacantes(v);
      setCandidatos(c);
      setRequisiciones(r);
    } catch (e) {
      showToast('Error al cargar datos: ' + e.message);
    }
  }, []);

  useEffect(() => {
    if (!isAuth) { setLoading(false); return; }
    (async () => {
      const t = await getToken();
      if (!t) return;
      setToken(t);
      const email = accounts[0]?.username;
      const r = await getUserRole(t, email).catch(() => null);
      setRol(r || null);
      await loadData(t);
      setLoading(false);
    })();
  }, [isAuth, getToken, loadData, accounts]);

  const refresh = () => loadData(token);

  const handleSaveCandidato = async (cand, stage, nota) => {
    setSaving(true);
    try {
      const email = accounts[0]?.username || '';
      if (stage) await moverEtapa(token, cand.id, cand.Etapa, stage, email, nota);
      else if (nota) await updateItem(token, LISTS.candidatos, cand.id, { Notas: nota });
      showToast(`✓ ${cand.Title} actualizado`);
      setOpenCand(null);
      await refresh();
    } catch (e) { showToast('Error: ' + e.message); }
    setSaving(false);
  };

  const handleNuevaVacante = async (fields) => {
    setSaving(true);
    try {
      await createItem(token, LISTS.vacantes, fields);
      showToast('✓ Vacante creada');
      setShowNuevaVacante(false);
      await refresh();
    } catch (e) { showToast('Error: ' + e.message); }
    setSaving(false);
  };

  const handleNuevoCandidato = async (fields) => {
    setSaving(true);
    try {
      await createItem(token, LISTS.candidatos, fields);
      showToast('✓ Candidato agregado');
      setShowNuevoCandidato(false);
      await refresh();
    } catch (e) { showToast('Error: ' + e.message); }
    setSaving(false);
  };

  const handleNuevaRequisicion = async (fields) => {
    setSaving(true);
    try {
      await createItem(token, LISTS.requisiciones, fields);
      showToast('✓ Requisición enviada correctamente');
      setShowNuevaRequisicion(false);
      await refresh();
    } catch (e) { showToast('Error: ' + e.message); }
    setSaving(false);
  };

  const handleAgendarEntrevista = async ({ candidato, vacante, entrevistador, entrevistadorEmail, modalidad, notas, inicio, fin }) => {
    setSaving(true);
    try {
      // Crear evento en calendario
      await crearEntrevistaCalendar(token, {
        candidatoNombre: candidato.Title,
        candidatoEmail: candidato.Email || '',
        vacanteTitulo: vacante?.Title || '',
        entrevistadorEmail,
        entrevistadorNombre: entrevistador,
        inicio, fin, modalidad, notas,
      });
      // Guardar en REC_Entrevistas
      await createItem(token, LISTS.entrevistas, {
        Title: `${candidato.Title} - ${vacante?.Title || ''}`,
        CandidatoId: Number(candidato.id),
        VacanteId: Number(candidato.VacanteId),
        Entrevistador: entrevistador,
        FechaHora: inicio.toISOString(),
        Modalidad: modalidad,
        Resultado: 'Pendiente',
        Notas: notas,
      });
      // Mover candidato a etapa Entrevista
      const email = accounts[0]?.username || '';
      await moverEtapa(token, candidato.id, candidato.Etapa, 'Entrevista', email, `Entrevista agendada con ${entrevistador}`);
      showToast(`✓ Entrevista agendada con ${entrevistador}`);
      setShowAgendarEntrevista(false);
      setCandidatoEntrevista(null);
      setOpenCand(null);
      await refresh();
    } catch (e) { showToast('Error al agendar: ' + e.message); }
    setSaving(false);
  };

  const handleSetView = (v) => {
    // Gerentes y Coordinadores solo pueden ver Requisiciones
    if (ROLES_REQUISICION.includes(rol) && v !== 'requisiciones') return;
    setView(v);
    if (v === 'pipeline') setFilterVacId(null);
  };

  if (!isAuth) return <LoginScreen />;

  if (!loading && isAuth && !rol) return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">FAZA</div>
        <div className="login-sub" style={{ color:'#ef4444', marginBottom:16 }}>Sin acceso al sistema</div>
        <p style={{ fontSize:13, color:'var(--muted)', marginBottom:24 }}>
          Tu cuenta no tiene permisos para acceder al ATS de Reclutamiento.<br/>
          Contacta a Josafat para solicitar acceso.
        </p>
        <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center' }} onClick={() => instance.logoutRedirect()}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-text">Cargando ATS FAZA...</div>
    </div>
  );

  // Gerentes y Coordinadores van directo a Requisiciones
  const defaultView = ROLES_REQUISICION.includes(rol) ? 'requisiciones' : 'dashboard';
  const activeView = ROLES_REQUISICION.includes(rol) ? 'requisiciones' : view;

  const counts = {
    vacantes: vacantes.length,
    candidatos: candidatos.length,
    requisiciones: requisiciones.filter(r => r.Estado === 'Pendiente').length
  };

  const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  const topbarButtons = () => {
    if (activeView === 'vacantes') return <button className="btn btn-primary" onClick={() => setShowNuevaVacante(true)}>+ Nueva vacante</button>;
    if (activeView === 'pipeline') return <button className="btn btn-primary" onClick={() => setShowNuevoCandidato(true)}>+ Candidato</button>;
    if (activeView === 'requisiciones') return <button className="btn btn-primary" onClick={() => setShowNuevaRequisicion(true)}>+ Nueva requisición</button>;
    return <button className="btn btn-ghost" onClick={refresh}>↻ Actualizar</button>;
  };

  return (
    <div className="app">
      <Sidebar view={activeView} setView={handleSetView} counts={counts} user={accounts[0]} rol={rol} />
      <main className="main">
        <div className="topbar">
          <div className="topbar-title">{VIEW_TITLES[activeView]}</div>
          <div className="topbar-pill">{hoy}</div>
          {topbarButtons()}
        </div>
        {activeView === 'dashboard' && <Dashboard vacantes={vacantes} candidatos={candidatos} setView={handleSetView} />}
        {activeView === 'pipeline' && <Pipeline candidatos={candidatos} vacantes={vacantes} onOpenCandidato={setOpenCand} filterVacId={filterVacId} setFilterVacId={setFilterVacId} />}
        {activeView === 'vacantes' && <Vacantes vacantes={vacantes} candidatos={candidatos} />}
        {activeView === 'requisiciones' && <Requisiciones requisiciones={requisiciones} rol={rol} />}
        {activeView === 'banco' && (
          <div className="content">
            <div className="empty-state">
              <div className="empty-state-icon">◑</div>
              <div className="empty-state-title">Banco de talento</div>
              <div>Se activa en la Fase 3 del proyecto</div>
            </div>
          </div>
        )}
      </main>
      {openCand && <CandidatoPanel candidato={openCand} vacantes={vacantes} onClose={() => setOpenCand(null)} onSave={handleSaveCandidato} saving={saving} onAgendar={(c) => { setCandidatoEntrevista(c); setShowAgendarEntrevista(true); }} />}
      {showNuevaVacante && <NuevaVacanteModal onClose={() => setShowNuevaVacante(false)} onSave={handleNuevaVacante} saving={saving} />}
      {showNuevoCandidato && <NuevoCandidatoModal vacantes={vacantes} onClose={() => setShowNuevoCandidato(false)} onSave={handleNuevoCandidato} saving={saving} />}
      {showNuevaRequisicion && <NuevaRequisicionModal onClose={() => setShowNuevaRequisicion(false)} onSave={handleNuevaRequisicion} saving={saving} user={accounts[0]} />}
      {showAgendarEntrevista && candidatoEntrevista && (
        <AgendarEntrevistaModal
          candidato={candidatoEntrevista}
          vacante={vacantes.find(v => v.id === String(candidatoEntrevista.VacanteId) || Number(v.id) === candidatoEntrevista.VacanteId)}
          token={token}
          onClose={() => { setShowAgendarEntrevista(false); setCandidatoEntrevista(null); }}
          onSave={handleAgendarEntrevista}
          saving={saving}
        />
      )}
      <Toast msg={toast} onHide={() => setToast('')} />
    </div>
  );
}
