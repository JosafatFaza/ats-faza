import { useEffect, useState } from "react";
import { useGraph } from "../hooks/useGraph";
import { getRequisiciones, crearRequisicion, actualizarRequisicion } from "../services/graphService";
import { useToast } from "../hooks/useToast";

export default function Requisiciones() {
  const { getToken, user } = useGraph();
  const showToast = useToast();
  const [requisiciones, setRequisiciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ Title: "", Area: "", Lider: "", Motivo: "Vacante nueva", Urgencia: "Media", FechaRequerida: "", Descripcion: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const token = await getToken();
      setRequisiciones(await getRequisiciones(token));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCrear() {
    if (!form.Title || !form.Area || !form.Lider) { showToast("Completa puesto, área y líder"); return; }
    setSaving(true);
    try {
      const token = await getToken();
      await crearRequisicion(token, { ...form, AsignadoA: "" });
      showToast("✓ Requisición enviada");
      setShowForm(false);
      setForm({ Title: "", Area: "", Lider: "", Motivo: "Vacante nueva", Urgencia: "Media", FechaRequerida: "", Descripcion: "" });
      load();
    } catch (err) { showToast("Error al enviar requisición"); }
    finally { setSaving(false); }
  }

  async function tomar(req) {
    try {
      const token = await getToken();
      await actualizarRequisicion(token, req.id, { AsignadoA: user?.email, Estado: "En proceso" });
      showToast("✓ Requisición asignada");
      load();
    } catch (err) { showToast("Error"); }
  }

  const URGENCIA_CLASS = { Alta: "p-alta", Media: "p-media", Baja: "p-baja" };

  if (loading) return <div className="loading">Cargando requisiciones...</div>;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "+ Nueva requisición"}
        </button>
      </div>

      {showForm && (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nueva requisición de personal</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Puesto requerido *</label>
              <input className="form-input" placeholder="Ej: Auxiliar de Almacén" value={form.Title} onChange={e => setForm({ ...form, Title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Área *</label>
              <input className="form-input" placeholder="Ej: CEDIS" value={form.Area} onChange={e => setForm({ ...form, Area: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Líder solicitante *</label>
              <input className="form-input" placeholder="Tu nombre" value={form.Lider} onChange={e => setForm({ ...form, Lider: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha requerida</label>
              <input type="date" className="form-input" value={form.FechaRequerida} onChange={e => setForm({ ...form, FechaRequerida: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Motivo</label>
              <select className="form-select" value={form.Motivo} onChange={e => setForm({ ...form, Motivo: e.target.value })}>
                <option>Vacante nueva</option>
                <option>Reemplazo</option>
                <option>Baja voluntaria</option>
                <option>Incremento de operación</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Urgencia</label>
              <select className="form-select" value={form.Urgencia} onChange={e => setForm({ ...form, Urgencia: e.target.value })}>
                <option>Alta</option><option>Media</option><option>Baja</option>
              </select>
            </div>
          </div>
          <div className="form-row full">
            <div className="form-group">
              <label className="form-label">Descripción / perfil requerido</label>
              <textarea className="form-textarea" placeholder="Experiencia, habilidades, características..." value={form.Descripcion} onChange={e => setForm({ ...form, Descripcion: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCrear} disabled={saving}>{saving ? "Enviando..." : "Enviar requisición"}</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {requisiciones.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◻</div>
          <div className="empty-title">Sin requisiciones pendientes</div>
          <div>Los líderes de área envían solicitudes de personal desde aquí</div>
        </div>
      ) : (
        requisiciones.map((r) => (
          <div key={r.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#1d4ed8", flexShrink: 0 }}>
                {(r.Lider || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.Title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Solicitado por {r.Lider} · {r.Area}</div>
              </div>
              <span className={`prioridad-badge ${URGENCIA_CLASS[r.Urgencia] || "p-baja"}`}>{r.Urgencia}</span>
            </div>
            <div style={{ padding: "12px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "var(--muted)" }}>
              <div><span style={{ color: "var(--muted2)" }}>Motivo:</span> {r.Motivo}</div>
              <div><span style={{ color: "var(--muted2)" }}>Fecha requerida:</span> {r.FechaRequerida ? new Date(r.FechaRequerida).toLocaleDateString("es-MX") : "—"}</div>
              <div><span style={{ color: "var(--muted2)" }}>Estado:</span> {r.Estado}</div>
              <div><span style={{ color: "var(--muted2)" }}>Asignado a:</span> {r.AsignadoA || "Sin asignar"}</div>
            </div>
            {r.Descripcion && <div style={{ padding: "0 18px 12px", fontSize: 12, color: "var(--muted)" }}>{r.Descripcion}</div>}
            {r.Estado === "Pendiente" && (
              <div style={{ padding: "10px 18px 14px", display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => tomar(r)}>Tomar requisición</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
