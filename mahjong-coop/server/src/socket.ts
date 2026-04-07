import type { Server, Socket } from "socket.io";
import { addPlayer, createGame, removePlayer, selectTile } from "./game";

let gameState = createGame(15);

export function setupSocket(io: Server): void {
	io.on("connection", (socket: Socket) => {
		console.log(`Client connected: ${socket.id}`);

		socket.emit("game:state", gameState);

		socket.on("player:join", (name: string) => {
			gameState = addPlayer(gameState, socket.id, name);
			io.emit("game:state", gameState);
		});

		socket.on("tile:select", (tileId: string) => {
			const result = selectTile(gameState, tileId, socket.id);
			gameState = result.newState;
			io.emit("game:state", gameState);
		});

		socket.on("disconnect", () => {
			gameState = removePlayer(gameState, socket.id);
			io.emit("game:state", gameState);
		});
	});
}
