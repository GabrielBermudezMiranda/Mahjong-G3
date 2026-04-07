import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ChevronRight,
  Clock,
  LogOut,
  Moon,
  Plus,
  Sun,
  Trophy,
  Users,
} from 'lucide-react';
import { GameState, RoomSummary, socketService, Tile } from './socketService';

const TILE_WIDTH = 56;
const TILE_HEIGHT = 76;
const BOARD_COLS = 6;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getTilePosition(index: number) {
  const col = index % BOARD_COLS;
  const row = Math.floor(index / BOARD_COLS);
  return {
    x: col * (TILE_WIDTH + 12),
    y: row * (TILE_HEIGHT + 12),
  };
}

export default function App() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [tempName, setTempName] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);
  const [roomName, setRoomName] = useState('');
  const [requiredPlayers, setRequiredPlayers] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('mahjong_user');
    const savedTheme = localStorage.getItem('mahjong_theme');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    setConnecting(true);

    const onGameState = (state: GameState) => {
      setGameState(state);
      if (state.startTime && state.hasStarted) {
        setTime(Math.floor((Date.now() - state.startTime) / 1000));
      }
    };

    const onRoomsList = (roomList: RoomSummary[]) => {
      setRooms(roomList);
    };

    const onRoomCreated = (payload: { roomId: string; name: string; requiredPlayers: number }) => {
      setShowCreateRoom(false);
      const createdRoom: RoomSummary = {
        id: payload.roomId,
        name: payload.name,
        currentPlayers: 1,
        requiredPlayers: payload.requiredPlayers,
        hasStarted: false,
      };
      setSelectedRoom(createdRoom);
      setRooms((prev) => [createdRoom, ...prev.filter((room) => room.id !== createdRoom.id)]);
    };

    const onRoomError = (message: string) => {
      setError(message);
      window.setTimeout(() => setError(null), 3000);
    };

    socketService.on('game:state', onGameState);
    socketService.on('rooms:list', onRoomsList);
    socketService.on('room:created', onRoomCreated);
    socketService.on('room:error', onRoomError);

    socketService
      .connect()
      .then(() => {
        if (!mounted) return;
        setConnecting(false);
      })
      .catch((connectError) => {
        if (!mounted) return;
        setConnecting(false);
        setError(connectError instanceof Error ? connectError.message : 'No se pudo conectar al servidor');
      });

    return () => {
      mounted = false;
      socketService.off('game:state', onGameState);
      socketService.off('rooms:list', onRoomsList);
      socketService.off('room:created', onRoomCreated);
      socketService.off('room:error', onRoomError);
      socketService.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (gameState?.startTime && gameState.hasStarted && !gameState.isGameOver) {
        setTime(Math.floor((Date.now() - gameState.startTime) / 1000));
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    const handleResize = () => {
      if (!boardRef.current) return;
      boardRef.current.style.setProperty('--board-scale', String(Math.min(1, window.innerWidth / 1280)));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = () => {
    const name = tempName.trim();
    if (!name) return;

    const newUser = { id: `user-${Date.now()}`, name };
    setUser(newUser);
    localStorage.setItem('mahjong_user', JSON.stringify(newUser));
    setTempName('');
  };

  const handleLogout = () => {
    setUser(null);
    setGameState(null);
    setSelectedRoom(null);
    localStorage.removeItem('mahjong_user');
    socketService.disconnect();
  };

  const handleCreateRoom = () => {
    if (!user || !roomName.trim()) {
      setError('Escribe un nombre para la sala');
      return;
    }

    socketService.createRoom({
      name: roomName.trim(),
      requiredPlayers,
      pairCount: 15,
    });
  };

  const handleJoinRoom = (room: RoomSummary) => {
    if (!user) return;
    setSelectedRoom(room);
    socketService.joinRoom(room.id, user.name);
  };

  const handleTileSelect = (tileId: string) => {
    if (!gameState || !gameState.hasStarted || gameState.isGameOver) return;
    socketService.selectTile(tileId);
  };

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    localStorage.setItem('mahjong_theme', nextTheme ? 'dark' : 'light');
  };

  const currentPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((player) => player.id === user.id) ?? null;
  }, [gameState, user]);

  const connectedPlayers = gameState?.players.filter((player) => player.isConnected).length ?? 0;
  const waitingPlayers = gameState ? Math.max(0, gameState.requiredPlayers - connectedPlayers) : 0;

  if (loading || connecting) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'}`}>
        <div className="text-center space-y-4">
          <div className="text-5xl">🀄</div>
          <p className="font-black tracking-[0.3em] uppercase text-sm text-emerald-500">Conectando</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full p-10 rounded-[40px] border-2 ${isDarkMode ? 'bg-stone-900/80 border-emerald-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white border-stone-200 shadow-2xl'} backdrop-blur-xl text-center space-y-8`}
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-stone-100 rounded-2xl mx-auto flex items-center justify-center text-5xl shadow-xl">🀄</div>
            <h1 className="text-4xl font-black tracking-tighter">MAHJONG SOLITARIO</h1>
            <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Ingresa tu nombre para entrar a las salas online</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Tu nombre..."
              className={`w-full px-6 py-4 rounded-2xl border-2 outline-none transition-all font-bold text-lg ${isDarkMode ? 'bg-stone-800 border-stone-700 text-white focus:border-emerald-500/50' : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-emerald-500'}`}
            />
            <button
              onClick={handleLogin}
              disabled={!tempName.trim()}
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-emerald-950 font-black text-xl rounded-2xl transition-all shadow-lg active:scale-95"
            >
              CONTINUAR
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'}`}>
        <header className={`fixed top-0 left-0 right-0 h-16 ${isDarkMode ? 'bg-black/60 border-white/5' : 'bg-white/80 border-black/5'} backdrop-blur-xl border-b flex items-center justify-between px-6 z-50`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-100 rounded flex items-center justify-center text-black shadow-[2px_2px_0_#065f46]">🀄</div>
            <span className="text-xl font-black tracking-tighter text-emerald-500">MAHJONG</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 transition-colors text-yellow-400">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all font-bold text-xs border border-red-500/20">
              <LogOut size={16} />
              SALIR
            </button>
          </div>
        </header>

        <main className="pt-24 px-6 pb-16 max-w-6xl mx-auto">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500 text-white rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl border rounded-3xl p-6 shadow-2xl space-y-4`}>
              <div className="flex items-center gap-2">
                <Plus className="text-emerald-500" size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest text-emerald-500">Crear Sala</h2>
              </div>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Nombre de la sala"
                className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-stone-950/60 border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'}`}
              />
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>Jugadores requeridos: {requiredPlayers}</label>
                <input type="range" min="2" max="8" value={requiredPlayers} onChange={(e) => setRequiredPlayers(Number(e.target.value))} className="w-full mt-3" />
              </div>
              <button onClick={handleCreateRoom} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-2xl transition-all flex items-center justify-center gap-2">
                Crear sala
                <ChevronRight size={18} />
              </button>
            </div>

            <div className={`${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl border rounded-3xl p-6 shadow-2xl space-y-4`}>
              <div className="flex items-center gap-2">
                <Users className="text-emerald-500" size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest text-emerald-500">Salas Disponibles</h2>
              </div>
              <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                {rooms.length === 0 ? (
                  <p className={`${isDarkMode ? 'text-stone-500' : 'text-stone-400'} text-sm`}>No hay salas disponibles todavía.</p>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-200'} flex items-center justify-between gap-4`}>
                      <div>
                        <p className="font-black">{room.name}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>{room.currentPlayers}/{room.requiredPlayers} jugadores {room.hasStarted ? '• En juego' : '• Esperando'}</p>
                        <p className={`text-[10px] font-mono ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>{room.id}</p>
                      </div>
                      <button onClick={() => handleJoinRoom(room)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-xl transition-all flex items-center gap-2">
                        Unirse
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'} overflow-hidden`}>
      <header className={`fixed top-0 left-0 right-0 h-16 ${isDarkMode ? 'bg-black/60 border-white/5' : 'bg-white/80 border-black/5'} backdrop-blur-xl border-b flex items-center justify-between px-6 z-50`}>
        <div className="flex items-center gap-4">
          <button onClick={() => { setGameState(null); setSelectedRoom(null); }} className="text-xl font-black tracking-tighter text-emerald-500 flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-stone-100 rounded flex items-center justify-center text-black shadow-[2px_2px_0_#065f46]">🀄</div>
            MAHJONG
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">{user.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 transition-colors text-yellow-400">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
          <button onClick={() => setIsFullscreen((value) => !value)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-emerald-500">
            {isFullscreen ? '⤢' : '⤢'}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all font-bold text-xs border border-red-500/20">
            <LogOut size={16} />
            SALIR
          </button>
        </div>
      </header>

      <main className="pt-24 pb-24 px-6 max-w-7xl mx-auto">
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500 text-white rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-6">
          <section className="space-y-6">
            <div className={`${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl border rounded-3xl p-6 shadow-2xl`}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter">{selectedRoom?.name ?? 'Sala'}</h1>
                  <p className={`text-xs font-mono ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>{selectedRoom?.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>Tiempo</p>
                    <p className="text-2xl font-mono font-black flex items-center gap-2 justify-end"><Clock size={18} className="text-emerald-500" />{formatTime(time)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>Restantes</p>
                    <p className="text-2xl font-mono font-black">{gameState.tiles.filter((tile) => !tile.isMatched).length}</p>
                  </div>
                </div>
              </div>

              {!gameState.hasStarted && (
                <div className={`mb-4 p-4 rounded-2xl ${isDarkMode ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' : 'bg-amber-100 border border-amber-200 text-amber-800'}`}>
                  Esperando a que se conecten todos los jugadores: {connectedPlayers}/{gameState.requiredPlayers}
                </div>
              )}

              {gameState.isGameOver && (
                <div className={`mb-4 p-4 rounded-2xl ${isDarkMode ? 'bg-green-500/10 border border-green-500/20 text-green-200' : 'bg-green-100 border border-green-200 text-green-800'}`}>
                  La partida terminó.
                </div>
              )}

              <div ref={boardRef} className="overflow-auto">
                <div className="relative mx-auto" style={{ width: '100%', minHeight: '360px' }}>
                  <AnimatePresence>
                    {gameState.tiles.map((tile, index) => {
                      const position = getTilePosition(index);
                      const isClickable = gameState.hasStarted && !gameState.isGameOver && !tile.isMatched;
                      return (
                        <motion.button
                          key={tile.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{
                            opacity: 1,
                            scale: tile.isMatched ? 0.8 : 1,
                            x: position.x,
                            y: position.y,
                          }}
                          whileHover={{ scale: isClickable ? 1.05 : 1 }}
                          whileTap={{ scale: isClickable ? 0.96 : 1 }}
                          onClick={() => handleTileSelect(tile.id)}
                          className={`absolute rounded-md overflow-hidden select-none transition-all ${tile.isMatched ? 'opacity-10' : ''}`}
                          style={{
                            width: TILE_WIDTH,
                            height: TILE_HEIGHT,
                            zIndex: 50 + index,
                            pointerEvents: isClickable ? 'auto' : 'none',
                          }}
                        >
                          <div className={`relative w-full h-full rounded-md border border-stone-400 ${tile.isFlipped ? 'bg-stone-100' : 'bg-stone-700'} shadow-lg`}>
                            <div className="absolute inset-0 translate-y-[4px] translate-x-[2px] bg-emerald-900 rounded-md" />
                            <div className="absolute inset-0 translate-y-[2px] translate-x-[1px] bg-stone-300 rounded-md" />
                            <div className={`absolute inset-0 rounded-md border border-stone-400 flex items-center justify-center text-4xl font-black ${tile.isFlipped ? 'bg-stone-100 text-stone-900' : 'bg-stone-700 text-stone-100'} ${tile.lockedBy ? 'ring-2 ring-yellow-400' : ''}`}>
                              {tile.isFlipped ? tile.symbol : '🀫'}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
              <StatCard label="Jugadores" value={`${connectedPlayers}/${gameState.requiredPlayers}`} />
              <StatCard label="Puntaje" value={currentPlayer?.score.toLocaleString() ?? '0'} />
              <StatCard label="Estado" value={gameState.hasStarted ? 'Jugando' : 'Esperando'} />
              <StatCard label="Sala" value={selectedRoom?.id.slice(0, 6).toUpperCase() ?? ''} />
            </div>
          </section>

          <aside className="space-y-6 sticky top-24 h-fit">
            <div className={`${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl border rounded-3xl p-6 shadow-2xl`}>
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-emerald-500" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Jugadores</h3>
              </div>
              <div className="space-y-3">
                {gameState.players.map((player, index) => (
                  <div key={player.id} className={`flex items-center justify-between p-3 rounded-2xl border ${player.id === user.id ? 'bg-emerald-500/10 border-emerald-500/20' : isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <div>
                      <p className="font-bold text-sm">{player.name}</p>
                      <p className={`text-[10px] uppercase tracking-widest ${player.isConnected ? 'text-emerald-500' : 'text-red-400'}`}>{player.isConnected ? 'Conectado' : 'Desconectado'}</p>
                    </div>
                    <span className="font-mono font-black text-emerald-500">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl border rounded-3xl p-6 shadow-2xl`}>
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-4">Salas disponibles</h3>
              <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                {rooms.map((room) => (
                  <div key={room.id} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-200'} flex items-center justify-between gap-3`}>
                    <div>
                      <p className="font-bold text-sm">{room.name}</p>
                      <p className={`text-[10px] ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>{room.currentPlayers}/{room.requiredPlayers}</p>
                    </div>
                    <button onClick={() => handleJoinRoom(room)} className="text-xs font-black px-3 py-2 rounded-xl bg-emerald-500 text-emerald-950">Entrar</button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-xl shadow-lg">
      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-1">{label}</div>
      <div className="text-xl font-black truncate">{value}</div>
    </div>
  );
}
