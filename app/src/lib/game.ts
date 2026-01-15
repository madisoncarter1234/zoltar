import { keccak256, toBytes } from 'viem';
import { type Difficulty } from './wordlist';

// ============ Types ============

interface PlayerState {
  tries: number;
  hasParticipated: boolean;  // Must send 1 message to see chat
  totalBuyIns: number;       // Track multiple buy-ins
}

interface ChatMessage {
  address: string;
  message: string;
  response: string;
  timestamp: number;
}

interface GameState {
  gameId: number;
  secret: string;
  difficulty: Difficulty;
  commitment: `0x${string}`;
  chat: ChatMessage[];
  players: Map<string, PlayerState>;
  startedAt: number;
  winner: string | null;
}

// ============ Global State ============

// Use globalThis to persist across Next.js API route recompilations in dev mode
declare global {
  // eslint-disable-next-line no-var
  var __extractGameV2: GameState | null | undefined;
}

const getGame = (): GameState | null => globalThis.__extractGameV2 ?? null;
const setGame = (game: GameState | null) => {
  globalThis.__extractGameV2 = game;
};

// ============ Constants ============

const TRIES_PER_BUY_IN = 5;

// ============ Game Management ============

/** Start a new game with random word */
export function startNewGame(gameId: number): { secret: string; commitment: `0x${string}`; difficulty: Difficulty } {
  const { word: secret, difficulty } = getRandomWordWithDifficulty();
  const commitment = keccak256(toBytes(secret));

  setGame({
    gameId,
    secret,
    difficulty,
    commitment,
    chat: [],
    players: new Map(),
    startedAt: Date.now(),
    winner: null,
  });

  console.log(`[Game] New game #${gameId} started. Secret: "${secret}" (${difficulty}), Commitment: ${commitment}`);

  return { secret, commitment, difficulty };
}

/** Set secret for existing on-chain game (for syncing after server restart) */
export function setGameSecret(gameId: number, secret: string): `0x${string}` {
  const commitment = keccak256(toBytes(secret));

  setGame({
    gameId,
    secret,
    difficulty: 'medium',  // Unknown when manually set
    commitment,
    chat: [],
    players: new Map(),
    startedAt: Date.now(),
    winner: null,
  });

  console.log(`[Game] Secret set for game #${gameId}: "${secret}", Commitment: ${commitment}`);
  return commitment;
}

/** Get current game info (public, no secret) */
export function getGameInfo() {
  const game = getGame();
  if (!game) return null;

  return {
    gameId: game.gameId,
    commitment: game.commitment,
    difficulty: game.difficulty,
    chatCount: game.chat.length,
    playerCount: game.players.size,
    startedAt: game.startedAt,
    winner: game.winner,
  };
}

/** Get current secret (for agent use only) */
export function getCurrentSecret(): string | null {
  return getGame()?.secret ?? null;
}

/** Get current game ID */
export function getCurrentGameId(): number | null {
  return getGame()?.gameId ?? null;
}

/** End the current game */
export function endGame(): string | null {
  const game = getGame();
  const wasSecret = game?.secret ?? null;
  setGame(null);
  return wasSecret;
}

// ============ Player Management ============

/** Record that a player bought in (call after on-chain verification) */
export function recordBuyIn(address: string) {
  const game = getGame();
  if (!game) return;

  const lower = address.toLowerCase();
  const existing = game.players.get(lower);

  if (existing) {
    existing.tries += TRIES_PER_BUY_IN;
    existing.totalBuyIns += 1;
  } else {
    game.players.set(lower, {
      tries: TRIES_PER_BUY_IN,
      hasParticipated: false,
      totalBuyIns: 1,
    });
  }

  console.log(`[Game] Player ${lower} bought in. Tries: ${game.players.get(lower)?.tries}`);
}

/** Get player state */
export function getPlayerState(address: string): PlayerState | null {
  const game = getGame();
  if (!game) return null;
  return game.players.get(address.toLowerCase()) ?? null;
}

/** Check if player has tries remaining */
export function hasTries(address: string): boolean {
  const player = getPlayerState(address);
  return (player?.tries ?? 0) > 0;
}

/** Use one try (returns false if none left) */
export function useTry(address: string): boolean {
  const game = getGame();
  if (!game) return false;

  const player = game.players.get(address.toLowerCase());
  if (!player || player.tries <= 0) return false;

  player.tries--;
  player.hasParticipated = true;
  return true;
}

/** Get remaining tries for player */
export function getRemainingTries(address: string): number {
  return getPlayerState(address)?.tries ?? 0;
}

// ============ Chat Management ============

/** Record a message and response */
export function recordMessage(address: string, message: string, response: string) {
  const game = getGame();
  if (!game) return;

  game.chat.push({
    address: address.toLowerCase(),
    message,
    response,
    timestamp: Date.now(),
  });
}

/** Get chat for player (only if they've participated) */
export function getChat(address: string): ChatMessage[] | null {
  const game = getGame();
  if (!game) return null;

  const player = game.players.get(address.toLowerCase());
  if (!player?.hasParticipated) return null;  // Must participate to see chat

  return game.chat;
}

/** Get full chat (for admin/debug) */
export function getFullChat(): ChatMessage[] {
  return getGame()?.chat ?? [];
}

// ============ Win Detection ============

/** Check if message contains the winning word */
export function checkWin(message: string): boolean {
  const game = getGame();
  if (!game || game.winner) return false;

  const normalized = message.toLowerCase().trim();
  const secret = game.secret.toLowerCase();

  // Check if the secret appears as a standalone word in the message
  // \b = word boundary, so "hoskinson" matches but "hoskinsonite" doesn't
  const regex = new RegExp(`\\b${escapeRegex(secret)}\\b`, 'i');
  return regex.test(normalized);
}

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Record winner */
export function setWinner(address: string) {
  const game = getGame();
  if (!game) return;

  game.winner = address.toLowerCase();
  console.log(`[Game] Winner declared: ${address}`);
}

/** Check if answer contains the secret (for safety filtering) */
export function containsSecret(text: string): boolean {
  const game = getGame();
  if (!game) return false;
  return text.toLowerCase().includes(game.secret.toLowerCase());
}

// ============ Helpers ============

import { WORDS } from './wordlist';

function getRandomWordWithDifficulty(): { word: string; difficulty: Difficulty } {
  const roll = Math.random();
  let difficulty: Difficulty;

  if (roll < 0.4) {
    difficulty = 'easy';
  } else if (roll < 0.8) {
    difficulty = 'medium';
  } else {
    difficulty = 'hard';
  }

  const words = WORDS[difficulty];
  const word = words[Math.floor(Math.random() * words.length)];

  return { word, difficulty };
}
