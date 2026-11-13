# Monitor de estado de servicios

Revisa cada 5 minutos si servicios populares (Microsoft, Google, Amazon, Cloudflare, Zoom, Slack, Claude AI y más) responden, y publica el resultado en una página web.

- `services.json`: lista de servicios y sus URLs públicas.
- `worker/check.mjs`: revisa cada URL y lee la página de estado oficial cuando la empresa la publica.
- `src/`: la app React que muestra el estado, el uptime de 24 horas y la latencia.

Mide si cada sitio responde desde GitHub. No mide la experiencia de cada usuario.

Comandos:

    npm install
    npm run check    # una revisión
    npm run dev      # app en desarrollo
