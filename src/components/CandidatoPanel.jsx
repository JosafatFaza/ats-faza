import { useState } from "react";

const ETAPA_ORDER = ["Postulado", "Entrevista", "Psicometria", "Referencias", "Aprobado"];

export default function CandidatoPanel({ candidato, vacante, onClose, onMoverEtapa, colorFor, initials }) {
  const [etapaNueva, setEtapaNueva] = useState("");
  const [notas, setNotas] = useState(candidato.Notas || "");
  const [saving, setSaving] = useState(false);

  const etapaIdx = ETAPA_ORDER.indexOf(candidato.Etapa);

  async function handleGuardar() {
    if (!etapaNueva && notas === candidato.Notas) return;
    setSaving(true);
    await onMoverEtapa(candidato.id, candidato.Etapa, etapaNueva || candidato.Etapa, notas);
    setSaving(false);
  }

  return (
    <div className="detail-panel">
      <div className="detail-head">
        <div className="detail-avatar" style={{ background: colorFor(candidato.id) }}>
          {initials(candidato.Title)}
        </div>
        <div>
          <div className="detail-name">{candidato.Title}</div>
          <div className="detail-vacante">{vacante?.Title || "Sin vacante asignada"}</div>
        </div>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>

      <div className="detail-body">
        <div className="detail-section">
          <div className="detail-section-title">Etapa actual</div>
          <div className="stepper">
            {ETAPA_ORDER.map((e, i) => (
              <div key={e} style={{ display: "contents" }}>
                {i > 0 && <div className={`step-line${i <= etapaIdx ? " done" : ""}`} />}
                <div className="step">
                  <div className={`step-dot${i < etapaIdx ? " done" : ""}${i === etapaIdx ? " current" : ""}`} />
                  <div className="step-label">{e}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">Contacto</div>
          <div className="detail-field">
            <span className="detail-field-label">Teléfono</span>
            <span className="detail-field-val">{candidato.Telefono || "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Email</span>
            <span className="detail-field-val">{candidato.Email || "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Fuente</span>
            <span className="detail-field-val">{candidato.Fuente || "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Experiencia</span>
            <span className="detail-field-val">{candidato.Experiencia || "—"}</span>
          </div>
        </div>

        {vacante && (
          <div className="detail-section">
            <div className="detail-section-title">Vacante</div>
            <div className="detail-field">
              <span className="detail-field-label">Puesto</span>
              <span className="detail-field-val">{vacante.Title}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Líder</span>
              <span className="detail-field-val">{vacante.Lider || "—"}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Área</span>
              <span className="detail-field-val">{vacante.Area || "—"}</span>
            </div>
          </div>
        )}

        {(candidato.CURP || candidato.NSS) && (
          <div className="detail-section">
            <div className="detail-section-title">Datos IMSS</div>
            {candidato.CURP && (
              <div className="detail-field">
                <span className="detail-field-label">CURP</span>
                <span className="detail-field-val" style={{ fontSize: 12, fontFamily: "monospace" }}>{candidato.CURP}</span>
              </div>
            )}
            {candidato.NSS && (
              <div className="detail-field">
                <span className="detail-field-label">NSS</span>
                <span className="detail-field-val" style={{ fontFamily: "monospace" }}>{candidato.NSS}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="detail-actions">
        <select
          className="detail-select"
          value={etapaNueva}
          onChange={(e) => setEtapaNueva(e.target.value)}
        >
          <option value="">— Mover a etapa —</option>
          <option value="Postulado">Postulado</option>
          <option value="Entrevista">Agendar entrevista</option>
          <option value="Psicometria">Enviar a psicometría</option>
          <option value="Referencias">Verificar referencias</option>
          <option value="Aprobado">Aprobar ingreso</option>
          <option value="Rechazado">Rechazar</option>
        </select>
        <textarea
          className="detail-textarea"
          rows={2}
          placeholder="Agregar nota sobre este candidato..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleGuardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
