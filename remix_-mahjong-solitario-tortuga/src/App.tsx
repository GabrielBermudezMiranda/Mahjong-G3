import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
	Users,
	Plus,
	LogOut,
	ChevronRight,
	Clock,
	AlertCircle,
	Sun,
	Moon,
	Maximize2,
	Minimize2,
} from 'lucide-react';
import { socketService, GameState, RoomSummary } from './socketService';

const TILE_WIDTH = 64;
const TILE_HEIGHT = 86;

export default function App() {
	const [user, setUser] = useState<{ id: string; name: string } | null>(null);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [rooms, setRooms] = useState<RoomSummary[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [scale, setScale] = useState(1);
	const [time, setTime] = useState(0);
	const [showCreateRoom, setShowCreateRoom] = useState(false);
	const [newRoomName, setNewRoomName] = useState('');
	const [newRoomPlayers, setNewRoomPlayers] = useState(4);
	const [tempName, setTempName] = useState('');
	const boardRef = useRef<HTMLDivElement>(null);

	// Load user from localStorage
	useEffect(() => {
		const savedUser = localStorage.getItem('mahjong_user');
		const savedTheme = localStorage.getItem('mahjong_theme');
		if (savedUser) {
			setUser(JSON.parse(savedUser));
		}
		if (savedTheme) {
			setIsDarkMode(savedTheme === 'dark');
		}
	}, []);

	// Connect to socket
	useEffect(() => {
		const connect = async () => {
			try {
				await socketService.connect();

				socketService.on('game:state', (state: GameState) => {
					setGameState(state);
					if (state.startTime && state.hasStarted) {
						const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
						setTime(elapsed);
					}
				});

				socketService.on('rooms:list', (roomsList: RoomSummary[]) => {
					setRooms(roomsList);
				});

				socketService.on('room:error', (message: string) => {
					setError(message);
					setTimeout(() => setError(null), 3000);
				});

				socketService.on('room:created', (data: any) => {
					setShowCreateRoom(false);
					setNewRoomName('');
				});
			} catch (e) {
				setError('No se pudo conectar al servidor');
				console.error(e);
			}
		};

		if (user) {
			connect();
		}

		return () => {
			socketService.disconnect();
		};
	}, [user]);

	// Timer
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null;
		if (gameState?.hasStarted && !gameState.isGameOver) {
			interval = setInterval(() => {
				setTime((prev) => prev + 1);
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [gameState?.hasStarted, gameState?.isGameOver]);

	// Responsive
	useEffect(() => {
		const handleResize = () => {
			if (!boardRef.current) return;
			const availableWidth = window.innerWidth - (window.innerWidth >= 1024 ? 350 : 40);
			const availableHeight = window.innerHeight - 150;

			const baseWidth = 16 * TILE_WIDTH;
			const baseHeight = 9 * TILE_HEIGHT;

			const scaleX = availableWidth / baseWidth;
			const scaleY = availableHeight / baseHeight;
			const newScale = Math.min(scaleX, scaleY) * 0.9;
			setScale(newScale);
		};

		window.addEventListener('resize', handleResize);
		handleResize();
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const handleLogin = () => {
		const name = tempName.trim() || prompt('¿Cuál es tu nombre?');
		if (name?.trim()) {
			const newUser = { id: `user-${Date.now()}`, name };
			setUser(newUser);
			localStorage.setItem('mahjong_user', JSON.stringify(newUser));
			setTempName('');
		}
	};

	const handleLogout = () => {
		setUser(null);
		setGameState(null);
		localStorage.removeItem('mahjong_user');
		socketService.disconnect();
	};

	const handleCreateRoom = () => {
		if (!user || !newRoomName.trim()) {
			setError('Por favor, ingresa un nombre para la sala');
			return;
		}
		socketService.createRoom({
			name: newRoomName,
			requiredPlayers: newRoomPlayers,
			pairCount: 15,
		});
	};

	const handleJoinRoom = (roomId: string) => {
		if (!user) return;
		socketService.joinRoom(roomId, user.name);
	};

	const handleLeaveRoom = () => {
		setGameState(null);
		setTime(0);
	};

	const handleTileSelect = (tileId: string) => {
		if (!gameState?.hasStarted || gameState.isGameOver) return;
		socketService.selectTile(tileId);
	};

	const toggleTheme = () => {
		const newTheme = !isDarkMode;
		setIsDarkMode(newTheme);
		localStorage.setItem('mahjong_theme', newTheme ? 'dark' : 'light');
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	if (!user) {
		return (
			<div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
				<div className={`text-center p-8 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
					<h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
						🀄 Mahjong Online
					</h1>
					<div className="flex gap-2 mb-4">
						<input
							type="text"
							placeholder="Tu nombre"
							value={tempName}
							onChange={(e) => setTempName(e.target.value)}
							onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
							className={`px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}
						/>
						<button
							onClick={handleLogin}
							className="px-8 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
						>
							Ingresar
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (!gameState) {
		return (
			<div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
				<header className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b p-4`}>
					<div className="max-w-7xl mx-auto flex justify-between items-center">
						<h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
							🀄 Mahjong Online
						</h1>
						<div className="flex gap-4 items-center">
							<button
								onClick={toggleTheme}
								className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-200 text-slate-700'}`}
							>
								{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
							</button>
							<span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{user.name}</span>
							<button
								onClick={handleLogout}
								className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
							>
								Salir
							</button>
						</div>
					</div>
				</header>

				<main className="max-w-7xl mx-auto p-4">
					{error && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="mb-4 p-4 bg-red-500 text-white rounded-lg flex items-center gap-2"
						>
							<AlertCircle size={20} />
							{error}
						</motion.div>
					)}

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Create Room */}
						<div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
							<h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
								<Plus size={20} />
								Crear Sala
							</h2>

							{!showCreateRoom ? (
								<button
									onClick={() => setShowCreateRoom(true)}
									className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
								>
									+ Nueva Sala
								</button>
							) : (
								<div className="space-y-4">
									<input
										type="text"
										placeholder="Nombre de la sala"
										value={newRoomName}
										onChange={(e) => setNewRoomName(e.target.value)}
										className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
									/>
									<div>
										<label className={`block mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
											Jugadores requeridos: {newRoomPlayers}
										</label>
										<input
											type="range"
											min="2"
											max="8"
											value={newRoomPlayers}
											onChange={(e) => setNewRoomPlayers(parseInt(e.target.value))}
											className="w-full"
										/>
									</div>
									<div className="flex gap-2">
										<button
											onClick={handleCreateRoom}
											className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
										>
											Crear
										</button>
										<button
											onClick={() => {
												setShowCreateRoom(false);
												setNewRoomName('');
											}}
											className={`flex-1 px-4 py-2 rounded-lg border ${isDarkMode ? 'border-slate-600 text-white hover:bg-slate-700' : 'border-slate-300 text-slate-900 hover:bg-slate-100'}`}
										>
											Cancelar
										</button>
									</div>
								</div>
							)}
						</div>

						{/* Room List */}
						<div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
							<h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
								<Users size={20} />
								Salas Disponibles
							</h2>

							<div className="space-y-2 max-h-96 overflow-y-auto">
								{rooms.length === 0 ? (
									<p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No hay salas disponibles</p>
								) : (
									rooms.map((room) => (
										<div
											key={room.id}
											className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} flex justify-between items-center`}
										>
											<div>
												<p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
													{room.name}
												</p>
												<p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
													{room.currentPlayers}/{room.requiredPlayers} jugadores{' '}
													{room.hasStarted && <span className="ml-2 text-green-400">▶ En juego</span>}
													{!room.hasStarted && room.currentPlayers < room.requiredPlayers && (
														<span className="ml-2 text-yellow-400">
															⏳ Faltan {room.requiredPlayers - room.currentPlayers}
														</span>
													)}
												</p>
											</div>
											<button
												onClick={() => handleJoinRoom(room.id)}
												disabled={room.currentPlayers >= room.requiredPlayers && !room.hasStarted}
												className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition flex items-center gap-2"
											>
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

	//  Game Screen
	const connectedCount = gameState.players.filter((p) => p.isConnected).length;
	const waitingFor = gameState.requiredPlayers - connectedCount;

	return (
		<div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
			<header className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b p-4`}>
				<div className="max-w-7xl mx-auto flex justify-between items-center">
					<div>
						<h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
							🀄 Mahjong Online
						</h1>
						{!gameState.hasStarted && (
							<p className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
								⏳ Faltan {waitingFor} jugador(es) para iniciar
							</p>
						)}
						{gameState.hasStarted && (
							<p className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
								<Clock size={16} />
								{formatTime(time)}
							</p>
						)}
					</div>

					<div className="flex gap-4 items-center">
						<button
							onClick={toggleTheme}
							className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-200 text-slate-700'}`}
						>
							{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
						</button>
						<button
							onClick={() => setIsFullscreen(!isFullscreen)}
							className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}
						>
							{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
						</button>
						<button
							onClick={handleLeaveRoom}
							className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
						>
							<LogOut size={16} />
							Salir
						</button>
					</div>
				</div>
			</header>

			<div className={`border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4`}>
				<div className="max-w-7xl mx-auto flex justify-between items-center overflow-x-auto pb-2">
					<div className="flex gap-6">
						{gameState.players.map((player) => (
							<div
								key={player.id}
								className={`text-center ${
									player.id === user.id
										? isDarkMode
											? 'bg-blue-600/20 border border-blue-500'
											: 'bg-blue-100 border border-blue-400'
										: ''
								} px-4 py-2 rounded-lg min-w-max`}
							>
								<p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
									{player.name}
								</p>
								<p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
									Score: {player.score}
								</p>
								<p
									className={`text-xs ${
										player.isConnected
											? isDarkMode
												? 'text-green-400'
												: 'text-green-600'
											: isDarkMode
												? 'text-red-400'
												: 'text-red-600'
									}`}
								>
									{player.isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			<main className="p-4">
				{!gameState.hasStarted && (
					<div className={`max-w-7xl mx-auto mb-4 p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} text-center`}>
						<p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
							⏳ Esperando a que se conecten todos los jugadores...
						</p>
						<p className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
							{connectedCount}/{gameState.requiredPlayers} jugadores conectados
						</p>
					</div>
				)}

				{gameState.isGameOver && (
					<div className={`max-w-7xl mx-auto mb-4 p-6 rounded-lg border ${isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-100 border-green-400'} text-center`}>
						<p className={`text-lg font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
							🎉 ¡Partida terminada!
						</p>
						<p className={`mt-2 ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
							Ganador: {gameState.players.reduce((a, b) => (a.score > b.score ? a : b)).name}
						</p>
					</div>
				)}

				<div ref={boardRef} className="flex justify-center items-center overflow-auto h-[600px]">
					<div className="relative" style={{ width: '1024px', height: '600px', position: 'relative' }}>
						{gameState.tiles.map((tile, idx) => {
							const col = idx % 8;
							const row = Math.floor(idx / 8);
							const x = col * 128;
							const y = row * 75;
							return (
								<motion.div
									key={tile.id}
									onClick={() => handleTileSelect(tile.id)}
									className={`absolute cursor-pointer rounded-lg overflow-hidden select-none transition-all ${
										tile.isMatched
											? 'opacity-20'
											: tile.isFlipped
												? isDarkMode
													? 'bg-blue-600 shadow-lg'
													: 'bg-blue-400 shadow-lg'
												: isDarkMode
													? 'bg-slate-600 hover:bg-slate-500'
													: 'bg-slate-300 hover:bg-slate-400'
									} ${tile.lockedBy ? 'ring-2 ring-yellow-400' : ''}`}
									style={{
										width: `${TILE_WIDTH}px`,
										height: `${TILE_HEIGHT}px`,
										left: `${x}px`,
										top: `${y}px`,
										zIndex: tile.lockedBy ? 10 : 1,
										pointerEvents: !gameState.hasStarted || tile.isMatched ? 'none' : 'auto',
									}}
									aria-disabled={!gameState.hasStarted || tile.isMatched}
									whileHover={{ scale: gameState.hasStarted && !tile.isMatched ? 1.1 : 1 }}
									whileTap={{ scale: gameState.hasStarted && !tile.isMatched ? 0.95 : 1 }}
								>
									{tile.isFlipped && (
										<div className="w-full h-full flex items-center justify-center text-3xl font-bold">
											{tile.symbol}
										</div>
									)}
								</motion.div>
							);
						})}
					</div>
				</div>
			</main>
		</div>
	);
}
