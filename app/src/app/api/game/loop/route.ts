import { NextRequest, NextResponse } from 'next/server';
import { startGameLoop, stopGameLoop, isGameLoopRunning } from 'src/lib/gameLoop';

// GET - Check if loop is running
export async function GET() {
  return NextResponse.json({
    running: isGameLoopRunning(),
  });
}

// POST - Start the game loop
export async function POST(request: NextRequest) {
  // Optional auth for starting loop
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.AGENT_SECRET_KEY;

  // Allow without auth for convenience, but log if authorized
  const isAuthorized = expectedKey && authHeader === `Bearer ${expectedKey}`;

  if (isGameLoopRunning()) {
    return NextResponse.json({
      message: 'Game loop already running',
      running: true,
    });
  }

  startGameLoop();

  return NextResponse.json({
    message: 'Game loop started',
    running: true,
    authorized: isAuthorized,
  });
}

// DELETE - Stop the game loop
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.AGENT_SECRET_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  stopGameLoop();

  return NextResponse.json({
    message: 'Game loop stopped',
    running: false,
  });
}
