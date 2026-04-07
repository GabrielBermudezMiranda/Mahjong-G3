export interface Tile {
  id: string;
  isFaceUp: boolean;
  isMatched: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface GameState {
  board: Tile[];
  players: Player[];
  maxPlayers: number;
}
