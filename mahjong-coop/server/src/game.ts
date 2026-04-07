import { GameState, Tile } from "./types";

interface SelectTileResult {
  newState: GameState;
  event: null;
}

export function createGame(pairCount: number): GameState {
  const safePairCount = Math.max(1, pairCount);
  const tiles: Tile[] = [];

  for (let i = 0; i < safePairCount * 2; i += 1) {
    tiles.push({
      id: `tile-${i + 1}`,
      isFaceUp: false,
      isMatched: false,
    });
  }

  return {
    board: tiles,
    players: [],
    maxPlayers: 5,
  };
}

export function addPlayer(
  state: GameState,
  playerId: string,
  name: string,
): GameState {
  const trimmedName = name.trim();
  const playerName = trimmedName.length > 0 ? trimmedName : "Player";

  const existingPlayerIndex = state.players.findIndex((p) => p.id === playerId);

  if (existingPlayerIndex !== -1) {
    const players = [...state.players];
    players[existingPlayerIndex] = {
      ...players[existingPlayerIndex],
      name: playerName,
      connected: true,
    };

    return {
      ...state,
      players,
    };
  }

  if (state.players.length >= state.maxPlayers) {
    return state;
  }

  return {
    ...state,
    players: [
      ...state.players,
      {
        id: playerId,
        name: playerName,
        score: 0,
        connected: true,
      },
    ],
  };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, connected: false } : player,
    ),
  };
}

export function selectTile(
  state: GameState,
  tileId: string,
  playerId: string,
): SelectTileResult {
  const hasPlayer = state.players.some((player) => player.id === playerId);

  if (!hasPlayer) {
    return { newState: state, event: null };
  }

  const board = state.board.map((tile) =>
    tile.id === tileId ? { ...tile, isFaceUp: !tile.isFaceUp } : tile,
  );

  return {
    newState: {
      ...state,
      board,
    },
    event: null,
  };
}
