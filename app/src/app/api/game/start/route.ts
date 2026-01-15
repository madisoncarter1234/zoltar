import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, encodeFunctionData, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { startNewGame, getCurrentGameId } from 'src/lib/game';
import { EXTRACT_ABI, EXTRACT_ADDRESS } from 'src/lib/contracts';

// Agent wallet - calls startGame on contract
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY as `0x${string}`;

export async function POST(request: NextRequest) {
  // Auth is optional - if no game is active, anyone can start one
  // This enables the auto-game-loop behavior where games run forever
  // If a game IS active, only agent can force-start (which would fail anyway)
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.AGENT_SECRET_KEY;
  const isAuthorized = expectedKey && authHeader === `Bearer ${expectedKey}`;

  if (!AGENT_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Agent wallet not configured' }, { status: 500 });
  }

  try {
    const contractAddress = EXTRACT_ADDRESS[baseSepolia.id];
    const account = privateKeyToAccount(AGENT_PRIVATE_KEY);

    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http('https://sepolia.base.org'),
    });

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org'),
    });

    // Check current game state on-chain
    const gameInfo = await publicClient.readContract({
      address: contractAddress,
      abi: EXTRACT_ABI,
      functionName: 'getGameInfo',
    }) as [bigint, `0x${string}`, bigint, bigint, boolean, bigint];

    const [currentGameId, , , , isActive] = gameInfo;

    if (isActive) {
      return NextResponse.json({
        error: 'Game already active. Wait for it to end.'
      }, { status: 400 });
    }

    // Next game ID will be current + 1
    const nextGameId = Number(currentGameId) + 1;

    // Generate new word and commitment
    const { secret, commitment, difficulty } = startNewGame(nextGameId);
    console.log(`[StartGame] Generated secret: "${secret}" (${difficulty}), commitment: ${commitment}`);

    // Call startGame on contract
    const hash = await walletClient.sendTransaction({
      to: contractAddress,
      data: encodeFunctionData({
        abi: EXTRACT_ABI,
        functionName: 'startGame',
        args: [commitment],
      }),
    });

    console.log(`[StartGame] Transaction sent: ${hash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[StartGame] Transaction confirmed in block ${receipt.blockNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Game started!',
      gameId: nextGameId,
      difficulty,
      txHash: hash,
      commitment,
    });
  } catch (error) {
    console.error('[StartGame] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to start game'
    }, { status: 500 });
  }
}
