// Verificador de servicios: revisa cada URL, lee la página de estado oficial cuando existe
// y guarda el resultado con historial en public/data/status.json.
//
// Uso:
//   node worker/check.mjs            una sola revisión
//   node worker/check.mjs --loop     revisa cada 5 minutos sin parar
//
// Estados:
//   up        responde bien (2xx/3xx), o bloquea bots (403/429) pero responde
//   degraded  responde con error 4xx, o la página oficial reporta incidentes menores
//   down      error 5xx, sin respuesta o tiempo agotado; o la página oficial reporta una caída

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SERVICIOS = join(RAIZ, "services.json");
const SALIDA = join(RAIZ, "public", "data", "status.json");
const INTERVALO_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 10_000;
const MAX_HISTORIAL = 288; // 24 horas con una revisión cada 5 minutos
const LOTE = 6;            // revisiones en paralelo, para no saturar la conexión
const AGENTE = "status-monitor/1.0 (monitor de disponibilidad)";
const PRIORIDAD = { down: 3, degraded: 2, up: 1 };

async function pedir(url, opciones = {}) {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...opciones,
      signal: control.signal,
      redirect: "follow",
      headers: { "User-Agent": AGENTE, Accept: "text/html,application/json;q=0.9,*/*;q=0.8" },
    });
  } finally {
    clearTimeout(timer);
  }
}

// Una falla de red o una espera agotada se reintenta una vez antes de dar al servicio por caído.
async function revisarHttp(url, reintentos = 1) {
  const inicio = Date.now();
  try {
    const res = await pedir(url, { method: "GET" });
    const latencia = Date.now() - inicio;
    const codigo = res.status;
    if (codigo < 400) return { estado: "up", codigo, latencia, nota: "Responde correctamente" };
    if (codigo === 403 || codigo === 429)
      return { estado: "up", codigo, latencia, nota: "Responde, pero bloquea revisiones automáticas" };
    if (codigo < 500) return { estado: "degraded", codigo, latencia, nota: `Error ${codigo} del sitio` };
    return { estado: "down", codigo, latencia, nota: `Error del servidor ${codigo}` };
  } catch (error) {
    if (reintentos > 0) return revisarHttp(url, reintentos - 1);
    const motivo = error.name === "AbortError" ? "Tiempo de espera agotado (dos intentos)" : "Sin respuesta (dos intentos)";
    return { estado: "down", codigo: null, latencia: Date.now() - inicio, nota: motivo };
  }
}

// Páginas de estado tipo Statuspage: indicator = none | minor | major | critical.
async function revisarPaginaOficial(statusApi) {
  try {
    const res = await pedir(statusApi);
    if (!res.ok) return null;
    const datos = await res.json();
    const indicador = datos?.status?.indicator ?? "none";
    const descripcion = datos?.status?.description ?? "";
    if (indicador === "none") return { estado: "up", nota: `Página oficial: ${descripcion || "sin incidentes"}` };
    if (indicador === "minor") return { estado: "degraded", nota: `Página oficial: ${descripcion}` };
    return { estado: "down", nota: `Página oficial: ${descripcion}` };
  } catch {
    return null;
  }
}

// Se queda con el peor de los dos resultados: la web y la página oficial.
function combinar(http, oficial) {
  if (!oficial) return http;
  if (PRIORIDAD[oficial.estado] > PRIORIDAD[http.estado]) return { ...http, estado: oficial.estado, nota: oficial.nota };
  if (http.estado === "up") return { ...http, nota: oficial.nota };
  return http;
}

async function revisarServicio(servicio) {
  const http = await revisarHttp(servicio.url);
  const oficial = servicio.statusApi ? await revisarPaginaOficial(servicio.statusApi) : null;
  return { id: servicio.id, name: servicio.name, url: servicio.url, grupo: servicio.grupo, ...combinar(http, oficial) };
}

async function leerAnterior() {
  try {
    return JSON.parse(await readFile(SALIDA, "utf8"));
  } catch {
    return { services: [] };
  }
}

async function revisarTodo() {
  const servicios = JSON.parse(await readFile(SERVICIOS, "utf8"));
  const anterior = await leerAnterior();
  const previos = new Map((anterior.services ?? []).map((s) => [s.id, s.history ?? []]));
  const ahora = new Date().toISOString();

  const resultados = [];
  for (let i = 0; i < servicios.length; i += LOTE) {
    resultados.push(...(await Promise.all(servicios.slice(i, i + LOTE).map(revisarServicio))));
  }

  const salida = resultados.map((r) => {
    const historial = [...(previos.get(r.id) ?? []), { t: ahora, estado: r.estado, latencia: r.latencia }].slice(-MAX_HISTORIAL);
    const arriba = historial.filter((h) => h.estado === "up").length;
    return { ...r, checkedAt: ahora, uptime: Math.round((arriba / historial.length) * 1000) / 10, history: historial };
  });

  await mkdir(dirname(SALIDA), { recursive: true });
  await writeFile(SALIDA, JSON.stringify({ updated: ahora, intervalMinutes: INTERVALO_MS / 60000, services: salida }, null, 2), "utf8");

  const conProblemas = salida.filter((s) => s.estado !== "up").map((s) => s.name);
  console.log(`[${ahora}] ${salida.length} servicios revisados · con problemas: ${conProblemas.length ? conProblemas.join(", ") : "ninguno"}`);
}

const loop = process.argv.includes("--loop");
await revisarTodo();
if (loop) {
  setInterval(() => revisarTodo().catch((e) => console.error("Error en la revisión:", e.message)), INTERVALO_MS);
  console.log(`Monitoreando cada ${INTERVALO_MS / 60000} minutos. Ctrl+C para detener.`);
}
