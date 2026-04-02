import { useEffect, useState } from "react";
import { useGraph } from "../hooks/useGraph";
import { getVacantes, crearCandidato } from "../services/graphService";
import { useToast } from "../hooks/useToast";

export default function NuevoCandidato({ onCerrar }) {
  const { getToken } = useGraph();
  const showToast = useToast();
  const [vacantes, setVacantes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    Title: "", Telefono: "", Email: "", Fuente: "Indeed",
    VacanteId: "", Experiencia: "", CURP: "", NSS: "",
  });

  useEffect(() => {
    getToken().then(getVacantes).then(setVacantes).catch(console.error);
  }, []);

  async function handleGuardar() {
    if (!form.Title || !form.VacanteId) { showToast("Nombre y vacante son requeridos"); return; }
    setSaving(true);
    try {
      const token = await getToken();
      await crearCandidato(token, { ...form, VacanteId: parseInt(form.VacanteId) });
      showToast("✓ Candidato registrado");
      onCerrar(true);
    } catch (err) { showToast("Error al registrar candidato"); }
    finally { setSaving(false); }
  }

  return (
    <div className="form-card" style={{ maxWidth: 580 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Registrar candidato</div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Nombre completo *</label>
          <input className="form-input" placeholder="Nombre Apellido Apellido" value={form.Title} onChange={e => setForm({ ...form, Title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Vacante *</label>
          <select className="form-select" value={form.VacanteId} onChange={e => setForm({ ...form, VacanteId: e.target.value })}>
            <option value="">Selecciona...</option>
            {vacantes.map(v => <option key={v.id} value={v.id}>{v.Title}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input className="form-input" placeholder="871 123 4567" value={form.Telefono} onChange={e => setForm({ ...form, Telefono: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" placeholder="correo@gmail.com" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fuente</label>
          <select className="form-select" value={form.Fuente} onChange={e => setForm({ ...form, Fuente: e.target.value })}>
            <option>Indeed</option><option>Referido</option><option>Walk-in</option><option>LinkedIn</option><option>Otro</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Experiencia relevante</label>
          <input className="form-input" placeholder="Ej: 3 años operaciones" value={form.Experiencia} onChange={e => setForm({ ...form, Experiencia: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">CURP</label>
          <input className="form-input" style={{ textTransform: "uppercase" }} placeholder="CURP (opcional)" value={form.CURP} onChange={e => setForm({ ...form, CURP: e.target.value.toUpperCase() })} />
        </div>
        <div className="form-group">
          <label className="form-label">NSS</label>
          <input className="form-input" placeholder="No. Seguro Social" value={form.NSS} onChange={e => setForm({ ...form, NSS: e.target.value })} />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>{saving ? "Guardando..." : "Registrar candidato"}</button>
        <button className="btn btn-ghost" onClick={() => onCerrar(false)}>Cancelar</button>
      </div>
    </div>
  );
}
