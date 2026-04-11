import { GameState, Player, ScoreSnapshot, Tile } from "./types";

interface SelectTileResult {
  newState: GameState;
  event: string | null;
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function buildScoreSnapshot(players: Player[], timestamp: number): ScoreSnapshot {
  const scores: Record<string, number> = {};
  for (const player of players) {
    scores[player.id] = player.score;
  }
  return { timestamp, scores };
}

function getClassicTurtlePositions(): { x: number; y: number; z: number }[] {
  const pos: { x: number; y: number; z: number }[] = [];
  
  // Capa 0: 87 fichas
  for (let y = 1; y <= 6; y++) {
    for (let x = 2; x <= 13; x++) {
      pos.push({ x, y, z: 0 });
    }
  }
  for (let x = 4; x <= 9; x++) {
    pos.push({ x, y: 0, z: 0 });
    pos.push({ x, y: 7, z: 0 });
  }
  pos.push({ x: 1, y: 3.5, z: 0 });
  pos.push({ x: 14, y: 3.5, z: 0 });
  pos.push({ x: 15, y: 3.5, z: 0 });
  
  // Capa 1: 36 fichas
  for (let y = 1; y <= 6; y++) {
    for (let x = 4; x <= 9; x++) {
      pos.push({ x: x + 0.5, y: y + 0.5, z: 1 });
    }
  }
  
  // Capa 2: 16 fichas
  for (let y = 2; y <= 5; y++) {
    for (let x = 5; x <= 8; x++) {
      pos.push({ x: x + 1, y: y + 1, z: 2 });
    }
  }
  
  // Capa 3: 4 fichas
  for (let y = 3; y <= 4; y++) {
    for (let x = 6; x <= 7; x++) {
      pos.push({ x: x + 1.5, y: y + 1.5, z: 3 });
    }
  }
  
  // Capa 4: 1 ficha
  pos.push({ x: 8, y: 4.5, z: 4 });

  return pos.slice(0, 144);
}

function createTiles(positions: { x: number; y: number; z: number }[]): Tile[] {
  const SYMBOLS = {
    dots: ['🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡'],
    bamboo: ['🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘'],
    chars: ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏'],
    winds: ['🀀', '🀁', '🀂', '🀃'],
    dragons: ['🀄', '🀅', '🀆'],
    seasons: ['🀦', '🀧', '🀨', '🀩'],
    flowers: ['🀢', '🀣', '🀤', '🀥'],
  };

  const types: { symbol: string; category: string; value: number }[] = [];
  
  // 3 suits * 9 numbers * 4 each = 108
  ['dots', 'bamboo', 'chars'].forEach((cat) => {
    SYMBOLS[cat as keyof typeof SYMBOLS].forEach((sym, i) => {
      for (let k = 0; k < 4; k++) types.push({ symbol: sym, category: cat, value: i });
    });
  });
  // 4 winds * 4 each = 16
  SYMBOLS.winds.forEach((sym, i) => {
    for (let k = 0; k < 4; k++) types.push({ symbol: sym, category: 'winds', value: i });
  });
  // 3 dragons * 4 each = 12
  SYMBOLS.dragons.forEach((sym, i) => {
    for (let k = 0; k < 4; k++) types.push({ symbol: sym, category: 'dragons', value: i });
  });
  // 4 seasons * 1 each = 4
  SYMBOLS.seasons.forEach((sym, i) => {
    types.push({ symbol: sym, category: 'seasons', value: i });
  });
  // 4 flowers * 1 each = 4
  SYMBOLS.flowers.forEach((sym, i) => {
    types.push({ symbol: sym, category: 'flowers', value: i });
  });

  shuffleInPlace(types);

  return positions.map((pos, i) => ({
    id: i,
    ...pos,
    ...types[i],
    isMatched: false,
    isSelected: false,
    isHinted: false,
  }));
}

export function createGame(pairCount: number, requiredPlayers = 2): GameState {
  const safeRequiredPlayers = Math.max(1, Math.min(8, requiredPlayers));
  
  // Generar las 144 fichas con formación tortuga
  const positions = getClassicTurtlePositions();
  const tiles = createTiles(positions);

  return {
    tiles,
    players: [],
    scoreHistory: [],
    isGameOver: false,
    startTime: null,
    requiredPlayers: safeRequiredPlayers,
    hasStarted: false,
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
  const now = Date.now();

  if (existingPlayerIndex !== -1) {
    const players = [...state.players];
    players[existingPlayerIndex] = {
      ...players[existingPlayerIndex],
      name: playerName,
      isConnected: true,
    };

    const connectedPlayers = players.filter((player) => player.isConnected).length;
    const hasStarted = state.hasStarted || connectedPlayers >= state.requiredPlayers;

    return {
      ...state,
      players,
      hasStarted,
      startTime: hasStarted ? state.startTime ?? now : state.startTime,
    };
  }

  if (state.players.length >= state.requiredPlayers) {
    return state;
  }

  const players = [
    ...state.players,
    {
      id: playerId,
      name: playerName,
      score: 0,
      isConnected: true,
    },
  ];

  const connectedPlayers = players.filter((player) => player.isConnected).length;
  const hasStarted = state.hasStarted || connectedPlayers >= state.requiredPlayers;

  return {
    ...state,
    players,
    scoreHistory: [...state.scoreHistory, buildScoreSnapshot(players, now)],
    hasStarted,
    startTime: hasStarted ? state.startTime ?? now : state.startTime,
  };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  const players = state.players.map((player) =>
    player.id === playerId ? { ...player, isConnected: false } : player,
  );

  return {
    ...state,
    players,
  };
}

export function selectTile(
  state: GameState,
  tileId: number,
  matchedTileIds?: number[],
): SelectTileResult {
  // Si el frontend envía que tienes dos fichas matcheadas, marcarlas
  if (matchedTileIds && matchedTileIds.length === 2) {
    const tiles = state.tiles.map((tile) =>
      matchedTileIds.includes(tile.id) ? { ...tile, isMatched: true } : tile,
    );

    const allMatched = tiles.every((tile) => tile.isMatched);
    const newState: GameState = {
      ...state,
      tiles,
      isGameOver: allMatched,
    };

    return {
      newState,
      event: allMatched ? "game:won" : "tiles:matched",
    };
  }

  return {
    newState: state,
    event: null,
  };
}

export function checkMatch(
  state: GameState,
  t1: number,
  t2: number,
  playerId: string,
): { newState: GameState; isMatch: boolean } {
  if (t1 === t2) return { newState: state, isMatch: false };

  const idx1 = state.tiles.findIndex((tile) => tile.id === t1);
  const idx2 = state.tiles.findIndex((tile) => tile.id === t2);
  if (idx1 === -1 || idx2 === -1) return { newState: state, isMatch: false };

  const tile1 = state.tiles[idx1];
  const tile2 = state.tiles[idx2];
  if (tile1.isMatched || tile2.isMatched) return { newState: state, isMatch: false };

  const isMatch = tile1.symbol === tile2.symbol;
  const tiles = [...state.tiles];
  const now = Date.now();

  if (isMatch) {
    tiles[idx1] = { ...tile1, isMatched: true };
    tiles[idx2] = { ...tile2, isMatched: true };

    const players = state.players.map((player) =>
      player.id === playerId ? { ...player, score: player.score + 1 } : player,
    );

    const isGameOver = tiles.every((tile) => tile.isMatched);
    return {
      newState: {
        ...state,
        tiles,
        players,
        scoreHistory: [...state.scoreHistory, buildScoreSnapshot(players, now)],
        isGameOver,
      },
      isMatch: true,
    };
  }

  return {
    newState: {
      ...state,
      tiles,
    },
    isMatch: false,
  };
}
