import { io, Socket } from 'socket.io-client';

export interface Player {
  id: string;
  name: string;
  score: number;
  isConnected: boolean;
}

export interface Tile {
  id: string;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
  lockedBy: string | null;
}

export interface GameState {
  tiles: Tile[];
  players: Player[];
  scoreHistory: any[];
  isGameOver: boolean;
  startTime: number | null;
  requiredPlayers: number;
  hasStarted: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  currentPlayers: number;
  requiredPlayers: number;
  hasStarted: boolean;
}

const SOCKET_SERVER_URL = (import.meta.env.VITE_SOCKET_URL as string) || 'https://mahjong-g3-production.up.railway.app';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }

        this.socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          withCredentials: false,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 10,
        });

        const connectionTimeout = setTimeout(() => {
          if (!this.socket?.connected) {
            reject(new Error(`Failed to connect to server at ${SOCKET_SERVER_URL}`));
          }
        }, 5000);

        this.socket.on('connect', () => {
          clearTimeout(connectionTimeout);
          this.emit('connected');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(connectionTimeout);
          reject(error);
        });

        this.socket.on('disconnect', () => {
          this.emit('disconnected');
        });

        this.socket.on('game:state', (gameState: GameState) => {
          this.emit('game:state', gameState);
        });

        this.socket.on('rooms:list', (rooms: RoomSummary[]) => {
          this.emit('rooms:list', rooms);
        });

        this.socket.on('room:created', (data: any) => {
          this.emit('room:created', data);
        });

        this.socket.on('room:error', (message: string) => {
          this.emit('room:error', message);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  createRoom(payload: { name?: string; requiredPlayers?: number; pairCount?: number }): void {
    this.socket?.emit('room:create', payload);
  }

  joinRoom(roomId: string, playerName: string): void {
    this.socket?.emit('room:join', { roomId, name: playerName });
  }

  selectTile(tileId: string): void {
    this.socket?.emit('tile:select', tileId);
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }
}

export const socketService = new SocketService();