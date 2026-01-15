import { createPublicClient, createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { EXTRACT_ABI, EXTRACT_ADDRESS } from './contracts';
import { startNewGame, endGame as endServerGame, getGameInfo as getServerGameInfo } from './game';

// ============ Config ============

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
const CHECK_INTERVAL = 30_000; // Check every 30 seconds
const CONTRACT_ADDRESS = EXTRACT_ADDRESS[baseSepolia.id];

// ============ Global State ============

declare global {
  // eslint-disable-next-line no-var
  var __gameLoopStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __gameLoopInterval: NodeJS.Timeout | undefined;
}

// ============ Clients ============

function getClients() {
  if (!AGENT_PRIVATE_KEY) {
    throw new Error('AGENT_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(AGENT_PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  return { publicClient, walletClient, account };
}

// ============ Contract Interactions ============

async function getOnChainGameInfo() {
  const { publicClient } = getClients();

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: EXTRACT_ABI,
    functionName: 'getGameInfo',
  }) as [bigint, `0x${string}`, bigint, bigint, boolean, bigint];

  return {
    gameId: Number(result[0]),
    commitment: result[1],
    pot: result[2],
    endTime: Number(result[3]),
    isActive: result[4],
    timeRemaining: Number(result[5]),
  };
}

async function callEndGame(): Promise<string> {
  const { publicClient, walletClient } = getClients();

  const hash = await walletClient.sendTransaction({
    to: CONTRACT_ADDRESS,
    data: encodeFunctionData({
      abi: EXTRACT_ABI,
      functionName: 'endGame',
    }),
  });

  console.log(`[GameLoop] endGame tx sent: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[GameLoop] endGame confirmed`);

  return hash;
}

async function callStartGame(commitment: `0x${string}`): Promise<string> {
  const { publicClient, walletClient } = getClients();

  const hash = await walletClient.sendTransaction({
    to: CONTRACT_ADDRESS,
    data: encodeFunctionData({
      abi: EXTRACT_ABI,
      functionName: 'startGame',
      args: [commitment],
    }),
  });

  console.log(`[GameLoop] startGame tx sent: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[GameLoop] startGame confirmed`);

  return hash;
}

// ============ Game Loop Logic ============

async function checkAndManageGame() {
  try {
    const onChain = await getOnChainGameInfo();
    const serverState = getServerGameInfo();

    console.log(`[GameLoop] Check - OnChain: active=${onChain.isActive}, timeLeft=${onChain.timeRemaining}s, pot=${onChain.pot}`);

    // Case 1: Game is active but time expired → end it and start new
    if (onChain.isActive && onChain.timeRemaining === 0) {
      console.log(`[GameLoop] Game #${onChain.gameId} expired. Ending and starting new game...`);

      // End the expired game (pot rolls over)
      await callEndGame();
      endServerGame();

      // Start new game
      const nextGameId = onChain.gameId + 1;
      const { commitment, secret, difficulty } = startNewGame(nextGameId);
      await callStartGame(commitment);

      console.log(`[GameLoop] New game #${nextGameId} started. Secret: "${secret}" (${difficulty})`);
      return;
    }

    // Case 2: No active game → start one
    if (!onChain.isActive) {
      console.log(`[GameLoop] No active game. Starting new game...`);

      const nextGameId = onChain.gameId + 1;
      const { commitment, secret, difficulty } = startNewGame(nextGameId);
      await callStartGame(commitment);

      console.log(`[GameLoop] New game #${nextGameId} started. Secret: "${secret}" (${difficulty})`);
      return;
    }

    // Case 3: Game is active, server state out of sync → resync
    if (onChain.isActive && (!serverState || serverState.gameId !== onChain.gameId)) {
      console.log(`[GameLoop] Server state out of sync. Game #${onChain.gameId} is active on-chain but server has game #${serverState?.gameId ?? 'none'}`);
      console.log(`[GameLoop] Note: Server needs manual sync via PATCH /api/game with the secret`);
      // We can't auto-sync because we don't know the secret
      // This would happen after a server restart mid-game
    }

    // Case 4: Everything is fine, game running
    // Do nothing, just monitoring

  } catch (error) {
    console.error(`[GameLoop] Error:`, error);
  }
}

// ============ Start/Stop Loop ============

export function startGameLoop() {
  if (globalThis.__gameLoopStarted) {
    console.log('[GameLoop] Already running');
    return;
  }

  if (!AGENT_PRIVATE_KEY) {
    console.error('[GameLoop] Cannot start: AGENT_PRIVATE_KEY not configured');
    return;
  }

  console.log('[GameLoop] Starting automatic game loop (30s interval)...');
  globalThis.__gameLoopStarted = true;

  // Run immediately on start
  checkAndManageGame();

  // Then run every 30 seconds
  globalThis.__gameLoopInterval = setInterval(checkAndManageGame, CHECK_INTERVAL);
}

export function stopGameLoop() {
  if (globalThis.__gameLoopInterval) {
    clearInterval(globalThis.__gameLoopInterval);
    globalThis.__gameLoopInterval = undefined;
  }
  globalThis.__gameLoopStarted = false;
  console.log('[GameLoop] Stopped');
}

export function isGameLoopRunning(): boolean {
  return globalThis.__gameLoopStarted ?? false;
}
