import { useEffect, useMemo, useState } from "react";

// Datos generados por worker/check.mjs. Esquema de cada servicio:
// { id, name, url, grupo, estado: "up"|"degraded"|"down", codigo, latencia, nota,
//   checkedAt (ISO), uptime (0-100), history: [{ t (ISO), estado, latencia }] }
const RUTA_DATOS = "./data/status.json";
const REFRESCO_MS = 60_000;

const ETIQUETA = { up: "Operativo", degraded: "Degradado", down: "Caído" };

function useEstado() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const res = await fetch(`${RUTA_DATOS}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelado) { setDatos(json); setError(null); }
      } catch (e) {
        if (!cancelado) setError(e.message);
      }
    }
    cargar();
    const id = setInterval(cargar, REFRESCO_MS);
    return () => { cancelado = true; clearInterval(id); };
  }, []);

  return { datos, error };
}

function formatoHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function Barras({ historial }) {
  // Últimas 48 revisiones (4 horas con revisiones cada 5 minutos).
  const ultimas = historial.slice(-48);
  return (
    <div className="barras" role="img" aria-label="Historial reciente">
      {ultimas.map((h, i) => (
        <span key={i} className={`barra ${h.estado}`} title={`${formatoHora(h.t)} · ${ETIQUETA[h.estado]}`} />
      ))}
    </div>
  );
}

function Tarjeta({ servicio }) {
  return (
    <article className={`tarjeta ${servicio.estado}`}>
      <header>
        <div>
          <h3>{servicio.name}</h3>
          <a href={servicio.url} target="_blank" rel="noreferrer">{servicio.url.replace("https://", "")}</a>
        </div>
        <span className={`estado ${servicio.estado}`}>{ETIQUETA[servicio.estado]}</span>
      </header>
      <Barras historial={servicio.history} />
      <dl>
        <div><dt>Uptime</dt><dd>{servicio.uptime.toFixed(1)}%</dd></div>
        <div><dt>Resp.</dt><dd>{servicio.latencia} ms</dd></div>
        <div><dt>Revisado</dt><dd>{formatoHora(servicio.checkedAt)}</dd></div>
      </dl>
      <p className="nota" title={servicio.nota}>{servicio.nota}</p>
    </article>
  );
}

export default function App() {
  const { datos, error } = useEstado();
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const servicios = datos?.services ?? [];
  const problemas = servicios.filter((s) => s.estado !== "up");

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return servicios.filter((s) => {
      if (filtro !== "todos" && s.estado !== filtro) return false;
      return !texto || s.name.toLowerCase().includes(texto) || s.grupo.toLowerCase().includes(texto);
    });
  }, [servicios, filtro, busqueda]);

  return (
    <main>
      <header className="cabecera">
        <div>
          <h1>Estado de servicios</h1>
          <p className="sub">Monitoreo técnico de {servicios.length || "—"} servicios populares, revisados cada {datos?.intervalMinutes ?? 5} minutos.</p>
        </div>
        <div className="resumen">
          <span className={`pastilla ${problemas.length ? "down" : "up"}`}>
            {problemas.length ? `${problemas.length} con problemas` : "Todo operativo"}
          </span>
          <span className="muted">Actualizado: {formatoHora(datos?.updated)}</span>
        </div>
      </header>

      {error && <div className="aviso">No pude cargar el estado ({error}). Intenta de nuevo en un minuto.</div>}

      <div className="controles">
        <input type="search" placeholder="Buscar servicio o grupo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar servicio" />
        <div className="filtros" role="group" aria-label="Filtrar por estado">
          {["todos", "up", "degraded", "down"].map((f) => (
            <button key={f} className={filtro === f ? "activo" : ""} onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : ETIQUETA[f]}
            </button>
          ))}
        </div>
      </div>

      <section className="grid">
        {visibles.map((s) => <Tarjeta key={s.id} servicio={s} />)}
        {!visibles.length && datos && <p className="muted">Ningún servicio coincide con el filtro.</p>}
      </section>

      <footer>
        <p>
          Esta página mide si cada sitio responde desde nuestro servidor y lee la página de estado oficial cuando la empresa la publica.
          No mide la experiencia de cada usuario ni reemplaza el estado oficial de cada servicio.
        </p>
        <p>Powered by DojoLabs</p>
      </footer>
    </main>
  );
}
