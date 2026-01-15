'use client';

import { GameControls } from 'src/components/GameControls';

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 scanlines">
      {/* Title */}
      <h1 className="text-xl mb-2 tracking-wider glow">EXTRACT</h1>
      <p className="text-[8px] text-gray-500 mb-8">CAN YOU OUTSMART THE ORACLE?</p>

      {/* Game Controls - handles everything */}
      <div className="mt-8 w-full max-w-md">
        <GameControls />
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-8 pb-4 text-[6px] text-gray-600">
        BUILT ON BASE
      </footer>
    </div>
  );
}
