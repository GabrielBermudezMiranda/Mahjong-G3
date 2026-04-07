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