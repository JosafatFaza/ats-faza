import { useEffect, useState } from "react";
import { useGraph } from "../hooks/useGraph";
import { getVacantes, getCandidatos, getEntrevistas } from "../services/graphService";

const PRIORIDAD_COLOR = { Alta: "#ef4444", Media: "#f59e0b", Baja: "#94a3b8" };

export default function Dashboard({ onNavigate }) {
  const { getToken } = useGraph();
  const [vacantes, setVacantes] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [entrevistas, setEntrevistas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const [v, c, e] = await Promise.all([
          getVacantes(token),
          getCandidatos(token),
          getEntrevistas(token),
        ]);
        setVacantes(v);
        setCandidatos(c);
        setEntrevistas(e);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading">Cargando dashboard...</div>;

  const hoy = new Date().toDateString();
  const entrevistasHoy = entrevistas.filter((e) => {
    if (!e.FechaHora) return false;
    return new Date(e.FechaHora).toDateString() === hoy;
  });
  const aprobados = candidatos.filter((c) => c.Etapa === "Aprobado");
  const enProceso = candidatos.filter(
    (c) => c.Etapa !== "Aprobado" && c.Etapa !== "Rechazado"
  );

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card kpi-green">
          <div className="kpi-label">Vacantes activas</div>
          <div className="kpi-value">{vacantes.length}</div>
          <div className="kpi-sub">En proceso de reclutamiento</div>
        </div>
        <div className="kpi-card kpi-blue">
          <div className="kpi-label">Candidatos en proceso</div>
          <div className="kpi-value">{enProceso.length}</div>
          <div className="kpi-sub">Activos en pipeline</div>
        </div>
        <div className="kpi-card kpi-amber">
          <div className="kpi-label">Entrevistas hoy</div>
          <div className="kpi-value">{entrevistasHoy.length}</div>
          <div className="kpi-sub">{entrevistasHoy.length === 0 ? "Sin entrevistas programadas" : "Programadas para hoy"}</div>
        </div>
        <div className="kpi-card kpi-purple">
          <div className="kpi-label">Aprobados este mes</div>
          <div className="kpi-value">{aprobados.length}</div>
          <div className="kpi-sub">Listos para ingreso</div>
        </div>
      </div>

      <div className="row-2">
        <div>
          <div className="section-head">
            <div className="section-title">Vacantes activas</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("vacantes")}>
              Ver todas →
            </button>
          </div>
          {vacantes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">Sin vacantes activas</div>
            </div>
          ) : (
            vacantes.slice(0, 7).map((v) => {
              const cands = candidatos.filter((c) => String(c.VacanteId) === String(v.id)).length;
              return (
                <div
                  key={v.id}
                  className="vacante-row"
                  onClick={() => onNavigate("pipeline", v.id)}
                >
                  <div className="vac-dot" style={{ background: PRIORIDAD_COLOR[v.Prioridad] || "#94a3b8" }} />
                  <div className="vac-info">
                    <div className="vac-titulo">{v.Title}</div>
                    <div className="vac-meta">{v.Lider} · {v.Ubicacion}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 22 }}>{cands}</span>
                  <span className={`prioridad-badge p-${(v.Prioridad || "baja").toLowerCase()}`}>
                    {v.Prioridad || "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div>
          <div className="section-head">
            <div className="section-title">Entrevistas próximas</div>
          </div>
          <div className="activity-list">
            {entrevistas.length === 0 ? (
              <div className="activity-item" style={{ justifyContent: "center", color: "var(--muted)" }}>
                Sin entrevistas registradas
              </div>
            ) : (
              entrevistas.slice(0, 6).map((e) => {
                const cand = candidatos.find((c) => String(c.id) === String(e.CandidatoId));
                const vac = vacantes.find((v) => String(v.id) === String(e.VacanteId));
                const fecha = e.FechaHora ? new Date(e.FechaHora).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
                return (
                  <div key={e.id} className="activity-item">
                    <div className="activity-dot" style={{ background: e.Resultado === "Aprobado" ? "#16a34a" : e.Resultado === "Rechazado" ? "#ef4444" : "#f59e0b" }} />
                    <div className="activity-text">
                      <strong>{cand?.Title || `Candidato #${e.CandidatoId}`}</strong>
                      {vac ? ` · ${vac.Title}` : ""}
                      {e.Entrevistador ? <span style={{ color: "var(--muted)" }}> con {e.Entrevistador}</span> : ""}
                    </div>
                    <div className="activity-time">{fecha}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
