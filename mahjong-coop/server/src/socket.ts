import type { Server, Socket } from "socket.io";
import { addPlayer, createGame, removePlayer, selectTile } from "./game";
import { GameState, RoomSummary } from "./types";

interface RoomState {
	id: string;
	code: string;
	name: string;
	gameState: GameState;
}

interface CreateRoomPayload {
	name?: string;
	requiredPlayers?: number;
	pairCount?: number;
	playerName?: string;
}

interface JoinRoomPayload {
	code: string;
	name: string;
}

const DEFAULT_ROOM_ID = "sala-principal";
const DEFAULT_PAIR_COUNT = 15;
const DEFAULT_REQUIRED_PLAYERS = 4;

const rooms = new Map<string, RoomState>();
const playerRoomBySocket = new Map<string, string>();
const codeToRoomId = new Map<string, string>();

function generateRoomId(): string {
	return `sala-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateRoomCode(): string {
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const numbers = '0123456789';
	let code = '';
	
	// Generate 4 random letters
	for (let i = 0; i < 4; i++) {
		code += letters[Math.floor(Math.random() * letters.length)];
	}
	
	// Add 2 random numbers
	for (let i = 0; i < 2; i++) {
		code += numbers[Math.floor(Math.random() * numbers.length)];
	}
	
	return code;
}

function getRoomSummaries(): RoomSummary[] {
	return Array.from(rooms.values()).map((room) => ({
		id: room.id,
		code: room.code,
		name: room.name,
		currentPlayers: room.gameState.players.filter((player) => player.isConnected).length,
		requiredPlayers: room.gameState.requiredPlayers,
		hasStarted: room.gameState.hasStarted,
	}));
}

function emitRoomList(io: Server): void {
	io.emit("rooms:list", getRoomSummaries());
}

function createRoom(payload?: CreateRoomPayload): RoomState {
	const id = generateRoomId();
	let code = generateRoomCode();
	
	// Ensure code is unique
	while (codeToRoomId.has(code)) {
		code = generateRoomCode();
	}
	
	const safeRequiredPlayers = Math.max(2, Math.min(8, payload?.requiredPlayers ?? DEFAULT_REQUIRED_PLAYERS));
	const safePairCount = Math.max(1, payload?.pairCount ?? DEFAULT_PAIR_COUNT);
	const trimmedName = payload?.name?.trim();

	const room: RoomState = {
		id,
		code,
		name: trimmedName && trimmedName.length > 0 ? trimmedName : `Sala ${rooms.size + 1}`,
		gameState: createGame(safePairCount, safeRequiredPlayers),
	};

	rooms.set(id, room);
	codeToRoomId.set(code, id);
	return room;
}

function ensureDefaultRoom(): void {
	if (rooms.has(DEFAULT_ROOM_ID)) return;
	rooms.set(DEFAULT_ROOM_ID, {
		id: DEFAULT_ROOM_ID,
		code: "MAIN00",
		name: "Sala principal",
		gameState: createGame(DEFAULT_PAIR_COUNT, DEFAULT_REQUIRED_PLAYERS),
	});
	codeToRoomId.set("MAIN00", DEFAULT_ROOM_ID);
}

function joinRoom(
	io: Server,
	socket: Socket,
	roomId: string,
	playerName: string,
): void {
	const room = rooms.get(roomId);
	if (!room) {
		socket.emit("room:error", "La sala no existe.");
		return;
	}

	const connectedPlayers = room.gameState.players.filter((player) => player.isConnected).length;
	if (connectedPlayers >= room.gameState.requiredPlayers) {
		socket.emit("room:error", "La sala ya esta completa.");
		return;
	}

	const previousRoomId = playerRoomBySocket.get(socket.id);
	if (previousRoomId && previousRoomId !== roomId) {
		const previousRoom = rooms.get(previousRoomId);
		if (previousRoom) {
			previousRoom.gameState = removePlayer(previousRoom.gameState, socket.id);
			io.to(previousRoom.id).emit("game:state", previousRoom.gameState);
		}
		socket.leave(previousRoomId);
	}

	socket.join(roomId);
	room.gameState = addPlayer(room.gameState, socket.id, playerName);
	playerRoomBySocket.set(socket.id, roomId);

	io.to(roomId).emit("game:state", room.gameState);
	emitRoomList(io);
}

export function setupSocket(io: Server): void {
	ensureDefaultRoom();
	emitRoomList(io);

	io.on("connection", (socket: Socket) => {
		console.log(`Client connected: ${socket.id}`);

		socket.emit("rooms:list", getRoomSummaries());
		const defaultRoom = rooms.get(DEFAULT_ROOM_ID);
		if (defaultRoom) {
			socket.emit("game:state", defaultRoom.gameState);
		}

		socket.on("room:create", (payload?: CreateRoomPayload) => {
			const room = createRoom(payload);
			emitRoomList(io);
			
			// El creador se une automáticamente a su propia sala
			socket.join(room.id);
			room.gameState = addPlayer(room.gameState, socket.id, payload?.playerName || "Host");
			playerRoomBySocket.set(socket.id, room.id);
			
			// Notificar al creador que la sala fue creada
			socket.emit("room:created", {
				roomId: room.id,
				code: room.code,
				name: room.name,
				requiredPlayers: room.gameState.requiredPlayers,
			});
			
			// Emitir estado actualizado a todos en la sala
			io.to(room.id).emit("game:state", room.gameState);
		});

		socket.on("room:join", (payload: { code: string; name: string }) => {
			// Resolver el código a roomId
			const roomId = codeToRoomId.get(payload.code);
			if (!roomId) {
				socket.emit("room:error", "Código de sala inválido.");
				return;
			}
			joinRoom(io, socket, roomId, payload.name);
		});

		socket.on("player:join", (name: string) => {
			joinRoom(io, socket, DEFAULT_ROOM_ID, name);
		});

		socket.on("tile:select", (payload: { tileIds: number[] }) => {
			const roomId = playerRoomBySocket.get(socket.id);
			if (!roomId) return;

			const room = rooms.get(roomId);
			if (!room) return;

			const result = selectTile(room.gameState, payload.tileIds[0], payload.tileIds);
			room.gameState = result.newState;
			io.to(roomId).emit("game:state", room.gameState);
		});

		socket.on("disconnect", () => {
			const roomId = playerRoomBySocket.get(socket.id);
			if (!roomId) return;

			const room = rooms.get(roomId);
			if (!room) return;

			room.gameState = removePlayer(room.gameState, socket.id);
			playerRoomBySocket.delete(socket.id);
			
			// Eliminar sala si no hay jugadores conectados y no es la sala principal
			const connectedPlayers = room.gameState.players.filter((p) => p.isConnected).length;
			if (connectedPlayers === 0 && roomId !== DEFAULT_ROOM_ID) {
				rooms.delete(roomId);
				codeToRoomId.delete(room.code);
			} else {
				io.to(roomId).emit("game:state", room.gameState);
			}
			
			emitRoomList(io);
		});
	});
}
