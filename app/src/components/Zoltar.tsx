'use client';

import { useState, useEffect } from 'react';

interface ZoltarProps {
  speaking?: boolean;
  message?: string;
}

// CSS Pixel Art Zoltar - smaller pixels for more detail
const PIXEL_SIZE = 4;
const GRID_WIDTH = 22;

// Color palette
const C = {
  _: 'transparent',
  T: '#8B0000', // Turban dark red
  t: '#DC143C', // Turban crimson
  G: '#FFD700', // Turban gold gem
  S: '#DEB887', // Skin
  s: '#C4A06A', // Skin shadow
  E: '#00FF00', // Eyes (glow)
  e: '#004400', // Eye dark
  B: '#1a1a1a', // Beard dark
  b: '#333333', // Beard lighter
  R: '#4B0082', // Robe purple
  r: '#6B238E', // Robe lighter
  W: '#FFFFFF', // White
  K: '#000000', // Black
};

// Zoltar pixel grid - 22 wide, perfectly symmetric
const ZOLTAR_PIXELS = [
  '______TTTTTTTTTT______', // 22
  '_____TttttttttttT_____', // 22
  '____TtttttGGtttttT____', // 22
  '____TttttttttttttT____', // 22
  '_____TttttttttttT_____', // 22
  '______TttttttttT______', // 22
  '______SSSSSSSSSS______', // 22
  '_____SSSSSSSSSSSS_____', // 22
  '_____SSeESSSSeESS_____', // 22 - eyes
  '_____SSeESSSSeESS_____', // 22 - eyes
  '_____SSSSSSSSSSSS_____', // 22
  '______SSSSSSSSSS______', // 22
  '______sSSSSSSSSs______', // 22 - nose shadow
  '_______SSSSSSSS_______', // 22
  '______bBBBBBBBBb______', // 22
  '_____bBBBBBBBBBBb_____', // 22
  '______bBBBBBBBBb______', // 22
  '______RRRRRRRRRR______', // 22
  '_____RRRRRRRRRRRR_____', // 22
  '_____RrRRRRRRRRrR_____', // 22
  '_____RrRRRRRRRRrR_____', // 22
  '______RRRRRRRRRR______', // 22
  '_______RRRRRRRR_______', // 22
];

function PixelGrid({ speaking }: { speaking: boolean }) {
  return (
    <div
      className="relative"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_WIDTH}, ${PIXEL_SIZE}px)`,
        gap: 0,
      }}
    >
      {ZOLTAR_PIXELS.flatMap((row, y) =>
        row.split('').map((pixel, x) => {
          const color = C[pixel as keyof typeof C] || 'transparent';
          const isEye = pixel === 'E';

          return (
            <div
              key={`${x}-${y}`}
              style={{
                width: PIXEL_SIZE,
                height: PIXEL_SIZE,
                backgroundColor: color,
                boxShadow: isEye && speaking
                  ? '0 0 8px #00FF00, 0 0 16px #00FF00'
                  : isEye
                    ? '0 0 4px #00FF00'
                    : undefined,
              }}
            />
          );
        })
      )}
    </div>
  );
}

function CrystalBall({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative mt-2 flex justify-center">
      <div
        className={`
          w-10 h-10 rounded-full
          bg-gradient-to-br from-purple-900 via-purple-600 to-purple-900
          border-2 border-purple-400
          ${speaking ? 'crystal-ball-glow' : ''}
        `}
        style={{
          boxShadow: speaking
            ? '0 0 20px #9333ea, 0 0 40px #9333ea, inset 0 0 20px rgba(147, 51, 234, 0.5)'
            : '0 0 10px rgba(147, 51, 234, 0.3), inset 0 0 10px rgba(147, 51, 234, 0.2)',
        }}
      >
        {/* Inner glow/reflection */}
        <div className="absolute top-1 left-2 w-2 h-2 bg-white/30 rounded-full" />
      </div>
    </div>
  );
}

export function Zoltar({ speaking = false, message }: ZoltarProps) {
  const [displayedMessage, setDisplayedMessage] = useState('');

  // Typewriter effect
  useEffect(() => {
    if (!message) {
      setDisplayedMessage('');
      return;
    }

    setDisplayedMessage('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < message.length) {
        setDisplayedMessage(message.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="flex flex-col items-center">
      {/* Cabinet */}
      <div className="relative zoltar-float">
        <div className="w-48 h-72 border-4 border-white bg-black relative">
          {/* Title */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-40 h-5 border-2 border-white bg-black flex items-center justify-center">
            <span className="text-[8px] tracking-[0.2em] text-white">ZOLTAR</span>
          </div>

          {/* Glass window with Zoltar */}
          <div className="absolute top-8 left-3 right-3 bottom-14 border-2 border-gray-700 bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center">
            <PixelGrid speaking={speaking} />
            <CrystalBall speaking={speaking} />
          </div>

          {/* Coin slot */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-5 border-2 border-gray-600 bg-black flex items-center justify-center">
            <span className="text-[6px] text-gray-500 tracking-wider">INSERT COIN</span>
          </div>
        </div>

        {/* Base */}
        <div className="w-52 h-3 bg-white mx-auto" />
        <div className="w-56 h-2 bg-gray-400 mx-auto" />
      </div>

      {/* Speech Bubble */}
      {displayedMessage && (
        <div className="mt-6 max-w-sm">
          <div className="relative bg-black border-2 border-green-500 p-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-green-500" />
            <p className="text-green-500 text-xs leading-relaxed font-mono">
              {displayedMessage}
              <span className="blink">█</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
