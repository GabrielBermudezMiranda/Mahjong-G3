# Mahjong-G3

Taller: **Mahjong Colaborativo**. Backend en Node.js + Socket.io + TypeScript.

## Backend (server)

El servidor corre en `http://localhost:3000` y expone un **canal Socket.io** (WebSocket) para sincronizar el estado del juego en tiempo real.

### Requisitos

- Node.js 18+

### Correr el servidor

Desde `mahjong-coop/server`:

```bash
npm install
npm run dev
```

Salida esperada:

```txt
Server is running on http://localhost:3000
```

### CORS

Por defecto el backend permite conexiones desde `http://localhost:5173` (Vite). Si tu frontend usa otro origen/puerto, ajustá la configuración en `mahjong-coop/server/src/index.ts`.

---

## API en tiempo real (Socket.io)

La “API” del juego es un protocolo de eventos.

### URL de conexión

- Desarrollo: `http://localhost:3000`

En el cliente (Vite) normalmente conviene usar:

```ts
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
```

### Eventos (contrato)

#### Server → Client

**`game:state`**

- Se emite al conectar un socket.
- Se vuelve a emitir cada vez que alguien se une, selecciona una ficha o se desconecta.
- Payload: `GameState`

#### Client → Server

**`player:join`**

- Payload: `string` (nombre del jugador)
- Efecto: agrega o reconecta al jugador con `socket.id` como `player.id`
- Respuesta: el server hace broadcast de `game:state` a todos.

**`tile:select`**

- Payload: `string` (`tileId`)
- Efecto:
	- Bloquea la ficha con `lockedBy = socket.id` y la voltea (`isFlipped = true`) si es válida.
	- Si el jugador llega a tener 2 fichas seleccionadas, el server evalúa match inmediatamente:
		- Si hay match: marca `isMatched = true` en ambas y suma +1 al score.
		- Si no hay match: desbloquea y vuelve a tapar ambas.
- Respuesta: el server hace broadcast de `game:state` a todos.

**`disconnect`** (evento interno de Socket.io)

- Efecto: marca `player.isConnected = false`.

### Tipos (TypeScript)

Estos tipos son el contrato para el frontend. Copialos tal cual en tu cliente (por ejemplo `client/src/types.ts`) para tener tipado estricto.

```ts
export interface Tile {
	id: string;
	symbol: string;
	isFlipped: boolean;
	isMatched: boolean;
	lockedBy: string | null;
}

export interface Player {
	id: string;
	name: string;
	score: number;
	isConnected: boolean;
}

export interface ScoreSnapshot {
	timestamp: number;
	scores: Record<string, number>;
}

export interface GameState {
	tiles: Tile[];
	players: Player[];
	scoreHistory: ScoreSnapshot[];
	isGameOver: boolean;
	startTime: number | null;
}
```

### Notas importantes para el frontend

- `player.id` es el `socket.id`.
- Una ficha está **bloqueada** si `lockedBy !== null`.
	- Si `lockedBy` es distinto al `socket.id` actual, tu UI debería tratarla como “no clickeable”.
- El server emite siempre el estado completo en `game:state` (no hay delta updates).

---

## Ejemplo mínimo de consumo (React + socket.io-client)

Instalación (en el frontend):

```bash
npm i socket.io-client
```

Hook de ejemplo (MVP):

```ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from './types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function useSocket() {
	const socketRef = useRef<Socket | null>(null);
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		const socket = io(SERVER_URL, { transports: ['websocket'] });
		socketRef.current = socket;

		socket.on('connect', () => setIsConnected(true));
		socket.on('disconnect', () => setIsConnected(false));
		socket.on('game:state', (state: GameState) => setGameState(state));

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, []);

	const joinGame = (name: string) => {
		socketRef.current?.emit('player:join', name);
	};

	const selectTile = (tileId: string) => {
		socketRef.current?.emit('tile:select', tileId);
	};

	return {
		socket: socketRef.current,
		gameState,
		isConnected,
		joinGame,
		selectTile,
	};
}
```

---

## Despliegue Vercel

Estado actual del repositorio:

- El backend en `mahjong-coop/server` esta listo para produccion con `PORT` y `CLIENT_ORIGIN` por variables de entorno.
- No existe aun la carpeta `mahjong-coop/client`, por lo tanto la configuracion real de Vercel todavia no puede completarse en este repo.

### 1) Backend en Railway

- Root directory del servicio: `mahjong-coop/server`
- Build command: `npm install && npm run build`
- Start command: `npm run start`

Variables recomendadas en Railway:

- `PORT`: lo define Railway automaticamente (no fijarlo manualmente salvo que lo necesites)
- `CLIENT_ORIGIN`: URL publica del frontend en Vercel

Ejemplo:

```env
CLIENT_ORIGIN=https://tu-proyecto.vercel.app
```

Cuando Railway te entregue la URL del backend, guardala para Vercel.

### 2) Frontend en Vercel

Cuando tengas la carpeta `client`:

- Root directory en Vercel: `mahjong-coop/client`
- Build command: `npm run build`
- Output directory: `dist`

Variable de entorno en Vercel:

```env
VITE_SERVER_URL=https://tu-backend.railway.app
```

### 3) Configuracion del hook

En el frontend, usar:

```ts
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
```

### 4) Checklist rapido de entrega

- Backend desplegado en Railway y respondiendo WebSocket.
- Frontend desplegado en Vercel.
- `CLIENT_ORIGIN` en Railway apunta al dominio Vercel.
- `VITE_SERVER_URL` en Vercel apunta al dominio Railway.
- Prueba final con dos navegadores y dos jugadores simultaneos.