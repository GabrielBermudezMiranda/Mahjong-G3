# Mahjong-G3

Monorepo del Mahjong colaborativo con frontend Vite y backend Socket.IO compartido.

## Estructura

- `remix_-mahjong-solitario-tortuga/`: frontend listo para Vercel.
- `mahjong-coop/server/`: backend Socket.IO con salas, jugadores y estado de juego.

## Desarrollo local

1. Instala dependencias desde la raíz:

```bash
npm install
```

2. Arranca el backend de sockets:

```bash
npm run dev:server
```

3. Arranca el frontend:

```bash
npm run dev:client
```

Por defecto el frontend apunta a `http://localhost:3001` vía `VITE_SOCKET_URL`.

## Deploy en Vercel

El proyecto está preparado para desplegar el frontend con Vercel usando `vercel.json`.

- Build command: `npm run build`
- Output directory: `remix_-mahjong-solitario-tortuga/dist`

El backend de sockets no se hospeda en Vercel; desplegalo como servicio Node aparte y cambiá `VITE_SOCKET_URL` al dominio público de ese servicio.

## Contrato de sockets

Eventos principales:

- Cliente → servidor: `room:create`, `room:join`, `player:join`, `tile:select`
- Servidor → cliente: `rooms:list`, `room:created`, `room:joined`, `room:error`, `game:state`

El estado completo del juego viaja en `game:state` para mantener sincronización simple entre jugadores.