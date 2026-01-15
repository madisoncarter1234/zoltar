import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { EXTRACT_ABI, EXTRACT_ADDRESS } from 'src/lib/contracts';
import { startNewGame, endGame as endServerGame, getGameInfo as getServerGameInfo } from 'src/lib/game';

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
const CONTRACT_ADDRESS = EXTRACT_ADDRESS[baseSepolia.id];

// Verify request is from Vercel Cron
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify the cron secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow Vercel's internal cron calls
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    if (!isVercelCron) {
      return false;
    }
  }

  return true;
}

export async function GET(request: NextRequest) {
  // Verify request (allow in dev without auth)
  if (process.env.NODE_ENV === 'production' && !verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!AGENT_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Agent not configured' }, { status: 500 });
  }

  try {
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

    // Get on-chain game state
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EXTRACT_ABI,
      functionName: 'getGameInfo',
    }) as [bigint, `0x${string}`, bigint, bigint, boolean, bigint];

    const onChain = {
      gameId: Number(result[0]),
      pot: result[2],
      isActive: result[4],
      timeRemaining: Number(result[5]),
    };

    console.log(`[Cron] Game state: active=${onChain.isActive}, timeLeft=${onChain.timeRemaining}s`);

    // Case 1: Game expired → end it and start new
    if (onChain.isActive && onChain.timeRemaining === 0) {
      console.log(`[Cron] Game #${onChain.gameId} expired. Ending and starting new...`);

      // End game
      const endHash = await walletClient.sendTransaction({
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: EXTRACT_ABI,
          functionName: 'endGame',
        }),
      });
      await publicClient.waitForTransactionReceipt({ hash: endHash });
      endServerGame();

      // Start new game
      const nextGameId = onChain.gameId + 1;
      const { commitment, secret, difficulty } = startNewGame(nextGameId);

      const startHash = await walletClient.sendTransaction({
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: EXTRACT_ABI,
          functionName: 'startGame',
          args: [commitment],
        }),
      });
      await publicClient.waitForTransactionReceipt({ hash: startHash });

      console.log(`[Cron] New game #${nextGameId} started. Secret: "${secret}" (${difficulty})`);

      return NextResponse.json({
        action: 'rotated',
        oldGameId: onChain.gameId,
        newGameId: nextGameId,
        difficulty,
      });
    }

    // Case 2: No active game → start one
    if (!onChain.isActive) {
      console.log(`[Cron] No active game. Starting new...`);

      const nextGameId = onChain.gameId + 1;
      const { commitment, secret, difficulty } = startNewGame(nextGameId);

      const hash = await walletClient.sendTransaction({
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: EXTRACT_ABI,
          functionName: 'startGame',
          args: [commitment],
        }),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      console.log(`[Cron] New game #${nextGameId} started. Secret: "${secret}" (${difficulty})`);

      return NextResponse.json({
        action: 'started',
        gameId: nextGameId,
        difficulty,
      });
    }

    // Case 3: Game is running normally
    return NextResponse.json({
      action: 'none',
      gameId: onChain.gameId,
      timeRemaining: onChain.timeRemaining,
    });

  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
