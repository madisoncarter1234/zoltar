import { NextRequest, NextResponse } from 'next/server';
import { getGameInfo, endGame, setGameSecret, getCurrentGameId } from 'src/lib/game';

// Get current game state from server
export async function GET() {
  const info = getGameInfo();

  if (!info) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    gameId: info.gameId,
    difficulty: info.difficulty,
    chatCount: info.chatCount,
    playerCount: info.playerCount,
    winner: info.winner,
  });
}

// Sync server with existing on-chain game (for recovery)
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.AGENT_SECRET_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { secret, gameId } = await request.json();

  if (!secret || typeof secret !== 'string') {
    return NextResponse.json({ error: 'Secret is required' }, { status: 400 });
  }

  const commitment = setGameSecret(gameId || 1, secret.toLowerCase().trim());

  return NextResponse.json({
    commitment,
    message: 'Server synced with on-chain game',
  });
}

// End current game (for manual override)
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.AGENT_SECRET_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = endGame();

  return NextResponse.json({
    message: 'Game ended',
    revealedSecret: secret,
  });
}
