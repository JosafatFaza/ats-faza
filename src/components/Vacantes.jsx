import { useEffect, useState } from "react";
import { useGraph } from "../hooks/useGraph";
import { getTodasVacantes, getCandidatos, crearVacante } from "../services/graphService";
import { useToast } from "../hooks/useToast";

const PRIORIDAD_COLOR = { Alta: "#ef4444", Media: "#f59e0b", Baja: "#94a3b8" };

export default function Vacantes({ onNavigate }) {
  const { getToken } = useGraph();
  const showToast = useToast();
  const [vacantes, setVacantes] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ Title: "", Area: "", Lider: "", Ubicacion: "", Prioridad: "Media", Descripcion: "", Requisitos: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const token = await getToken();
      const [v, c] = await Promise.all([getTodasVacantes(token), getCandidatos(token)]);
      setVacantes(v);
      setCandidatos(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCrear() {
    if (!form.Title || !form.Area || !form.Lider) { showToast("Completa puesto, área y líder"); return; }
    setSaving(true);
    try {
      const token = await getToken();
      await crearVacante(token, form);
      showToast("✓ Vacante creada correctamente");
      setShowForm(false);
      setForm({ Title: "", Area: "", Lider: "", Ubicacion: "", Prioridad: "Media", Descripcion: "", Requisitos: "" });
      load();
    } catch (err) { showToast("Error al crear vacante"); }
    finally { setSaving(false); }
  }

  const dias = (fecha) => {
    if (!fecha) return 0;
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  };

  if (loading) return <div className="loading">Cargando vacantes...</div>;

  return (
    <div>
      {showForm && (
        <div style={{ marginBottom: 20 }}>
          <div className="form-card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nueva vacante</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Puesto *</label>
                <input className="form-input" placeholder="Ej: Analista de Operaciones" value={form.Title} onChange={e => setForm({ ...form, Title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Área *</label>
                <input className="form-input" placeholder="Ej: Operaciones" value={form.Area} onChange={e => setForm({ ...form, Area: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Líder solicitante *</label>
                <input className="form-input" placeholder="Ej: Manuel Rayas" value={form.Lider} onChange={e => setForm({ ...form, Lider: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Ubicación</label>
                <input className="form-input" placeholder="Ej: Torreón, Coah." value={form.Ubicacion} onChange={e => setForm({ ...form, Ubicacion: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prioridad</label>
                <select className="form-select" value={form.Prioridad} onChange={e => setForm({ ...form, Prioridad: e.target.value })}>
                  <option>Alta</option><option>Media</option><option>Baja</option>
                </select>
              </div>
            </div>
            <div className="form-row full">
              <div className="form-group">
                <label className="form-label">Descripción del puesto</label>
                <textarea className="form-textarea" placeholder="Descripción general del rol..." value={form.Descripcion} onChange={e => setForm({ ...form, Descripcion: e.target.value })} />
              </div>
            </div>
            <div className="form-row full">
              <div className="form-group">
                <label className="form-label">Requisitos</label>
                <textarea className="form-textarea" placeholder="Experiencia, estudios, habilidades..." value={form.Requisitos} onChange={e => setForm({ ...form, Requisitos: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleCrear} disabled={saving}>{saving ? "Guardando..." : "Crear vacante"}</button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nueva vacante</button>
        </div>
      )}

      {vacantes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <div className="empty-title">Sin vacantes registradas</div>
          <div>Crea la primera vacante con el botón de arriba</div>
        </div>
      ) : (
        <div className="vac-grid">
          {vacantes.map((v) => {
            const cands = candidatos.filter((c) => String(c.VacanteId) === String(v.id));
            const d = dias(v.FechaApertura);
            return (
              <div key={v.id} className="vac-card" onClick={() => onNavigate("pipeline", v.id)}>
                <div className="vac-card-head">
                  <div className="vac-card-title">{v.Title}</div>
                  <span className={`prioridad-badge p-${(v.Prioridad || "baja").toLowerCase()}`}>{v.Prioridad || "—"}</span>
                </div>
                <div className="vac-card-meta">
                  <span>{v.Lider}</span>
                  <span>{v.Ubicacion}</span>
                  <span style={{ color: "var(--muted2)" }}>{v.Estado || "Abierta"}</span>
                </div>
                <div className="vac-progress-label">
                  <span>{cands.length} candidatos</span>
                  <span className={`dias-tag${d > 14 ? " urgent" : ""}`}>Día {d}</span>
                </div>
                <div className="vac-progress-bar">
                  <div className="vac-progress-fill" style={{ width: `${Math.min(100, cands.length * 12)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
