import { useEffect, useState } from "react";
import { useGraph } from "../hooks/useGraph";
import { getCandidatos, getVacantes, actualizarEtapaCandidato } from "../services/graphService";
import CandidatoPanel from "./CandidatoPanel";
import { useToast } from "../hooks/useToast";

const ETAPAS = [
  { key: "Postulado",   color: "var(--c-postulado)"   },
  { key: "Entrevista",  color: "var(--c-entrevista)"  },
  { key: "Psicometria", color: "var(--c-psicometria)" },
  { key: "Referencias", color: "var(--c-referencias)" },
  { key: "Aprobado",    color: "var(--c-aprobado)"    },
  { key: "Rechazado",   color: "var(--c-rechazado)"   },
];

const AVATARS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#14b8a6","#f97316","#84cc16","#06b6d4"];
function colorFor(id) { return AVATARS[parseInt(id) % AVATARS.length]; }
function initials(nombre) {
  if (!nombre) return "?";
  return nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function Pipeline({ filtroVacanteId, onFiltroChange }) {
  const { getToken, user } = useGraph();
  const showToast = useToast();
  const [candidatos, setCandidatos] = useState([]);
  const [vacantes, setVacantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState(filtroVacanteId || null);

  async function load() {
    try {
      const token = await getToken();
      const [c, v] = await Promise.all([getCandidatos(token), getVacantes(token)]);
      setCandidatos(c);
      setVacantes(v);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (filtroVacanteId) setFiltroActivo(filtroVacanteId); }, [filtroVacanteId]);

  async function handleMoverEtapa(candidatoId, etapaAnterior, etapaNueva, notas) {
    try {
      const token = await getToken();
      await actualizarEtapaCandidato(token, candidatoId, etapaAnterior, etapaNueva, user?.email || "Sistema", notas);
      setCandidatos((prev) =>
        prev.map((c) => c.id === candidatoId ? { ...c, Etapa: etapaNueva } : c)
      );
      showToast(`✓ ${selected?.Title} movido a ${etapaNueva}`);
      setSelected(null);
    } catch (err) {
      showToast("Error al actualizar — intenta de nuevo");
    }
  }

  if (loading) return <div className="loading">Cargando pipeline...</div>;

  const candidatosFiltrados = filtroActivo
    ? candidatos.filter((c) => String(c.VacanteId) === String(filtroActivo))
    : candidatos;

  const vacanteSelected = vacantes.find((v) => String(v.id) === String(filtroActivo));

  return (
    <>
      <div className="pipeline-filters">
        <button
          className={`filter-btn${!filtroActivo ? " active" : ""}`}
          onClick={() => { setFiltroActivo(null); onFiltroChange && onFiltroChange(null); }}
        >
          Todas
        </button>
        {vacantes.map((v) => (
          <button
            key={v.id}
            className={`filter-btn${String(filtroActivo) === String(v.id) ? " active" : ""}`}
            onClick={() => { setFiltroActivo(v.id); onFiltroChange && onFiltroChange(v.id); }}
          >
            {v.Title}
          </button>
        ))}
      </div>

      <div className="kanban-scroll">
        {ETAPAS.map((etapa) => {
          const cols = candidatosFiltrados.filter((c) => c.Etapa === etapa.key);
          return (
            <div key={etapa.key} className="kanban-col">
              <div className="col-header">
                <div className="col-dot" style={{ background: etapa.color }} />
                <div className="col-name">{etapa.key}</div>
                <div className="col-num">{cols.length}</div>
              </div>
              <div className="col-cards">
                {cols.length === 0 ? (
                  <div className="empty-col">Sin candidatos</div>
                ) : (
                  cols.map((c) => {
                    const vac = vacantes.find((v) => String(v.id) === String(c.VacanteId));
                    return (
                      <div key={c.id} className="cand-card" onClick={() => setSelected(c)}>
                        <div className="cand-name">{c.Title}</div>
                        {!filtroActivo && <div className="cand-vacante">{vac?.Title || "—"}</div>}
                        <div className="cand-footer">
                          <span className={`source-pill src-${(c.Fuente || "Otro").replace(/\s/g, "-")}`}>
                            {c.Fuente || "Otro"}
                          </span>
                          <span className="cand-exp">{c.Experiencia}</span>
                        </div>
                        {c.Notas && <div className="cand-nota">{c.Notas}</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <>
          <div className="overlay" onClick={() => setSelected(null)} />
          <CandidatoPanel
            candidato={selected}
            vacante={vacantes.find((v) => String(v.id) === String(selected.VacanteId))}
            onClose={() => setSelected(null)}
            onMoverEtapa={handleMoverEtapa}
            colorFor={colorFor}
            initials={initials}
          />
        </>
      )}
    </>
  );
}
